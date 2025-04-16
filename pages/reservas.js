// pages/reservas.js

import { useState, useEffect } from "react"; // Añadido useEffect
// *** ¡Importante! Corregir la importación de db y añadir funciones Firestore ***
import { db } from "../firebase/firebaseConfig"; // CORREGIDO: Usar la config centralizada
import { collection, addDoc, Timestamp, doc, getDoc } from "firebase/firestore"; // Añadido doc y getDoc
import emailjs from '@emailjs/browser';

// Helper para obtener el nombre del día en español (como en Seccion3)
const getSpanishDayName = (date) => {
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return days[date.getDay()];
};

export default function Reservas() {
  // Estado del formulario
  const [form, setForm] = useState({
    sector: "",
    nombre: "",
    dni: "",
    nacimiento: "",
    email: "",
    telefono: "",
    fecha: "",
    horario: "",
    personas: "",
    restricciones: ""
  });

  // *** Estado para Edad Mínima cargada desde Firestore ***
  const [edadMinimaConfig, setEdadMinimaConfig] = useState(21); // Valor por defecto inicial
  const [loadingEdad, setLoadingEdad] = useState(true);
  const [errorEdad, setErrorEdad] = useState(null);
  // ---

  // Estados para la configuración de turnos (sin cambios)
  const [turnosConfig, setTurnosConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [errorConfig, setErrorConfig] = useState(null);

  const seccion2RestriccionesActiva = false; // Mantienes tu lógica original aquí

  // --- Referencia al documento de configuración general ---
  const configDocRef = doc(db, "configuracionAura", "ajustesGenerales");
  // ---

  // *** Cargar Edad Mínima y Configuración de Turnos desde Firestore ***
  useEffect(() => {
    const fetchConfig = async () => {
      setLoadingEdad(true);
      setLoadingConfig(true);
      setErrorEdad(null);
      setErrorConfig(null);

      // Referencias
      const edadConfigRef = doc(db, "configuracionAura", "ajustesGenerales");
      const turnosConfigRef = doc(db, "configuracionAura", "turnosHorarios");

      try {
        // Cargar Edad Mínima
        const edadSnap = await getDoc(edadConfigRef);
        if (edadSnap.exists() && edadSnap.data().edadMinima !== undefined) {
          setEdadMinimaConfig(edadSnap.data().edadMinima);
          console.log("Edad mínima cargada:", edadSnap.data().edadMinima);
        } else {
          setEdadMinimaConfig(21); // Valor por defecto
          console.log("Usando edad mínima por defecto (21).");
        }
      } catch (error) {
        console.error("Error al cargar edad mínima:", error);
        setErrorEdad("Error cargando edad mínima.");
        setEdadMinimaConfig(21); // Usar defecto en error
      } finally {
        setLoadingEdad(false);
      }

      try {
        // Cargar Config Turnos (tu lógica existente)
        const turnosSnap = await getDoc(turnosConfigRef);
        if (turnosSnap.exists()) {
          console.log("Configuración de turnos cargada:", turnosSnap.data());
          setTurnosConfig(turnosSnap.data());
        } else {
          console.warn("No se encontró configuración de turnos en Firestore.");
          setTurnosConfig({});
          setErrorConfig("No se pudo cargar la configuración de horarios.");
        }
      } catch (error) {
        console.error("Error al cargar configuración de turnos:", error);
        setErrorConfig("Error cargando configuración de horarios.");
        setTurnosConfig(null);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();
  }, []); // Se ejecuta solo una vez al montar

  // *** Filtrar Horarios Disponibles (sin cambios en esta lógica) ***
  useEffect(() => {
    if (!form.fecha || !turnosConfig) {
      setHorariosDisponibles([]);
      return;
    }
    try {
      const parts = form.fecha.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const selectedDate = new Date(year, month, day);
      const dayName = getSpanishDayName(selectedDate);
      const configDia = turnosConfig[dayName];

      if (configDia && configDia.visible) {
        const disponibles = configDia.turnos
          .filter(turno => turno.activo)
          .map(turno => turno.hora);
        setHorariosDisponibles(disponibles);
        if (form.horario && !disponibles.includes(form.horario)) {
          setForm(prevForm => ({ ...prevForm, horario: "" }));
        }
      } else {
        setHorariosDisponibles([]);
         if (form.horario) {
             setForm(prevForm => ({ ...prevForm, horario: "" }));
         }
      }
    } catch (e) {
      console.error("Error al procesar fecha o configuración:", e);
      setHorariosDisponibles([]);
       if (form.horario) {
           setForm(prevForm => ({ ...prevForm, horario: "" }));
       }
    }
  }, [form.fecha, turnosConfig, form.horario]);

  // --- Tus funciones existentes (handleChange, setFechaRapida, etc.) ---
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const setFechaRapida = (tipo) => {
    // Tu lógica existente (sin cambios)
    const hoy = new Date();
    let fecha = new Date();
    fecha.setHours(0, 0, 0, 0);
    if (tipo === "manana") {
        fecha.setDate(fecha.getDate() + 1);
    } else if (tipo === "viernes") {
        const diaActual = fecha.getDay();
        const diasHastaViernes = (5 - diaActual + 7) % 7;
        if (diasHastaViernes === 0 && hoy.getDay() === 5) {}
        else if (diasHastaViernes === 0 && hoy.getDay() !== 5) { fecha.setDate(fecha.getDate() + 7); }
        else { fecha.setDate(fecha.getDate() + diasHastaViernes); }
    } else if (tipo === "sabado") {
        const diaActual = fecha.getDay();
        const diasHastaSabado = (6 - diaActual + 7) % 7;
         if (diasHastaSabado === 0 && hoy.getDay() === 6) {}
         else if (diasHastaSabado === 0 && hoy.getDay() !== 6) { fecha.setDate(fecha.getDate() + 7); }
         else { fecha.setDate(fecha.getDate() + diasHastaSabado); }
    }
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    setForm({ ...form, fecha: `${yyyy}-${mm}-${dd}` });
  };

  // *** Usar edadMinimaConfig ***
  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 0;
    try {
      const hoy = new Date();
      // Asegurar formato YYYY-MM-DD para new Date()
      const parts = fechaNacimiento.split('-');
      if (parts.length !== 3) return 0; // Formato inválido
      const nacimiento = new Date(parts[0], parts[1] - 1, parts[2]);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const m = hoy.getMonth() - nacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
      return edad;
    } catch (e) {
      console.error("Error calculando edad:", e);
      return 0;
    }
  };

  const camposObligatorios = ["sector", "nombre", "dni", "nacimiento", "email", "telefono", "fecha", "horario", "personas"];

  const sectoresDisponibles = () => {
    // Tu lógica existente (sin cambios)
    // Idealmente, esto también leería de Firestore (Seccion4)
    const cantidad = parseInt(form.personas);
    if (isNaN(cantidad) || cantidad < 1) return [];
    const sectores = [];
    if (cantidad >= 1) sectores.push("Terraza Descubierta");
    if (cantidad >= 1 && cantidad <= 8) sectores.push("Box Fuego");
    if (cantidad >= 1 && cantidad <= 4) sectores.push("Mesas Cascadas 1");
    if (cantidad >= 1 && cantidad <= 4) sectores.push("Mesas Cascadas 2");
    return [...new Set(sectores)];
  };

  // *** Modificar guardarReserva para usar edadMinimaConfig y llamar a Cloud Function ***
  const guardarReserva = async () => {
    // *** Usar edadMinimaConfig para la validación ***
    const edad = calcularEdad(form.nacimiento);
    if (edad < edadMinimaConfig) {
      alert(`Debés ser mayor de ${edadMinimaConfig} años para reservar.`);
      return;
    }

    // Validación de campos obligatorios (sin cambios aquí, pero la validación de edad ya usa la config)
    for (const campo of camposObligatorios) {
      const valor = form[campo];
      let esInvalido = !valor;
      if (campo === "personas" && valor !== "evento_privado") {
        const numPersonas = parseInt(valor);
        esInvalido = isNaN(numPersonas) || numPersonas < 1 || numPersonas > 10;
      }
       if (campo === "sector" && form.personas === "evento_privado") { esInvalido = false; }
      if (esInvalido) {
        let mensaje = `El campo "${campo}" es obligatorio y debe tener un valor válido.`;
        if (campo === "personas") mensaje = "La cantidad de personas debe ser entre 1 y 10, o seleccionar Evento privado.";
        if (campo === "horario") mensaje = "Debes seleccionar un horario disponible para la fecha elegida.";
        if (campo === "sector" && form.personas !== "evento_privado") mensaje = "Debes seleccionar un sector disponible para la cantidad de personas.";
        alert(mensaje);
        return;
      }
    }

    // *** AQUÍ: Llamada a la Cloud Function (en lugar de addDoc directo) ***
    console.log("Preparando para llamar a Cloud Function con:", form);
    alert("FUNCIONALIDAD EN DESARROLLO: Llamada a Cloud Function para validar capacidad y guardar.");

    // --- Código COMENTADO para guardar directamente (será reemplazado por fetch a Cloud Function) ---
    /*
    try {
      const datosReserva = {
        nombre: form.nombre,
        dni: form.dni,
        fecha_nacimiento: form.nacimiento,
        email: form.email,
        telefono: form.telefono,
        sector: form.personas === "evento_privado" ? "Evento Privado" : form.sector,
        restricciones: form.restricciones,
        fecha: form.fecha,
        horario: form.horario,
        personas: form.personas === "evento_privado" ? "Evento Privado" : parseInt(form.personas),
        estado: "confirmada",
        creada_en: Timestamp.now()
      };

      await addDoc(collection(db, "reservas"), datosReserva);

      // Envío de emails (tu lógica existente)
      const templateParams = { ... };
      const adminParams = { ... };
      emailjs.send(...);
      emailjs.send(...);

      alert("¡Reserva confirmada! Recibirás un email con los detalles.");
      setForm({ nombre: "", dni: "", nacimiento: "", email: "", telefono: "", sector: "", restricciones: "", fecha: "", horario: "", personas: "" });
      setHorariosDisponibles([]);

    } catch (error) {
      console.error("Error al guardar la reserva:", error);
      alert("Hubo un problema al procesar tu reserva. Por favor, intenta nuevamente o contacta soporte.");
    }
    */
    // --- Fin del código comentado ---
  };
  // --- Fin de guardarReserva ---

  // --- Renderizado ---
  return (
    <div style={estiloContenedor}>
      <h1 style={estiloTitulo}>BIENVENIDOS</h1>

      {/* Mostrar error si no se pudo cargar la edad mínima */}
      {errorEdad && <p style={{ color: 'red', fontSize: '0.8rem', textAlign: 'center' }}>{errorEdad}</p>}

      <span>Información personal:</span>
      <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre y Apellido" style={estiloInput} />
      <input name="dni" value={form.dni} onChange={handleChange} placeholder="DNI" style={estiloInput} />

      {/* Input Nacimiento: Actualizar label y max date */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {/* *** Usar edadMinimaConfig en el label *** */}
        <span style={{ minWidth: "70px", fontSize: "0.9rem" }}>
          {loadingEdad ? "Cargando..." : `+${edadMinimaConfig} años`}
        </span>
        <input
          name="nacimiento"
          value={form.nacimiento}
          onChange={handleChange}
          type="date"
          placeholder="Fecha de nacimiento"
          style={{ ...estiloInput, flex: 1 }}
          // *** Usar edadMinimaConfig para calcular max date ***
          max={
            loadingEdad ? undefined : // No poner max si aún carga
            new Date(new Date().setFullYear(new Date().getFullYear() - edadMinimaConfig)).toISOString().split("T")[0]
          }
          disabled={loadingEdad} // Deshabilitar si carga
        />
      </div>

      <span>Información de contacto:</span>
      <input name="email" value={form.email} onChange={handleChange} type="email" placeholder="Email" style={estiloInput} />
      <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" style={estiloInput} />

      <span>Confirmación de reserva:</span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <label htmlFor="fechaReserva" style={{ minWidth: "100px", fontSize: "0.9rem" }}>Elegí una fecha:</label>
        <input
          id="fechaReserva"
          name="fecha"
          value={form.fecha}
          onChange={handleChange}
          type="date"
          placeholder="Fecha de reserva"
          style={{ ...estiloInput, flex: 1 }}
          min={new Date().toISOString().split("T")[0]}
        />
      </div>

      {/* Botones Fecha Rápida (sin cambios) */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem", justifyContent: "center" }}>
        <button onClick={() => setFechaRapida("hoy")} style={estiloBotonSecundario}>Hoy</button>
        <button onClick={() => setFechaRapida("manana")} style={estiloBotonSecundario}>Mañana</button>
        <button onClick={() => setFechaRapida("viernes")} style={estiloBotonSecundario}>Próx. Viernes</button>
        <button onClick={() => setFechaRapida("sabado")} style={estiloBotonSecundario}>Próx. Sábado</button>
      </div>

      {/* Select de Horario (sin cambios aquí, ya usa la config cargada) */}
      <select
        name="horario"
        value={form.horario}
        onChange={handleChange}
        style={estiloInput}
        disabled={loadingConfig || !form.fecha}
      >
        <option value="" disabled hidden>
          {loadingConfig ? "Cargando horarios..." : !form.fecha ? "Seleccioná una fecha primero" : "Seleccioná un horario"}
        </option>
        {!loadingConfig && form.fecha && horariosDisponibles.length === 0 && (
          <option value="" disabled>No hay turnos disponibles este día</option>
        )}
        {horariosDisponibles.map((hora) => (
          <option key={hora} value={hora}>{hora}</option>
        ))}
      </select>
      {errorConfig && <p style={{ color: 'red', fontSize: '0.8rem', textAlign: 'center' }}>{errorConfig}</p>}

      {/* Select Personas (sin cambios) */}
      <select name="personas" value={form.personas} onChange={handleChange} style={estiloInput}>
        <option value="" disabled hidden>Seleccioná cantidad</option>
        {[...Array(10)].map((_, i) => (
          <option key={i + 1} value={i + 1}>{i + 1} persona{i > 0 ? 's' : ''}</option>
        ))}
        <option value="evento_privado">Evento privado (+10)</option>
      </select>

      {/* Select Sector (sin cambios) */}
      {form.personas && form.personas !== "evento_privado" && (
        <select
          name="sector"
          value={form.sector}
          onChange={handleChange}
          style={estiloInput}
          disabled={sectoresDisponibles().length === 0}
        >
          <option value="" disabled hidden>
            {sectoresDisponibles().length === 0 ? "No hay sectores para esa cantidad" : "Seleccioná un sector"}
          </option>
          {sectoresDisponibles().map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      {/* Mensaje Evento Privado (sin cambios) */}
      {form.personas === "evento_privado" && (
        <div style={{ color: "#EFE4CF", fontSize: "0.9rem", textAlign: "center", padding: "0.5rem", background: "#1C2340", borderRadius: "8px" }}>
          Para eventos privados (+10 personas), por favor contáctanos vía <a href="https://wa.me/549XXXXXXXXXX" target="_blank" rel="noopener noreferrer" style={{ color: "#D3C6A3", textDecoration: "underline", fontWeight: "bold" }}>WhatsApp</a> para coordinar detalles y disponibilidad.
        </div>
      )}

      {/* Input Restricciones (sin cambios) */}
      {seccion2RestriccionesActiva && (
        <input name="restricciones" value={form.restricciones} onChange={handleChange} placeholder="Alergias / Restricciones (opcional)" style={estiloInput} />
      )}

      {/* Botón Confirmar Reserva (sin cambios aquí, la lógica está en la función) */}
      <button onClick={guardarReserva} style={estiloBoton}>Confirmar Reserva</button>
    </div>
  );
}

// --- Tus Estilos (sin cambios) ---
const estiloContenedor = {
  minHeight: "100vh",
  backgroundColor: "#0A1034",
  color: "#EFE4CF",
  padding: "2rem",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  maxWidth: "600px",
  margin: "0 auto",
  fontFamily: "sans-serif"
};

const estiloTitulo = {
  fontSize: "2.5rem",
  textAlign: "center",
  color: "#D3C6A3",
  marginBottom: "1.5rem",
  letterSpacing: "2px"
};

const estiloInput = {
  padding: "0.8rem",
  borderRadius: "12px",
  border: "1px solid #D3C6A3",
  backgroundColor: "#EFE4CF",
  color: "#2C1B0F",
  fontSize: "1rem"
};

const estiloBoton = {
  padding: "1rem",
  backgroundColor: "#806C4F",
  color: "white",
  fontWeight: "bold",
  borderRadius: "12px",
  border: "none",
  marginTop: "1rem",
  cursor: "pointer",
  transition: "background-color 0.2s ease", // Efecto hover
};
// Añadir estilo hover al botón principal si quieres
// estiloBoton[':hover'] = { backgroundColor: "#6a5a40" }; // Ejemplo

const estiloBotonSecundario = {
  padding: "0.5rem 1rem",
  backgroundColor: "#1C2340", // Color diferente para destacar menos
  color: "#EFE4CF",
  border: "1px solid #806C4F", // Borde sutil
  borderRadius: "8px",
  cursor: "pointer",
  transition: "background-color 0.2s ease",
};
// Añadir estilo hover al botón secundario
// estiloBotonSecundario[':hover'] = { backgroundColor: "#2a3457" }; // Ejemplo
