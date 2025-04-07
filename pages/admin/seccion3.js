// Sección 3 – Turnos y Horarios
import { useState } from "react";

export default function Seccion3() {
  const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const turnosBase = [
    "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
    "22:00", "22:30", "23:00", "23:30", "00:00", "00:30", "01:00"
  ];

  const [configTurnos, setConfigTurnos] = useState(
    diasSemana.reduce((acc, dia) => {
      acc[dia] = turnosBase.map((hora) => ({ hora, activo: true, capacidad: 15 }));
      return acc;
    }, {})
  );

  const toggleTurno = (dia, index) => {
    const nuevaConfig = { ...configTurnos };
    nuevaConfig[dia][index].activo = !nuevaConfig[dia][index].activo;
    setConfigTurnos(nuevaConfig);
  };

  const cambiarCapacidad = (dia, index, valor) => {
    const nuevaConfig = { ...configTurnos };
    nuevaConfig[dia][index].capacidad = parseInt(valor) || 0;
    setConfigTurnos(nuevaConfig);
  };

  const toggleTodos = (dia) => {
    const todosActivos = configTurnos[dia].every((t) => t.activo);
    const nuevaConfig = { ...configTurnos };
    nuevaConfig[dia] = nuevaConfig[dia].map((turno) => ({ ...turno, activo: !todosActivos }));
    setConfigTurnos(nuevaConfig);
  };

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>⏰ Turnos y Horarios</h1>

      {diasSemana.map((dia) => {
        const todosDesactivados = configTurnos[dia].every(t => !t.activo);
        return (
          <div key={dia} style={estilos.diaBox}>
            <h3 style={estilos.diaTitulo}>{dia}</h3>
            {todosDesactivados ? (
              <button
                style={estilos.botonActivar}
                onClick={() => toggleTodos(dia)}
              >
                ✅ Reactivar todos los turnos
              </button>
            ) : (
              <>
                {configTurnos[dia].map((turno, index) => (
                  <div key={index} style={estilos.turnoRow}>
                    <label>{turno.hora}</label>
                    <input
                      type="number"
                      value={turno.capacidad}
                      onChange={(e) => cambiarCapacidad(dia, index, e.target.value)}
                      style={estilos.input}
                    />
                    <label>
                      <input
                        type="checkbox"
                        checked={turno.activo}
                        onChange={() => toggleTurno(dia, index)}
                      /> Activo
                    </label>
                  </div>
                ))}
                <button
                  style={configTurnos[dia].every(t => t.activo) ? estilos.botonDesactivar : estilos.botonActivar}
                  onClick={() => toggleTodos(dia)}
                >
                  {configTurnos[dia].every(t => t.activo)
                    ? "🚫 Desactivar todos los turnos"
                    : "✅ Reactivar todos los turnos"}
                </button>
              </>
            )}
          </div>
        );
      })}

      <button style={estilos.botonVolver} onClick={() => window.location.href = '/admin/seccion1'}>
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
  diaBox: {
    backgroundColor: "#1C2340",
    padding: "1rem",
    borderRadius: "10px",
    marginBottom: "1.5rem",
  },
  diaTitulo: {
    marginBottom: "1rem",
    color: "#D3C6A3",
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
