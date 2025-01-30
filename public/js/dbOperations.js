// Utility functions for database operations

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

    const data = {
        title: postData.title,
        description: postData.description || '',
        city: postData.city,
        street: postData.street,
        image: postData.image || null,
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

// Convert image to hex
async function imageToHex(file) {
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
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Convert hex to data URL
function hexToDataURL(hexString, mimeType = 'image/jpeg') {
    const bytes = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
}

export default {
    saveUser,
    savePost,
    saveComment,
    imageToHex,
    hexToDataURL
};