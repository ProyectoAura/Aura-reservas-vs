// Sección 5 – Alergias y Restricciones Alimentarias
import { useState } from "react";

export default function alergias() {
  const instrucciones = [
    "Si una reserva incluye una alergia o restricción, debe mostrarse resaltada en la Sección 2.",
    "El texto debe estar destacado (por ejemplo, fondo amarillo o rojo claro) y con un ícono de alerta ⚠️.",
    "Al visualizar la reserva, el sistema debe generar un cartel de aviso visible para el mozo al recibir al cliente.",
    "Estas observaciones NO deben pasarse por alto ni quedar ocultas entre los demás datos."
  ];

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>🥗 Alergias y Restricciones</h1>

      <div style={estilos.card}>
        <p style={estilos.intro}>Las restricciones alimentarias deben ser visiblemente destacadas en las reservas, para prevenir errores y cuidar al cliente.</p>
        <ul>
          {instrucciones.map((item, i) => (
            <li key={i} style={estilos.item}>⚠️ {item}</li>
          ))}
        </ul>
        <p style={estilos.final}>Esta sección sirve como guía de implementación para todas las reservas que incluyan comentarios de este tipo.</p>
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
  },
  intro: {
    fontSize: "1rem",
    marginBottom: "1rem",
    color: "#EFE4CF",
  },
  item: {
    marginBottom: "0.5rem",
    fontSize: "0.95rem",
  },
  final: {
    marginTop: "1.5rem",
    fontStyle: "italic",
    color: "#D3C6A3",
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
