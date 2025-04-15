import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

export default async function handler(req, res) {
  try {
    const snapshot = await getDocs(collection(db, "usuarios"));
    const usuarios = snapshot.docs.map((doc) => doc.data());
    res.status(200).json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
}
