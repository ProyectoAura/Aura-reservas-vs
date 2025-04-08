// pages/admin.js
import React, { useEffect } from "react";
import { useRouter } from "next/router";

export default function Admin() {
  const router = useRouter();

  // Protección: redirige al inicio si no está autorizado
  useEffect(() => {
    const autorizado = localStorage.getItem("adminAutorizado");
    if (autorizado !== "true") {
      router.push("/");
    }
  }, []);

  const secciones = [
    { nombre: "Información y Estadisticas diarias", ruta: "/admin/seccion1", emoji: "📊" },
    { nombre: "Gestión de reservas", ruta: "/admin/seccion2", emoji: "🗂️" },
    { nombre: "Turnos y horarios", ruta: "/admin/seccion3", emoji: "🕒" },
    { nombre: "Mesas y sectores", ruta: "/admin/seccion4", emoji: "🪑" },
    { nombre: "Exportación de datos", ruta: "/admin/seccion5", emoji: "📤" },
    { nombre: "Seguridad y usuarios", ruta: "/admin/seccion6", emoji: "🔐" },
  ];

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>📋 Panel de Administrador</h1>

      <button style={estilos.volver} onClick={() => router.push("/")}>⟵ Volver</button>

      <div style={estilos.lista}>
        {secciones.map((s, i) => (
          <button
            key={i}
            style={estilos.botonSeccion}
            onClick={() => router.push(s.ruta)}
          >
            {s.emoji} {s.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}

const estilos = {
  contenedor: {
    backgroundColor: "#0A1034",
    color: "#EFE4CF",
    minHeight: "100vh",
    padding: "2rem 1rem",
    fontFamily: "serif",
  },
  titulo: {
    fontSize: "2rem",
    marginBottom: "1.5rem",
    color: "#D3C6A3",
    textAlign: "center",
  },
  volver: {
    backgroundColor: "#806C4F",
    color: "#EFE4CF",
    border: "none",
    borderRadius: "12px",
    padding: "0.5rem 1.2rem",
    cursor: "pointer",
    marginBottom: "2rem",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
  },
  lista: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxWidth: "500px",
    margin: "0 auto",
  },
  botonSeccion: {
    backgroundColor: "#1C2340",
    color: "#D3C6A3",
    fontSize: "1.2rem",
    padding: "1rem",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
    textAlign: "left",
    boxShadow: "0 0 6px rgba(0,0,0,0.2)",
  },
};
