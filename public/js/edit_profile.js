
// get logged in user data
function getUserData() {
    const user = auth.currentUser;
    if (user) {
        db.collection('users').doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                document.getElementById('usernameInput').value = doc.data().username || '';
                document.getElementById('bioInput').value = doc.data().bio || '';
                if (doc.data().profilePicture) {
                    document.getElementById('profilePicture').src = doc.data().profilePicture;
                }
            } else {
                console.error("No user data found.");
            }
        }).catch(error => {
            console.error("Error fetching user data: ", error);
        });
    } else {
        console.error("No user is currently signed in.");
        alert("You need to be signed in to view this page.");
        window.location.href = "/html/login.html"; // Redirect to sign-in page
    }
}

// update username and bio to firestore
document.getElementById('editProfileForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const username = document.getElementById('usernameInput').value;
    const bio = document.getElementById('bioInput').value;
    const user = auth.currentUser;

    if (user) {
        db.collection('users').doc(user.uid).update({
            username: username,
            bio: bio
        })
            .then(function () {
                alert('Profile updated successfully!');
            })
            .catch(function (error) {
                console.error('Error updating profile: ', error);
                alert('Failed to update profile. Please try again.');
            });
    }
});

// change profile picture, update to firestore
document.getElementById('profilePictureInput').addEventListener('change', function (e) {
    const user = auth.currentUser;
    if (!user) {
        alert("Please sign in to upload a profile picture.");
        return;
    }

    const file = e.target.files[0];
    if (file) {
        const storageRef = firebase.storage().ref('profile_pictures/' + user.uid + '.jpg');
        storageRef.put(file).then(function (snapshot) {
            return snapshot.ref.getDownloadURL();
        }).then(function (url) {
            document.getElementById('profilePicture').src = url;
            db.collection('users').doc(user.uid).update({ profilePicture: url })
                .then(() => {
                    console.log('Profile picture URL saved to Firestore.');
                })
                .catch(error => {
                    console.error('Error saving profile picture URL: ', error);
                });
        }).catch(function (error) {
            console.error('Error uploading profile picture: ', error);
            alert('Failed to upload profile picture. Please try again.');
        });
    }
});

window.onload = getUserData;