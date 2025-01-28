// Function to convert time to "x time ago" format
function timeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval} year${interval > 1 ? 's' : ''} ago`;

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval} month${interval > 1 ? 's' : ''} ago`;

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval} day${interval > 1 ? 's' : ''} ago`;

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval} hour${interval > 1 ? 's' : ''} ago`;

    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval} minute${interval > 1 ? 's' : ''} ago`;

    return "just now";
}

// Function to populate the page with data from Firebase
async function displayPostsDynamically(collection, type = "all") {
    const cardTemplate = document.getElementById("post-template");
    const currentUser = firebase.auth().currentUser;

    let userLikes = [];
    if (currentUser) {
        // Fetch user's liked posts
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        userLikes = userDoc.data().likes || [];
    }

    let query;
    if (type === "user") {
        if (!currentUser) {
            alert("You need to be logged in to view your posts.");
            return;
        }

        query = db.collection(collection)
            .where("user.uid", "==", currentUser.uid)
            .orderBy("time", "desc");
    } else {
        query = db.collection(collection)
            .orderBy("time", "desc");
    }

    const posts = await query.get();

    posts.forEach(async (doc) => {
        const data = doc.data();
        const title = data.title;
        const location = data.street.concat(", " + data.city);
        const time = data.time;
        const imgURL = data.image_URL;
        const userName = data.user?.username || "Unknown User";
        const docID = doc.id;
        const likesCount = data.likesCount || 0;
        const userID = data.user?.uid;

        let pfp = "/public/img/profileImage.png"; // Default profile picture
        // Fetch user profile img
        if (userID) {
            try {
                const userDoc = await db.collection('users').doc(userID).get();
                pfp = userDoc.exists && userDoc.data().profile_picture ? userDoc.data().profile_picture : pfp;
            } catch (error) {
                console.error(`Error fetching user document for userID: ${userID}`, error);
            }
        }

        const newPost = cardTemplate.content.cloneNode(true);

        // Set image, title, location, and username
        const postPictureElement = newPost.querySelector('.post-picture');
        const postTopBar = newPost.querySelector('.post-topbar');
        const postBottomBar = newPost.querySelector('.post-bottombar');
        const postTitleElement = newPost.querySelector('.post-title');
        const postProfilePictureElement = newPost.querySelector('.profileIcon');

        // Prevent clicks on the entire card from redirecting (to avoid content page)
        if (postTopBar || postBottomBar) {
            postTopBar.onclick = (event) => {
                event.stopPropagation(); // Prevent the click event from propagating
                window.location.href = `content_view.html?docID=${docID}`;
            };

            postBottomBar.onclick = (event) => {
                event.stopPropagation(); // Prevent the click event from propagating
                window.location.href = `content_view.html?docID=${docID}`;
            };
        }

        // Prevent clicks on like button from redirecting
        const likeButton = newPost.querySelector('.post-like');
        if (likeButton) {
            likeButton.id = 'save-' + docID;
            if (userLikes.includes(docID)) {
                likeButton.src = '/public/img/heart(1).png'; // Set to liked icon
            } else {
                likeButton.src = '/public/img/heart.png'; // Set to unliked icon
            }
            likeButton.onclick = (event) => {
                event.stopPropagation(); // Prevent the click event from propagating to parent elements
                toggleLike(docID); // Execute like functionality
            };
        }

        // Prevent clicks on the post image from redirecting to content page
        if (postPictureElement) {
            postPictureElement.onclick = (event) => {
                event.stopPropagation(); // Prevent click event from bubbling up to the card
                window.location.href = `content_view.html?docID=${docID}`;
            };
        }

        // Set the title and post details
        postTitleElement.innerHTML = title;
        postPictureElement.src = imgURL;

        // Set profile image
        if (postProfilePictureElement) {
            postProfilePictureElement.src = pfp;
        }

        newPost.querySelector('.post-user').innerHTML = userName;
        newPost.querySelector('.post-user').setAttribute("data-user-id", userID);
        newPost.querySelector('.profileIcon').setAttribute("data-user-id", userID);
        newPost.querySelector('.post-location').innerHTML = location;

        // Set like button and like count
        const likeCountElement = newPost.querySelector('.post-like-count');
        if (likeCountElement) {
            likeCountElement.id = 'like-count-' + docID;
            likeCountElement.innerText = `${likesCount} like${likesCount !== 1 ? 's' : ''}`;
        }

        // Display time ago
        const timeElement = newPost.querySelector('.post-time');
        if (time && timeElement) {
            timeElement.innerHTML = timeAgo(time.toDate());
        } else {
            timeElement.innerHTML = "Unknown time";
        }

        // Append the new post to the page
        document.getElementById(collection + "-go-here").appendChild(newPost);
    });
}

// Firebase Auth State Change Listener
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const pageType = window.location.pathname.includes("profile.html") ? "user" : "all";
        displayPostsDynamically("posts", pageType);
    } else {
        if (window.location.pathname.includes("profile.html")) {
            alert("Please log in to view your posts.");
        } else {
            displayPostsDynamically("posts", "all");
        }
    }
});

// Toggle like/unlike for a post
async function toggleLike(postID) {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error("No user is signed in.");
        return;
    }

    const currentUser = db.collection('users').doc(user.uid);
    const postRef = db.collection('posts').doc(postID);
    const iconID = 'save-' + postID;
    const likeIcon = document.getElementById(iconID);
    const likeCountElement = document.getElementById('like-count-' + postID);

    try {
        // Fetch current user's liked posts
        const userDoc = await currentUser.get();
        const likes = userDoc.data().likes || [];

        // Fetch current like count of the post
        const postDoc = await postRef.get();
        let likeCount = postDoc.data().likesCount || 0;

        if (likes.includes(postID)) {
            // Unlike the post
            await currentUser.update({
                likes: firebase.firestore.FieldValue.arrayRemove(postID)
            });
            await postRef.update({
                likesCount: firebase.firestore.FieldValue.increment(-1)
            });

            console.log("Post has been unliked for " + postID);
            if (likeIcon) {
                likeIcon.src = '/public/img/heart.png'; // Set to unliked icon
            }
            likeCount--; // Decrement local counter
        } else {
            // Like the post
            await currentUser.update({
                likes: firebase.firestore.FieldValue.arrayUnion(postID)
            });
            await postRef.update({
                likesCount: firebase.firestore.FieldValue.increment(1)
            });

            console.log("Post has been liked for " + postID);
            if (likeIcon) {
                likeIcon.src = '/public/img/heart(1).png'; // Set to liked icon
            }
            likeCount++; // Increment local counter
        }

        // Update the like count display
        if (likeCountElement) {
            likeCountElement.innerText = `${likeCount} like${likeCount !== 1 ? 's' : ''}`;
        }
    } catch (error) {
        console.error("Error updating like status or count:", error);
    }
}

// Set nav button to active when clicked
const homeButton = document.getElementById("nav-home");
homeButton.onload = homeButton.classList.toggle("active");
