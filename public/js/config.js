//----------------------------------------
//  Your web app's Firebase configuration
//----------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyDc8PMogN8Ko7NZA7KWX53McY7nFzoNnKE",
    authDomain: "artistreet-4d6e2.web.app",
    projectId: "artistreet-4d6e2",
    messagingSenderId: "698245109532",
    appId: "1:309533548164:web:63b96a8b4e41c8faafacd1"
};

//--------------------------------------------
// initialize the Firebase app
// initialize Firestore database if using it
//--------------------------------------------
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();
