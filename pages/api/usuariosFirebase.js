import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

export default async function handler(req, res) {
  try {
    const querySnapshot = await getDocs(collection(db, "usuarios"));
    const usuarios = querySnapshot.docs.map((doc) => doc.data());
    res.status(200).json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
}
