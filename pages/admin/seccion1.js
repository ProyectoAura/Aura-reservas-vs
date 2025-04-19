// pages/admin/seccion1.js
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
// <<< ¡ASEGÚRATE QUE ESTA IMPORTACIÓN SEA CORRECTA! >>>
// Si usas firebaseConfig.js en la raíz, debería ser:
import { db } from "../../firebaseConfig"; // <<< RUTA CORRECTA desde pages/admin/
// Si usas lib/firebase.js en la raíz:
// import { db } from "../../lib/firebase";
import { collection, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { Timestamp } from "firebase/firestore"; // <<< AÑADIDO: Importar Timestamp

export default function Seccion1() {
  const [edadMinima, setEdadMinima] = useState(21);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("activas");
  const [reservas, setReservas] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [reservaEditada, setReservaEditada] = useState({});
  const [loadingReservas, setLoadingReservas] = useState(true); // Estado de carga

  // Estado para turnos (definido una sola vez)
  const turnosIniciales = {
    "19:00": 15, "19:30": 15, "20:00": 15, "20:30": 15, "21:00": 15,
    "21:30": 15, "22:00": 15, "22:30": 15, "23:00": 15, "23:30": 15,
    "00:00": 15, "00:30": 15, "01:00": 15
  };
  const [turnosDisponibles, setTurnosDisponibles] = useState(turnosIniciales);

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
      setLoadingReservas(true); // Iniciar carga
      try {
        // <<< USA "reservasAura" >>>
        const querySnapshot = await getDocs(collection(db, "reservasAura"));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReservas(data);
        console.log("Reservas cargadas desde 'reservasAura':", data.length);
      } catch (error) {
        console.error("Error al obtener reservas:", error);
        setReservas([]); // Limpiar en caso de error
      } finally {
        setLoadingReservas(false); // Finalizar carga
      }
    };
    obtenerReservas();
  }, []); // Cargar solo al montar

  // Función obtenerEstado (versión robusta)
  const obtenerEstado = (fechaReserva) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Asegurar comparación solo por fecha
    try {
        // Intentar parsear la fecha (puede venir como string o Timestamp)
        let fecha;
        if (fechaReserva instanceof Date) {
            fecha = fechaReserva;
        } else if (typeof fechaReserva === 'string' && fechaReserva.includes('-')) {
            const parts = fechaReserva.split('-');
            // Usar Date.UTC para evitar problemas de timezone al crear la fecha
            fecha = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
        } else if (fechaReserva && typeof fechaReserva.toDate === 'function') { // Es un Timestamp de Firestore
            fecha = fechaReserva.toDate();
        } else {
            console.warn("Formato de fecha no reconocido en obtenerEstado:", fechaReserva);
            return "desconocido"; // Estado por defecto si la fecha es inválida
        }
        fecha.setUTCHours(0, 0, 0, 0); // Comparar fechas UTC

        if (fecha < hoy) return "cumplida";
        return "activa"; // Por defecto es activa si no es pasada

    } catch (e) {
        console.error("Error parseando fecha en obtenerEstado:", fechaReserva, e);
        return "desconocido";
    }
  };

  // Filtrado (usa la función obtenerEstado corregida)
  const reservasFiltradas = reservas.filter(r => {
    const estadoGuardado = r.estado || "confirmada"; // Usar estado guardado o 'confirmada' por defecto
    const estadoCalculado = obtenerEstado(r.fecha); // Calcular si es 'cumplida' o 'activa' por fecha

    let estadoFinalParaFiltrar = estadoGuardado;
    // Si está guardado como 'confirmada' pero la fecha ya pasó, tratarla como 'cumplida' para el filtro
    if (estadoGuardado === "confirmada" && estadoCalculado === "cumplida") {
        estadoFinalParaFiltrar = "cumplida";
    }
    // Si está guardada como 'activa' (o 'confirmada') y la fecha no ha pasado, es 'activa'
    if ((estadoGuardado === "confirmada" || estadoGuardado === "activa") && estadoCalculado === "activa") {
        estadoFinalParaFiltrar = "activa";
    }
    // Si está guardada como 'cancelada', se queda como 'cancelada'

    const matchFecha = (!fechaDesde || r.fecha >= fechaDesde) && (!fechaHasta || r.fecha <= fechaHasta);
    const matchEstado = filtroEstado === "todas" || estadoFinalParaFiltrar === filtroEstado;

    return matchFecha && matchEstado;
  });

  // Cálculos basados en reservasFiltradas (definidos una sola vez)
  const personasPorTurno = reservasFiltradas.reduce((acc, r) => { acc[r.horario] = (acc[r.horario] || 0) + (r.personas || 0); return acc; }, {});
  const totalReservas = reservasFiltradas.reduce((acc, r) => acc + (r.personas || 0), 0);
  const maxReservas = Object.values(turnosDisponibles).reduce((a, b) => a + b, 0);
  const porcentajeOcupacion = maxReservas > 0 ? ((totalReservas / maxReservas) * 100).toFixed(1) : "0.0";

  // Función exportarExcel (definida una sola vez)
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

  // Función handleCambioTurno (definida una sola vez)
  const handleCambioTurno = (turno, valor) => {
    const nuevoValor = parseInt(valor);
    if (!isNaN(nuevoValor)) {
      setTurnosDisponibles({ ...turnosDisponibles, [turno]: nuevoValor });
    }
  };

  // Funciones Editar, Guardar, Cancelar, Actualizar Estado, Eliminar (sin cambios en su lógica interna, pero usando "reservasAura")
  const editarReserva = (reserva) => {
    setEditandoId(reserva.id);
    setReservaEditada({
        nombre: reserva.nombre || "",
        horario: reserva.horario || "",
        personas: reserva.personas || 1,
        estado: reserva.estado || "confirmada"
    });
  };

  const guardarReserva = async (id) => {
    try {
      const ref = doc(db, "reservasAura", id);
      // Asegurar que el estado se guarde correctamente
      const datosParaGuardar = {
        nombre: reservaEditada.nombre,
        horario: reservaEditada.horario,
        personas: reservaEditada.personas,
        estado: reservaEditada.estado || "confirmada" // Default a confirmada si no hay estado
      };
      await updateDoc(ref, datosParaGuardar);
      setReservas(reservas.map(r => r.id === id ? { ...r, ...datosParaGuardar } : r));
      setEditandoId(null);
      setReservaEditada({});
      console.log("Reserva actualizada en 'reservasAura'");
    } catch (e) {
      console.error("Error al guardar:", e);
      alert("Error al guardar la reserva.");
    }
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setReservaEditada({});
  };

  const actualizarEstadoReserva = async (id, nuevoEstado) => {
    try {
      const ref = doc(db, "reservasAura", id);
      await updateDoc(ref, { estado: nuevoEstado });
      setReservas(prev => prev.map(r => r.id === id ? { ...r, estado: nuevoEstado } : r));
      console.log(`Estado de reserva ${id} actualizado a ${nuevoEstado} en 'reservasAura'`);
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      alert("Error al actualizar el estado.");
    }
  };

  const eliminarReserva = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar esta reserva?")) return;
    try {
      await deleteDoc(doc(db, "reservasAura", id));
      setReservas(reservas.filter(r => r.id !== id));
      console.log(`Reserva ${id} eliminada de 'reservasAura'`);
    } catch (e) {
      console.error("Error al eliminar:", e);
      alert("Error al eliminar la reserva.");
    }
  };

  // --- Renderizado ---
  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>📊 Panel de Administrador</h1>

      {/* Stats Box 1 */}
      <div style={estilos.statsBox}>
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

      {/* Stats Box 2 */}
      <div style={estilos.statsBox}>
        <h3 style={estilos.subtitulo}>🕒 Turnos disponibles:</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {Object.keys(turnosDisponibles).map((turno) => (
            <li key={turno} style={{ marginBottom: "0.5rem" }}>
              <strong>{turno} hs:</strong>
              <input type="number" value={turnosDisponibles[turno]} onChange={(e) => handleCambioTurno(turno, e.target.value)} style={{ ...estilos.input, width: "60px", marginLeft: "0.5rem" }} />
              lugares / {turnosDisponibles[turno] - (personasPorTurno[turno] || 0)} disponibles
            </li>
          ))}
        </ul>
      </div>

      {/* Stats Box 3 */}
      <div style={estilos.statsBox}>
        <h3 style={estilos.subtitulo}>📋 Reservas ({filtroEstado}):</h3>
        {loadingReservas ? (
          <p>Cargando reservas...</p>
        ) : reservasFiltradas.length === 0 ? (
          <p>No hay reservas que coincidan con los filtros.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={estilos.tabla}>
              <thead>
                <tr style={estilos.encabezadoTabla}>
                  <th>Nombre</th>
                  <th>Turno</th>
                  <th>Fecha</th>
                  <th>Personas</th>
                  <th>Sector</th>
                  <th>Estado</th>
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
                        <input type="number" value={reservaEditada.personas} onChange={(e) => setReservaEditada({ ...reservaEditada, personas: parseInt(e.target.value) || 0 })} style={estilos.input} />
                      ) : reserva.personas}
                    </td>
                    <td style={estilos.celda}>{reserva.sector || "-"}</td>
                    <td style={estilos.celda}>
                      {editandoId === reserva.id ? (
                        <select value={reservaEditada.estado} onChange={(e) => setReservaEditada({ ...reservaEditada, estado: e.target.value })} style={estilos.input}>
                          <option value="confirmada">Confirmada</option>
                          <option value="activa">Activa</option>
                          <option value="cumplida">Cumplida</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      ) : (reserva.estado || "confirmada")}
                    </td>
                    <td style={estilos.celda}>
                      {editandoId === reserva.id ? (
                        <>
                          <button onClick={() => guardarReserva(reserva.id)} style={estilos.btnEditar} title="Guardar">💾</button>
                          <button onClick={cancelarEdicion} style={estilos.btnEliminar} title="Cancelar">✖️</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => editarReserva(reserva)} style={estilos.btnEditar} title="Editar">✏️</button>
                          <button onClick={() => eliminarReserva(reserva.id)} style={estilos.btnEliminar} title="Eliminar">🗑️</button>
                          {(reserva.estado !== 'cumplida') && <button onClick={() => actualizarEstadoReserva(reserva.id, 'cumplida')} style={{...estilos.btnEditar, marginLeft: '5px'}} title="Marcar como Cumplida">✅</button>}
                          {(reserva.estado !== 'cancelada') && <button onClick={() => actualizarEstadoReserva(reserva.id, 'cancelada')} style={{...estilos.btnEliminar, marginLeft: '5px'}} title="Marcar como Cancelada">❌</button>}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Botones Exportar y Volver */}
      <button onClick={exportarExcel} style={estilos.botonExportar}>📥 Descargar Excel Filtrado</button>
      <button style={estilos.botonVolver} onClick={() => window.location.href = '/admin'}>🔙 Volver al Panel Principal</button>
    </div>
  );
} // Fin del componente Seccion1

// Estilos (definidos una sola vez)
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
    textAlign: 'center', // Centrar texto en celdas
    verticalAlign: 'middle', // Alinear verticalmente
  },
  btnEditar: {
    marginRight: "0.5rem",
    cursor: "pointer",
    backgroundColor: "#D3C6A3",
    border: "none",
    padding: "4px 8px", // Ajustar padding
    borderRadius: "4px",
    fontSize: '1rem', // Asegurar tamaño icono
    lineHeight: 1, // Alinear icono
  },
  btnEliminar: {
    cursor: "pointer",
    backgroundColor: "#806C4F",
    color: "white",
    border: "none",
    padding: "4px 8px", // Ajustar padding
    borderRadius: "4px",
    fontSize: '1rem', // Asegurar tamaño icono
    lineHeight: 1, // Alinear icono
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
