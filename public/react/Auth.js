import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    onIdTokenChanged,
} from "firebase/auth";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

import CORE from "./core";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyB7-6qAgnl-fLc2NkwL463Sp7bEMEvojdQ",
    authDomain: "timesheet-manager-ad983.firebaseapp.com",
    projectId: "timesheet-manager-ad983",
    storageBucket: "timesheet-manager-ad983.appspot.com",
    messagingSenderId: "729457268485",
    appId: "1:729457268485:web:c4296679005d6eb511896c",
    measurementId: "G-53KYLHF60T",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const provider = new GoogleAuthProvider();

const auth = getAuth();

const popupSignInProcedure = () => {
    signInWithPopup(auth, provider)
        .then((result) => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            // The signed-in user info.
            const user = result.user;

            console.log(user);
            // ...
        })
        .catch((error) => {
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            // The email of the user's account used.
            const email = error.customData.email;
            // The AuthCredential type that was used.
            const credential = GoogleAuthProvider.credentialFromError(error);
            // ...
        });
};

// onIdTokenChanged(function (user) {
//     if (user) {
//         // Reassign token
//         console.log(user);
//     }
// });

// Observer for auth data change
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("USER")
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User

        CORE.UI.setup(user);
    } else {
        console.log("NO USER")
        // User is signed out
        // ...
        // show login screen
        // popupSignInProcedure();
        CORE.UI.showAuthModal();
        CORE.UI.renderUsername("JohnDoe@gmail.com");
        CORE.UI.hideLogoutBtn();
        CORE.UI.blurBackground();
        CORE.UI.clear();
        // TODO reroute to /login and do popupSignInProcedure() there.
    }
});

$("#logout").on("click", (e) => {
    e.preventDefault();

    auth.signOut().then(
        function () {
            console.log("Signed Out");
        },
        function (error) {
            console.error("Sign Out Error", error);
        }
    );
});

$("body").on("click", "#googleLoginBtn", (e) => {
    popupSignInProcedure();
})

// onIdTokenChanged(auth, (user) => {
//     if (user) {
//         console.log(user);
//     }
// });

export { auth, app };
