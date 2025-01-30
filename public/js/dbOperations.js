// Import Firebase Storage
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

// Initialize Storage
const storage = firebase.storage();

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

// Upload image to Firebase Storage with progress tracking
async function uploadImageWithProgress(file, progressCallback) {
    if (!file) return null;
    
    try {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const storageRef = ref(storage, `posts/${fileName}`);
        
        // Create upload task
        const uploadTask = uploadBytes(storageRef, file);
        
        // Track upload progress
        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (progressCallback) {
                    progressCallback(progress);
                }
            }
        );
        
        // Wait for upload to complete
        const snapshot = await uploadTask;
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return {
            url: downloadURL,
            path: `posts/${fileName}`,
            type: file.type
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
async function savePost(postData, progressCallback) {
    const postRef = postData.id ? 
        db.collection('posts').doc(postData.id) : 
        db.collection('posts').doc();

    // Upload image if provided
    let imageData = null;
    if (postData.image) {
        imageData = await uploadImageWithProgress(postData.image, progressCallback);
    }

    const data = {
        title: postData.title,
        description: postData.description || '',
        city: postData.city,
        street: postData.street,
        imageUrl: imageData ? imageData.url : null,
        imagePath: imageData ? imageData.path : null,
        imageType: imageData ? imageData.type : null,
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

// Update existing post's image
async function updatePostImage(postId, newFile) {
    try {
        // Get existing post data
        const postRef = db.collection('posts').doc(postId);
        const postDoc = await postRef.get();
        
        if (!postDoc.exists) {
            throw new Error('Post not found');
        }
        
        const postData = postDoc.data();
        
        // Delete old image if it exists
        if (postData.imagePath) {
            const oldImageRef = ref(storage, postData.imagePath);
            await deleteObject(oldImageRef);
        }
        
        // Upload new image
        if (newFile) {
            const imageData = await uploadImage(newFile);
            
            // Update post with new image data
            await postRef.update({
                imageUrl: imageData.url,
                imagePath: imageData.path,
                imageType: newFile.type
            });
            
            return imageData;
        }
        
        // If no new file, clear image data
        await postRef.update({
            imageUrl: null,
            imagePath: null,
            imageType: null
        });
        
        return null;
    } catch (error) {
        console.error("Error updating post image:", error);
        throw error;
    }
}

// Get post with image URL
async function getPostWithImage(postId) {
    try {
        const postRef = db.collection('posts').doc(postId);
        const postDoc = await postRef.get();
        
        if (!postDoc.exists) {
            throw new Error('Post not found');
        }
        
        const postData = postDoc.data();
        
        // If post has an image, get the download URL
        if (postData.imagePath) {
            const imageRef = ref(storage, postData.imagePath);
            postData.imageUrl = await getDownloadURL(imageRef);
        }
        
        return { id: postDoc.id, ...postData };
    } catch (error) {
        console.error("Error getting post with image:", error);
        throw error;
    }
}

export {
    saveUser,
    savePost,
    saveComment,
    deletePost,
    uploadImage,
    uploadImageWithProgress,
    updatePostImage,
    getPostWithImage
};