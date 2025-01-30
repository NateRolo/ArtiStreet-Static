// Import Firebase Storage
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

// Initialize Storage
const storage = getStorage();

// Utility functions for database operations

// Upload image to Firebase Storage
async function uploadImage(file) {
    if (!file) return null;
    
    try {
        // Create a unique filename using timestamp and original name
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        
        // Create a reference to the file location
        const storageRef = ref(storage, `posts/${fileName}`);
        
        // Upload the file
        const snapshot = await uploadBytes(storageRef, file);
        
        // Get the download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return {
            url: downloadURL,
            path: `posts/${fileName}`
        };
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
}

// Create or update user document
async function saveUser(user, userData) {
    const userRef = db.collection('users').doc(user.uid);
    const data = {
        userID: user.uid,
        email: user.email,
        username: userData.username,
        userHandle: userData.userHandle,
        bio: userData.bio || '',
        profilePicture: userData.profilePicture || null
    };
    await userRef.set(data, { merge: true });
    return data;
}

// Create or update post
async function savePost(postData) {
    const postRef = postData.id ? 
        db.collection('posts').doc(postData.id) : 
        db.collection('posts').doc();

    // Upload image if provided
    let imageData = null;
    if (postData.image) {
        imageData = await uploadImage(postData.image);
    }

    const data = {
        title: postData.title,
        description: postData.description || '',
        city: postData.city,
        street: postData.street,
        imageUrl: imageData ? imageData.url : null,
        imagePath: imageData ? imageData.path : null,
        likesCount: postData.likesCount || 0,
        time: postData.time || firebase.firestore.FieldValue.serverTimestamp(),
        user: {
            uid: postData.user.uid,
            username: postData.user.username,
            handle: postData.user.handle
        }
    };

    await postRef.set(data, { merge: true });
    return { id: postRef.id, ...data };
}

// Create comment
async function saveComment(commentData) {
    const commentRef = db.collection('comments').doc();
    const userRef = db.collection('users').doc(commentData.userID);
    
    // Get user data
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    const data = {
        postID: commentData.postID,
        userID: commentData.userID,
        username: userData.username,
        profilePicture: userData.profilePicture || null,
        text: commentData.text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    await commentRef.set(data);
    return { id: commentRef.id, ...data };
}

// Delete post and its image
async function deletePost(postId) {
    try {
        // Get post data
        const postRef = db.collection('posts').doc(postId);
        const postDoc = await postRef.get();
        const postData = postDoc.data();

        // Delete image from storage if it exists
        if (postData.imagePath) {
            const imageRef = ref(storage, postData.imagePath);
            await deleteObject(imageRef);
        }

        // Delete post document
        await postRef.delete();
    } catch (error) {
        console.error("Error deleting post:", error);
        throw error;
    }
}

export default {
    saveUser,
    savePost,
    saveComment,
    deletePost,
    uploadImage
};