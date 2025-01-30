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
    loginButton.addEventListener("click", async function (event) {
      event.preventDefault();
      try {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        console.log("Attempting login for:", email);
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        console.log("Login successful:", userCredential.user.uid);

        window.location.href = '/app/html/Landing.html';
      } catch (error) {
        console.error("Login error:", error);
        alert(error.message);
      }
    });
  }
}

// Initialize listeners when the script loads
initializeLoginListeners();

// Re-initialize listeners when the router loads new content
window.addEventListener('router-content-loaded', initializeLoginListeners);
