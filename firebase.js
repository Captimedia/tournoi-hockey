import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getDatabase, ref, onValue, get, set, update, push,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { firebaseConfig } from "./config.js?v=6f5832a0";

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export { ref, onValue, get, set, update, push, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged };
