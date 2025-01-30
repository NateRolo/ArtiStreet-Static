// Populate the page with user info and post details
async function displayPictureInfo() {
  const params = new URL(window.location.href);
  const ID = params.searchParams.get("docID");

  if (!ID) {
    console.error("No post ID found in the URL.");
    return;
  }

  console.log("Post ID:", ID);

  try {
    const postDoc = await db.collection("posts").doc(ID).get();
    if (!postDoc.exists) {
      console.error("No such post document!");
      return;
    }

    const thisPost = postDoc.data();
    console.log("Post Data:", thisPost);

    const {
      image_URL: postCode,
      title: postName,
      user,
      description: descOfPost = "",
      city: postCity,
      street: postStreet,
      time: postTime,
    } = thisPost;

    const postLocation = `${postCity}, ${postStreet}`;
    const formattedTimeString = postTime.toDate().toLocaleString();

    // Populate the title, description, time, image, and location
    document.querySelector(".post-title").innerHTML = postName;
    document.querySelector(".post-description").innerHTML = descOfPost;
    document.querySelector(".post-time").innerHTML = formattedTimeString;
    document.querySelector(".post-location").innerHTML = postLocation;
    document.querySelector(".post-picture").src = postCode;

    // Fetch and display the user's profile picture
    if (user?.uid) {
      const userDoc = await db.collection("users").doc(user.uid).get();
      if (!userDoc.exists) {
        console.warn("User profile not found.");
        return;
      }

      const {
        profile_picture: profilePic = "/img/profileImage.png", // Fallback image
        username,
      } = userDoc.data();

      //gets userhandle
      let userhandle = userDoc.data().userHandle;

      // Create or update the profile picture element
      const profilePicElement = document.createElement("img");
      profilePicElement.src = profilePic;
      profilePicElement.alt = `${username}'s Profile Picture`;
      profilePicElement.classList.add("profile-picture");
      profilePicElement.style.width = "50px";
      profilePicElement.style.height = "50px";
      profilePicElement.style.borderRadius = "50%";

      document.querySelector(".bi-person-circle").replaceWith(profilePicElement);

      // Display username and user handle
      document.getElementById("user-name").innerHTML = username;
      document.getElementById("user-handle").innerHTML = userhandle;
    } else {
      console.warn("No user data found in the post document.");
    }

    // Load comments for this post
    loadComments(ID);
  } catch (error) {
    console.error("Error fetching post data:", error);
  }
}

displayPictureInfo();

// Load comments for a specific post
function loadComments(postId) {
  const commentsRef = db.collection("comments").where("postId", "==", postId);

  commentsRef.onSnapshot(
    (snapshot) => {
      const commentsList = document.getElementById("comments-list");
      commentsList.innerHTML = ""; // Clear existing comments

      snapshot.forEach((doc) => {
        const { username, text, profile_picture, userId } = doc.data();

        // Create comment container
        const commentElement = document.createElement("div");
        commentElement.classList.add("comment-item");

        // let profilePic = userDoc.data().profile_picture;

        // Add profile image
        const profileImg = document.createElement("img");
        profileImg.src = profile_picture || "/img/profileImage.png"; 
        profileImg.alt = `${username}'s Profile Picture`;
        profileImg.classList.add("comment-profile-img");
        profileImg.style.width = "40px";
        profileImg.style.height = "40px";
        profileImg.style.borderRadius = "50%";
        profileImg.style.marginRight = "10px";

        // Add comment text
        const commentText = document.createElement("div");
        commentText.classList.add("comment-text");
        commentText.innerHTML = `<strong>${username}</strong>: ${text}`;

        // Add trash icon
        const trashIcon = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        trashIcon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        trashIcon.setAttribute("width", "16");
        trashIcon.setAttribute("height", "16");
        trashIcon.setAttribute("fill", "currentColor");
        trashIcon.setAttribute("class", "bi bi-trash");
        trashIcon.setAttribute("viewBox", "0 0 16 16");

        trashIcon.innerHTML = `
          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
          <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
        `;
        trashIcon.style.cursor = "pointer"; // Make the icon interactive

        // Event listener for deleting comments only for the user who made the comment
        firebase.auth().onAuthStateChanged((user) => {
          if (user && user.uid === userId) {
            // Only allow deletion if the user is the author
            trashIcon.addEventListener("click", () => {
              db.collection("comments")
                .doc(doc.id)
                .delete()
                .then(() => {
                  console.log("Comment deleted successfully.");
                })
                .catch((error) => {
                  console.error("Error deleting comment: ", error);
                });
            });
          } else {
            // Hide or disable the trash icon for users who didn't post the comment
            trashIcon.style.display = "none";
          }
        });

        // Append profile image, text, and trash icon to the comment element
        commentElement.appendChild(profileImg);
        commentElement.appendChild(commentText);
        commentElement.appendChild(trashIcon);

        // Append the comment element to the comments list
        commentsList.appendChild(commentElement);
      });
    },
    (error) => {
      console.error("Error loading comments:", error);
    }
  );
}

// Post a new comment
document
  .getElementById("comment-form")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    const commentText = document.getElementById("comment-text").value;
    const postId = getPostIdFromURL(); // Get the current post ID dynamically

    // Ensure the user is logged in
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        // Fetch additional user data if stored in Firestore
        db.collection("users")
          .doc(user.uid)
          .get()
          .then((doc) => {
            if (doc.exists) {
              const { username, profile_picture } = doc.data();

              // Add the comment to Firestore
              db.collection("comments")
                .add({
                  postId: postId,
                  username: username,
                  text: commentText,
                  profile_picture:
                    profile_picture || "/img/profileImage.png", // Default fallback
                  userId: user.uid, // Store the user ID for deletion authorization
                  timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                })
                .then(() => {
                  console.log("Comment successfully added!");
                  document.getElementById("comment-text").value = ""; // Clear comment input
                })
                .catch((error) => {
                  console.error("Error adding comment: ", error);
                });
            } else {
              console.log("User document not found!");
            }
          })
          .catch((error) => {
            console.error("Error fetching user data:", error);
          });
      } else {
        console.log("No user is logged in.");
      }
    });
  });

// Helper function to get the post ID from URL parameters
function getPostIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("docID"); // Assumes post ID is passed as a query parameter named 'docID'
}

async function addComment(postId, text) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error("User not authenticated");

        const comment = await dbOperations.saveComment({
            postID: postId,
            userID: user.uid,
            text: text
        });

        return comment;
    } catch (error) {
        console.error("Error adding comment:", error);
        throw error;
    }
}
