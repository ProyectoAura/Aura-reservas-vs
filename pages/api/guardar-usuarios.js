// pages/api/guardar-usuarios.js

import { db } from '../../lib/firebase';
import { collection, setDoc, doc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const usuarios = req.body;

    const batch = usuarios.map(async (usuario) => {
      const ref = doc(db, 'usuarios', usuario.id.toString());
      await setDoc(ref, usuario);
    });

    await Promise.all(batch);

    return res.status(200).json({ message: 'Usuarios guardados correctamente' });
  } catch (error) {
    console.error('Error guardando usuarios:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
}
