
import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import * as XLSX from "xlsx";

export default function Admin() {
  const [reservas, setReservas] = useState([]);
  const [vista, setVista] = useState("principal");

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

  const descargarBaseCompleta = () => {
    const worksheet = XLSX.utils.json_to_sheet(reservas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Base Completa");
    XLSX.writeFile(workbook, "base_completa.xlsx");
  };

  if (vista === "principal") {
    return (
      <main className="min-h-screen bg-[#0A1034] text-white p-6 font-sans">
        <h1 className="text-4xl text-center text-[#D3C6A3] font-bold mb-6">Panel Principal</h1>
        <div className="grid gap-4 max-w-md mx-auto">
          <button onClick={() => setVista("reservas")} className="bg-white/10 hover:bg-white/20 p-4 rounded-xl">📋 Reservas</button>
          <button onClick={() => setVista("menu")} className="bg-white/10 hover:bg-white/20 p-4 rounded-xl">🍽️ Menú</button>
          <button onClick={() => setVista("admin")} className="bg-white/10 hover:bg-white/20 p-4 rounded-xl">🛠️ Ingresar como Administrador</button>
        </div>
      </main>
    );
  }

  if (vista === "menu") {
    return (
      <main className="min-h-screen bg-[#0A1034] text-white p-6 font-sans">
        <button onClick={() => setVista('principal')} className="text-[#D3C6A3] mb-4">← Volver</button>
        <h2 className="text-2xl text-center mb-4">📝 Gestión del Menú</h2>
        <p className="text-center">Próximamente se podrá editar precios y platos desde aquí.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A1034] text-white p-6 font-sans">
      <button onClick={() => setVista('principal')} className="text-[#D3C6A3] mb-2">← Volver</button>
      <h1 className="text-3xl text-center text-[#D3C6A3] mb-6 font-semibold">Panel del Administrador</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto mb-6">
        <button onClick={() => setVista("ver")} className="bg-white/10 hover:bg-white/20 py-3 rounded-xl">Ver Reservas</button>
        <button onClick={descargarExcel} className="bg-white/10 hover:bg-white/20 py-3 rounded-xl">Descargar Excel Diario</button>
        <button onClick={() => setVista("bloquear")} className="bg-white/10 hover:bg-white/20 py-3 rounded-xl">Bloquear Horarios</button>
        <button onClick={() => setVista("turnos")} className="bg-white/10 hover:bg-white/20 py-3 rounded-xl">Crear Turnos</button>
        <button onClick={() => setVista("estadisticas")} className="bg-white/10 hover:bg-white/20 py-3 rounded-xl">Estadísticas</button>
        <button onClick={descargarBaseCompleta} className="bg-white/10 hover:bg-white/20 py-3 rounded-xl">Descargar Base Completa</button>
      </div>

      {vista === "ver" && (
        <div className="overflow-x-auto bg-[#121212] rounded-xl p-4 border border-[#2c2c2c]">
          <table className="table-auto w-full text-sm">
            <thead className="text-[#D3C6A3] border-b border-[#333]">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Horario</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">DNI</th>
                <th className="px-3 py-2">Teléfono</th>
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
      )}
    </main>
  );
}
