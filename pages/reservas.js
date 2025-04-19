// pages/reservas.js
import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig"; // Asegúrate que esta ruta sea correcta
import { collection, addDoc, Timestamp, doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import emailjs from '@emailjs/browser';

// Helper para obtener el nombre del día en español
const getSpanishDayName = (date) => {
  if (!(date instanceof Date)) {
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const parts = date.split('-');
      // Usar UTC para evitar problemas de timezone al determinar el día
      date = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    } else {
      console.error("Fecha inválida para getSpanishDayName:", date);
      return "ErrorDia";
    }
  }
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  // getUTCDay() es consistente con la fecha creada con Date.UTC
  return days[date.getUTCDay()];
};


export default function Reservas() {
  // --- Estados (sin cambios) ---
  const [form, setForm] = useState({ sector: "", nombre: "", dni: "", nacimiento: "", email: "", telefono: "", fecha: "", horario: "", personas: "", restricciones: "" });
  const [edadMinimaConfig, setEdadMinimaConfig] = useState(21);
  const [loadingEdad, setLoadingEdad] = useState(true);
  const [errorEdad, setErrorEdad] = useState(null);
  const [turnosConfig, setTurnosConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [errorConfig, setErrorConfig] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const seccion2RestriccionesActiva = false; // Asumo que esto se controla desde otro lado

  // --- Carga Inicial (sin cambios) ---
  useEffect(() => {
    const fetchConfig = async () => {
      setLoadingEdad(true); setLoadingConfig(true); setErrorEdad(null); setErrorConfig(null);
      const edadConfigRef = doc(db, "configuracionAura", "ajustesGenerales");
      const turnosConfigRef = doc(db, "configuracionAura", "turnosHorarios");
      try {
        const edadSnap = await getDoc(edadConfigRef);
        if (edadSnap.exists() && edadSnap.data().edadMinima !== undefined) {
          setEdadMinimaConfig(edadSnap.data().edadMinima); console.log("Edad mínima cargada:", edadSnap.data().edadMinima);
        } else { setEdadMinimaConfig(21); console.log("Usando edad mínima por defecto (21)."); }
      } catch (error) { console.error("Error al cargar edad mínima:", error); setErrorEdad("Error cargando edad mínima."); setEdadMinimaConfig(21); }
      finally { setLoadingEdad(false); }
      try {
        const turnosSnap = await getDoc(turnosConfigRef);
        if (turnosSnap.exists()) { console.log("Configuración de turnos cargada:", turnosSnap.data()); setTurnosConfig(turnosSnap.data()); }
        else { console.warn("No se encontró configuración de turnos en Firestore."); setTurnosConfig({}); setErrorConfig("No se pudo cargar la configuración de horarios."); }
      } catch (error) { console.error("Error al cargar configuración de turnos:", error); setErrorConfig("Error cargando configuración de horarios."); setTurnosConfig(null); }
      finally { setLoadingConfig(false); }
    };
    fetchConfig();
  }, []);

  // --- Filtrar Horarios Disponibles (sin cambios) ---
  useEffect(() => {
    if (!form.fecha || !turnosConfig) { setHorariosDisponibles([]); return; }
    try {
      // No es necesario crear Date object aquí, getSpanishDayName lo maneja
      const dayName = getSpanishDayName(form.fecha);
      if (dayName === "ErrorDia") { setHorariosDisponibles([]); if (form.horario) setForm(prevForm => ({ ...prevForm, horario: "" })); return; }
      const configDia = turnosConfig[dayName];
      if (configDia && configDia.visible) {
        const disponibles = configDia.turnos.filter(turno => turno.activo).map(turno => turno.hora);
        setHorariosDisponibles(disponibles);
        if (form.horario && !disponibles.includes(form.horario)) { setForm(prevForm => ({ ...prevForm, horario: "" })); }
      } else { setHorariosDisponibles([]); if (form.horario) { setForm(prevForm => ({ ...prevForm, horario: "" })); } }
    } catch (e) { console.error("Error al procesar fecha o configuración:", e); setHorariosDisponibles([]); if (form.horario) { setForm(prevForm => ({ ...prevForm, horario: "" })); } }
  }, [form.fecha, turnosConfig, form.horario]);

  // --- Funciones Auxiliares (sin cambios) ---
  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); };
  const setFechaRapida = (tipo) => { const hoy = new Date(); let fecha = new Date(); fecha.setHours(0, 0, 0, 0); if (tipo === "manana") { fecha.setDate(fecha.getDate() + 1); } else if (tipo === "viernes") { const diaActual = fecha.getDay(); const diasHastaViernes = (5 - diaActual + 7) % 7; if (diasHastaViernes === 0 && hoy.getDay() === 5) {} else if (diasHastaViernes === 0 && hoy.getDay() !== 5) { fecha.setDate(fecha.getDate() + 7); } else { fecha.setDate(fecha.getDate() + diasHastaViernes); } } else if (tipo === "sabado") { const diaActual = fecha.getDay(); const diasHastaSabado = (6 - diaActual + 7) % 7; if (diasHastaSabado === 0 && hoy.getDay() === 6) {} else if (diasHastaSabado === 0 && hoy.getDay() !== 6) { fecha.setDate(fecha.getDate() + 7); } else { fecha.setDate(fecha.getDate() + diasHastaSabado); } } const yyyy = fecha.getFullYear(); const mm = String(fecha.getMonth() + 1).padStart(2, '0'); const dd = String(fecha.getDate()).padStart(2, '0'); setForm({ ...form, fecha: `${yyyy}-${mm}-${dd}` }); };
  const calcularEdad = (fechaNacimiento) => { if (!fechaNacimiento) return 0; try { const hoy = new Date(); const parts = fechaNacimiento.split('-'); if (parts.length !== 3) return 0; const nacimiento = new Date(parts[0], parts[1] - 1, parts[2]); let edad = hoy.getFullYear() - nacimiento.getFullYear(); const m = hoy.getMonth() - nacimiento.getMonth(); if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--; return edad; } catch (e) { console.error("Error calculando edad:", e); return 0; } };
  const camposObligatoriosBase = ["nombre", "dni", "nacimiento", "email", "telefono", "fecha", "horario", "personas"];
  const getCamposObligatorios = () => { if (form.personas === "evento_privado") { return camposObligatoriosBase; } return [...camposObligatoriosBase, "sector"]; }
  const sectoresDisponibles = () => { const cantidad = parseInt(form.personas); if (isNaN(cantidad) || cantidad < 1) return []; const sectores = []; if (cantidad >= 1) sectores.push("Terraza Descubierta"); if (cantidad >= 1 && cantidad <= 8) sectores.push("Box Fuego"); if (cantidad >= 1 && cantidad <= 4) sectores.push("Mesas Cascadas 1"); if (cantidad >= 1 && cantidad <= 4) sectores.push("Mesas Cascadas 2"); return [...new Set(sectores)]; };

  // --- Función guardarReserva con Transacción ---
  const guardarReserva = async () => {
    setGuardando(true);

    // --- Validación Previa (sin cambios) ---
    const edad = calcularEdad(form.nacimiento);
    if (!loadingEdad && edad < edadMinimaConfig) { alert(`Debés ser mayor de ${edadMinimaConfig} años para reservar.`); setGuardando(false); return; }
    const camposActualesObligatorios = getCamposObligatorios();
    for (const campo of camposActualesObligatorios) { const valor = form[campo]; let esInvalido = !valor; if (campo === "personas" && valor !== "evento_privado") { const numPersonas = parseInt(valor); esInvalido = isNaN(numPersonas) || numPersonas < 1 || numPersonas > 10; } if (esInvalido) { let mensaje = `El campo "${campo}" es obligatorio y debe tener un valor válido.`; if (campo === "personas") mensaje = "La cantidad de personas debe ser entre 1 y 10, o seleccionar Evento privado."; if (campo === "horario") mensaje = "Debes seleccionar un horario disponible para la fecha elegida."; if (campo === "sector") mensaje = "Debes seleccionar un sector disponible para la cantidad de personas."; alert(mensaje); setGuardando(false); return; } }
    if (!horariosDisponibles.includes(form.horario)) { alert("El horario seleccionado no está disponible para la fecha elegida."); setGuardando(false); return; }
    if (form.personas !== "evento_privado" && !sectoresDisponibles().includes(form.sector)) { alert("El sector seleccionado no está disponible para la cantidad de personas."); setGuardando(false); return; }
    const personasNum = form.personas === "evento_privado" ? 0 : parseInt(form.personas);
    if (form.personas !== "evento_privado" && (isNaN(personasNum) || personasNum <= 0)) { alert("Cantidad de personas inválida."); setGuardando(false); return; }

    // --- Ejecutar Transacción ---
    try {
      await runTransaction(db, async (transaction) => {
        console.log("Iniciando transacción...");
        const configTurnosRef = doc(db, "configuracionAura", "turnosHorarios");
        const configTurnosSnap = await transaction.get(configTurnosRef);
        if (!configTurnosSnap.exists()) { throw new Error("No se encontró la configuración de turnos."); }
        const configData = configTurnosSnap.data();

        // *** OBTENER DÍA DE LA SEMANA PARA LA REGLA ***
        const diaSemanaCalculado = getSpanishDayName(form.fecha);
        if (diaSemanaCalculado === "ErrorDia") {
            throw new Error("La fecha seleccionada no es válida.");
        }
        // **********************************************

        const configDia = configData[diaSemanaCalculado]; // Usar el día calculado
        if (!configDia || !configDia.visible) { throw new Error("El día seleccionado no está disponible para reservas."); }
        const configTurno = configDia.turnos.find(t => t.hora === form.horario);
        if (!configTurno || !configTurno.activo) { throw new Error("El horario seleccionado no está activo para este día."); }
        const capacidadMaxima = configTurno.capacidad;
        if (typeof capacidadMaxima !== 'number' || capacidadMaxima < 0) { throw new Error("Error interno: Capacidad del turno no definida correctamente."); }
        console.log(`Capacidad máxima para ${diaSemanaCalculado} ${form.horario}: ${capacidadMaxima}`);
        const contadorId = `${form.fecha}_${form.horario.replace(":", "")}`;
        const contadorRef = doc(db, "ocupacionTurnos", contadorId);
        const contadorSnap = await transaction.get(contadorRef);
        let ocupacionActual = 0;
        if (contadorSnap.exists()) { ocupacionActual = contadorSnap.data().totalPersonas || 0; }
        console.log(`Ocupación actual para ${contadorId}: ${ocupacionActual}`);
        if (form.personas !== "evento_privado") {
            const nuevaOcupacion = ocupacionActual + personasNum;
            console.log(`Verificando: ${ocupacionActual} + ${personasNum} <= ${capacidadMaxima}`);
            if (nuevaOcupacion > capacidadMaxima) { throw new Error(`Lo sentimos, no hay suficiente capacidad para ${personasNum} persona(s) en este horario. Quedan ${capacidadMaxima - ocupacionActual} lugares.`); }
            if (contadorSnap.exists()) { transaction.update(contadorRef, { totalPersonas: nuevaOcupacion }); console.log(`Actualizando contador ${contadorId} a ${nuevaOcupacion}`); }
            else { transaction.set(contadorRef, { totalPersonas: nuevaOcupacion, fecha: form.fecha, horario: form.horario }); console.log(`Creando contador ${contadorId} con ${nuevaOcupacion}`); }
        } else { console.log("Reserva de evento privado, no se actualiza contador de ocupación."); }

        // *** AÑADIR diaSemana A LOS DATOS GUARDADOS ***
        const nuevaReservaRef = doc(collection(db, "reservasAura"));
        const datosReservaParaGuardar = {
          nombre: form.nombre.trim(), dni: form.dni.trim(), nacimiento: form.nacimiento, email: form.email.trim(), telefono: form.telefono.trim(),
          fecha: form.fecha, horario: form.horario,
          diaSemana: diaSemanaCalculado, // <<< CAMPO AÑADIDO
          personas: form.personas === "evento_privado" ? "Evento Privado" : personasNum,
          sector: form.personas === "evento_privado" ? "Evento Privado" : form.sector, restricciones: form.restricciones.trim() || null,
          estado: "confirmada", fechaCreacion: serverTimestamp()
        };
        // ********************************************

        transaction.set(nuevaReservaRef, datosReservaParaGuardar);
        console.log(`Creando reserva ${nuevaReservaRef.id}`);
      });

      // --- Éxito de la Transacción (sin cambios) ---
      console.log("Transacción completada con éxito.");
      alert("¡Reserva confirmada con éxito!");
      const datosReservaGuardada = { ...form, personas: form.personas === "evento_privado" ? "Evento Privado" : parseInt(form.personas), sector: form.personas === "evento_privado" ? "Evento Privado" : form.sector, };
      const templateParams = { to_name: form.nombre, to_email: form.email, sector: datosReservaGuardada.sector, fecha: form.fecha, horario: form.horario, personas: datosReservaGuardada.personas };
      const adminParams = { to_name: "Recepcion Aura", to_email: "recepcion@aura.com", sector: datosReservaGuardada.sector, fecha: form.fecha, horario: form.horario, personas: datosReservaGuardada.personas, nombre_cliente: form.nombre, telefono: form.telefono, email_cliente: form.email, restricciones: form.restricciones || "Ninguna" };
      emailjs.send('service_6ds4u72', 'template_1138upp', templateParams, 'X8oYjznwltzuEDFa8').then(res => console.log("Email cliente enviado:", res.status)).catch(err => console.error("Error email cliente:", err));
      emailjs.send('service_6ds4u72', 'template_e0y60yf', adminParams, 'X8oYjznwltzuEDFa8').then(res => console.log("Email admin enviado:", res.status)).catch(err => console.error("Error email admin:", err));
      setForm({ nombre: "", dni: "", nacimiento: "", email: "", telefono: "", sector: "", restricciones: "", fecha: "", horario: "", personas: "" });
      setHorariosDisponibles([]);

    } catch (error) {
      // --- Error en la Transacción (sin cambios) ---
      console.error("Error durante la transacción de reserva:", error);
      if (error.message.includes("capacidad") || error.message.includes("fecha no válida") || error.message.includes("día no disponible") || error.message.includes("horario no activo")) { alert(`Error al reservar: ${error.message}`); }
      else { alert(`Error al procesar la reserva: ${error.message || "Intenta nuevamente."}`); }
    } finally {
      setGuardando(false);
    }
  };
  // --- Fin de guardarReserva ---

  // --- Renderizado (sin cambios) ---
  return (
    <div style={estiloContenedor}>
      <h1 style={estiloTitulo}>BIENVENIDOS</h1>
      {errorEdad && <p style={{ color: 'red', fontSize: '0.8rem', textAlign: 'center' }}>{errorEdad}</p>}
      <span>Información personal:</span>
      <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre y Apellido" style={estiloInput} />
      <input name="dni" value={form.dni} onChange={handleChange} placeholder="DNI" style={estiloInput} />
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ minWidth: "70px", fontSize: "0.9rem" }}>{loadingEdad ? "Cargando..." : `+${edadMinimaConfig} años`}</span>
        <input name="nacimiento" value={form.nacimiento} onChange={handleChange} type="date" placeholder="Fecha de nacimiento" style={{ ...estiloInput, flex: 1 }} max={loadingEdad ? undefined : new Date(new Date().setFullYear(new Date().getFullYear() - edadMinimaConfig)).toISOString().split("T")[0]} disabled={loadingEdad} />
      </div>
      <span>Información de contacto:</span>
      <input name="email" value={form.email} onChange={handleChange} type="email" placeholder="Email" style={estiloInput} />
      <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" style={estiloInput} />
      <span>Confirmación de reserva:</span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <label htmlFor="fechaReserva" style={{ minWidth: "100px", fontSize: "0.9rem" }}>Elegí una fecha:</label>
        <input id="fechaReserva" name="fecha" value={form.fecha} onChange={handleChange} type="date" placeholder="Fecha de reserva" style={{ ...estiloInput, flex: 1 }} min={new Date().toISOString().split("T")[0]} />
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem", justifyContent: "center" }}>
        <button onClick={() => setFechaRapida("hoy")} style={estiloBotonSecundario}>Hoy</button>
        <button onClick={() => setFechaRapida("manana")} style={estiloBotonSecundario}>Mañana</button>
        <button onClick={() => setFechaRapida("viernes")} style={estiloBotonSecundario}>Próx. Viernes</button>
        <button onClick={() => setFechaRapida("sabado")} style={estiloBotonSecundario}>Próx. Sábado</button>
      </div>
      <select name="horario" value={form.horario} onChange={handleChange} style={estiloInput} disabled={loadingConfig || !form.fecha}>
        <option value="" disabled hidden>{loadingConfig ? "Cargando horarios..." : !form.fecha ? "Seleccioná una fecha primero" : "Seleccioná un horario"}</option>
        {!loadingConfig && form.fecha && horariosDisponibles.length === 0 && (<option value="" disabled>No hay turnos disponibles este día</option>)}
        {horariosDisponibles.map((hora) => (<option key={hora} value={hora}>{hora}</option>))}
      </select>
      {errorConfig && <p style={{ color: 'red', fontSize: '0.8rem', textAlign: 'center' }}>{errorConfig}</p>}
      <select name="personas" value={form.personas} onChange={handleChange} style={estiloInput}>
        <option value="" disabled hidden>Seleccioná cantidad</option>
        {[...Array(10)].map((_, i) => (<option key={i + 1} value={i + 1}>{i + 1} persona{i > 0 ? 's' : ''}</option>))}
        <option value="evento_privado">Evento privado (+10)</option>
      </select>
      {form.personas && form.personas !== "evento_privado" && (
        <select name="sector" value={form.sector} onChange={handleChange} style={estiloInput} disabled={sectoresDisponibles().length === 0}>
          <option value="" disabled hidden>{sectoresDisponibles().length === 0 ? "No hay sectores para esa cantidad" : "Seleccioná un sector"}</option>
          {sectoresDisponibles().map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
      )}
      {form.personas === "evento_privado" && (
        <div style={{ color: "#EFE4CF", fontSize: "0.9rem", textAlign: "center", padding: "0.5rem", background: "#1C2340", borderRadius: "8px" }}>
          Para eventos privados (+10 personas), por favor contáctanos vía <a href="https://wa.me/549XXXXXXXXXX" target="_blank" rel="noopener noreferrer" style={{ color: "#D3C6A3", textDecoration: "underline", fontWeight: "bold" }}>WhatsApp</a> para coordinar detalles y disponibilidad.
        </div>
      )}
      {seccion2RestriccionesActiva && (<input name="restricciones" value={form.restricciones} onChange={handleChange} placeholder="Alergias / Restricciones (opcional)" style={estiloInput} />)}
      <button onClick={guardarReserva} style={{...estiloBoton, opacity: guardando ? 0.6 : 1}} disabled={guardando || loadingEdad || loadingConfig}>
        {guardando ? "Procesando..." : "Confirmar Reserva"}
      </button>
    </div>
  );
}

// --- Estilos (sin cambios) ---
const estiloContenedor = { minHeight: "100vh", backgroundColor: "#0A1034", color: "#EFE4CF", padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" };
const estiloTitulo = { fontSize: "2.5rem", textAlign: "center", color: "#D3C6A3", marginBottom: "1.5rem", letterSpacing: "2px" };
const estiloInput = { padding: "0.8rem", borderRadius: "12px", border: "1px solid #D3C6A3", backgroundColor: "#EFE4CF", color: "#2C1B0F", fontSize: "1rem" };
const estiloBoton = { padding: "1rem", backgroundColor: "#806C4F", color: "white", fontWeight: "bold", borderRadius: "12px", border: "none", marginTop: "1rem", cursor: "pointer", transition: "opacity 0.3s ease", };
const estiloBotonSecundario = { padding: "0.5rem 1rem", backgroundColor: "#1C2340", color: "#EFE4CF", border: "1px solid #806C4F", borderRadius: "8px", cursor: "pointer", transition: "background-color 0.2s ease", };
