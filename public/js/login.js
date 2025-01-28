// send back to signup page
function initializeLoginListeners() {
  const signupRedirect = document.getElementById('signup-redirect');
  const loginButton = document.getElementById('login');

  if (signupRedirect) {
    signupRedirect.addEventListener("click", function () {
      window.location.href = '/';
    });
  }

  if (loginButton) {
    loginButton.addEventListener("click", function (event) {
      event.preventDefault();

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      // input validation
      if (!email || !password) {
        alert("Please fill out all fields.");
        return;
      }

      firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          window.location.href = '/app/html/Landing.html';
        })
        .catch((error) => {
          const errorMessage = error.message;
          alert(errorMessage);
        });
    });
  }
}

// Initialize listeners when the script loads
initializeLoginListeners();

// Re-initialize listeners when the router loads new content
window.addEventListener('router-content-loaded', initializeLoginListeners);
