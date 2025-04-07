// Sección 5 – Exportación de Datos
import { useState } from "react";
import * as XLSX from "xlsx";

export default function Seccion5() {
  const reservas = [
    { nombre: "Martín Pérez", fecha: "2025-04-06", turno: "19:00", personas: 2, alergia: "" },
    { nombre: "Lucía Gómez", fecha: "2025-04-06", turno: "20:00", personas: 4, alergia: "Frutos secos" },
    { nombre: "Nico Sosa", fecha: "2025-04-07", turno: "21:00", personas: 2, alergia: "" },
  ];

  const exportarExcel = (tipo) => {
  const data = [
    ["Nombre", "Fecha", "Turno", "Personas", "Alergia o Restricción"]
  ];

  let reservasFiltradas = reservas;
  const hoy = new Date("2025-04-06"); // simulado

  if (tipo === "hoy") {
    reservasFiltradas = reservas.filter(r => r.fecha === "2025-04-06");
  }

  if (tipo === "mes_actual") {
    reservasFiltradas = reservas.filter(r => {
      const fecha = new Date(r.fecha);
      return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
    });
  }

  if (tipo === "todas") {
    reservasFiltradas = reservas;
  }

  reservasFiltradas.forEach(r => {
    data.push([r.nombre, r.fecha, r.turno, r.personas, r.alergia || "-"]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reservas");

  let fileName = "reservas.xlsx";
  if (tipo === "hoy") fileName = "reservas_hoy.xlsx";
  if (tipo === "mes_actual") fileName = "reservas_mes_actual.xlsx";
  if (tipo === "todas") fileName = "todas_las_reservas.xlsx";

  XLSX.writeFile(wb, fileName);
};

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>📤 Exportación de Datos</h1>

      <div style={estilos.card}>
        <p style={estilos.intro}>Desde aquí podés descargar los archivos con los datos de las reservas.</p>
        <button style={estilos.botonExportar} onClick={() => exportarExcel("hoy")}>
          📥 Descargar reservas del día
        </button>
        <button style={estilos.botonExportar} onClick={() => exportarExcel("mes_actual")}>
          📅 Descargar reservas del mes actual
        </button>
        <button style={estilos.botonExportar} onClick={() => exportarExcel("todas")}>
          📦 Descargar todas las reservas
        </button>
      </div>

      <button style={estilos.botonVolver} onClick={() => window.location.href = '/admin/seccion1'}>
        🔙 Volver al Panel Principal
      </button>
    </div>
  );
}

const estilos = {
  contenedor: {
    backgroundColor: "#0A1034",
    color: "#EFE4CF",
    minHeight: "100vh",
    padding: "2rem",
    fontFamily: "serif",
  },
  titulo: {
    fontSize: "2rem",
    marginBottom: "1.5rem",
    textAlign: "center",
    color: "#D3C6A3",
  },
  card: {
    backgroundColor: "#1C2340",
    padding: "1.5rem",
    borderRadius: "10px",
    boxShadow: "0 0 6px rgba(0,0,0,0.2)",
    textAlign: "center"
  },
  intro: {
    fontSize: "1rem",
    marginBottom: "1.5rem",
    color: "#EFE4CF",
  },
  botonExportar: {
    backgroundColor: "#D3C6A3",
    color: "#0A1034",
    border: "none",
    borderRadius: "10px",
    padding: "0.6rem 1.2rem",
    margin: "0.5rem",
    cursor: "pointer",
    fontSize: "1rem",
  },
  botonVolver: {
    backgroundColor: "#806C4F",
    color: "#EFE4CF",
    border: "none",
    borderRadius: "12px",
    padding: "0.6rem 1.2rem",
    cursor: "pointer",
    display: "block",
    margin: "2rem auto 0",
    fontSize: "1rem",
  },
};
