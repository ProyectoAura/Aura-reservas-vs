// Sección 3 – Turnos y Horarios
import { useState, useEffect } from "react"; // Añadido useEffect
import { db } from "../../firebaseConfig"; // <<< IMPORTANTE: Asegúrate que la ruta sea correcta
import { doc, getDoc, setDoc } from "firebase/firestore"; // <<< AÑADIDO: Firestore functions
import { useRouter } from "next/router"; // <<< AÑADIDO: Para posible protección
import Cookies from "js-cookie"; // <<< AÑADIDO: Para protección

export default function Seccion3() {
  const router = useRouter(); // <<< AÑADIDO
  const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const turnosBase = [
    "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
    "22:00", "22:30", "23:00", "23:30", "00:00", "00:30", "01:00"
  ];

  // Configuración por defecto si no hay nada en Firestore
  const getDefaultConfig = () => {
    return diasSemana.reduce((acc, dia) => {
      acc[dia] = {
        visible: true,
        turnos: turnosBase.map((hora) => ({ hora, activo: true, capacidad: 15 }))
      };
      return acc;
    }, {});
  };

  // --- Estados ---
  const [configTurnos, setConfigTurnos] = useState(null); // Inicializar como null
  const [loadingConfig, setLoadingConfig] = useState(true); // Estado de carga inicial
  const [savingConfig, setSavingConfig] = useState(false); // Estado de guardado
  const [isLoadingClient, setIsLoadingClient] = useState(true); // Para protección
  const [permissionLevel, setPermissionLevel] = useState('no'); // Nivel de permiso

  // --- Protección y Carga Inicial ---
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      setIsLoadingClient(true);
      setLoadingConfig(true); // Iniciar carga de config también

      // 1. Autorización
      const autorizado = localStorage.getItem("adminAutorizado") === "true" || Cookies.get("adminAutorizado") === "true";
      if (!autorizado) { router.replace("/"); return; }

      // 2. Permisos (Asumiendo que esta sección requiere permiso 'editar' o 'total' en 'reservas' o una clave propia)
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuarioAura"));
      const userRole = usuarioGuardado?.rol;
      const isOwner = usuarioGuardado?.contraseña === 'Aura2025';
      if (!userRole) { router.replace("/"); return; }

      let perm = 'no';
      try {
        const permisosSnap = await getDoc(doc(db, "permisosAura", "roles")); // Asumiendo doc 'roles'
        if (permisosSnap.exists()) {
          // Ajusta 'reservas' si tienes una clave específica para config de turnos
          perm = permisosSnap.data()?.reservas?.[userRole] || 'no';
        }
      } catch (error) { console.error("Error cargando permisos:", error); }

      const finalPermission = isOwner ? 'total' : perm;
      setPermissionLevel(finalPermission);

      if (finalPermission !== 'total' && finalPermission !== 'editar') {
        alert("No tienes permiso para editar la configuración de turnos.");
        router.replace('/panel'); // O a donde corresponda
        setIsLoadingClient(false);
        setLoadingConfig(false);
        return;
      }
      setIsLoadingClient(false); // Termina chequeo cliente/permisos

      // 3. Cargar Configuración desde Firestore
      const configRef = doc(db, "configuracionAura", "turnosHorarios");
      try {
        const docSnap = await getDoc(configRef);
        if (docSnap.exists()) {
          console.log("Configuración de turnos cargada desde Firestore.");
          setConfigTurnos(docSnap.data()); // Usar datos de Firestore
        } else {
          console.log("No se encontró configuración en Firestore, usando valores por defecto.");
          setConfigTurnos(getDefaultConfig()); // Usar configuración por defecto
        }
      } catch (error) {
        console.error("Error al cargar configuración de turnos:", error);
        alert("Error al cargar la configuración. Se usarán valores por defecto.");
        setConfigTurnos(getDefaultConfig()); // Usar defecto en caso de error
      } finally {
        setLoadingConfig(false); // Terminar carga de config
      }
    };

    checkAuthAndLoad();
  }, [router]); // Dependencia del router

  // --- Función para Guardar Configuración en Firestore ---
  const saveConfigToFirestore = async (newConfig) => {
    if (permissionLevel !== 'total' && permissionLevel !== 'editar') {
      console.warn("Intento de guardado sin permiso.");
      return; // No guardar si no tiene permiso
    }
    setSavingConfig(true);
    const configRef = doc(db, "configuracionAura", "turnosHorarios");
    try {
      await setDoc(configRef, newConfig); // setDoc sobrescribe el documento completo
      console.log("Configuración de turnos guardada en Firestore.");
      // Podrías añadir un feedback visual breve aquí si lo deseas
    } catch (error) {
      console.error("Error al guardar configuración en Firestore:", error);
      alert("Error al guardar la configuración. Intenta nuevamente.");
    } finally {
      setSavingConfig(false);
    }
  };

  // --- Modificar Funciones Existentes para Guardar ---

  const toggleDiaVisible = (dia) => {
    // Calcula el nuevo estado
    const newConfig = {
      ...configTurnos,
      [dia]: {
        ...configTurnos[dia],
        visible: !configTurnos[dia].visible
      }
    };
    // Actualiza el estado local
    setConfigTurnos(newConfig);
    // Guarda en Firestore
    saveConfigToFirestore(newConfig);
  };

  const toggleTurno = (dia, index) => {
    // Calcula el nuevo estado
    const nuevaConfig = { ...configTurnos };
    // ¡OJO! Necesitas clonar el array de turnos para evitar mutación directa
    const nuevosTurnos = [...nuevaConfig[dia].turnos];
    nuevosTurnos[index] = {
        ...nuevosTurnos[index],
        activo: !nuevosTurnos[index].activo
    };
    nuevaConfig[dia] = { ...nuevaConfig[dia], turnos: nuevosTurnos };

    // Actualiza el estado local
    setConfigTurnos(nuevaConfig);
    // Guarda en Firestore
    saveConfigToFirestore(nuevaConfig);
  };

  const cambiarCapacidad = (dia, index, valor) => {
    // Calcula el nuevo estado
    const nuevaConfig = { ...configTurnos };
    // Clonar array de turnos
    const nuevosTurnos = [...nuevaConfig[dia].turnos];
    nuevosTurnos[index] = {
        ...nuevosTurnos[index],
        capacidad: parseInt(valor) || 0
    };
    nuevaConfig[dia] = { ...nuevaConfig[dia], turnos: nuevosTurnos };

    // Actualiza el estado local
    setConfigTurnos(nuevaConfig);
    // Guarda en Firestore
    saveConfigToFirestore(nuevaConfig);
  };

  const toggleTodos = (dia) => {
    // Calcula el nuevo estado
    const todosActivos = configTurnos[dia].turnos.every((t) => t.activo);
    const nuevaConfig = { ...configTurnos };
    // Mapear para crear un NUEVO array de turnos
    const nuevosTurnos = nuevaConfig[dia].turnos.map((turno) => ({
      ...turno,
      activo: !todosActivos
    }));
    nuevaConfig[dia] = { ...nuevaConfig[dia], turnos: nuevosTurnos };

    // Actualiza el estado local
    setConfigTurnos(nuevaConfig);
    // Guarda en Firestore
    saveConfigToFirestore(nuevaConfig);
  };

  // --- Renderizado ---
  // Mostrar carga mientras se verifica auth/permisos o se carga la config
  if (isLoadingClient || loadingConfig) {
    return <div style={estilos.contenedor}><p style={estilos.loading}>Cargando configuración...</p></div>;
  }

  // Si después de cargar, no tiene permiso (ya se habría redirigido, pero como fallback)
  if (permissionLevel !== 'total' && permissionLevel !== 'editar') {
     return <div style={estilos.contenedor}><p style={estilos.loading}>Acceso denegado.</p></div>;
  }

  // Si configTurnos aún es null después de cargar (error inesperado)
  if (!configTurnos) {
      return <div style={estilos.contenedor}><p style={estilos.loading}>Error al cargar la configuración. Recarga la página.</p></div>;
  }


  return (
    <div style={estilos.contenedor}>
      {/* Botón Volver (Añadido) */}
      <button onClick={() => router.push('/panel')} style={estilos.botonVolverAbsoluto}>
        ← Volver
      </button>

      <h1 style={estilos.titulo}>⏰ Turnos y Horarios</h1>

      {/* Indicador de Guardado */}
      {savingConfig && <p style={estilos.savingIndicator}>Guardando...</p>}

      <div style={estilos.controlesDias}>
        {diasSemana.map(dia => (
          <button
            key={`toggle-${dia}`}
            onClick={() => toggleDiaVisible(dia)}
            style={{
              ...estilos.botonDia,
              backgroundColor: configTurnos[dia]?.visible ? '#5CB85C' : '#D9534F' // Añadir ?. por si acaso
            }}
            disabled={savingConfig} // Deshabilitar mientras guarda
          >
            {dia} {configTurnos[dia]?.visible ? '▲' : '▼'}
          </button>
        ))}
      </div>

      {diasSemana.map((dia) => {
        // Asegurarse que configTurnos[dia] exista antes de acceder a 'visible'
        if (!configTurnos[dia] || !configTurnos[dia].visible) return null;

        const todosDesactivados = configTurnos[dia].turnos.every(t => !t.activo);
        return (
          <div key={dia} style={estilos.diaBox}>
            <div style={estilos.diaHeader}>
              <h3 style={estilos.diaTitulo}>{dia}</h3>
              <button
                onClick={() => toggleDiaVisible(dia)}
                style={estilos.botonOcultar}
                disabled={savingConfig} // Deshabilitar mientras guarda
              >
                Ocultar
              </button>
            </div>

            {todosDesactivados ? (
              <button
                style={estilos.botonActivar}
                onClick={() => toggleTodos(dia)}
                disabled={savingConfig} // Deshabilitar mientras guarda
              >
                ✅ Reactivar todos los turnos
              </button>
            ) : (
              <>
                {configTurnos[dia].turnos.map((turno, index) => (
                  <div key={index} style={estilos.turnoRow}>
                    <label style={{minWidth: '50px'}}>{turno.hora}</label> {/* Ancho mínimo para alinear */}
                    <input
                      type="number"
                      value={turno.capacidad}
                      onChange={(e) => cambiarCapacidad(dia, index, e.target.value)}
                      style={estilos.input}
                      min="0"
                      disabled={savingConfig} // Deshabilitar mientras guarda
                    />
                    <label style={estilos.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={turno.activo}
                        onChange={() => toggleTurno(dia, index)}
                        disabled={savingConfig} // Deshabilitar mientras guarda
                      /> Activo
                    </label>
                  </div>
                ))}
                <button
                  style={configTurnos[dia].turnos.every(t => t.activo) ? estilos.botonDesactivar : estilos.botonActivar}
                  onClick={() => toggleTodos(dia)}
                  disabled={savingConfig} // Deshabilitar mientras guarda
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

      {/* Botón Volver al Panel (ya no es absoluto) */}
      {/* <button style={estilos.botonVolver} onClick={() => router.push('/panel')}>
        🔙 Volver al Panel Principal
      </button> */}
    </div>
  );
}

// --- Estilos (Añadidos estilos para carga/guardado y botón volver absoluto) ---
const estilos = {
  contenedor: {
    backgroundColor: "#0A1034",
    color: "#EFE4CF",
    minHeight: "100vh",
    padding: "2rem",
    fontFamily: "serif",
    position: 'relative', // Para el botón volver absoluto
  },
  // <<< AÑADIDO: Botón Volver Absoluto >>>
  botonVolverAbsoluto: {
    position: 'absolute',
    top: '1rem',
    left: '1rem',
    background: "#806C4F",
    color: "#EFE4CF",
    padding: "0.5rem 1rem",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    zIndex: 10,
  },
  titulo: {
    fontSize: "2rem",
    marginTop: '2rem', // Espacio para el botón volver
    marginBottom: "2rem",
    textAlign: "center",
    color: "#D3C6A3",
  },
  // <<< AÑADIDO: Estilos Carga/Guardado >>>
  loading: {
    color: 'white',
    textAlign: 'center',
    paddingTop: '2rem',
    fontSize: '1.2rem'
  },
  savingIndicator: {
    position: 'fixed', // O 'absolute' si prefieres
    top: '10px',
    right: '10px',
    background: 'rgba(255, 152, 0, 0.8)', // Naranja semitransparente
    color: '#0A1034',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    zIndex: 100,
  },
  // --- Estilos existentes (sin cambios) ---
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
    transition: 'all 0.3s ease',
    // Estilo disabled se añade en línea o con clases
    '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
    }
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
    cursor: 'pointer',
    '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
    }
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
    '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
    }
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    // Estilo disabled se aplica al input checkbox directamente
  },
  botonDesactivar: {
    backgroundColor: "#D9534F",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0.4rem 1rem",
    cursor: "pointer",
    marginTop: "1rem",
    '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
    }
  },
  botonActivar: {
    backgroundColor: "#5CB85C",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0.4rem 1rem",
    cursor: "pointer",
    marginTop: "1rem",
    '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
    }
  },
  // Botón Volver al final (comentado, usamos el absoluto)
  // botonVolver: {
  //   backgroundColor: "#806C4F",
  //   color: "#EFE4CF",
  //   border: "none",
  //   borderRadius: "12px",
  //   padding: "0.6rem 1.2rem",
  //   cursor: "pointer",
  //   display: "block",
  //   margin: "2rem auto 0",
  //   fontSize: "1rem",
  // },
};
