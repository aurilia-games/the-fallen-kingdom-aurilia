
/* =====================================================
   THE FALLEN KINGDOM: AURILIA
   FIREBASE CONFIGURATION
===================================================== */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAVNDhxpAFOKh964A2Zb0cvIuCp9tUeQ_8",
  authDomain: "aurilia-leaderboard.firebaseapp.com",
  projectId: "aurilia-leaderboard",
  storageBucket: "aurilia-leaderboard.firebasestorage.app",
  messagingSenderId: "337326477242",
  appId: "1:337326477242:web:a306e978e4642cae4fd783",
  measurementId: "G-HETDVBZ0GM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

// Restore existing session, or sign in anonymously.
const authReady = new Promise((resolve, reject) => {
  const unsubscribe = onAuthStateChanged(
    auth,
    async user => {
      unsubscribe();

      try {
        const currentUser = user ||
          (await signInAnonymously(auth)).user;

        console.log(
          "Aurilia Firebase connected successfully!"
        );

        resolve(currentUser);
      } catch (error) {
        console.error(
          "Aurilia Firebase authentication failed:",
          error
        );
        reject(error);
      }
    },
    error => {
      unsubscribe();
      reject(error);
    }
  );
});

// Teacher Google Sign-In
async function signInTeacher() {
  await authReady;

  const result = await signInWithPopup(
    auth,
    googleProvider
  );

  return result.user;
}

// Sign out and restore a guest session.
async function signOutTeacher() {
  await signOut(auth);

  const result = await signInAnonymously(auth);
  return result.user;
}

export {
  app,
  db,
  auth,
  authReady,
  signInTeacher,
  signOutTeacher
};
