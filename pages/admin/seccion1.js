// pages/admin/seccion1.js
import { useState } from "react";
import * as XLSX from "xlsx";

export default function Seccion1() {
  const [edadMinima, setEdadMinima] = useState(21);

  const turnosIniciales = {
    "19:00": 15,
    "19:30": 15,
    "20:00": 15,
    "20:30": 15,
    "21:00": 15,
    "21:30": 15,
    "22:00": 15,
    "22:30": 15,
    "23:00": 15,
    "23:30": 15,
    "00:00": 15,
    "00:30": 15,
    "01:00": 15
  };

  const [turnosDisponibles, setTurnosDisponibles] = useState(turnosIniciales);

  // Simulamos reservas (serán dinámicas en el futuro con Firebase)
  const reservas = [
    { id: 1, nombre: "Martín Pérez", turno: "19:00", personas: 2 },
    { id: 2, nombre: "Lucía Gómez", turno: "20:00", personas: 4 }
  ];

  // Calcula cuántas personas hay por turno
  const personasPorTurno = reservas.reduce((acc, r) => {
    acc[r.turno] = (acc[r.turno] || 0) + r.personas;
    return acc;
  }, {});

  const totalReservas = reservas.reduce((acc, r) => acc + r.personas, 0);
  const maxReservas = Object.values(turnosDisponibles).reduce((a, b) => a + b, 0);
  const porcentajeOcupacion = ((totalReservas / maxReservas) * 100).toFixed(1);

  const exportarExcel = () => {
    const data = [["Turno", "Capacidad", "Reservado"]];
    for (const turno in turnosDisponibles) {
      data.push([turno, turnosDisponibles[turno], personasPorTurno[turno] || 0]);
    }
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reservas");
    XLSX.writeFile(wb, "reservas_dia_actual.xlsx");
  };

  const handleCambioTurno = (turno, valor) => {
    const nuevoValor = parseInt(valor);
    if (!isNaN(nuevoValor)) {
      setTurnosDisponibles({
        ...turnosDisponibles,
        [turno]: nuevoValor
      });
    }
  };

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>📊 Panel de Administrador</h1>

      <div style={estilos.statsBox}>
        <p>🔢 <strong>Total de reservas hoy:</strong> {reservas.length} 👬 <strong>Total de personas hoy:</strong> {totalReservas}</p>
        <p>📈 <strong>Ocupación actual:</strong> {porcentajeOcupacion}%</p>
        <div style={{ marginTop: "1rem" }}>
          <label htmlFor="edad">🔞 Edad mínima requerida: </label>
          <input
            id="edad"
            type="number"
            value={edadMinima}
            onChange={(e) => setEdadMinima(Number(e.target.value))}
            style={estilos.input}
          />
        </div>
      </div>

      <div style={estilos.statsBox}>
        <h3 style={{ color: "#D3C6A3" }}>🕒 Turnos disponibles:</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {Object.keys(turnosDisponibles).map((turno) => (
            <li key={turno} style={{ marginBottom: "0.5rem" }}>
              {turno} hs:
              <input
                type="number"
                value={turnosDisponibles[turno]}
                onChange={(e) => handleCambioTurno(turno, e.target.value)}
                style={{ ...estilos.input, width: "60px", marginLeft: "0.5rem" }}
              /> lugares / {turnosDisponibles[turno] - (personasPorTurno[turno] || 0)} disponibles
            </li>
          ))}
        </ul>
      </div>

      <div style={estilos.statsBox}>
        <h3 style={{ color: "#D3C6A3" }}>📋 Reservas del día:</h3>
        <table style={estilos.tabla}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Turno</th>
              <th>Personas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map((reserva) => (
              <tr key={reserva.id}>
                <td>{reserva.nombre}</td>
                <td>{reserva.turno}</td>
                <td>{reserva.personas}</td>
                <td>
                  <button style={estilos.btnEditar}>✏️</button>
                  <button style={estilos.btnEliminar}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={exportarExcel} style={estilos.botonExportar}>
        📥 Descargar Excel del día
      </button>

      <button style={estilos.botonVolver} onClick={() => window.location.href = '/admin'}>
        🔙 Volver al Panel Principal
      </button>
    </div>
  );
}

const estilos = {
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
  contenedor: {
    backgroundColor: "#0A1034",
    color: "#EFE4CF",
    minHeight: "100vh",
    padding: "2rem",
    fontFamily: "serif",
  },
  titulo: {
    fontSize: "2rem",
    marginBottom: "2rem",
    textAlign: "center",
    color: "#D3C6A3",
  },
  statsBox: {
    backgroundColor: "#1C2340",
    padding: "1.5rem",
    borderRadius: "12px",
    boxShadow: "0 0 8px rgba(0,0,0,0.3)",
    marginBottom: "2rem",
  },
  input: {
    backgroundColor: "#EFE4CF",
    color: "#0A1034",
    borderRadius: "8px",
    padding: "0.4rem 0.6rem",
    border: "none",
  },
  tabla: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "1rem",
  },
  btnEditar: {
    marginRight: "0.5rem",
    cursor: "pointer",
    backgroundColor: "#D3C6A3",
    border: "none",
    padding: "4px",
    borderRadius: "4px",
  },
  btnEliminar: {
    cursor: "pointer",
    backgroundColor: "#806C4F",
    color: "white",
    border: "none",
    padding: "4px",
    borderRadius: "4px"
  },
  botonExportar: {
    backgroundColor: "#806C4F",
    color: "#EFE4CF",
    border: "none",
    borderRadius: "12px",
    padding: "0.6rem 1.5rem",
    cursor: "pointer",
    display: "block",
    margin: "2rem auto 0",
    fontSize: "1rem",
  },
};
