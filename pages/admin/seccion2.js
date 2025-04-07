// Sección 2 - Gestión de Reservas
import { useState, useEffect } from "react";

export default function Seccion2() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarRestricciones, setMostrarRestricciones] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mostrarRestricciones");
      if (stored !== null) {
        setMostrarRestricciones(JSON.parse(stored));
      }
    }
  }, []);

  const [nuevaReserva, setNuevaReserva] = useState({ nombre: "", fecha: "", turno: "19:00", personas: 1, alergia: "" });
  const [reservas, setReservas] = useState([
    { id: 1, nombre: "Martín Pérez", turno: "19:00", personas: 2, fecha: "2025-04-06", alergia: "" },
    { id: 2, nombre: "Lucía Gómez", turno: "20:00", personas: 4, fecha: "2025-04-06", alergia: "Frutos secos" },
    { id: 3, nombre: "Nico Sosa", turno: "21:00", personas: 2, fecha: "2025-04-07", alergia: "" }
  ]);

  const turnos = [
    "19:00", "19:30", "20:00", "20:30", "21:00",
    "21:30", "22:00", "22:30", "23:00", "23:30",
    "00:00", "00:30", "01:00"
  ];

  const reservasFiltradas = fechaSeleccionada
    ? reservas.filter((res) => res.fecha === fechaSeleccionada)
    : reservas;

  const handleAgregarReserva = () => {
    if (nuevaReserva.id) {
      setReservas(reservas.map((r) => (r.id === nuevaReserva.id ? nuevaReserva : r)));
    } else {
      const nueva = {
        ...nuevaReserva,
        id: Date.now()
      };
      setReservas([...reservas, nueva]);
    }
    setNuevaReserva({ nombre: "", fecha: "", turno: "19:00", personas: 1 });
    setMostrarFormulario(false);
  };

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>🗂️ Gestión de Reservas</h1>
      <label style={{ display: 'block', marginBottom: '1rem' }}>
        <input
          type="checkbox"
          checked={mostrarRestricciones}
          onChange={(e) => {
            setMostrarRestricciones(e.target.checked);
            localStorage.setItem("mostrarRestricciones", JSON.stringify(e.target.checked));
          }}
        /> Mostrar restricciones alimenticias/alergias
      </label>

      <div style={estilos.filtroBox}>
        <label htmlFor="fecha">📅 Filtrar por fecha: </label>
        <input
          type="date"
          id="fecha"
          value={fechaSeleccionada}
          onChange={(e) => setFechaSeleccionada(e.target.value)}
          style={estilos.input}
        />
      </div>

      <button onClick={() => setMostrarFormulario(!mostrarFormulario)} style={estilos.botonAgregar}>
        {mostrarFormulario ? "✖️ Cancelar" : "➕ Agregar nueva reserva"}
      </button>

      {mostrarFormulario && (
        <div style={estilos.formularioBox}>
          <input
            type="text"
            placeholder="Nombre"
            value={nuevaReserva.nombre}
            onChange={(e) => setNuevaReserva({ ...nuevaReserva, nombre: e.target.value })}
            style={estilos.input}
          />
          <input
            type="date"
            value={nuevaReserva.fecha}
            onChange={(e) => setNuevaReserva({ ...nuevaReserva, fecha: e.target.value })}
            style={estilos.input}
          />
          <select
            value={nuevaReserva.turno}
            onChange={(e) => setNuevaReserva({ ...nuevaReserva, turno: e.target.value })}
            style={estilos.input}
          >
            {turnos.map((turno) => (
              <option key={turno} value={turno}>{turno}</option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            value={nuevaReserva.personas}
            onChange={(e) => setNuevaReserva({ ...nuevaReserva, personas: parseInt(e.target.value) })}
            style={estilos.input}
          />
          <input
            type="text"
            placeholder="Alergias o restricciones"
            value={nuevaReserva.alergia}
            onChange={(e) => setNuevaReserva({ ...nuevaReserva, alergia: e.target.value })}
            style={estilos.input}
          />
          <button onClick={handleAgregarReserva} style={estilos.botonConfirmar}>💾 Guardar</button>
        </div>
      )}

      <table style={estilos.tabla}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Nombre</th>
            <th>Turno</th>
            <th>Personas</th>
            {mostrarRestricciones && <th>Restricciones</th>}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {reservasFiltradas.map((reserva) => (
            <tr key={reserva.id}>
              <td>{reserva.fecha}</td>
              <td>{reserva.nombre}</td>
              <td>{reserva.turno}</td>
              <td>{reserva.personas}</td>
              {mostrarRestricciones && <td>{reserva.alergia ? `⚠️ ${reserva.alergia}` : '-'}</td>}
              <td>
                <button
                  style={estilos.btnEditar}
                  onClick={() => {
                    setNuevaReserva(reserva);
                    setMostrarFormulario(true);
                  }}
                >✏️</button>
                <button
                  style={estilos.btnEliminar}
                  onClick={() => {
                    const confirmacion = window.confirm("¿Estás seguro que deseas eliminar esta reserva?");
                    if (confirmacion) {
                      setReservas(reservas.filter((r) => r.id !== reserva.id));
                    }
                  }}
                >🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button style={estilos.botonAlergias} onClick={() => window.location.href = '/admin/alergias'}>
        🥗 Alergias y Restricciones
      </button>
      <button style={estilos.botonVolver} onClick={() => window.location.href = '/admin'}>
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
  filtroBox: {
    marginBottom: "1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  formularioBox: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginBottom: "1.5rem",
    backgroundColor: "#1C2340",
    padding: "1rem",
    borderRadius: "8px",
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
    backgroundColor: "#1C2340",
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
    borderRadius: "4px",
  },
  botonAgregar: {
    backgroundColor: "#D3C6A3",
    color: "#0A1034",
    border: "none",
    borderRadius: "8px",
    padding: "0.5rem 1rem",
    marginBottom: "1rem",
    cursor: "pointer",
  },
  botonConfirmar: {
    backgroundColor: "#806C4F",
    color: "#EFE4CF",
    border: "none",
    borderRadius: "8px",
    padding: "0.5rem 1rem",
    cursor: "pointer",
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
  botonAlergias: {
    backgroundColor: "#D3C6A3",
    color: "#0A1034",
    border: "none",
    borderRadius: "12px",
    padding: "0.6rem 1.2rem",
    cursor: "pointer",
    display: "block",
    margin: "1rem auto 0",
    fontSize: "1rem",
  },
};
