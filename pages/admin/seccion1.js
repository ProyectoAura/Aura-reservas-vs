// pages/admin/seccion1.js
import { useState, useEffect, useCallback, useRef } from "react"; // Añadido useCallback y useRef
import * as XLSX from "xlsx";
// *** ¡Importante! Corregir la importación de db y añadir funciones Firestore ***
import { db } from "../../firebase/firebaseConfig"; // CORREGIDO: Usar la config centralizada
import { collection, getDocs, updateDoc, doc, deleteDoc, getDoc, setDoc } from "firebase/firestore"; // Añadido getDoc, setDoc

// --- Debounce function (igual que en Seccion3) ---
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
// --- End Debounce ---

export default function Seccion1() {
  // Estado local para edad mínima, con valor inicial por defecto
  const [edadMinima, setEdadMinima] = useState(21);
  const [loadingEdad, setLoadingEdad] = useState(true); // Estado de carga para edad mínima
  const [errorEdad, setErrorEdad] = useState(null); // Estado de error para edad mínima
  const isInitialLoadEdad = useRef(true); // Para evitar guardado inicial

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("activas");
  const [reservas, setReservas] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [reservaEditada, setReservaEditada] = useState({});

  // --- Referencia al documento de configuración general ---
  const configDocRef = doc(db, "configuracionAura", "ajustesGenerales");
  // ---

  // --- Cargar Edad Mínima al montar ---
  useEffect(() => {
    const cargarEdadMinima = async () => {
      setLoadingEdad(true);
      setErrorEdad(null);
      try {
        const docSnap = await getDoc(configDocRef);
        if (docSnap.exists() && docSnap.data().edadMinima !== undefined) {
          console.log("Edad mínima cargada desde Firestore:", docSnap.data().edadMinima);
          setEdadMinima(docSnap.data().edadMinima);
        } else {
          console.log("No se encontró edad mínima en Firestore, usando valor por defecto (21).");
          setEdadMinima(21); // Valor por defecto si no existe
          // Opcional: Guardar el valor por defecto si el documento no existe
          // await setDoc(configDocRef, { edadMinima: 21 }, { merge: true });
        }
      } catch (err) {
        console.error("Error al cargar edad mínima:", err);
        setErrorEdad("Error al cargar la edad mínima. Usando valor por defecto.");
        setEdadMinima(21); // Usar defecto en caso de error
      } finally {
        setLoadingEdad(false);
        // Marcar carga inicial como completada
        setTimeout(() => { isInitialLoadEdad.current = false; }, 0);
      }
    };
    cargarEdadMinima();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar

  // --- Función Debounced para Guardar Edad Mínima ---
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSaveEdad = useCallback(
    debounce(async (nuevaEdad) => {
      console.log("Guardando edad mínima en Firestore:", nuevaEdad);
      setErrorEdad(null);
      try {
        // Usamos setDoc con merge:true para crear/actualizar el campo específico
        await setDoc(configDocRef, { edadMinima: nuevaEdad }, { merge: true });
        console.log("Edad mínima guardada.");
      } catch (err) {
        console.error("Error al guardar edad mínima:", err);
        setErrorEdad("Error al guardar la edad mínima.");
      }
    }, 1000), // Guardar 1 segundo después del último cambio
    [configDocRef] // Dependencia para useCallback
  );

  // --- Guardar Edad Mínima cuando cambia el estado local ---
  useEffect(() => {
    // Solo guardar si no es la carga inicial y no estamos cargando
    if (!isInitialLoadEdad.current && !loadingEdad) {
      // Validar que sea un número razonable antes de guardar
      if (typeof edadMinima === 'number' && edadMinima >= 0) {
        debouncedSaveEdad(edadMinima);
      } else {
        setErrorEdad("La edad mínima debe ser un número válido.");
      }
    }
  }, [edadMinima, loadingEdad, debouncedSaveEdad]); // Depende del estado local y la carga

  // --- Resto de tus useEffect y funciones (obtenerReservas, etc.) ---
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

  // --- Tus funciones existentes (obtenerEstado, reservasFiltradas, etc.) ---
  // (Sin cambios en estas funciones, solo asegúrate que db se importa correctamente arriba)
  const obtenerEstado = (fechaReserva) => {
    const hoy = new Date();
    // Asegurarse que la fecha tenga formato YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaReserva)) return "desconocido";
    const [a, m, d] = fechaReserva.split("-");
    // Crear fecha en UTC para evitar problemas de timezone
    const fecha = new Date(Date.UTC(parseInt(a), parseInt(m) - 1, parseInt(d)));
    const hoyUtc = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));

    if (fecha < hoyUtc) return "cumplida";
    return "activa"; // O podrías tener 'pendiente', 'confirmada', etc. basado en r.estado
  };

  const reservasFiltradas = reservas.filter(r => {
    // Añadir chequeo por si r.fecha no existe o es inválida
    if (!r.fecha || typeof r.fecha !== 'string') return false;

    const estadoCalculado = obtenerEstado(r.fecha);
    const estadoReal = r.estado || estadoCalculado; // Priorizar estado guardado si existe

    const matchFecha = (!fechaDesde || r.fecha >= fechaDesde) && (!fechaHasta || r.fecha <= fechaHasta);

    let matchEstado = false;
    if (filtroEstado === "todas") {
        matchEstado = true;
    } else if (filtroEstado === "activas") {
        // Considerar activas las confirmadas o pendientes que no sean pasadas
        matchEstado = (estadoReal === "confirmada" || estadoReal === "pendiente") && estadoCalculado !== "cumplida";
    } else {
        matchEstado = estadoReal === filtroEstado;
    }

    return matchFecha && matchEstado;
});


  // --- Capacidad de Turnos (Esto debería venir de Seccion3/Firestore eventualmente) ---
  const turnosIniciales = {
    "19:00": 15, "19:30": 15, "20:00": 15, "20:30": 15, "21:00": 15,
    "21:30": 15, "22:00": 15, "22:30": 15, "23:00": 15, "23:30": 15,
    "00:00": 15, "00:30": 15, "01:00": 15
  };
  const [turnosDisponibles, setTurnosDisponibles] = useState(turnosIniciales);
  // TODO: Cargar turnosDisponibles desde 'configuracionAura/turnosHorarios'

  const personasPorTurno = reservasFiltradas.reduce((acc, r) => {
    // Asegurarse que r.personas sea un número
    const numPersonas = typeof r.personas === 'number' ? r.personas : parseInt(r.personas) || 0;
    if (r.horario) { // Solo contar si hay horario
        acc[r.horario] = (acc[r.horario] || 0) + numPersonas;
    }
    return acc;
  }, {});

  const totalPersonas = reservasFiltradas.reduce((acc, r) => {
      const numPersonas = typeof r.personas === 'number' ? r.personas : parseInt(r.personas) || 0;
      return acc + numPersonas;
  }, 0);

  // Calcular maxReservas basado en los turnos *reales* que tienen reservas filtradas
  // o idealmente, basado en la configuración cargada de Seccion3
  const maxReservas = Object.entries(personasPorTurno).reduce((acc, [turno, _]) => {
      return acc + (turnosDisponibles[turno] || 0); // Sumar capacidad del turno si existe
  }, 0);

  // Evitar división por cero si no hay capacidad o reservas
  const porcentajeOcupacion = maxReservas > 0 ? ((totalPersonas / maxReservas) * 100).toFixed(1) : "0.0";


  const exportarExcel = () => {
    // Tu lógica de exportación (sin cambios necesarios aquí)
    const data = [["Nombre", "Turno", "Fecha", "Personas", "Sector", "Estado", "Restricciones"]];
    reservasFiltradas.forEach((reserva) => {
        data.push([
            reserva.nombre || "-",
            reserva.horario || "-",
            reserva.fecha || "-",
            reserva.personas || "-",
            reserva.sector || "-",
            reserva.estado || obtenerEstado(reserva.fecha) || "-",
            reserva.restricciones || "-"
        ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reservas Filtradas");
    XLSX.writeFile(wb, `reservas_${fechaDesde}_a_${fechaHasta}_${filtroEstado}.xlsx`);
  };

  const handleCambioTurno = (turno, valor) => {
    // Esta función debería idealmente actualizar la config en Firestore (Seccion3)
    const nuevoValor = parseInt(valor);
    if (!isNaN(nuevoValor)) {
      setTurnosDisponibles({ ...turnosDisponibles, [turno]: nuevoValor });
      // TODO: Llamar a una función para guardar este cambio en Firestore (configuracionAura/turnosHorarios)
    }
  };

  const editarReserva = (reserva) => {
    setEditandoId(reserva.id);
    // Asegurar que todos los campos necesarios para editar existan
    setReservaEditada({
        nombre: reserva.nombre || "",
        horario: reserva.horario || "",
        personas: reserva.personas || 1,
        estado: reserva.estado || "confirmada",
        fecha: reserva.fecha || "",
        sector: reserva.sector || ""
        // Añade otros campos si son editables
    });
  };

  const guardarReserva = async (id) => {
    try {
      const ref = doc(db, "reservas", id);
      // Solo actualizar los campos que se editan
      const datosParaActualizar = {
        nombre: reservaEditada.nombre,
        horario: reservaEditada.horario,
        personas: parseInt(reservaEditada.personas) || 1, // Asegurar que sea número
        estado: reservaEditada.estado,
        fecha: reservaEditada.fecha,
        sector: reservaEditada.sector
        // Añade otros campos si es necesario
      };
      await updateDoc(ref, datosParaActualizar);
      setReservas(reservas.map(r => r.id === id ? { ...r, ...datosParaActualizar } : r));
      setEditandoId(null);
      setReservaEditada({});
    } catch (e) {
      console.error("Error al guardar:", e);
      alert("Error al guardar la reserva.");
    }
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setReservaEditada({});
  };

  const eliminarReserva = async (id) => {
     if (window.confirm("¿Estás seguro de eliminar esta reserva permanentemente?")) {
        try {
          await deleteDoc(doc(db, "reservas", id));
          setReservas(reservas.filter(r => r.id !== id));
        } catch (e) {
          console.error("Error al eliminar:", e);
          alert("Error al eliminar la reserva.");
        }
     }
  };

  // --- Renderizado ---
  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>📊 Panel de Administrador</h1>

      <div style={estilos.statsBox}>
        {/* Mostrar total de personas en lugar de reservas */}
        <p>🔢 <strong>Reservas filtradas:</strong> {reservasFiltradas.length} 👬 <strong>Total de personas:</strong> {totalPersonas}</p>
        {/* Mostrar ocupación */}
        <p>📈 <strong>Ocupación (calculada):</strong> {porcentajeOcupacion}% {maxReservas > 0 ? `(sobre ${maxReservas} lugares)` : '(Capacidad no definida)'}</p>

        {/* Input Edad Mínima */}
        <div style={{ marginTop: "1rem" }}>
          <label htmlFor="edad">🔞 Edad mínima requerida: </label>
          <input
            id="edad"
            type="number"
            value={edadMinima}
            // Actualizar estado local al cambiar
            onChange={(e) => setEdadMinima(Number(e.target.value))}
            style={estilos.input}
            disabled={loadingEdad} // Deshabilitar mientras carga
            min="0" // Evitar edades negativas
          />
          {loadingEdad && <span style={{ marginLeft: '10px', fontStyle: 'italic' }}>Cargando...</span>}
          {errorEdad && <span style={{ marginLeft: '10px', color: 'red' }}>{errorEdad}</span>}
        </div>

        {/* Filtros de Fecha y Estado */}
        <div style={{ marginTop: "1rem", display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
              <option value="activas">Activas (Confirmadas/Pendientes)</option>
              <option value="confirmada">Confirmadas</option>
              <option value="pendiente">Pendientes</option>
              <option value="cumplida">Cumplidas</option>
              <option value="cancelada">Canceladas</option>
              <option value="todas">Todas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sección Turnos Disponibles (Mantenerla, pero idealmente sincronizar con Seccion3) */}
      <div style={estilos.statsBox}>
        <h3 style={estilos.subtitulo}>🕒 Ocupación por Turno (Filtrado):</h3>
        <ul style={{ listStyle: "none", padding: 0, columnCount: 2 }}> {/* 2 columnas */}
          {Object.keys(turnosDisponibles)
             .sort() // Ordenar turnos
             .map((turno) => {
                const capacidadTurno = turnosDisponibles[turno] || 0;
                const ocupados = personasPorTurno[turno] || 0;
                const disponibles = capacidadTurno - ocupados;
                // Solo mostrar si hay capacidad definida o si hay reservas en ese turno
                if (capacidadTurno > 0 || ocupados > 0) {
                    return (
                        <li key={turno} style={{ marginBottom: "0.5rem", breakInside: 'avoid-column' }}>
                          <strong>{turno} hs:</strong>
                          {/* Input para editar capacidad (debería guardar en Seccion3/Firestore) */}
                          {/* <input type="number" value={capacidadTurno} onChange={(e) => handleCambioTurno(turno, e.target.value)} style={{ ...estilos.input, width: "60px", marginLeft: "0.5rem" }} /> */}
                          <span> {ocupados} / {capacidadTurno} ({disponibles >= 0 ? `${disponibles} disp.` : `${Math.abs(disponibles)} exced.`})</span>
                        </li>
                    );
                }
                return null; // No mostrar turnos sin capacidad ni reservas
          })}
        </ul>
      </div>


      {/* Tabla de Reservas */}
      <div style={estilos.statsBox}>
        <h3 style={estilos.subtitulo}>📋 Reservas Filtradas:</h3>
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
                <tr key={reserva.id} style={{ backgroundColor: editandoId === reserva.id ? '#2a3457' : 'transparent' }}>
                  {/* Celdas de datos o inputs de edición */}
                  <td style={estilos.celda}>
                    {editandoId === reserva.id ? (
                      <input value={reservaEditada.nombre} onChange={(e) => setReservaEditada({ ...reservaEditada, nombre: e.target.value })} style={estilos.inputTabla} />
                    ) : reserva.nombre}
                  </td>
                  <td style={estilos.celda}>
                    {editandoId === reserva.id ? (
                      <input value={reservaEditada.horario} onChange={(e) => setReservaEditada({ ...reservaEditada, horario: e.target.value })} style={estilos.inputTabla} />
                    ) : reserva.horario}
                  </td>
                   <td style={estilos.celda}>
                    {editandoId === reserva.id ? (
                      <input type="date" value={reservaEditada.fecha} onChange={(e) => setReservaEditada({ ...reservaEditada, fecha: e.target.value })} style={estilos.inputTabla} />
                    ) : reserva.fecha}
                  </td>
                  <td style={estilos.celda}>
                    {editandoId === reserva.id ? (
                      <input type="number" value={reservaEditada.personas} onChange={(e) => setReservaEditada({ ...reservaEditada, personas: parseInt(e.target.value) })} style={estilos.inputTabla} min="1"/>
                    ) : reserva.personas}
                  </td>
                   <td style={estilos.celda}>
                    {editandoId === reserva.id ? (
                      <input value={reservaEditada.sector} onChange={(e) => setReservaEditada({ ...reservaEditada, sector: e.target.value })} style={estilos.inputTabla} />
                    ) : reserva.sector || "-"}
                  </td>
                  <td style={estilos.celda}>
                    {editandoId === reserva.id ? (
                       <select value={reservaEditada.estado} onChange={(e) => setReservaEditada({ ...reservaEditada, estado: e.target.value })} style={estilos.inputTabla}>
                           <option value="confirmada">Confirmada</option>
                           <option value="pendiente">Pendiente</option>
                           <option value="cancelada">Cancelada</option>
                           <option value="cumplida">Cumplida</option>
                       </select>
                    ) : (reserva.estado || obtenerEstado(reserva.fecha))}
                  </td>
                  {/* Botones de Acciones */}
                  <td style={estilos.celda}>
                    {editandoId === reserva.id ? (
                      <>
                        <button onClick={() => guardarReserva(reserva.id)} style={estilos.btnGuardar}>💾</button>
                        <button onClick={cancelarEdicion} style={estilos.btnCancelar}>❌</button>
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
           {reservasFiltradas.length === 0 && <p style={{textAlign: 'center', marginTop: '1rem'}}>No hay reservas que coincidan con los filtros seleccionados.</p>}
        </div>
      </div>

      {/* Botones Exportar y Volver */}
      <button onClick={exportarExcel} style={estilos.botonExportar} disabled={reservasFiltradas.length === 0}>
         📥 Descargar Excel (Filtrado)
      </button>
      <button style={estilos.botonVolver} onClick={() => window.location.href = '/admin'}>🔙 Volver al Panel Principal</button>
    </div>
  );
}

// --- Estilos (Añadir estilos para botones guardar/cancelar y inputTabla) ---
const estilos = {
  // ... (tus estilos existentes)
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
   inputTabla: { // Estilo para inputs dentro de la tabla
    backgroundColor: "#FFF", // Fondo blanco para destacar
    color: "#0A1034",
    borderRadius: "4px",
    padding: "0.2rem 0.4rem",
    border: "1px solid #ccc",
    width: '90%', // Ajustar ancho
  },
  tabla: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "1rem",
  },
  encabezadoTabla: {
    backgroundColor: "#806C4F", // Color más oscuro para encabezado
    color: "#EFE4CF",
    fontWeight: "bold",
  },
  celda: {
    border: "1px solid #806C4F", // Borde más visible
    padding: "0.5rem",
    textAlign: 'center', // Centrar texto en celdas
    verticalAlign: 'middle', // Alinear verticalmente
  },
  btnEditar: {
    marginRight: "0.5rem",
    cursor: "pointer",
    backgroundColor: "#D3C6A3", // Amarillo claro
    color: '#0A1034',
    border: "none",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  btnEliminar: {
    cursor: "pointer",
    backgroundColor: "#D9534F", // Rojo
    color: "white",
    border: "none",
    padding: "4px 8px",
    borderRadius: "4px"
  },
  btnGuardar: { // Nuevo estilo
     marginRight: "0.5rem",
     cursor: "pointer",
     backgroundColor: "#5CB85C", // Verde
     color: "white",
     border: "none",
     padding: "4px 8px",
     borderRadius: "4px",
  },
  btnCancelar: { // Nuevo estilo
     cursor: "pointer",
     backgroundColor: "#777", // Gris
     color: "white",
     border: "none",
     padding: "4px 8px",
     borderRadius: "4px",
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
    opacity: 1, // Estilo base
    transition: 'opacity 0.3s ease', // Transición suave
  },
   // Estilo para botón deshabilitado
  'botonExportar:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
  }
};
// Añadir regla CSS global para el botón deshabilitado si es necesario
// (Esto es más complejo en JSS, pero el estilo inline :disabled funciona en muchos navegadores)
