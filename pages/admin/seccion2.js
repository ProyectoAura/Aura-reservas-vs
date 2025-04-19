// Sección 2 - Gestión de Reservas (con Firebase) - Versión con columnas ocultables
import { useState, useEffect } from "react";
// <<< ¡ASEGÚRATE QUE ESTA IMPORTACIÓN SEA CORRECTA! >>>
// Si usas firebaseConfig.js en la raíz, debería ser:
// import { db } from "../../firebaseConfig";
// Si usas lib/firebase.js en la raíz:
import { db } from "../../firebaseConfig"; // <<< RUTA CORRECTA desde pages/admin/
 // Asumiendo que esta es la correcta según tu archivo
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore"; // Añadido query, orderBy

export default function Seccion2() {
  // Estados principales
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevaReserva, setNuevaReserva] = useState({
    nombre: "",
    fecha: "",
    horario: "19:00", // Cambiado de 'turno' a 'horario' para consistencia
    personas: 1,
    alergia: "", // Mantener como 'alergia' o cambiar a 'restricciones'? Usaremos 'restricciones'
    restricciones: "",
    sector: "", // Añadir sector
    email: "", // Añadir email
    telefono: "", // Añadir telefono
    estado: "confirmada" // Estado por defecto
  });
  const [reservas, setReservas] = useState([]);
  const [loadingReservas, setLoadingReservas] = useState(true); // Estado de carga

  // Control de visibilidad de columnas
  const [columnasVisibles, setColumnasVisibles] = useState({
    fecha: true,
    nombre: true,
    horario: true, // Cambiado de 'turno'
    personas: true,
    restricciones: true,
    sector: true, // Añadido
    contacto: true, // Añadido (email/tel)
    estado: true, // Añadido
    acciones: true
  });

  // Filtros
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroHorario, setFiltroHorario] = useState(""); // Cambiado de 'turno'
  const [filtroPersonas, setFiltroPersonas] = useState("");
  const [filtroEstado, setFiltroEstado] = useState(""); // Añadido

  // <<< CORRECCIÓN: El nombre de la variable es 'turnos' >>>
  const turnos = [ // Renombrado de 'horarios' a 'turnos' para consistencia con el uso
    "19:00", "19:30", "20:00", "20:30", "21:00",
    "21:30", "22:00", "22:30", "23:00", "23:30",
    "00:00", "00:30", "01:00"
  ];

  // Obtener reservas al cargar
  useEffect(() => {
    const cargarConfiguracion = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("columnasVisiblesSeccion2"); // Usar clave específica
        if (stored !== null) {
          try {
            const parsed = JSON.parse(stored);
            // Fusionar con valores por defecto para asegurar todas las claves
            setColumnasVisibles(prev => ({ ...prev, ...parsed }));
          } catch (e) { console.error("Error parsing stored columns:", e); }
        }
      }
    };

    const obtenerReservas = async () => {
      setLoadingReservas(true);
      try {
        // <<< USA "reservasAura" >>>
        const q = query(collection(db, "reservasAura"), orderBy("fecha", "desc"), orderBy("horario", "asc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReservas(data);
        console.log("Reservas cargadas desde 'reservasAura':", data.length);
      } catch (error) {
        console.error("Error al obtener reservas:", error);
        setReservas([]);
      } finally {
        setLoadingReservas(false);
      }
    };

    cargarConfiguracion();
    obtenerReservas();
  }, []);

  // Filtrar reservas
  const reservasFiltradas = reservas.filter((res) => {
    const coincideFecha = filtroFecha === "" || res.fecha?.includes(filtroFecha);
    const coincideNombre = filtroNombre === "" || res.nombre?.toLowerCase().includes(filtroNombre.toLowerCase());
    const coincideHorario = filtroHorario === "" || res.horario?.includes(filtroHorario); // Cambiado de 'turno'
    const coincidePersonas = filtroPersonas === "" || res.personas?.toString() === filtroPersonas;
    const coincideEstado = filtroEstado === "" || (res.estado || "confirmada") === filtroEstado; // Añadido

    return coincideFecha && coincideNombre && coincideHorario && coincidePersonas && coincideEstado;
  });

  // Alternar visibilidad de columnas
  const toggleColumna = (columna) => {
    const nuevasColumnas = {
      ...columnasVisibles,
      [columna]: !columnasVisibles[columna]
    };
    setColumnasVisibles(nuevasColumnas);
    localStorage.setItem("columnasVisiblesSeccion2", JSON.stringify(nuevasColumnas)); // Usar clave específica
  };

  // Resetear formulario
  const resetFormulario = () => {
      setNuevaReserva({
          nombre: "", fecha: "", horario: "19:00", personas: 1,
          restricciones: "", sector: "", email: "", telefono: "",
          estado: "confirmada", id: null // Asegurar que el id se limpie
      });
      setMostrarFormulario(false);
  };

  // Manejar agregar/editar reserva
  const handleAgregarReserva = async () => {
    // Validaciones básicas
    if (!nuevaReserva.nombre || !nuevaReserva.fecha || !nuevaReserva.horario || !nuevaReserva.personas) {
        alert("Nombre, Fecha, Horario y Personas son obligatorios.");
        return;
    }
    const personasNum = parseInt(nuevaReserva.personas);
    if (isNaN(personasNum) || personasNum <= 0) {
        alert("La cantidad de personas debe ser un número positivo.");
        return;
    }

    // Preparar datos para guardar (excluir 'id' si es nuevo)
    const datosParaGuardar = {
        nombre: nuevaReserva.nombre,
        fecha: nuevaReserva.fecha,
        horario: nuevaReserva.horario,
        personas: personasNum,
        restricciones: nuevaReserva.restricciones || "",
        sector: nuevaReserva.sector || "",
        email: nuevaReserva.email || "",
        telefono: nuevaReserva.telefono || "",
        estado: nuevaReserva.estado || "confirmada",
        // Añadir timestamp de creación/modificación si se desea
        // ultimaModificacion: serverTimestamp()
    };


    try {
      if (nuevaReserva.id) { // Editando existente
        // <<< USA "reservasAura" >>>
        const ref = doc(db, "reservasAura", nuevaReserva.id);
        await updateDoc(ref, datosParaGuardar);
        // Actualizar estado local
        setReservas(reservas.map(r => (r.id === nuevaReserva.id ? { ...r, ...datosParaGuardar } : r)));
        alert("Reserva actualizada.");
      } else { // Creando nueva
        // <<< USA "reservasAura" >>>
        const docRef = await addDoc(collection(db, "reservasAura"), datosParaGuardar);
        // Actualizar estado local añadiendo el ID
        setReservas([...reservas, { ...datosParaGuardar, id: docRef.id }]);
        alert("Reserva agregada.");
      }
      resetFormulario(); // Limpiar y cerrar formulario
    } catch (e) {
      console.error("Error al guardar la reserva:", e);
      alert("Error al guardar la reserva.");
    }
  };

  // Iniciar edición
  const handleEditarReserva = (reserva) => {
      setNuevaReserva({ ...reserva }); // Cargar datos de la reserva al formulario
      setMostrarFormulario(true); // Mostrar formulario
  };

  // Eliminar reserva
  const handleEliminarReserva = async (id) => {
      if (window.confirm("¿Estás seguro que deseas eliminar esta reserva?")) {
          try {
              // <<< USA "reservasAura" >>>
              await deleteDoc(doc(db, "reservasAura", id));
              setReservas(reservas.filter((r) => r.id !== id)); // Actualizar estado local
              alert("Reserva eliminada.");
          } catch (e) {
              console.error("Error al eliminar reserva:", e);
              alert("Error al eliminar la reserva.");
          }
      }
  };


  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>🗂️ Gestión de Reservas</h1>

      {/* Controles de columnas */}
      <div style={{...estilos.filtroBox, flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem'}}>
        <span style={{marginRight: '0.5rem', color: '#EFE4CF'}}>👁️ Mostrar columnas:</span>
        {Object.entries(columnasVisibles).map(([columna, visible]) => (
          <button
            key={columna}
            onClick={() => toggleColumna(columna)}
            style={{
              ...estilos.botonColumna,
              backgroundColor: visible ? '#D3C6A3' : '#806C4F',
              color: visible ? '#0A1034' : '#EFE4CF'
            }}
          >
            {/* Ajustar nombres mostrados */}
            {columna === 'restricciones' ? 'Restric.' :
             columna === 'horario' ? 'Horario' :
             columna === 'personas' ? 'Pers.' :
             columna === 'contacto' ? 'Contacto' :
             columna.charAt(0).toUpperCase() + columna.slice(1)}
            {visible ? ' ✅' : ' ❌'}
          </button>
        ))}
      </div>

      {/* Filtro por fecha (opcional, se puede quitar si se usa el de la tabla) */}
      {/* <div style={estilos.filtroBox}> ... </div> */}

      {/* Botón agregar/cancelar reserva */}
      <button
        onClick={() => {
            if (mostrarFormulario) {
                resetFormulario(); // Si ya está abierto, cancelar/limpiar
            } else {
                setNuevaReserva({ // Resetear a valores por defecto al abrir
                    nombre: "", fecha: "", horario: "19:00", personas: 1,
                    restricciones: "", sector: "", email: "", telefono: "",
                    estado: "confirmada", id: null
                });
                setMostrarFormulario(true); // Abrir
            }
        }}
        style={estilos.botonAgregar}
      >
        {mostrarFormulario ? "✖️ Cancelar" : "➕ Agregar nueva reserva"}
      </button>

      {/* Formulario de reserva */}
      {mostrarFormulario && (
        <div style={estilos.formularioBox}>
          {/* Inputs del formulario */}
          <input type="text" placeholder="Nombre" value={nuevaReserva.nombre} onChange={(e) => setNuevaReserva({ ...nuevaReserva, nombre: e.target.value })} style={estilos.input} />
          <input type="date" value={nuevaReserva.fecha} onChange={(e) => setNuevaReserva({ ...nuevaReserva, fecha: e.target.value })} style={estilos.input} />
          <select value={nuevaReserva.horario} onChange={(e) => setNuevaReserva({ ...nuevaReserva, horario: e.target.value })} style={estilos.input}>
            {/* <<< CORRECCIÓN: Usar 'turnos' aquí también >>> */}
            {turnos.map((h) => (<option key={h} value={h}>{h}</option>))}
          </select>
          <input type="number" min="1" placeholder="Personas" value={nuevaReserva.personas} onChange={(e) => setNuevaReserva({ ...nuevaReserva, personas: parseInt(e.target.value) || 1 })} style={estilos.input} />
          <input type="text" placeholder="Sector (opcional)" value={nuevaReserva.sector} onChange={(e) => setNuevaReserva({ ...nuevaReserva, sector: e.target.value })} style={estilos.input} />
          <input type="email" placeholder="Email (opcional)" value={nuevaReserva.email} onChange={(e) => setNuevaReserva({ ...nuevaReserva, email: e.target.value })} style={estilos.input} />
          <input type="tel" placeholder="Teléfono (opcional)" value={nuevaReserva.telefono} onChange={(e) => setNuevaReserva({ ...nuevaReserva, telefono: e.target.value })} style={estilos.input} />
          <input type="text" placeholder="Alergias o restricciones" value={nuevaReserva.restricciones} onChange={(e) => setNuevaReserva({ ...nuevaReserva, restricciones: e.target.value })} style={{...estilos.input, width: '100%'}} />
          {/* Selector de Estado (solo visible si se está editando) */}
          {nuevaReserva.id && (
              <select value={nuevaReserva.estado} onChange={(e) => setNuevaReserva({ ...nuevaReserva, estado: e.target.value })} style={estilos.input}>
                  <option value="confirmada">Confirmada</option>
                  <option value="activa">Activa</option>
                  <option value="cumplida">Cumplida</option>
                  <option value="cancelada">Cancelada</option>
              </select>
          )}
          <button onClick={handleAgregarReserva} style={estilos.botonConfirmar}>
            💾 {nuevaReserva.id ? "Actualizar Reserva" : "Guardar Reserva"}
          </button>
        </div>
      )}

      {/* Tabla de reservas */}
      <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
        {loadingReservas ? (
          <p style={{ textAlign: 'center', color: '#ccc' }}>Cargando reservas...</p>
        ) : (
          <table style={estilos.tabla}>
            <thead>
              <tr>
                {/* Filtros en encabezados */}
                {columnasVisibles.fecha && (<th><input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} placeholder="Filtrar Fecha" style={estilos.inputFiltro}/></th>)}
                {columnasVisibles.nombre && (<th><input type="text" value={filtroNombre} onChange={e => setFiltroNombre(e.target.value)} placeholder="Filtrar Nombre" style={estilos.inputFiltro}/></th>)}
                {/* <<< CORRECCIÓN AQUÍ >>> */}
                {columnasVisibles.horario && (<th><select value={filtroHorario} onChange={e => setFiltroHorario(e.target.value)} style={estilos.inputFiltro}><option value="">Horario</option>{turnos.map(h=><option key={h} value={h}>{h}</option>)}</select></th>)}
                {columnasVisibles.personas && (<th><input type="number" value={filtroPersonas} onChange={e => setFiltroPersonas(e.target.value)} placeholder="Pers." style={{...estilos.inputFiltro, width: '60px'}}/></th>)}
                {columnasVisibles.restricciones && <th>Restric.</th>}
                {columnasVisibles.sector && <th>Sector</th>}
                {columnasVisibles.contacto && <th>Contacto</th>}
                {columnasVisibles.estado && (<th><select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={estilos.inputFiltro}><option value="">Estado</option><option value="confirmada">Confirmada</option><option value="activa">Activa</option><option value="cumplida">Cumplida</option><option value="cancelada">Cancelada</option></select></th>)}
                {columnasVisibles.acciones && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {/* Renderiza la fila "No hay reservas" O el mapeo, sin espacio intermedio */}
              {!loadingReservas && reservasFiltradas.length === 0 ? (
                  <tr><td colSpan={Object.values(columnasVisibles).filter(v=>v).length} style={{textAlign: 'center', padding: '1rem', color: '#aaa'}}>No hay reservas que coincidan.</td></tr>
              ) : (
                reservasFiltradas.map((reserva) => (
                                    <tr key={reserva.id} style={{backgroundColor: reserva.restricciones ? '#3a3a20' : 'transparent'}}> {/* Resaltar si hay restricciones */}
                    {/* Poner los TD condicionales juntos o con comentarios para evitar whitespace */}
                    {columnasVisibles.fecha && (<td style={estilos.celda}>{reserva.fecha}</td>)}{/*
                 */}{columnasVisibles.nombre && (<td style={estilos.celda}>{reserva.nombre}</td>)}{/*
                 */}{columnasVisibles.horario && (<td style={estilos.celda}>{reserva.horario}</td>)}{/*
                 */}{columnasVisibles.personas && (<td style={estilos.celda}>{reserva.personas}</td>)}{/*
                 */}{columnasVisibles.restricciones && (<td style={estilos.celda}>{reserva.restricciones ? `⚠️ ${reserva.restricciones}` : '-'}</td>)}{/*
                 */}{columnasVisibles.sector && (<td style={estilos.celda}>{reserva.sector || '-'}</td>)}{/*
                 */}{columnasVisibles.contacto && (<td style={estilos.celda}>{reserva.email || reserva.telefono || '-'}</td>)}{/*
                 */}{columnasVisibles.estado && (<td style={estilos.celda}>{reserva.estado || 'confirmada'}</td>)}{/*
                 */}{columnasVisibles.acciones && (
                      <td style={estilos.celda}>
                        <button style={estilos.btnEditar} onClick={() => handleEditarReserva(reserva)} title="Editar">✏️</button>
                        <button style={estilos.btnEliminar} onClick={() => handleEliminarReserva(reserva.id)} title="Eliminar">🗑️</button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Botones adicionales */}
      <button
        style={estilos.botonAlergias}
        onClick={() => window.location.href = '/admin/alergias'}
      >
        🥗 Alergias y Restricciones
      </button>
      <button
        style={estilos.botonVolver}
        onClick={() => window.location.href = '/admin'}
      >
        🔙 Volver al Panel Principal
      </button>
    </div>
  );
}

// Estilos (Añadido estilo para inputFiltro)
const estilos = {
  contenedor: { backgroundColor: "#0A1034", color: "#EFE4CF", minHeight: "100vh", padding: "2rem", fontFamily: "serif", },
  titulo: { fontSize: "2rem", marginBottom: "1.5rem", textAlign: "center", color: "#D3C6A3", },
  filtroBox: { marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", },
  formularioBox: { display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem", backgroundColor: "#1C2340", padding: "1.5rem", borderRadius: "8px", },
  input: { backgroundColor: "#EFE4CF", color: "#0A1034", borderRadius: "8px", padding: "0.6rem 0.8rem", border: "none", flexGrow: 1, minWidth: '150px' }, // Flex grow para ocupar espacio
  inputFiltro: { backgroundColor: "#EFE4CF", color: "#0A1034", borderRadius: "6px", padding: "0.3rem 0.5rem", border: "1px solid #555", fontSize: '0.9em' }, // Estilo para filtros de tabla
  tabla: { width: "100%", borderCollapse: "collapse", backgroundColor: "#1C2340", border: "1px solid #D3C6A3", },
  celda: { border: '1px solid #D3C6A3', padding: '8px', textAlign: 'center', fontSize: '0.9em' },
  btnEditar: { marginRight: "0.5rem", cursor: "pointer", backgroundColor: "#D3C6A3", border: "none", padding: "5px 9px", borderRadius: "4px", },
  btnEliminar: { cursor: "pointer", backgroundColor: "#806C4F", color: "white", border: "none", padding: "5px 9px", borderRadius: "4px", },
  botonAgregar: { backgroundColor: "#D3C6A3", color: "#0A1034", border: "none", borderRadius: "8px", padding: "0.6rem 1.2rem", marginBottom: "1rem", cursor: "pointer", fontWeight: 'bold' },
  botonConfirmar: { backgroundColor: "#806C4F", color: "#EFE4CF", border: "none", borderRadius: "8px", padding: "0.6rem 1.2rem", cursor: "pointer", fontWeight: 'bold', width: '100%', marginTop: '0.5rem' }, // Ancho completo
  botonVolver: { backgroundColor: "#806C4F", color: "#EFE4CF", border: "none", borderRadius: "12px", padding: "0.6rem 1.2rem", cursor: "pointer", display: "block", margin: "2rem auto 0", fontSize: "1rem", },
  botonAlergias: { backgroundColor: "#D3C6A3", color: "#0A1034", border: "none", borderRadius: "12px", padding: "0.6rem 1.2rem", cursor: "pointer", display: "block", margin: "1rem auto 0", fontSize: "1rem", },
  botonColumna: { padding: '0.4rem 0.8rem', borderRadius: '12px', border: 'none', cursor: 'pointer', marginRight: '0.4rem', marginBottom: '0.4rem', fontSize: '0.85rem', transition: 'all 0.3s ease', fontWeight: 'bold' }
};
