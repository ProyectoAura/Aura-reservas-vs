
import Head from "next/head";
import { useState } from "react";

export default function Home() {
  const [adminClave, setAdminClave] = useState("");

  const verificarClave = () => {
    if (adminClave === "adminaura") {
      window.location.href = "/admin";
    } else {
      alert("Clave incorrecta");
    }
  };

  return (
    <>
      <Head><title>AURA Rooftop</title></Head>
      <main className="min-h-screen bg-[#0A1034] text-white font-sans flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-[#D3C6A3] mb-8">AURA</h1>
          </div>
          <div className="grid gap-4">
            <a href="/reservas" className="w-full block bg-white/10 hover:bg-white/20 text-center py-4 rounded-xl text-white font-medium text-lg">📋 Reservas</a>
            <a href="/menu" className="w-full block bg-white/10 hover:bg-white/20 text-center py-4 rounded-xl text-white font-medium text-lg">🍽️ Menú</a>
            <div className="bg-white/10 rounded-xl p-4">
              <input type="password" placeholder="Clave admin" value={adminClave}
                onChange={(e) => setAdminClave(e.target.value)}
                className="w-full p-3 rounded-xl bg-white/20 text-white placeholder:text-white/60 border border-[#D3C6A3] mb-3" />
              <button type="button" onClick={verificarClave}
                className="w-full p-3 rounded-xl bg-[#806C4F] text-white font-semibold hover:bg-[#6f5b3f] transition">
                🛠️ Ingresar como Administrador
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
