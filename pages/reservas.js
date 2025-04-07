// pages/reservas.js
import { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Reservas() {
  const seccion2RestriccionesActiva = false; // Cambiar a true si se activa desde el panel
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
    let fecha;
    if (tipo === "hoy") {
      fecha = hoy;
    } else if (tipo === "manana") {
      fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + 1);
    } else if (tipo === "semana") {
      const dia = hoy.getDay();
      const diferencia = dia === 0 ? -6 : 1 - dia;
      fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + diferencia);
    }
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
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const camposObligatorios = ["sector", "nombre", "dni", "nacimiento", "email", "telefono", "fecha", "horario", "personas"];

  const guardarReserva = async () => {
    const edad = calcularEdad(form.nacimiento);
    if (edad < edadMinima) {
      alert(`Debés ser mayor de ${edadMinima} años para reservar.`);
      return;
    }

    for (const campo of camposObligatorios) {
      if (!form[campo] || (campo === "personas" && form[campo] !== "evento_privado" && (isNaN(form[campo]) || parseInt(form[campo]) < 1 || parseInt(form[campo]) > 10))) {
        alert("Todos los campos obligatorios deben estar completos y tener valores válidos. Máximo 10 personas.");
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
      alert("¡Reserva confirmada!");
      setForm({ nombre: "", dni: "", nacimiento: "", email: "", telefono: "", sector: "", restricciones: "", fecha: "", horario: "", personas: "" });
    } catch (error) {
      console.error("Error al guardar la reserva:", error);
      alert("Hubo un error al guardar la reserva");
    }
  };

  

  return (
    <div style={{
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
    }}>
      <h1 style={{
        fontSize: "2.5rem",
        textAlign: "center",
        color: "#D3C6A3",
        marginBottom: "1.5rem",
        letterSpacing: "2px"
      }}>
        BIENVENIDOS
      </h1>

      Información personal:
      <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre y Apellido"
        style={estiloInput} />
      <input name="dni" value={form.dni} onChange={handleChange} placeholder="DNI"
        style={estiloInput} />
      <input name="nacimiento" value={form.nacimiento} onChange={handleChange} type="date" onFocus={(e) => e.target.showPicker && e.target.showPicker()}
        placeholder="Fecha de nacimiento" style={estiloInput} />
              Información de contacto:
      <input name="email" value={form.email} onChange={handleChange} type="email" placeholder="Email"
        style={estiloInput} />
      <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono"
        style={estiloInput} />
              Confirmar reserva:

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button onClick={() => setFechaRapida("hoy")} style={estiloBotonSecundario}>Hoy</button>
        <button onClick={() => setFechaRapida("manana")} style={estiloBotonSecundario}>Mañana</button>
        <button onClick={() => setFechaRapida("semana")} style={estiloBotonSecundario}>Esta semana</button>
      </div>

      <input name="fecha" value={form.fecha} onChange={handleChange} type="date" onFocus={(e) => e.target.showPicker && e.target.showPicker()}
        placeholder="Fecha y hora de reserva" style={estiloInput} />

      <select
  name="horario"
  value={form.horario}
  onChange={handleChange}
  style={{ ...estiloInput, color: '#2C1B0F"' }}
>
        <option value="" disabled hidden style={{ color: '#EFE4CF' }}>Seleccioná un horario</option>
        <option value="19:00">19:00</option>
        <option value="19:30">19:30</option>
        <option value="20:00">20:00</option>
        <option value="20:30">20:30</option>
        <option value="21:00">21:00</option>
      </select>

      <select
  name="personas"
  value={form.personas}
  onChange={handleChange}
  style={estiloInput}
>
  <option value="" disabled hidden style={{ color: '#EFE4CF' }}>Seleccioná cantidad</option>
  {[...Array(10)].map((_, i) => (
    <option key={i + 1} value={i + 1}>{i + 1}</option>
  ))}
  <option value="evento_privado">Evento privado</option>
</select>

{form.personas === "evento_privado" && (
  <div style={{ color: "#EFE4CF", fontSize: "0.9rem" }}>
    Contactarse por <a href="https://wa.me/549XXXXXXXXXX" target="_blank" rel="noopener noreferrer" style={{ color: "#D3C6A3", textDecoration: "underline" }}>WhatsApp</a> para más detalles.
  </div>
)}

            

  

      {seccion2RestriccionesActiva && (
  <input name="restricciones" value={form.restricciones} onChange={handleChange}
    placeholder="Restricciones alimenticias / Alergias (opcional)"
    style={estiloInput} />
)}

      <button onClick={guardarReserva} style={estiloBoton}>
        Confirmar Reserva
      </button>
    </div>
  );
}

const estiloInput = {
  padding: "0.8rem",
  borderRadius: "12px",
  border: "1px solid #D3C6A3",
  backgroundColor: "#EFE4CF", // nuevo azul distinto al fondo (#0A1034)
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
