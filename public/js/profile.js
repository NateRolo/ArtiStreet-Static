// formats timestamp of posts as "x time ago"
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


// populate page with user's info 
async function displayUserInfo() {
    firebase.auth().onAuthStateChanged(user => {


        if (!user) {
            console.log("You need to be signed in to see your posts.");
        }
        //go to the correct user document by referencing to the user uid
        currentUser = db.collection("users").doc(user.uid);
        //get the document for current user.
        currentUser.get()
            .then(userDoc => {
                //get the data fields of the user
                let userName = userDoc.data().username;
                let userHandle = userDoc.data().userHandle;
                let userBio = userDoc.data().bio;
                let pfp = userDoc.data().profile_picture;
                //if the data fields are not empty, then write them in to the form.
                if (userName != null) {
                    document.getElementById("user-name").innerHTML = userName;
                }
                if (userHandle != null) {
                    document.getElementById("user-handle").innerHTML = "@" + userHandle;
                }
                if (userBio != null) {
                    document.getElementById("user-bio").innerHTML = userBio;
                }
                if (pfp != null) {
                    document.getElementById("pfp").src = pfp;
                } else {
                    document.getElementById("pfp").src = "/img/profileImage.png";
                }

            })
    })
}
displayUserInfo();


// populate page with posts
async function displayPostsDynamically(collection, filterType = "user") {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.log("User not logged in.");
        return;
    }

    const cardTemplate = document.getElementById("post-template");
    const postContainer = document.getElementById(`${collection}-go-here`);
    postContainer.innerHTML = "";

    let userLikes = [];
    if (currentUser) {
        // Fetch user's liked posts
        const userDoc = await db.collection('users').doc(user.uid).get();
        userLikes = userDoc.data().likes || [];
    }

    let query;
    if (filterType === "user") { // show user posts
        query = db.collection(collection)
            .where("user.uid", "==", user.uid)
            .orderBy("time", "desc");
    } else if (filterType === "liked") { // show liked posts
        const userDoc = await db.collection('users').doc(user.uid).get();
        const likes = userDoc.data().likes || [];
        query = db.collection(collection).where(firebase.firestore.FieldPath.documentId(), 'in', likes);
    }

    const posts = await query.get();
    for (const doc of posts.docs) {
        const data = doc.data();
        const docID = doc.id;
        const likesCount = data.likesCount || 0;
        const newPost = cardTemplate.content.cloneNode(true);
        const imgURL = data.image_URL;

        const postPictureElement = newPost.querySelector('.post-picture');
        const postTitleElement = newPost.querySelector('.post-title');
        const postUserElement = newPost.querySelector('.post-user');
        const postLocationElement = newPost.querySelector('.post-location');
        const postTimeElement = newPost.querySelector('.post-time');
        const postProfileImageElement = newPost.querySelector('.profileIcon');

        if (postPictureElement && imgURL) {
            postPictureElement.src = imgURL;
            postPictureElement.onclick = () => window.location.href = `content_view.html?docID=${docID}`;
        }

        postTitleElement.innerHTML = data.title;
        postTitleElement.onclick = () => window.location.href = `content_view.html?docID=${docID}`;

        if (postUserElement) postUserElement.innerHTML = data.user.username;
        if (postLocationElement) postLocationElement.innerHTML = `${data.street}, ${data.city}`;
        if (postTimeElement) postTimeElement.innerHTML = data.time ? timeAgo(data.time.toDate()) : "Unknown time";

        // Fetch profile image for the user who created the post
        if (postProfileImageElement) {
            const postUserDoc = await db.collection('users').doc(data.user.uid).get();
            const postUserProfileImage = postUserDoc.data().profile_picture;
            if (!postUserProfileImage){
                postProfileImageElement.src = "/img/profileImage.png";
            } else {
                postProfileImageElement.src = postUserProfileImage;
            }
                
            
        } 

        

        // Set like button and like count
        const likeButton = newPost.querySelector('.post-like');
        const likeCountElement = newPost.querySelector('.post-like-count');
        if (likeButton) {
            likeButton.id = 'save-' + docID;
            if (userLikes.includes(docID)) {
                likeButton.src = '../img/heart(1).png'; // Set to liked icon
            } else {
                likeButton.src = '../img/heart.png'; // Set to unliked icon
            }
            likeButton.onclick = () => toggleLike(docID);
        }
        if (likeCountElement) {
            likeCountElement.id = 'like-count-' + docID;
            likeCountElement.innerText = `${likesCount} like${likesCount !== 1 ? 's' : ''}`;
        }

        // Add an "Edit" button if the current user is the owner of the post
        if (data.user.uid === user.uid) { // Check if the post owner matches the current user
            const editButton = document.createElement("button");
            editButton.innerText = "Edit";
            editButton.className = "post-edit-button";
            editButton.onclick = () => {
                window.location.href = `add_edit_post.html?docId=${docID}`;
            };

            const postBottomBar = newPost.querySelector('.post-bottombar');
            if (postBottomBar) {
                postBottomBar.appendChild(editButton);
            }
        }

        postContainer.appendChild(newPost);
    }
}


async function toggleLike(postID, filterType = "user") {
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
    const postElement = document.getElementById(`post-${postID}`); // Post container

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
                likeIcon.src = '../img/heart.png'; // Set to unliked icon
            }
            likeCount--; // Decrement local counter

            // Remove post dynamically if in "liked" tab
            if (filterType === "liked" && postElement) {
                postElement.remove();
            }
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
                likeIcon.src = '../img/heart(1).png'; // Set to liked icon
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


// confirm user is logged in
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        displayPostsDynamically("posts", "user");
    } else {
        console.log("User not logged in.");
    }
});

// nav tab to view liked posts
document.getElementById("user-likes").addEventListener("click", () => {
    displayPostsDynamically("posts", "liked");
    document.getElementById("user-likes").classList.toggle("active");
    document.getElementById("user-posts").classList.remove("active");
});

// nav tab  to view user's own posts
document.getElementById("user-posts").addEventListener("click", () => {
    displayPostsDynamically("posts", "user");
    document.getElementById("user-posts").classList.toggle("active");
    document.getElementById("user-likes").classList.remove("active");
});

// edit profile button
document.getElementById("edit-profile").addEventListener("click", () => {
    editProfile();
})

// original states of page
const profileHeader = document.getElementById("pfp-container").innerHTML;
const postContainer = document.getElementById("posts-go-here").innerHTML;

let originalPostContainer = ""; // Global variable to save posts content

// edit profile function
async function editProfile() {
    const profileHeader = document.getElementById("profileHeader");
    const editButton = document.getElementById("edit-profile");
    const postsElement = document.getElementById("posts-go-here");
    const navTabElement = document.getElementById("nav-tab");

    // Hide the Edit Profile button, posts, and nav tab
    editButton.style.display = "none";
    postsElement.style.display = "none";
    navTabElement.style.display = "none";

    // Fetch the current user data
    const user = firebase.auth().currentUser;
    const userDoc = await db.collection("users").doc(user.uid).get();
    const { username, userHandle, bio, profile_picture } = userDoc.data();

    // Replace profileHeader content with forms
    profileHeader.innerHTML = `
        <div id="edit-profile-forms">
            <form>
                <div>
                    <label for="edit-pfp">Profile Picture:</label>
                    <br>
                    <img 
                        id="current-pfp" 
                        src="${profile_picture}" 
                        alt="Current Profile Picture" 
                        style="width: 150px; height: auto; border: 1px solid #ccc; margin: 10px 0; cursor: pointer;"
                    >
                    <input 
                        type="file" 
                        id="edit-pfp" 
                        name="edit-pfp" 
                        accept="image/*" 
                        style="display: none;"
                    >
                    <img 
                        id="pfp-preview" 
                        style="display: none; width: 150px; height: auto; border: 1px solid #ccc; margin-top: 10px;" 
                        alt="Preview"
                    >
                </div>
                <div>
                    <label for="edit-username">Username:</label>
                    <input type="text" id="edit-username" name="edit-username" value="${username}">
                </div>
               <div>
                    <label for="edit-bio">Bio:</label>
                    <textarea id="edit-bio" name="edit-bio">${bio}</textarea>
                </div>
                <button id="save-profile" type="button">Save</button>
                <button id="cancel-edit" type="button">Cancel</button>
            </form>
        </div>
    `;

    // button for profile picture click
    const currentPfp = document.getElementById("current-pfp");
    const editPfpInput = document.getElementById("edit-pfp");
    const previewPfp = document.getElementById("pfp-preview");

    currentPfp.addEventListener("click", () => {
        editPfpInput.click(); // Open file picker when clicking the current profile picture
    });

    editPfpInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewPfp.src = e.target.result; // Set preview image source
                previewPfp.style.display = "block"; // Show the preview image
                currentPfp.style.display = "none"; // Hide the current profile picture
            };
            reader.readAsDataURL(file); // Read the file for preview
        } else {
            // Reset preview if no file is selected
            previewPfp.style.display = "none";
            currentPfp.style.display = "block";
        }
    });

    // reselect image if needed
    previewPfp.addEventListener("click", () => {
        editPfpInput.click(); // Open file picker when clicking the preview picture
    });



    // save profile button
document.getElementById("save-profile").addEventListener("click", async () => {
    Swal.fire({
        title: 'Are you sure?',
        text: "Are you sure you want to save your changes?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, save',
        cancelButtonText: 'No, cancel',
    }).then(async (result) => {
        if (result.isConfirmed) {
            const newUsername = document.getElementById("edit-username").value;
            await saveProfile();
            await updateUserPostsUsername(newUsername);
            restoreUI(profileHeader, editButton, postsElement, navTabElement);
            
            Swal.fire({
                title: 'Success!',
                text: "Your profile has been updated successfully!",
                icon: 'success',
                confirmButtonText: 'Ok',
            });
        }
    });
});

// Event Listener: Cancel edit
document.getElementById("cancel-edit").addEventListener("click", () => {
    Swal.fire({
        title: 'Are you sure?',
        text: "Any unsaved changes will be lost.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, cancel',
        cancelButtonText: 'No, keep editing',
    }).then((result) => {
        if (result.isConfirmed) {
            restoreUI(profileHeader, editButton, postsElement, navTabElement);
        }
    });
});


// Restore the original UI
function restoreUI(profileHeader, editButton, postsElement, navTabElement) {
    location.reload(); // Alternatively, reload content dynamically if necessary
    editButton.style.display = "block";
    postsElement.style.display = "block";
    navTabElement.style.display = "flex";
}

async function saveProfile() {
    const user = firebase.auth().currentUser;
    const userDocRef = db.collection("users").doc(user.uid);

    // Update username and bio
    const newUsername = document.getElementById("edit-username").value;
    const newBio = document.getElementById("edit-bio").value;

    // profile picture upload
    const fileInput = document.getElementById("edit-pfp");
    const file = fileInput.files[0];
    let newProfilePicture = null;

    if (file) {
        const storageRef = storage.ref(`images/${file.name}`);
        await storageRef.put(file);
        newProfilePicture = await storageRef.getDownloadURL();
    }

    // Update Firestore
    const updates = {
        username: newUsername,
        bio: newBio
    };

    if (newProfilePicture) {
        updates.profile_picture = newProfilePicture;
    }

    await userDocRef.update(updates);
};

// update user's posts with new username
async function updateUserPostsUsername(newUsername) {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.log("No user is signed in.");
        return;
    }

    try {
        // Fetch all posts created by this user
        const userPostsQuery = db.collection("posts").where("user.uid", "==", user.uid);
        const userPostsSnapshot = await userPostsQuery.get();

        // Start a Firestore batch to update all posts
        const batch = db.batch();

        userPostsSnapshot.forEach((postDoc) => {
            const postRef = db.collection("posts").doc(postDoc.id);
            batch.update(postRef, { "user.username": newUsername });
        });

        // Commit the batch update
        await batch.commit();

        console.log("Username updated successfully in user document and all posts.");
    } catch (error) {
        console.error("Error updating username in posts:", error);
    }
};

// set nav button to active when clicked
const profileButton = document.getElementById("nav-profile");
profileButton.onload = profileButton.classList.toggle("active");
}
//Log out button when click it redirect you to login page
document.getElementById("log-out").addEventListener("click", () => {
    Swal.fire({
        title: "Are you sure?",
        text: "You will be logged out and redirected to the login page.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, log me out!",
        cancelButtonText: "Cancel",
    }).then((result) => {
        if (result.isConfirmed) {
            firebase.auth()
                .signOut()
                .then(() => {
                    Swal.fire({
                        title: "Logged Out",
                        text: "You have been successfully logged out.",
                        icon: "success",
                        timer: 2000, // 2-second delay for user feedback
                        showConfirmButton: false,
                    });
                    // Redirect to login page after 2 seconds
                    setTimeout(() => {
                        window.location.href = "./login.html";
                    }, 2000);
                })
                .catch((error) => {
                    console.error("Error logging out:", error);
                    Swal.fire({
                        title: "Error",
                        text: "Failed to log out. Please try again.",
                        icon: "error",
                    });
                });
        }
    }); 
});
