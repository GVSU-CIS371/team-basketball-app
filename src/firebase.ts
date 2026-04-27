import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA_Jr8T0EQB4Ju4H9i44azpFyAMP2y0YIc",
  authDomain: "basketball-20987.firebaseapp.com",
  projectId: "basketball-20987",
  storageBucket: "basketball-20987.firebasestorage.app",
  messagingSenderId: "1036181877177",
  appId: "1:1036181877177:web:ebe8002790006993e1c668"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
