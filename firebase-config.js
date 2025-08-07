// firebase-config.js (Storage Removed)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDPF5B7fbg3winNofxXHNiRMHAmFoGSH0I",
  authDomain: "aichatbot-app-a98e0.firebaseapp.com",
  projectId: "aichatbot-app-a98e0",
  storageBucket: "aichatbot-app-a98e0.appspot.com",
  messagingSenderId: "464886714046",
  appId: "1:464886714046:web:9fe6d464c8b8ca2d4998ef",
  measurementId: "G-JZPW415069"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// REMOVED: Storage is no longer needed
// const storage = getStorage(app);

export { auth, db };