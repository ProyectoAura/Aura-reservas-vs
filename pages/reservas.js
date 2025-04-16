// pages/reservas.js

import { useState, useEffect } from "react";
// *** ¡Importante! Asegúrate que la ruta a tu config de Firebase sea la correcta ***
import { db } from "../firebase/firebaseConfig"; // Cambiado de ../lib/firebase
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
    horario: "", // Se seleccionará de la lista filtrada
    personas: "",
    restricciones: ""
  });

  // *** Estados para la configuración de turnos ***
  const [turnosConfig, setTurnosConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [errorConfig, setErrorConfig] = useState(null);
  // ---

  const edadMinima = 21;
  const seccion2RestriccionesActiva = false; // Mantienes tu lógica original aquí

  // *** Cargar Configuración de Turnos desde Firestore ***
  useEffect(() => {
    const fetchTurnosConfig = async () => {
      setLoadingConfig(true);
      setErrorConfig(null);
      const configDocRef = doc(db, "configuracionAura", "turnosHorarios");
      try {
        const docSnap = await getDoc(configDocRef);
        if (docSnap.exists()) {
          console.log("Configuración de turnos cargada:", docSnap.data());
          setTurnosConfig(docSnap.data());
        } else {
          console.warn("No se encontró configuración de turnos en Firestore. Se usarán horarios por defecto o ninguno.");
          // Podrías poner una configuración por defecto aquí si lo deseas
          setTurnosConfig({}); // O null, para indicar que no hay config
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

    fetchTurnosConfig();
  }, []); // Se ejecuta solo una vez al montar

  // *** Filtrar Horarios Disponibles cuando cambia la fecha o la configuración ***
  useEffect(() => {
    if (!form.fecha || !turnosConfig) {
      setHorariosDisponibles([]);
      return; // Salir si no hay fecha o configuración
    }

    try {
      // Asegurarse que la fecha tenga el formato correcto para new Date()
      // new Date('YYYY-MM-DD') puede dar problemas de timezone, es más seguro así:
      const parts = form.fecha.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Meses son 0-indexados
      const day = parseInt(parts[2], 10);
      const selectedDate = new Date(year, month, day);

      const dayName = getSpanishDayName(selectedDate);
      const configDia = turnosConfig[dayName];

      if (configDia && configDia.visible) {
        const disponibles = configDia.turnos
          .filter(turno => turno.activo) // Solo turnos activos
          .map(turno => turno.hora); // Extraer solo la hora
        setHorariosDisponibles(disponibles);

        // Si el horario seleccionado previamente ya no está disponible, resetearlo
        if (form.horario && !disponibles.includes(form.horario)) {
          setForm(prevForm => ({ ...prevForm, horario: "" }));
        }

      } else {
        // El día no está configurado o no está visible
        setHorariosDisponibles([]);
         if (form.horario) { // Resetear si había uno seleccionado
             setForm(prevForm => ({ ...prevForm, horario: "" }));
         }
      }
    } catch (e) {
      console.error("Error al procesar fecha o configuración:", e);
      setHorariosDisponibles([]); // En caso de error, no mostrar horarios
       if (form.horario) { // Resetear si había uno seleccionado
           setForm(prevForm => ({ ...prevForm, horario: "" }));
       }
    }

  }, [form.fecha, turnosConfig, form.horario]); // Depende de la fecha seleccionada y la config cargada

  // --- Tus funciones existentes (handleChange, setFechaRapida, calcularEdad, guardarReserva, etc.) ---
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const setFechaRapida = (tipo) => {
    const hoy = new Date();
    let fecha = new Date(); // Usar new Date() para evitar modificar 'hoy' directamente

    // Ajustar la fecha base para que sea hoy a las 00:00:00 para evitar problemas con horas
    fecha.setHours(0, 0, 0, 0);

    if (tipo === "manana") {
        fecha.setDate(fecha.getDate() + 1);
    } else if (tipo === "viernes") {
        const diaActual = fecha.getDay(); // 0 = Domingo, 1 = Lunes, ..., 5 = Viernes
        const diasHastaViernes = (5 - diaActual + 7) % 7;
        // Si hoy es viernes, queremos el *próximo* viernes (o hoy si es viernes)
        // Si hoy es sábado, queremos el próximo viernes
        // Si hoy es domingo, queremos el próximo viernes
        // Si hoy es lunes, queremos el viernes de esta semana
        if (diasHastaViernes === 0 && hoy.getDay() === 5) {
           // Hoy es viernes, se queda igual
        } else if (diasHastaViernes === 0 && hoy.getDay() !== 5) {
           // Si da 0 pero no es viernes (ej: sábado, domingo), sumar 7
           fecha.setDate(fecha.getDate() + 7);
        }
         else {
           fecha.setDate(fecha.getDate() + diasHastaViernes);
        }

    } else if (tipo === "sabado") {
        const diaActual = fecha.getDay(); // 0 = Domingo, ..., 6 = Sábado
        const diasHastaSabado = (6 - diaActual + 7) % 7;
         if (diasHastaSabado === 0 && hoy.getDay() === 6) {
           // Hoy es sábado, se queda igual
         } else if (diasHastaSabado === 0 && hoy.getDay() !== 6) {
            // Si da 0 pero no es sábado (ej: domingo), sumar 7
            fecha.setDate(fecha.getDate() + 7);
         }
         else {
           fecha.setDate(fecha.getDate() + diasHastaSabado);
         }
    }
     // Si tipo es "hoy", no hacemos nada, ya es la fecha actual

    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    setForm({ ...form, fecha: `${yyyy}-${mm}-${dd}` });
  };


  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 0; // Controlar si no hay fecha
    try {
      const hoy = new Date();
      const nacimiento = new Date(fechaNacimiento);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const m = hoy.getMonth() - nacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
      return edad;
    } catch (e) {
      console.error("Error calculando edad:", e);
      return 0; // Devolver 0 en caso de error
    }
  };

  const camposObligatorios = ["sector", "nombre", "dni", "nacimiento", "email", "telefono", "fecha", "horario", "personas"];

  const sectoresDisponibles = () => {
    // Esta lógica podría eventualmente leerse también de Seccion4 si la guardas en Firestore
    const cantidad = parseInt(form.personas);
    if (isNaN(cantidad) || cantidad < 1) return []; // Si no es un número válido o es 0

    const sectores = [];
    // Asumiendo capacidades fijas por ahora, idealmente vendrían de config
    if (cantidad >= 1) sectores.push("Terraza Descubierta"); // Capacidad flexible
    if (cantidad >= 1 && cantidad <= 8) sectores.push("Box Fuego"); // Capacidad 8
    if (cantidad >= 1 && cantidad <= 4) sectores.push("Mesas Cascadas 1"); // Capacidad 4
    if (cantidad >= 1 && cantidad <= 4) sectores.push("Mesas Cascadas 2"); // Capacidad 4
    // Podrías añadir lógica para "Terraza Semicubierta" si agrupa zonas

    // Eliminar duplicados si los hubiera
    return [...new Set(sectores)];
  };


  const guardarReserva = async () => {
    const edad = calcularEdad(form.nacimiento);
    if (edad < edadMinima) {
      alert(`Debés ser mayor de ${edadMinima} años para reservar.`);
      return;
    }

    // Validar campos obligatorios
    for (const campo of camposObligatorios) {
      const valor = form[campo];
      let esInvalido = !valor; // Chequeo básico si está vacío

      if (campo === "personas" && valor !== "evento_privado") {
        const numPersonas = parseInt(valor);
        esInvalido = isNaN(numPersonas) || numPersonas < 1 || numPersonas > 10; // Ajusta el 10 si es necesario
      }
       // Si el campo es 'sector' y las personas son 'evento_privado', no es obligatorio
       if (campo === "sector" && form.personas === "evento_privado") {
           esInvalido = false;
       }


      if (esInvalido) {
        let mensaje = `El campo "${campo}" es obligatorio y debe tener un valor válido.`;
        if (campo === "personas") mensaje = "La cantidad de personas debe ser entre 1 y 10, o seleccionar Evento privado.";
        if (campo === "horario") mensaje = "Debes seleccionar un horario disponible para la fecha elegida.";
        if (campo === "sector" && form.personas !== "evento_privado") mensaje = "Debes seleccionar un sector disponible para la cantidad de personas.";

        alert(mensaje);
        return; // Detener el proceso si un campo es inválido
      }
    }


    // Si todo es válido, proceder a guardar
    try {
      const datosReserva = {
        nombre: form.nombre,
        dni: form.dni,
        fecha_nacimiento: form.nacimiento,
        email: form.email,
        telefono: form.telefono,
        sector: form.personas === "evento_privado" ? "Evento Privado" : form.sector, // Ajustar sector para evento
        restricciones: form.restricciones,
        fecha: form.fecha,
        horario: form.horario,
        personas: form.personas === "evento_privado" ? "Evento Privado" : parseInt(form.personas),
        estado: "confirmada", // O 'pendiente' si requiere confirmación
        creada_en: Timestamp.now()
      };

      await addDoc(collection(db, "reservas"), datosReserva);

      // Envío de emails (tu lógica existente)
      const templateParams = {
        to_name: form.nombre,
        to_email: form.email,
        sector: datosReserva.sector, // Usar el dato guardado
        fecha: form.fecha,
        horario: form.horario,
        personas: datosReserva.personas // Usar el dato guardado
      };

      const adminParams = {
        to_name: "Recepcion Aura",
        to_email: "recepcion@aura.com", // Cambiar si es necesario
        sector: datosReserva.sector,
        fecha: form.fecha,
        horario: form.horario,
        personas: datosReserva.personas,
        nombre_cliente: form.nombre,
        telefono: form.telefono,
        email_cliente: form.email,
        restricciones: form.restricciones || "Ninguna" // Incluir restricciones
      };

      // Asegúrate que los IDs de servicio y template sean correctos
      emailjs.send('service_6ds4u72', 'template_1138upp', templateParams, 'X8oYjznwltzuEDFa8')
        .then(res => console.log("Email cliente enviado:", res.status))
        .catch(err => console.error("Error email cliente:", err));

      emailjs.send('service_6ds4u72', 'template_e0y60yf', adminParams, 'X8oYjznwltzuEDFa8')
       .then(res => console.log("Email admin enviado:", res.status))
       .catch(err => console.error("Error email admin:", err));


      alert("¡Reserva confirmada! Recibirás un email con los detalles.");
      // Resetear formulario
      setForm({ nombre: "", dni: "", nacimiento: "", email: "", telefono: "", sector: "", restricciones: "", fecha: "", horario: "", personas: "" });
      setHorariosDisponibles([]); // Limpiar horarios disponibles también

    } catch (error) {
      console.error("Error al guardar la reserva:", error);
      alert("Hubo un problema al procesar tu reserva. Por favor, intenta nuevamente o contacta soporte.");
    }
  };
  // --- Fin de tus funciones existentes ---

  return (
    <div style={estiloContenedor}>
      <h1 style={estiloTitulo}>BIENVENIDOS</h1>

      {/* --- Tus Inputs existentes --- */}
      <span>Información personal:</span>
      <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre y Apellido" style={estiloInput} />
      <input name="dni" value={form.dni} onChange={handleChange} placeholder="DNI" style={estiloInput} />
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ minWidth: "70px", fontSize: "0.9rem" }}>Nacimiento (+{edadMinima}):</span>
        <input
          name="nacimiento"
          value={form.nacimiento}
          onChange={handleChange}
          type="date"
          placeholder="Fecha de nacimiento"
          style={{ ...estiloInput, flex: 1 }}
          max={new Date(new Date().setFullYear(new Date().getFullYear() - edadMinima)).toISOString().split("T")[0]} // Max date based on min age
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
          min={new Date().toISOString().split("T")[0]} // No permitir fechas pasadas
        />
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem", justifyContent: "center" }}>
        <button onClick={() => setFechaRapida("hoy")} style={estiloBotonSecundario}>Hoy</button>
        <button onClick={() => setFechaRapida("manana")} style={estiloBotonSecundario}>Mañana</button>
        <button onClick={() => setFechaRapida("viernes")} style={estiloBotonSecundario}>Próx. Viernes</button>
        <button onClick={() => setFechaRapida("sabado")} style={estiloBotonSecundario}>Próx. Sábado</button>
      </div>

      {/* --- Select de Horario Modificado --- */}
      <select
        name="horario"
        value={form.horario}
        onChange={handleChange}
        style={estiloInput}
        disabled={loadingConfig || !form.fecha} // Deshabilitar si carga o no hay fecha
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
      {/* Muestra error si no se pudo cargar la config */}
      {errorConfig && <p style={{ color: 'red', fontSize: '0.8rem', textAlign: 'center' }}>{errorConfig}</p>}

      {/* --- Tus Selects/Inputs restantes --- */}
      <select name="personas" value={form.personas} onChange={handleChange} style={estiloInput}>
        <option value="" disabled hidden>Seleccioná cantidad</option>
        {[...Array(10)].map((_, i) => ( // Asumiendo máximo 10, ajustar si es necesario
          <option key={i + 1} value={i + 1}>{i + 1} persona{i > 0 ? 's' : ''}</option>
        ))}
        <option value="evento_privado">Evento privado (+10)</option>
      </select>

      {/* Select de Sector: Solo mostrar si se eligió cantidad y no es evento privado */}
      {form.personas && form.personas !== "evento_privado" && (
        <select
          name="sector"
          value={form.sector}
          onChange={handleChange}
          style={estiloInput}
          disabled={sectoresDisponibles().length === 0} // Deshabilitar si no hay sectores para esa cantidad
        >
          <option value="" disabled hidden>
            {sectoresDisponibles().length === 0 ? "No hay sectores para esa cantidad" : "Seleccioná un sector"}
          </option>
          {sectoresDisponibles().map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      {/* Mensaje para evento privado */}
      {form.personas === "evento_privado" && (
        <div style={{ color: "#EFE4CF", fontSize: "0.9rem", textAlign: "center", padding: "0.5rem", background: "#1C2340", borderRadius: "8px" }}>
          Para eventos privados (+10 personas), por favor contáctanos vía <a href="https://wa.me/549XXXXXXXXXX" target="_blank" rel="noopener noreferrer" style={{ color: "#D3C6A3", textDecoration: "underline", fontWeight: "bold" }}>WhatsApp</a> para coordinar detalles y disponibilidad.
        </div>
      )}

      {/* Input de Restricciones (si está activo) */}
      {seccion2RestriccionesActiva && (
        <input name="restricciones" value={form.restricciones} onChange={handleChange} placeholder="Alergias / Restricciones (opcional)" style={estiloInput} />
      )}

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
