// pages/admin/seccion1.js
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { collection, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function Seccion1() {
  const [edadMinima, setEdadMinima] = useState(21);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("activas");
  const [reservas, setReservas] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [reservaEditada, setReservaEditada] = useState({});

  useEffect(() => {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const hoyStr = `${yyyy}-${mm}-${dd}`;
    setFechaDesde(hoyStr);
    setFechaHasta(hoyStr);
  }, []);

  useEffect(() => {
    const obtenerReservas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "reservas"));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReservas(data);
      } catch (error) {
        console.error("Error al obtener reservas:", error);
      }
    };
    obtenerReservas();
  }, []);

  const obtenerEstado = (fechaReserva) => {
    const hoy = new Date();
    const [a, m, d] = fechaReserva.split("-");
    const fecha = new Date(`${a}-${m}-${d}`);
    if (fecha < new Date(hoy.toDateString())) return "cumplida";
    return "activa";
  };

  const reservasFiltradas = reservas.filter(r => {
    const estado = obtenerEstado(r.fecha);
    const matchFecha = (!fechaDesde || r.fecha >= fechaDesde) && (!fechaHasta || r.fecha <= fechaHasta);
    const matchEstado = filtroEstado === "todas" || r.estado === filtroEstado || estado === filtroEstado;
    return matchFecha && matchEstado;
  });

  const turnosIniciales = {
    "19:00": 15, "19:30": 15, "20:00": 15, "20:30": 15, "21:00": 15,
    "21:30": 15, "22:00": 15, "22:30": 15, "23:00": 15, "23:30": 15,
    "00:00": 15, "00:30": 15, "01:00": 15
  };

  const [turnosDisponibles, setTurnosDisponibles] = useState(turnosIniciales);

  const personasPorTurno = reservasFiltradas.reduce((acc, r) => {
    acc[r.horario] = (acc[r.horario] || 0) + r.personas;
    return acc;
  }, {});

  const totalReservas = reservasFiltradas.reduce((acc, r) => acc + r.personas, 0);
  const maxReservas = Object.values(turnosDisponibles).reduce((a, b) => a + b, 0);
  const porcentajeOcupacion = ((totalReservas / maxReservas) * 100).toFixed(1);

  const exportarExcel = () => {
  const data = [["Turno", "Capacidad", "Reservado", "Fecha", "Sector"]];
  reservasFiltradas.forEach((reserva) => {
    const turno = reserva.horario;
    const capacidad = turnosDisponibles[turno] || 0;
    const reservado = personasPorTurno[turno] || 0;
    const fecha = reserva.fecha || "-";
    const sector = reserva.sector || "-";
    data.push([turno, capacidad, reservado, fecha, sector]);
  });
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reservas");
  XLSX.writeFile(wb, "reservas_dia_actual.xlsx");
};

  const handleCambioTurno = (turno, valor) => {
    const nuevoValor = parseInt(valor);
    if (!isNaN(nuevoValor)) {
      setTurnosDisponibles({ ...turnosDisponibles, [turno]: nuevoValor });
    }
  };

  const editarReserva = (reserva) => {
    setEditandoId(reserva.id);
    setReservaEditada({ nombre: reserva.nombre, horario: reserva.horario, personas: reserva.personas });
  };

  const guardarReserva = async (id) => {
    try {
      const ref = doc(db, "reservas", id);
      await updateDoc(ref, reservaEditada);
      setReservas(reservas.map(r => r.id === id ? { ...r, ...reservaEditada } : r));
      setEditandoId(null);
      setReservaEditada({});
    } catch (e) {
      console.error("Error al guardar:", e);
    }
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setReservaEditada({});
  };

  const eliminarReserva = async (id) => {
    try {
      await deleteDoc(doc(db, "reservas", id));
      setReservas(reservas.filter(r => r.id !== id));
    } catch (e) {
      console.error("Error al eliminar:", e);
    }
  };

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>📊 Panel de Administrador</h1>

      <div style={estilos.statsBox}>
        <p>🔢 <strong>Total de reservas:</strong> {reservasFiltradas.length} 👬 <strong>Total de personas:</strong> {totalReservas}</p>
        <p>📈 <strong>Ocupación actual:</strong> {porcentajeOcupacion}%</p>
        <div style={{ marginTop: "1rem" }}>
          <label htmlFor="edad">🔞 Edad mínima requerida: </label>
          <input id="edad" type="number" value={edadMinima} onChange={(e) => setEdadMinima(Number(e.target.value))} style={estilos.input} />
        </div>
        <div style={{ marginTop: "1rem", display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label htmlFor="fechaDesde">📅 Desde: </label>
            <input id="fechaDesde" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={estilos.input} />
          </div>
          <div>
            <label htmlFor="fechaHasta">📅 Hasta: </label>
            <input id="fechaHasta" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={estilos.input} />
          </div>
          <div>
            <label htmlFor="estado">📌 Estado: </label>
            <select id="estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={estilos.input}>
              <option value="activas">Activas</option>
              <option value="cumplida">Cumplidas</option>
              <option value="cancelada">Canceladas</option>
              <option value="todas">Todas</option>
            </select>
          </div>
        </div>
      </div>

      <div style={estilos.statsBox}>
        <h3 style={estilos.subtitulo}>🕒 Turnos disponibles:</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {Object.keys(turnosDisponibles).map((turno) => (
            <li key={turno} style={{ marginBottom: "0.5rem" }}>
              <strong>{turno} hs:</strong>
              <input type="number" value={turnosDisponibles[turno]} onChange={(e) => handleCambioTurno(turno, e.target.value)} style={{ ...estilos.input, width: "60px", marginLeft: "0.5rem" }} /> lugares / {turnosDisponibles[turno] - (personasPorTurno[turno] || 0)} disponibles
            </li>
          ))}
        </ul>
      </div>

      <div style={estilos.statsBox}>
        <h3 style={estilos.subtitulo}>📋 Reservas del día:</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={estilos.tabla}>
            <thead>
  <tr style={estilos.encabezadoTabla}>
    <th>Nombre</th>
    <th>Turno</th>
    <th>Fecha</th>
    <th>Personas</th>
    <th>Sector</th>
    <th>Acciones</th>
  </tr>
</thead>
            <tbody>
  {reservasFiltradas.map((reserva) => (
    <tr key={reserva.id}>
      <td style={estilos.celda}>
        {editandoId === reserva.id ? (
          <input value={reservaEditada.nombre} onChange={(e) => setReservaEditada({ ...reservaEditada, nombre: e.target.value })} style={estilos.input} />
        ) : reserva.nombre}
      </td>
      <td style={estilos.celda}>
        {editandoId === reserva.id ? (
          <input value={reservaEditada.horario} onChange={(e) => setReservaEditada({ ...reservaEditada, horario: e.target.value })} style={estilos.input} />
        ) : reserva.horario}
      </td>
      <td style={estilos.celda}>{reserva.fecha}</td>
      <td style={estilos.celda}>
        {editandoId === reserva.id ? (
          <input type="number" value={reservaEditada.personas} onChange={(e) => setReservaEditada({ ...reservaEditada, personas: parseInt(e.target.value) })} style={estilos.input} />
        ) : reserva.personas}
      </td>
      <td style={estilos.celda}>{reserva.sector || "-"}</td>
      <td style={estilos.celda}>
        {editandoId === reserva.id ? (
          <>
            <button onClick={() => guardarReserva(reserva.id)} style={estilos.btnEditar}>💾</button>
            <button onClick={cancelarEdicion} style={estilos.btnEliminar}>❌</button>
          </>
        ) : (
          <>
            <button onClick={() => editarReserva(reserva)} style={estilos.btnEditar}>✏️</button>
            <button onClick={() => eliminarReserva(reserva.id)} style={estilos.btnEliminar}>🗑️</button>
          </>
        )}
      </td>
    </tr>
  ))}
</tbody>
          </table>
        </div>
      </div>

      <button onClick={exportarExcel} style={estilos.botonExportar}>📥 Descargar Excel del día</button>
      <button style={estilos.botonVolver} onClick={() => window.location.href = '/admin'}>🔙 Volver al Panel Principal</button>
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
  subtitulo: {
    color: "#D3C6A3",
    marginBottom: "1rem",
    fontSize: "1.2rem",
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
  encabezadoTabla: {
    backgroundColor: "#EFE4CF",
    color: "#0A1034",
    fontWeight: "bold",
  },
  celda: {
    borderBottom: "1px solid #ccc",
    padding: "0.5rem",
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
