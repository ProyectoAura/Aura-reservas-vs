// Sección 3 – Turnos y Horarios
import { useState, useEffect, useRef, useCallback } from "react";
// *** Import Firestore functions and db ***
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig"; // Make sure this path is correct

// --- Debounce function ---
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

export default function Seccion3() {
  const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const turnosBase = [
    "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
    "22:00", "22:30", "23:00", "23:30", "00:00", "00:30", "01:00"
  ];

  // Default state if nothing is loaded from Firestore
  const initialState = diasSemana.reduce((acc, dia) => {
    acc[dia] = {
      visible: true,
      turnos: turnosBase.map((hora) => ({ hora, activo: true, capacidad: 15 }))
    };
    return acc;
  }, {});

  const [configTurnos, setConfigTurnos] = useState(initialState);
  // *** Add Loading State ***
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isInitialLoad = useRef(true); // To prevent saving on initial load

  // --- Firestore Document Reference ---
  const configDocRef = doc(db, "configuracionAura", "turnosHorarios");
  // ---

  // *** Load Configuration on Mount ***
  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      setError(null);
      try {
        const docSnap = await getDoc(configDocRef);
        if (docSnap.exists()) {
          console.log("Configuración cargada desde Firestore.");
          // Basic validation/merge in case structure changed
          const loadedData = docSnap.data();
          const mergedState = { ...initialState }; // Start with default structure
          Object.keys(mergedState).forEach(dia => {
            if (loadedData[dia]) {
              mergedState[dia] = {
                ...mergedState[dia], // Keep default structure
                ...loadedData[dia], // Overwrite with loaded values
                // Ensure 'turnos' array has the correct structure
                turnos: mergedState[dia].turnos.map(defaultTurno => {
                  const loadedTurno = loadedData[dia].turnos?.find(t => t.hora === defaultTurno.hora);
                  return loadedTurno ? { ...defaultTurno, ...loadedTurno } : defaultTurno;
                })
              };
            }
          });
          setConfigTurnos(mergedState);

        } else {
          console.log("No se encontró configuración en Firestore, usando valores por defecto.");
          setConfigTurnos(initialState); // Use default if no doc exists
        }
      } catch (err) {
        console.error("Error al cargar configuración:", err);
        setError("Error al cargar la configuración. Usando valores por defecto.");
        setConfigTurnos(initialState); // Use default on error
      } finally {
        setLoading(false);
        // Set initial load ref to false *after* the first load attempt
        setTimeout(() => { isInitialLoad.current = false; }, 0);
      }
    };

    loadConfig();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

  // *** Debounced Save Function ***
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce(async (newConfig) => {
      console.log("Guardando configuración en Firestore...");
      try {
        await setDoc(configDocRef, newConfig, { merge: true }); // Use setDoc with merge to create/update
        console.log("Configuración guardada.");
        setError(null); // Clear error on successful save
      } catch (err) {
        console.error("Error al guardar configuración:", err);
        setError("Error al guardar la configuración. Los cambios podrían no persistir.");
      }
    }, 1500), // Debounce saves by 1.5 seconds
    [configDocRef] // Dependency for useCallback
  );

  // *** Save Configuration on Change ***
  useEffect(() => {
    // Only save after the initial load is complete and not during loading
    if (!isInitialLoad.current && !loading) {
      debouncedSave(configTurnos);
    }
  }, [configTurnos, loading, debouncedSave]); // Depend on configTurnos, loading state and the debounced function

  // --- Handler Functions (Modified to update state, triggering the save useEffect) ---

  const toggleDiaVisible = (dia) => {
    setConfigTurnos(prev => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        visible: !prev[dia].visible
      }
    }));
  };

  const toggleTurno = (dia, index) => {
    setConfigTurnos(prev => {
      const nuevaConfig = { ...prev };
      // Deep copy the specific day's turnos array to avoid mutation issues
      const nuevosTurnos = [...nuevaConfig[dia].turnos];
      nuevosTurnos[index] = {
        ...nuevosTurnos[index],
        activo: !nuevosTurnos[index].activo
      };
      nuevaConfig[dia] = { ...nuevaConfig[dia], turnos: nuevosTurnos };
      return nuevaConfig;
    });
  };

  const cambiarCapacidad = (dia, index, valor) => {
    setConfigTurnos(prev => {
      const nuevaConfig = { ...prev };
      const nuevosTurnos = [...nuevaConfig[dia].turnos];
      nuevosTurnos[index] = {
        ...nuevosTurnos[index],
        capacidad: parseInt(valor) || 0
      };
      nuevaConfig[dia] = { ...nuevaConfig[dia], turnos: nuevosTurnos };
      return nuevaConfig;
    });
  };

  const toggleTodos = (dia) => {
    setConfigTurnos(prev => {
      const todosActivos = prev[dia].turnos.every((t) => t.activo);
      const nuevaConfig = { ...prev };
      nuevaConfig[dia] = {
        ...nuevaConfig[dia],
        turnos: nuevaConfig[dia].turnos.map((turno) => ({
          ...turno,
          activo: !todosActivos
        }))
      };
      return nuevaConfig;
    });
  };

  // --- Render Logic ---

  // Show loading indicator
  if (loading) {
    return <div style={{ ...estilos.contenedor, textAlign: 'center', paddingTop: '5rem' }}>Cargando configuración...</div>;
  }

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>⏰ Turnos y Horarios</h1>

      {/* Display error message if any */}
      {error && <div style={estilos.errorBox}>{error}</div>}

      <div style={estilos.controlesDias}>
        {diasSemana.map(dia => (
          <button
            key={`toggle-${dia}`}
            onClick={() => toggleDiaVisible(dia)}
            style={{
              ...estilos.botonDia,
              backgroundColor: configTurnos[dia]?.visible ? '#5CB85C' : '#D9534F' // Added safe navigation
            }}
          >
            {dia} {configTurnos[dia]?.visible ? '▲' : '▼'}
          </button>
        ))}
      </div>

      {diasSemana.map((dia) => {
        // Added safe navigation in case configTurnos is not fully loaded yet (though loading state should prevent this)
        if (!configTurnos[dia]?.visible) return null;

        const todosDesactivados = configTurnos[dia].turnos.every(t => !t.activo);
        return (
          <div key={dia} style={estilos.diaBox}>
            <div style={estilos.diaHeader}>
              <h3 style={estilos.diaTitulo}>{dia}</h3>
              <button
                onClick={() => toggleDiaVisible(dia)}
                style={estilos.botonOcultar}
              >
                Ocultar
              </button>
            </div>

            {todosDesactivados ? (
              <button
                style={estilos.botonActivar}
                onClick={() => toggleTodos(dia)}
              >
                ✅ Reactivar todos los turnos
              </button>
            ) : (
              <>
                {configTurnos[dia].turnos.map((turno, index) => (
                  <div key={index} style={estilos.turnoRow}>
                    <label>{turno.hora}</label>
                    <input
                      type="number"
                      value={turno.capacidad}
                      onChange={(e) => cambiarCapacidad(dia, index, e.target.value)}
                      style={estilos.input}
                      min="0"
                    />
                    <label style={estilos.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={turno.activo}
                        onChange={() => toggleTurno(dia, index)}
                      /> Activo
                    </label>
                  </div>
                ))}
                <button
                  style={configTurnos[dia].turnos.every(t => t.activo) ? estilos.botonDesactivar : estilos.botonActivar}
                  onClick={() => toggleTodos(dia)}
                >
                  {configTurnos[dia].turnos.every(t => t.activo)
                    ? "🚫 Desactivar todos los turnos"
                    : "✅ Reactivar todos los turnos"}
                </button>
              </>
            )}
          </div>
        );
      })}

      <button style={estilos.botonVolver} onClick={() => window.location.href = '/admin'}> {/* Changed back link */}
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
    marginBottom: "2rem",
    textAlign: "center",
    color: "#D3C6A3",
  },
  // *** Style for error message ***
  errorBox: {
    backgroundColor: '#D9534F',
    color: 'white',
    padding: '0.8rem',
    borderRadius: '8px',
    textAlign: 'center',
    marginBottom: '1.5rem',
    fontWeight: 'bold',
  },
  controlesDias: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    justifyContent: 'center'
  },
  botonDia: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    color: 'white',
    transition: 'all 0.3s ease'
  },
  diaBox: {
    backgroundColor: "#1C2340",
    padding: "1rem",
    borderRadius: "10px",
    marginBottom: "1.5rem",
  },
  diaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  diaTitulo: {
    color: "#D3C6A3",
    margin: 0
  },
  botonOcultar: {
    backgroundColor: 'transparent',
    color: '#EFE4CF',
    border: '1px solid #EFE4CF',
    borderRadius: '6px',
    padding: '0.3rem 0.8rem',
    cursor: 'pointer'
  },
  turnoRow: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "0.5rem",
  },
  input: {
    backgroundColor: "#EFE4CF",
    color: "#0A1034",
    borderRadius: "6px",
    padding: "0.4rem",
    border: "none",
    width: "60px",
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  botonDesactivar: {
    backgroundColor: "#D9534F",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0.4rem 1rem",
    cursor: "pointer",
    marginTop: "1rem",
  },
  botonActivar: {
    backgroundColor: "#5CB85C",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0.4rem 1rem",
    cursor: "pointer",
    marginTop: "1rem",
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
