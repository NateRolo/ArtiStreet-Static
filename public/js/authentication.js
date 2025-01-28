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
        submitButton.addEventListener("click", function (event) {
            event.preventDefault();

            const userHandle = document.getElementById('userHandle').value;

            // Notify the user about the permanence of the user handle
            const confirmation = confirm(
                `Heads up! The user handle "${userHandle}" is permanent and cannot be changed later. Are you sure you want to proceed?`
            );
            if (confirmation) {
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const username = document.getElementById('username').value;
                

                // input validation
                if (!email || !password || !username || !userHandle) {
                    alert("Please fill out all fields.");
                    return;
                }

                // Sign up 
                firebase.auth().createUserWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        const user = userCredential.user;


                        return db.collection("users").doc(user.uid).set({
                            userID: user.uid,
                            email: user.email,
                            username: username,
                            userHandle: userHandle,
                        });
                    })
                    .then(() => {
                        window.location.href = '/app/html/Landing.html';
                    })
                    .catch((error) => {
                        const errorMessage = error.message;
                        alert(errorMessage);
                    });
            }
        });
    }
}

// Initialize listeners when the script loads
initializeAuthListeners();

// Re-initialize listeners when the router loads new content
window.addEventListener('router-content-loaded', initializeAuthListeners);
