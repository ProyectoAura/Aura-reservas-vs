
import Head from "next/head";
import { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { enviarMailReserva } from "../lib/email";

export default function Home() {
  const [form, setForm] = useState({
    nombre: "", dni: "", nacimiento: "", email: "",
    telefono: "", restricciones: "", fecha: "", horario: ""
  });
  const [adminClave, setAdminClave] = useState("");
  const [accesoAdmin, setAccesoAdmin] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const guardarReserva = async () => {
    try {
      await addDoc(collection(db, "reservas"), {
        ...form,
        personas: 2,
        estado: "confirmada",
        creada_en: Timestamp.now()
      });
      await enviarMailReserva(form);
      alert("Reserva confirmada!");
      setForm({
        nombre: "", dni: "", nacimiento: "", email: "",
        telefono: "", restricciones: "", fecha: "", horario: ""
      });
    } catch (error) {
      console.error("Error al guardar la reserva:", error);
      alert("Error al guardar la reserva");
    }
  };

  const verificarClave = () => {
    if (adminClave === "adminaura") {
      setAccesoAdmin(true);
    } else {
      alert("Clave incorrecta");
    }
  };

  return (
    <>
      <Head>
        <title>AURA Rooftop</title>
      </Head>
      <main className="min-h-screen bg-[#0A1034] text-white font-sans flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-[#D3C6A3]">AURA</h1>
          </div>

          {!accesoAdmin ? (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); guardarReserva(); }}>
              <input className="w-full p-3 rounded-xl bg-[#EFE4CF] text-gray-700 placeholder:text-gray-600" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre y Apellido" />
              <input className="w-full p-3 rounded-xl bg-[#EFE4CF] text-gray-700 placeholder:text-gray-600" name="dni" value={form.dni} onChange={handleChange} placeholder="DNI" />

              <label className="block text-sm text-[#D3C6A3]">Fecha de nacimiento</label>
              <input className="w-full p-3 rounded-xl bg-[#EFE4CF] text-gray-700" name="nacimiento" value={form.nacimiento} onChange={handleChange} type="date" />

              <input className="w-full p-3 rounded-xl bg-[#EFE4CF] text-gray-700 placeholder:text-gray-600" name="email" value={form.email} onChange={handleChange} type="email" placeholder="Email" />
              <input className="w-full p-3 rounded-xl bg-[#EFE4CF] text-gray-700 placeholder:text-gray-600" name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" />
              <input className="w-full p-3 rounded-xl bg-[#EFE4CF] text-gray-700 placeholder:text-gray-600" name="restricciones" value={form.restricciones} onChange={handleChange} placeholder="Restricciones alimenticias / alergias" />

              <label className="block text-sm text-[#D3C6A3]">Fecha de reserva</label>
              <input className="w-full p-3 rounded-xl bg-[#EFE4CF] text-gray-700" name="fecha" value={form.fecha} onChange={handleChange} type="date" />

              <input className="w-full p-3 rounded-xl bg-[#EFE4CF] text-gray-700" name="horario" value={form.horario} onChange={handleChange} type="time" step="1800" placeholder="Horario" />
              <button type="submit" className="w-full p-3 rounded-xl bg-[#806C4F] text-white font-semibold hover:bg-[#6f5b3f] transition">
                Confirmar Reserva
              </button>

              <div className="pt-4">
                <input type="password" placeholder="Clave admin" value={adminClave} onChange={(e) => setAdminClave(e.target.value)} className="w-full p-3 rounded-xl bg-white/10 text-white placeholder:text-white/60 border border-[#D3C6A3]" />
                <button type="button" className="w-full mt-2 p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white" onClick={verificarClave}>
                  Ingresar como Admin
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <h2 className="text-center text-xl text-[#D3C6A3] font-semibold mb-2">Panel del Administrador</h2>
              <button className="w-full p-3 rounded-xl bg-white/10 hover:bg-white/20">Ver Reservas</button>
              <button className="w-full p-3 rounded-xl bg-white/10 hover:bg-white/20">Crear Turnos</button>
              <button className="w-full p-3 rounded-xl bg-white/10 hover:bg-white/20">Bloquear Horarios</button>
              <button className="w-full p-3 rounded-xl bg-white/10 hover:bg-white/20">Descargar Excel</button>
              <button className="w-full p-3 rounded-xl bg-white/10 hover:bg-white/20">Estadísticas</button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
