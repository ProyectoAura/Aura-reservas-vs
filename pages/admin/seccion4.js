// Sección 4 – Mesas y Sectores
import { useState } from "react";

export default function Seccion4() {
  const [sectores, setSectores] = useState([
    {
      nombre: "Terraza descubierta",
      activo: true,
      zonas: [
        { nombre: "Mesas cuadradas (2 o más personas)", capacidad: 30 }
      ]
    },
    {
      nombre: "Terraza semicubierta",
      activo: true,
      zonas: [
        { nombre: "Box fuego", capacidad: 8 },
        { nombre: "Mesas cascadas 1", capacidad: 4 },
        { nombre: "Mesas cascadas 2", capacidad: 4 }
      ]
    },
    {
      nombre: "Salón interior",
      activo: false,
      zonas: [
        { nombre: "(en espera)", capacidad: 40 }
      ]
    }
  ]);

  const toggleActivo = (index) => {
    const nuevos = [...sectores];
    nuevos[index].activo = !nuevos[index].activo;
    setSectores(nuevos);
  };

  const cambiarCapacidadZona = (sectorIndex, zonaIndex, valor) => {
    const nuevos = [...sectores];
    nuevos[sectorIndex].zonas[zonaIndex].capacidad = parseInt(valor) || 0;
    setSectores(nuevos);
  };

  const cambiarNombreZona = (sectorIndex, zonaIndex, texto) => {
    const nuevos = [...sectores];
    nuevos[sectorIndex].zonas[zonaIndex].nombre = texto;
    setSectores(nuevos);
  };

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>🍷 Mesas y Sectores</h1>

      {sectores.map((sector, sectorIndex) => (
        <div key={sectorIndex} style={estilos.sectorBox}>
          <h3 style={estilos.nombreSector}>{sector.nombre}</h3>

          {sector.zonas.map((zona, zonaIndex) => (
            <div key={zonaIndex} style={estilos.zonaBox}>
              <input
                type="text"
                value={zona.nombre}
                onChange={(e) => cambiarNombreZona(sectorIndex, zonaIndex, e.target.value)}
                style={estilos.inputZona}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Capacidad:
                <input
                  type="number"
                  value={zona.capacidad}
                  onChange={(e) => cambiarCapacidadZona(sectorIndex, zonaIndex, e.target.value)}
                  style={estilos.input}
                />
              </label>
            </div>
          ))}

          <div style={{ marginTop: "1rem" }}>
            <label>
              <input
                type="checkbox"
                checked={sector.activo}
                onChange={() => toggleActivo(sectorIndex)}
              /> Disponible para reservar
            </label>
          </div>
        </div>
      ))}

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
  sectorBox: {
    backgroundColor: "#1C2340",
    padding: "1rem",
    borderRadius: "10px",
    marginBottom: "1.5rem",
  },
  nombreSector: {
    marginBottom: "1rem",
    color: "#D3C6A3",
  },
  zonaBox: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1rem",
    flexWrap: "wrap",
  },
  input: {
    backgroundColor: "#EFE4CF",
    color: "#0A1034",
    borderRadius: "6px",
    padding: "0.4rem",
    border: "none",
    width: "80px",
  },
  inputZona: {
    backgroundColor: "#EFE4CF",
    color: "#0A1034",
    borderRadius: "6px",
    padding: "0.4rem",
    border: "none",
    width: "300px",
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
