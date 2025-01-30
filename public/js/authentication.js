// Add import at the top of the file
import dbOperations from './dbOperations.js';

// Add this at the start of the file
console.log("Firestore instance:", db);
console.log("Auth instance:", firebase.auth());

// Wrap all event listeners in a function that we can call after DOM loads
function initializeAuthListeners() {
    const loginRedirect = document.getElementById('login-redirect');
    const userHandle = document.getElementById('userHandle');
    const submitButton = document.getElementById('submit');

    if (loginRedirect) {
        loginRedirect.addEventListener("click", function () {
            window.location.href = '/app/html/login.html';
        });
    }

    if (userHandle) {
        userHandle.addEventListener("focus", () => {
            const message = document.getElementById("userHandleMessage");
            if (message) message.style.display = "block";
        });

        userHandle.addEventListener("blur", () => {
            const message = document.getElementById("userHandleMessage");
            if (message) message.style.display = "none";
        });
    }

    if (submitButton) {
        submitButton.addEventListener("click", async function (event) {
            event.preventDefault();
            try {
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const username = document.getElementById('username').value;
                const userHandle = document.getElementById('userHandle').value;

                console.log("Attempting to create user:", email);
                await handleSignUp(email, password, username, userHandle);
            } catch (error) {
                console.error("Error in sign up:", error);
                alert(error.message);
            }
        });
    }
}

async function handleSignUp(email, password, username, userHandle) {
    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Create user document with proper structure
        await dbOperations.saveUser(user, {
            username: username,
            userHandle: userHandle,
            bio: '',
            profilePicture: null
        });

        window.location.href = '/app/html/Landing.html';
    } catch (error) {
        console.error("Error in sign up:", error);
        throw error;
    }
}

// Initialize listeners when the script loads
initializeAuthListeners();

// Re-initialize listeners when the router loads new content
window.addEventListener('router-content-loaded', initializeAuthListeners);
