
import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import * as XLSX from "xlsx";

export default function Admin() {
  const [reservas, setReservas] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      const q = query(collection(db, "reservas"), orderBy("fecha", "asc"), orderBy("horario", "asc"));
      const snapshot = await getDocs(q);
      const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReservas(datos);
    };
    cargar();
  }, []);

  const descargarExcel = () => {
    const hoy = new Date().toISOString().split("T")[0];
    const filtradas = reservas.filter(r => r.fecha === hoy);
    const worksheet = XLSX.utils.json_to_sheet(filtradas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reservas");
    XLSX.writeFile(workbook, `reservas_${hoy}.xlsx`);
  };

  return (
    <main className="min-h-screen bg-[#0A1034] text-white p-6 font-sans">
      <h1 className="text-3xl text-center text-[#D3C6A3] mb-4 font-semibold">Panel del Administrador</h1>
      <button onClick={descargarExcel} className="bg-[#806C4F] px-4 py-2 rounded mb-4 hover:bg-[#6f5b3f]">
        Descargar Excel Diario
      </button>
      <div className="overflow-x-auto bg-[#121212] rounded-xl p-4 border border-[#2c2c2c]">
        <table className="table-auto w-full text-sm">
          <thead className="text-[#D3C6A3] border-b border-[#333]">
            <tr>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Horario</th>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">DNI</th>
              <th className="px-3 py-2 text-left">Teléfono</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map(r => (
              <tr key={r.id} className="border-b border-[#2a2a2a] hover:bg-[#1d1d1d]">
                <td className="px-3 py-2">{r.fecha}</td>
                <td className="px-3 py-2">{r.horario}</td>
                <td className="px-3 py-2">{r.nombre}</td>
                <td className="px-3 py-2">{r.dni}</td>
                <td className="px-3 py-2">{r.telefono}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
