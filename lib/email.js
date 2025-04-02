
import emailjs from "@emailjs/browser";

export const enviarMailReserva = (form) => {
  const templateParams = {
    nombre: form.nombre,
    dni: form.dni,
    email: form.email,
    telefono: form.telefono,
    fecha: form.fecha,
    horario: form.horario,
    restricciones: form.restricciones,
    asunto: `🟡 Reserva AURA – ${form.nombre} – ${form.fecha} ${form.horario}`,
  };

  return emailjs.send(
    "service_gmail", // El ID real lo pone el usuario si lo cambia
    "reserva_confirmada", // Template ID
    templateParams,
    "X8oYjznwltzuEDFa8" // Public Key (seguro en frontend)
  );
};
