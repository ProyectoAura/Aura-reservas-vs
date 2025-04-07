// pages/reservas.js
import { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import emailjs from '@emailjs/browser';

export default function Reservas() {
  const seccion2RestriccionesActiva = false;
  const [form, setForm] = useState({// pages/reservas.js
import { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import emailjs from '@emailjs/browser';

export default function Reservas() {
  const seccion2RestriccionesActiva = false;
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

  const edadMinima = 21;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const setFechaRapida = (tipo) => {
    const hoy = new Date();
    let fecha = new Date(hoy);
    if (tipo === "manana") fecha.setDate(hoy.getDate() + 1);
    if (tipo === "semana") fecha.setDate(hoy.getDate() - hoy.getDay() + 1);
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    setForm({ ...form, fecha: `${yyyy}-${mm}-${dd}` });
  };

  const calcularEdad = (fechaNacimiento) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };

  const camposObligatorios = ["sector", "nombre", "dni", "nacimiento", "email", "telefono", "fecha", "horario", "personas"];

  const sectoresDisponibles = () => {
    const cantidad = parseInt(form.personas);
    const sectores = [];
    if (cantidad >= 1) sectores.push("Terraza descubierta");
    if (cantidad >= 4) sectores.push("Terraza semicubierta");
    if (cantidad >= 6) sectores.push("Box Fuego");
    return sectores;
  };

  const guardarReserva = async () => {
    const edad = calcularEdad(form.nacimiento);
    if (edad < edadMinima) {
      alert(`Debés ser mayor de ${edadMinima} años para reservar.`);
      return;
    }

    for (const campo of camposObligatorios) {
      const valor = form[campo];
      if (!valor || (campo === "personas" && valor !== "evento_privado" && (isNaN(valor) || parseInt(valor) < 1 || parseInt(valor) > 10))) {
        let mensaje = `El campo "${campo}" es obligatorio y debe tener un valor válido.`;
        if (campo === "personas") mensaje = "La cantidad de personas debe ser entre 1 y 10, o seleccionar Evento privado.";
        alert(mensaje);
        return;
      }
    }

    try {
      await addDoc(collection(db, "reservas"), {
        nombre: form.nombre,
        dni: form.dni,
        fecha_nacimiento: form.nacimiento,
        email: form.email,
        telefono: form.telefono,
        sector: form.sector,
        restricciones: form.restricciones,
        fecha: form.fecha,
        horario: form.horario,
        personas: form.personas === "evento_privado" ? "evento_privado" : parseInt(form.personas),
        estado: "confirmada",
        creada_en: Timestamp.now()
      });

      const templateParams = {
  to_name: form.nombre,
  to_email: form.email,
  sector: form.sector,
  fecha: form.fecha,
  horario: form.horario,
  personas: form.personas
};

const adminParams = {
  to_name: "Recepcion Aura",
  to_email: "recepcion@aura.com", // reemplazá por el real
  sector: form.sector,
  fecha: form.fecha,
  horario: form.horario,
  personas: form.personas,
  nombre_cliente: form.nombre,
  telefono: form.telefono,
  email_cliente: form.email
};

      emailjs.send(
  'service_6ds4u72',
  'template_1138upp',
  templateParams,
  'X8oYjznwltzuEDFa8'
).then((result) => {
  console.log('Email al cliente enviado ✅', result.text);
}, (error) => {
  console.error('Error al enviar email al cliente ❌', error);
});

emailjs.send(
  'service_6ds4u72',
  'template_e0y60yf',
  adminParams,
  'X8oYjznwltzuEDFa8'
).then((result) => {
  console.log('Email al recepcionista enviado ✅', result.text);
}, (error) => {
  console.error('Error al enviar email al recepcionista ❌', error);
});

      alert("¡Reserva confirmada!");
      setForm({ nombre: "", dni: "", nacimiento: "", email: "", telefono: "", sector: "", restricciones: "", fecha: "", horario: "", personas: "" });
    } catch (error) {
      console.error("Error al guardar la reserva:", error);
      alert("Hubo un error al guardar la reserva");
    }
  };

  return (
    <div style={estiloContenedor}>
      <h1 style={estiloTitulo}>BIENVENIDOS</h1>

      <span>Información personal:</span>
      <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre y Apellido" style={estiloInput} />
      <input name="dni" value={form.dni} onChange={handleChange} placeholder="DNI" style={estiloInput} />
      <input name="nacimiento" value={form.nacimiento} onChange={handleChange} type="date" onFocus={(e) => e.target.showPicker && e.target.showPicker()} placeholder="Fecha de nacimiento" style={estiloInput} />

      <span>Información de contacto:</span>
      <input name="email" value={form.email} onChange={handleChange} type="email" placeholder="Email" style={estiloInput} />
      <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" style={estiloInput} />

      <span>Confirmación de reserva:</span>

<div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
  <button onClick={() => setFechaRapida("hoy")} style={estiloBotonSecundario}>Hoy</button>
  <button onClick={() => setFechaRapida("manana")} style={estiloBotonSecundario}>Mañana</button>
  <button onClick={() => setFechaRapida("semana")} style={estiloBotonSecundario}>Esta semana</button>
</div>

<input name="fecha" value={form.fecha} onChange={handleChange} type="date" onFocus={(e) => e.target.showPicker && e.target.showPicker()} placeholder="Fecha de reserva" style={estiloInput} />

<select name="horario" value={form.horario} onChange={handleChange} style={estiloInput}>
  <option value="" disabled hidden>Seleccioná un horario</option>
  {['19:00', '19:30', '20:00', '20:30', '21:00'].map((hora) => (
    <option key={hora} value={hora}>{hora}</option>
  ))}
</select>

<select name="personas" value={form.personas} onChange={handleChange} style={estiloInput}>
  <option value="" disabled hidden>Seleccioná cantidad</option>
  {[...Array(10)].map((_, i) => (
    <option key={i + 1} value={i + 1}>{i + 1}</option>
  ))}
  <option value="evento_privado">Evento privado</option>
</select>

{form.personas && form.personas !== "evento_privado" && (
  <select name="sector" value={form.sector} onChange={handleChange} style={estiloInput}>
    <option value="" disabled hidden>Seleccioná un sector</option>
    {sectoresDisponibles().map((s) => (
      <option key={s} value={s}>{s}</option>
    ))}
  </select>
)}{form.personas === "evento_privado" && (
        <div style={{ color: "#EFE4CF", fontSize: "0.9rem" }}>
          Contactarse por <a href="https://wa.me/549XXXXXXXXXX" target="_blank" rel="noopener noreferrer" style={{ color: "#D3C6A3", textDecoration: "underline" }}>WhatsApp</a> para más detalles.
        </div>
      )}

      {seccion2RestriccionesActiva && (
        <input name="restricciones" value={form.restricciones} onChange={handleChange} placeholder="Restricciones alimenticias / Alergias (opcional)" style={estiloInput} />
      )}

      <button onClick={guardarReserva} style={estiloBoton}>Confirmar Reserva</button>
    </div>
  );
}

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
  cursor: "pointer"
};

const estiloBotonSecundario = {
  padding: "0.5rem 1rem",
  backgroundColor: "#806C4F",
  color: "#2C1B0F",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer"
};

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

  const edadMinima = 21;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const setFechaRapida = (tipo) => {
    const hoy = new Date();
    let fecha = new Date(hoy);
    if (tipo === "manana") fecha.setDate(hoy.getDate() + 1);
    if (tipo === "semana") fecha.setDate(hoy.getDate() - hoy.getDay() + 1);
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    setForm({ ...form, fecha: `${yyyy}-${mm}-${dd}` });
  };

  const calcularEdad = (fechaNacimiento) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };

  const camposObligatorios = ["sector", "nombre", "dni", "nacimiento", "email", "telefono", "fecha", "horario", "personas"];

  const sectoresDisponibles = () => {
    const cantidad = parseInt(form.personas);
    const sectores = [];
    if (cantidad >= 1) sectores.push("Terraza descubierta");
    if (cantidad >= 4) sectores.push("Terraza semicubierta");
    if (cantidad >= 6) sectores.push("Box Fuego");
    return sectores;
  };

  const guardarReserva = async () => {
    const edad = calcularEdad(form.nacimiento);
    if (edad < edadMinima) {
      alert(`Debés ser mayor de ${edadMinima} años para reservar.`);
      return;
    }

    for (const campo of camposObligatorios) {
      const valor = form[campo];
      if (!valor || (campo === "personas" && valor !== "evento_privado" && (isNaN(valor) || parseInt(valor) < 1 || parseInt(valor) > 10))) {
        let mensaje = `El campo "${campo}" es obligatorio y debe tener un valor válido.`;
        if (campo === "personas") mensaje = "La cantidad de personas debe ser entre 1 y 10, o seleccionar Evento privado.";
        alert(mensaje);
        return;
      }
    }

    try {
      await addDoc(collection(db, "reservas"), {
        nombre: form.nombre,
        dni: form.dni,
        fecha_nacimiento: form.nacimiento,
        email: form.email,
        telefono: form.telefono,
        sector: form.sector,
        restricciones: form.restricciones,
        fecha: form.fecha,
        horario: form.horario,
        personas: form.personas === "evento_privado" ? "evento_privado" : parseInt(form.personas),
        estado: "confirmada",
        creada_en: Timestamp.now()
      });

      const templateParams = {
  to_name: form.nombre,
  to_email: form.email,
  sector: form.sector,
  fecha: form.fecha,
  horario: form.horario,
  personas: form.personas
};

const adminParams = {
  to_name: "Recepcion Aura",
  to_email: "recepcion@aura.com", // reemplazá por el real
  sector: form.sector,
  fecha: form.fecha,
  horario: form.horario,
  personas: form.personas,
  nombre_cliente: form.nombre,
  telefono: form.telefono,
  email_cliente: form.email
};

      emailjs.send(
  'service_6ds4u72',
  'template_1138upp',
  templateParams,
  'X8oYjznwltzuEDFa8'
).then((result) => {
  console.log('Email al cliente enviado ✅', result.text);
}, (error) => {
  console.error('Error al enviar email al cliente ❌', error);
});

emailjs.send(
  'service_6ds4u72',
  'template_reserva_admin',
  adminParams,
  'X8oYjznwltzuEDFa8'
).then((result) => {
  console.log('Email al recepcionista enviado ✅', result.text);
}, (error) => {
  console.error('Error al enviar email al recepcionista ❌', error);
});

      alert("¡Reserva confirmada!");
      setForm({ nombre: "", dni: "", nacimiento: "", email: "", telefono: "", sector: "", restricciones: "", fecha: "", horario: "", personas: "" });
    } catch (error) {
      console.error("Error al guardar la reserva:", error);
      alert("Hubo un error al guardar la reserva");
    }
  };

  return (
    <div style={estiloContenedor}>
      <h1 style={estiloTitulo}>BIENVENIDOS</h1>

      <span>Información personal:</span>
      <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre y Apellido" style={estiloInput} />
      <input name="dni" value={form.dni} onChange={handleChange} placeholder="DNI" style={estiloInput} />
      <input name="nacimiento" value={form.nacimiento} onChange={handleChange} type="date" onFocus={(e) => e.target.showPicker && e.target.showPicker()} placeholder="Fecha de nacimiento" style={estiloInput} />

      <span>Información de contacto:</span>
      <input name="email" value={form.email} onChange={handleChange} type="email" placeholder="Email" style={estiloInput} />
      <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" style={estiloInput} />

      <span>Confirmación de reserva:</span>

<div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
  <button onClick={() => setFechaRapida("hoy")} style={estiloBotonSecundario}>Hoy</button>
  <button onClick={() => setFechaRapida("manana")} style={estiloBotonSecundario}>Mañana</button>
  <button onClick={() => setFechaRapida("semana")} style={estiloBotonSecundario}>Esta semana</button>
</div>

<input name="fecha" value={form.fecha} onChange={handleChange} type="date" onFocus={(e) => e.target.showPicker && e.target.showPicker()} placeholder="Fecha de reserva" style={estiloInput} />

<select name="horario" value={form.horario} onChange={handleChange} style={estiloInput}>
  <option value="" disabled hidden>Seleccioná un horario</option>
  {['19:00', '19:30', '20:00', '20:30', '21:00'].map((hora) => (
    <option key={hora} value={hora}>{hora}</option>
  ))}
</select>

<select name="personas" value={form.personas} onChange={handleChange} style={estiloInput}>
  <option value="" disabled hidden>Seleccioná cantidad</option>
  {[...Array(10)].map((_, i) => (
    <option key={i + 1} value={i + 1}>{i + 1}</option>
  ))}
  <option value="evento_privado">Evento privado</option>
</select>

{form.personas && form.personas !== "evento_privado" && (
  <select name="sector" value={form.sector} onChange={handleChange} style={estiloInput}>
    <option value="" disabled hidden>Seleccioná un sector</option>
    {sectoresDisponibles().map((s) => (
      <option key={s} value={s}>{s}</option>
    ))}
  </select>
)}{form.personas === "evento_privado" && (
        <div style={{ color: "#EFE4CF", fontSize: "0.9rem" }}>
          Contactarse por <a href="https://wa.me/549XXXXXXXXXX" target="_blank" rel="noopener noreferrer" style={{ color: "#D3C6A3", textDecoration: "underline" }}>WhatsApp</a> para más detalles.
        </div>
      )}

      {seccion2RestriccionesActiva && (
        <input name="restricciones" value={form.restricciones} onChange={handleChange} placeholder="Restricciones alimenticias / Alergias (opcional)" style={estiloInput} />
      )}

      <button onClick={guardarReserva} style={estiloBoton}>Confirmar Reserva</button>
    </div>
  );
}

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
  cursor: "pointer"
};

const estiloBotonSecundario = {
  padding: "0.5rem 1rem",
  backgroundColor: "#806C4F",
  color: "#2C1B0F",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer"
};
