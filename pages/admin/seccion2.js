// Sección 2 - Gestión de Reservas (con Firebase) - Versión con columnas ocultables
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

export default function Seccion2() {
  // Estados principales
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevaReserva, setNuevaReserva] = useState({ 
    nombre: "", 
    fecha: "", 
    turno: "19:00", 
    personas: 1, 
    alergia: "" 
  });
  const [reservas, setReservas] = useState([]);

  // Control de visibilidad de columnas
  const [columnasVisibles, setColumnasVisibles] = useState({
    fecha: true,
    nombre: true,
    turno: true,
    personas: true,
    restricciones: true,
    acciones: true
  });

  // Filtros
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroTurno, setFiltroTurno] = useState("");
  const [filtroPersonas, setFiltroPersonas] = useState("");

  // Turnos disponibles
  const turnos = [
    "19:00", "19:30", "20:00", "20:30", "21:00",
    "21:30", "22:00", "22:30", "23:00", "23:30",
    "00:00", "00:30", "01:00"
  ];

  // Obtener reservas al cargar
  useEffect(() => {
    const cargarConfiguracion = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("columnasVisibles");
        if (stored !== null) {
          setColumnasVisibles(JSON.parse(stored));
        }
      }
    };

    const obtenerReservas = async () => {
      const querySnapshot = await getDocs(collection(db, "reservas"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReservas(data);
    };

    cargarConfiguracion();
    obtenerReservas();
  }, []);

  // Filtrar reservas
  const reservasFiltradas = reservas.filter((res) => {
    const coincideFecha = filtroFecha === "" || res.fecha.includes(filtroFecha);
    const coincideNombre = filtroNombre === "" || res.nombre.toLowerCase().includes(filtroNombre.toLowerCase());
    const coincideTurno = filtroTurno === "" || res.turno.includes(filtroTurno);
    const coincidePersonas = filtroPersonas === "" || res.personas.toString() === filtroPersonas;

    return coincideFecha && coincideNombre && coincideTurno && coincidePersonas;
  });

  // Alternar visibilidad de columnas
  const toggleColumna = (columna) => {
    const nuevasColumnas = {
      ...columnasVisibles,
      [columna]: !columnasVisibles[columna]
    };
    setColumnasVisibles(nuevasColumnas);
    localStorage.setItem("columnasVisibles", JSON.stringify(nuevasColumnas));
  };

  // Manejar agregar/editar reserva
  const handleAgregarReserva = async () => {
    try {
      if (nuevaReserva.id) {
        const ref = doc(db, "reservas", nuevaReserva.id);
        await updateDoc(ref, nuevaReserva);
        setReservas(reservas.map(r => (r.id === nuevaReserva.id ? nuevaReserva : r)));
      } else {
        const reservaConEstado = { ...nuevaReserva, estado: "confirmada" };
        const docRef = await addDoc(collection(db, "reservas"), reservaConEstado);
        setReservas([...reservas, { ...reservaConEstado, id: docRef.id }]);
      }
      setNuevaReserva({ nombre: "", fecha: "", turno: "19:00", personas: 1, alergia: "" });
      setMostrarFormulario(false);
    } catch (e) {
      console.error("Error al guardar la reserva:", e);
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
            {columna === 'restricciones' ? 'Restricciones' : 
             columna === 'personas' ? 'Personas' :
             columna.charAt(0).toUpperCase() + columna.slice(1)}
            {visible ? ' ✅' : ' ❌'}
          </button>
        ))}
      </div>

      {/* Filtro por fecha */}
      <div style={estilos.filtroBox}>
        <label htmlFor="fecha" style={{color: '#EFE4CF'}}>📅 Filtrar por fecha:</label>
        <input
          type="date"
          id="fecha"
          value={fechaSeleccionada}
          onChange={(e) => setFechaSeleccionada(e.target.value)}
          style={estilos.input}
        />
      </div>

      {/* Botón agregar reserva */}
      <button 
        onClick={() => setMostrarFormulario(!mostrarFormulario)} 
        style={estilos.botonAgregar}
      >
        {mostrarFormulario ? "✖️ Cancelar" : "➕ Agregar nueva reserva"}
      </button>

      {/* Formulario de reserva */}
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
          <button onClick={handleAgregarReserva} style={estilos.botonConfirmar}>
            💾 Guardar
          </button>
        </div>
      )}

      {/* Tabla de reservas */}
      <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
        <table style={estilos.tabla}>
          <thead>
            <tr>
              {columnasVisibles.fecha && (
                <th>
                  <select onChange={e => setFiltroFecha(e.target.value)} style={estilos.input}>
                    <option value="">📅 Todas las fechas</option>
                    {[...new Set(reservas.map(r => r.fecha))].sort().map((fecha, i) => (
                      <option key={i} value={fecha}>{fecha}</option>
                    ))}
                  </select>
                </th>
              )}
              {columnasVisibles.nombre && (
                <th>
                  <select onChange={e => setFiltroNombre(e.target.value)} style={estilos.input}>
                    <option value="">👤 Todos</option>
                    {[...new Set(reservas.map(r => r.nombre))].sort().map((nombre, i) => (
                      <option key={i} value={nombre}>{nombre}</option>
                    ))}
                  </select>
                </th>
              )}
              {columnasVisibles.turno && (
                <th>
                  <select onChange={e => setFiltroTurno(e.target.value)} style={estilos.input}>
                    <option value="">⏰ Todos</option>
                    {[...new Set(reservas.map(r => r.turno))].sort().map((turno, i) => (
                      <option key={i} value={turno}>{turno}</option>
                    ))}
                  </select>
                </th>
              )}
              {columnasVisibles.personas && (
                <th>
                  <select onChange={e => setFiltroPersonas(e.target.value)} style={estilos.input}>
                    <option value="">👥 Todas</option>
                    {[...new Set(reservas.map(r => r.personas))].sort((a, b) => a - b).map((cant, i) => (
                      <option key={i} value={cant}>{cant}</option>
                    ))}
                  </select>
                </th>
              )}
              {columnasVisibles.restricciones && <th>Restricciones</th>}
              {columnasVisibles.acciones && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {reservasFiltradas.map((reserva) => (
              <tr key={reserva.id}>
                {columnasVisibles.fecha && (
                  <td style={estilos.celda}>{reserva.fecha}</td>
                )}
                {columnasVisibles.nombre && (
                  <td style={estilos.celda}>{reserva.nombre}</td>
                )}
                {columnasVisibles.turno && (
                  <td style={estilos.celda}>{reserva.turno || reserva.horario}</td>
                )}
                {columnasVisibles.personas && (
                  <td style={estilos.celda}>{reserva.personas}</td>
                )}
                {columnasVisibles.restricciones && (
                  <td style={estilos.celda}>
                    {reserva.alergia ? `⚠️ ${reserva.alergia}` : '-'}
                  </td>
                )}
                {columnasVisibles.acciones && (
                  <td style={estilos.celda}>
                    <button
                      style={estilos.btnEditar}
                      onClick={() => {
                        setNuevaReserva(reserva);
                        setMostrarFormulario(true);
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      style={estilos.btnEliminar}
                      onClick={async () => {
                        const confirmacion = window.confirm("¿Estás seguro que deseas eliminar esta reserva?");
                        if (confirmacion) {
                          try {
                            await deleteDoc(doc(db, "reservas", reserva.id));
                            setReservas(reservas.filter((r) => r.id !== reserva.id));
                          } catch (e) {
                            console.error("Error al eliminar reserva:", e);
                          }
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
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

// Estilos
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
    border: "1px solid #D3C6A3",
  },
  celda: {
    border: '1px solid #D3C6A3', 
    padding: '6px',
    textAlign: 'center'
  },
  btnEditar: {
    marginRight: "0.5rem",
    cursor: "pointer",
    backgroundColor: "#D3C6A3",
    border: "none",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  btnEliminar: {
    cursor: "pointer",
    backgroundColor: "#806C4F",
    color: "white",
    border: "none",
    padding: "4px 8px",
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
  botonColumna: {
    padding: '0.3rem 0.6rem',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    marginRight: '0.3rem',
    marginBottom: '0.3rem',
    fontSize: '0.85rem',
    transition: 'all 0.3s ease',
    fontWeight: 'bold'
  }
};
