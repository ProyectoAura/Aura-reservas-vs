// firebase/firebaseConfig.js
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCqRltuLUOQIIZa4T2krSvt7-9gXk8NIE0",
  authDomain: "aurareservas.firebaseapp.com",
  projectId: "aurareservas",
  storageBucket: "aurareservas.appspot.com",
  messagingSenderId: "680573619931",
  appId: "1:680573619931:web:6689e64d0276d2c63386fe"
};

// ✅ Solo inicializa si no existe ya
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
