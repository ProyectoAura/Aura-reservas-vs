// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCqRltuLUOQIIZa4T2krSvt7-9gXk8NIE0",
  authDomain: "aurareservas.firebaseapp.com",
  projectId: "aurareservas",
  storageBucket: "aurareservas.appspot.com",
  messagingSenderId: "680573619931",
  appId: "1:680573619931:web:6689e64d0276d2c63386fe"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
