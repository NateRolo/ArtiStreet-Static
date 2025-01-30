import { auth, db } from './config.js';
import { savePost as dbSavePost, uploadImageWithProgress } from './dbOperations.js';
import { 
    collection, 
    doc, 
    getDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Initialize DOM Elements
const titleInput = document.getElementById("input-title");
const locationInput = document.getElementById("input-location");
const descOfPost = document.getElementById("exampleFormControlTextarea1");
const imgUpload = document.getElementById("img-upload");
const imgPreview = document.getElementById("img-upload-preview");
const imgLabel = document.getElementById("img-label");
const saveButton = document.getElementById("save_button");
const backButton = document.getElementById('backButton');

// Utility Function: Get Query String Parameter
const getQueryParam = (param) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
};


// Add utility function to convert image to hex
const imageToHex = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target.result;
            const bytes = new Uint8Array(arrayBuffer);
            let hexString = '';
            for (let i = 0; i < bytes.length; i++) {
                const hex = bytes[i].toString(16).padStart(2, '0');
                hexString += hex;
            }
            resolve(hexString);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

// Add utility function to convert hex back to data URL
const hexToDataURL = (hexString, mimeType = 'image/jpeg') => {
    const bytes = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
};

// Utility Function: Populate Post Info
const populatePostForm = async (docId) => {
    try {
        const postDoc = await getDoc(doc(db, "posts", docId));
        if (!postDoc.exists) {
            Swal.fire({
                icon: "error",
                title: "Post Not Found",
                text: "The post you are looking for doesn't exist."
            });
            return;
        }

        const postData = postDoc.data();

        // Populate form fields
        titleInput.value = postData.title || "";
        locationInput.value = `${postData.street || ""}, ${postData.city || ""}`;
        descOfPost.value = postData.description || "";

        // Populate image preview from hex
        if (postData.image_hex) {
            imgPreview.src = hexToDataURL(postData.image_hex, postData.image_type);
            imgPreview.style.display = "block";
            imgLabel.style.display = "none";
        } else {
            imgLabel.style.display = "block";
            imgPreview.style.display = "none";
        }
    } catch (error) {
        console.error("Error fetching post data:", error);
        Swal.fire({
            icon: "error",
            title: "Failed to Load Post",
            text: "There was an error while fetching the post details."
        });
    }
};

// Utility Function: Save or Update Post
const saveOrUpdatePost = async (docId = null) => {
    let title = titleInput.value.trim();
    titleInput.value = title;

    const location = locationInput.value.trim();
    const file = imgUpload.files[0];
    const description = descOfPost.value.trim();

    // Validate input fields
    if (!title) {
        Swal.fire({
            icon: "error",
            title: "Validation Error",
            text: "Title cannot be empty or contain only spaces."
        });
        titleInput.style.border = "2px solid red"; // Highlight invalid input
        return;
    }
    titleInput.style.border = ""; // Reset border if valid

    if (!location || (!file && !docId)) {
        Swal.fire({
            icon: "error",
            title: "Validation Error",
            text: "Please fill in all required fields."
        });
        return;
    }

    const locationPattern = /^[^,]+,\s*[^,]+$/;
    if (!locationPattern.test(location)) {
        Swal.fire({
            icon: "error",
            title: "Validation Error",
            text: "Please enter the location in 'street, city' format."
        });
        locationInput.style.border = "2px solid red";
        return;
    }

    const [street, city] = location.split(",").map((part) => part.trim());

    try {
        const user = auth.currentUser;
        if (!user) {
            Swal.fire({
                icon: "error",
                title: "Authentication Error",
                text: "You need to be logged in to post."
            });
            return;
        }

        console.log("Current user:", user.uid); // Debug log

        const usersRef = collection(db, "users");
        const userDocRef = doc(usersRef, user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists) {
            Swal.fire({
                icon: "error",
                title: "User Error",
                text: "User profile not found."
            });
            return;
        }

        const userData = userDoc.data();

        const postData = {
            title,
            city,
            street,
            image: file, // Pass the file directly
            user: {
                uid: user.uid,
                username: userData.username,
                handle: userData.userHandle,
            },
            description,
            time: serverTimestamp(),
        };

        if (docId) {
            // If editing, include the document ID
            postData.id = docId;
        }

        await dbSavePost(postData);

        Swal.fire({
            position: "top-end",
            icon: "success",
            title: docId ? "Post updated successfully!" : "Post saved successfully!",
            showConfirmButton: false,
            timer: 1500,
        });

        setTimeout(() => {
            window.location.href = "/app/html/Landing.html";
        }, 1500);
    } catch (error) {
        console.error("Error details:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: error.message || "Failed to save the post. Please try again."
        });
    }
};

// Event Listeners
const handleFileSelection = (event) => {
    event.stopPropagation();
    const file = imgUpload.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imgPreview.src = e.target.result;
            imgPreview.style.display = "block";
            imgLabel.style.display = "none";
        };
        reader.readAsDataURL(file);
    } else {
        imgLabel.style.display = "block";
        imgPreview.style.display = "none";
    }
};

// File upload behaviours
const triggerFileInput = (event) => {
    event.preventDefault(); 
    imgUpload.click();
};

const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

// Add Event Listeners
imgLabel.addEventListener("click", triggerFileInput);
imgPreview.addEventListener("click", debounce(triggerFileInput, 200));
imgUpload.addEventListener("change", handleFileSelection);

// delete post button
const deleteButton = document.getElementById("delete_button");
deleteButton.addEventListener("click", async () => {
    const docId = getQueryParam("docId"); // Get the post ID from the query string
    await deletePost(docId);
});

// hide post button if adding new post, change button to "post" instead of "save"
function hideDeletePostButton() {
    if (getQueryParam("docId") == null) {
        document.getElementById("delete_button").style.display = "none";
        document.getElementById("save_button").innerHTML = "Post";
    }
} hideDeletePostButton();


// save changes button
saveButton.addEventListener("click", async () => {
    try {
        const file = imgUpload.files[0];
        if (!file) {
            throw new Error("Please select an image");
        }
        const title = titleInput.value.trim();
        if (!title) {
            throw new Error("Title is required");
        }
        const location = locationInput.value.trim();
        if (!location) {
            throw new Error("Location is required");
        }
        const description = descOfPost.value.trim();
        const [street, city] = location.split(",").map(part => part.trim());
        
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");
        
        const usersRef = collection(db, "users");
        const userDocRef = doc(usersRef, user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();
        
        const postData = {
            title,
            description,
            city,
            street,
            file: file,
            user: {
                uid: user.uid,
                username: userData.username,
                handle: userData.userHandle
            }
        };
        
        // Show progress indicator
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        imgPreview.parentNode.appendChild(progressBar);
        
        await dbSavePost(postData, (progress) => {
            progressBar.style.width = `${progress}%`;
        });
        
        // Success handling
        Swal.fire({
            icon: 'success',
            title: 'Post saved successfully!'
        });
        
        // Redirect after success
        setTimeout(() => {
            window.location.href = "/app/html/Landing.html";
        }, 1500);
    } catch (error) {
        console.error('Error saving post:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error saving post',
            text: error.message
        });
    }
});

const cancelEdit = () => {
    Swal.fire({
        title: 'Are you sure?',
        text: "Any unsaved changes will be lost.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, cancel',
        cancelButtonText: 'No, keep editing',
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = "/html/profile.html"; // Redirect to profile.html
        }
    });
};


// Attach to Cancel Button
const cancelButton = document.getElementById("cancel_button"); // Ensure the button has this ID in your HTML
if (cancelButton) {
    cancelButton.addEventListener("click", cancelEdit);
}

// Populate form on page load
window.addEventListener("DOMContentLoaded", async () => {
    const docId = getQueryParam("docId");
    if (docId) {
        await populatePostForm(docId); // Populate form if editing
    }
});

// delete post function 
const deletePost = async (docId) => {
    if (!docId) {
        Swal.fire({
            icon: "error",
            title: "Post Not Found",
            text: "Post ID is missing. Unable to delete post."
        });
        return;
    }

    const confirmDelete = await Swal.fire({
        title: "Are you sure?",
        text: "This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel"
    });

    if (!confirmDelete.isConfirmed) return;

    try {
        const user = auth.currentUser;
        if (!user) {
            Swal.fire({
                icon: "error",
                title: "Not Logged In",
                text: "You must be logged in to delete a post."
            });
            return;
        }

        const postsRef = collection(db, "posts");
        const postRef = doc(postsRef, docId);
        const postDoc = await getDoc(postRef);

        if (!postDoc.exists) {
            Swal.fire({
                icon: "error",
                title: "Post Not Found",
                text: "Post not found!"
            });
            return;
        }

        const postData = postDoc.data();

        if (postData.user.uid !== user.uid) {
            Swal.fire({
                icon: "error",
                title: "Unauthorized",
                text: "You are not authorized to delete this post."
            });
            return;
        }

        // Delete the post document from Firestore
        await deleteDoc(postRef);

        Swal.fire({
            icon: "success",
            title: "Post Deleted",
            text: "Post deleted successfully!"
        });

        window.location.href = "/app/html/Landing.html";
    } catch (error) {
        console.error("Error deleting post:", error);
        Swal.fire({
            icon: "error",
            title: "Failed to Delete Post",
            text: "Please try again later."
        });
    }
};

backButton.addEventListener('click', () => {
    // Navigate to the previous page
    window.history.back();
});

// set nav button to active when clicked
const navPostButton = document.getElementById("nav-post");
navPostButton.onload = navPostButton.classList.toggle("active");

async function processPostData(postData) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const usersRef = collection(db, "users");
        const userDocRef = doc(usersRef, user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();

        let imageHex = null;
        if (postData.file) {
            imageHex = await imageToHex(postData.file);
        }

        const post = await dbSavePost({
            title: postData.title,
            description: postData.description,
            city: postData.city,
            street: postData.street,
            image: imageHex,
            user: {
                uid: user.uid,
                username: userData.username,
                handle: userData.userHandle
            }
        });

        return post;
    } catch (error) {
        console.error("Error saving post:", error);
        throw error;
    }
}
