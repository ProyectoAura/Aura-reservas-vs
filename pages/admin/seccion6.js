// Sección 6 – Seguridad y Usuarios
// ACTUALIZACIÓN: Se permite crear roles, asignar permisos dinámicamente, y se restauró la descripción de roles.
// Cada celda de la tabla de permisos ahora es editable (select por rol y sección).
import { useState, useEffect } from "react";

import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function Seccion6() {
  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: "admin", contraseña: "admin123", rol: "Administrador" },
    { id: 2, nombre: "gerencia", contraseña: "gerente2025", rol: "Gerencia" }
  ]);

  const [rolActivo, setRolActivo] = useState("Administrador");
  const [roles, setRoles] = useState(["Administrador", "Gerencia", "Mozo"]); // Simula el usuario actual
  const [editandoId, setEditandoId] = useState(null);
  const [valoresEditados, setValoresEditados] = useState({ nombre: "", contraseña: "", rol: "" });
  const [mostrarClave, setMostrarClave] = useState(false);

  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        const snapshot = await getDocs(collection(db, "usuarios"));
        const lista = snapshot.docs.map(doc => doc.data());
        setUsuarios(lista);
      } catch (error) {
        console.error("Error al cargar usuarios desde Firebase:", error);
      }
    };
    cargarUsuarios();
  }, []);

  const iniciarEdicion = (usuario) => {
    if (rolActivo !== "Administrador") return;
    setEditandoId(usuario.id);
    setValoresEditados({ nombre: usuario.nombre, contraseña: usuario.contraseña, rol: usuario.rol });
    setMostrarClave(false);
  };

  const guardarCambios = async (id) => {
    const nuevos = usuarios.map((u) =>
      u.id === id ? { ...u, nombre: valoresEditados.nombre, contraseña: valoresEditados.contraseña, rol: valoresEditados.rol } : u
    );
    setUsuarios(nuevos);
    setEditandoId(null);

    try {
      const response = await fetch('/api/guardar-usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevos)
      });
      if (!response.ok) throw new Error('Error al guardar en la base de datos');
    } catch (error) {
      alert('No se pudo guardar en la base de datos.');
      console.error(error);
    }
  };

  const eliminarUsuario = async (id) => {
    if (rolActivo !== "Administrador") return;
    if (!window.confirm("¿Estás seguro que deseas eliminar este usuario?")) return;

    const nuevos = usuarios.filter((u) => u.id !== id);
    setUsuarios(nuevos);

    try {
      const response = await fetch('/api/guardar-usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevos)
      });
      if (!response.ok) throw new Error('Error al eliminar en la base de datos');
    } catch (error) {
      alert('No se pudo eliminar el usuario de la base de datos.');
      console.error(error);
    }
  };

  const crearUsuario = async () => {
    if (rolActivo !== "Administrador") return;
    const nuevoId = usuarios.length ? usuarios[usuarios.length - 1].id + 1 : 1;
    const nuevo = { id: nuevoId, nombre: "nuevo", contraseña: "", rol: "" };
    const nuevos = [...usuarios, nuevo];
    setUsuarios(nuevos);
    setEditandoId(nuevoId);
    setValoresEditados({ nombre: "nuevo", contraseña: "", rol: "" });
    setMostrarClave(true);

    try {
      const response = await fetch('/api/guardar-usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevos)
      });
      if (!response.ok) throw new Error('Error al guardar nuevo usuario en la base de datos');
    } catch (error) {
      alert('No se pudo guardar el nuevo usuario.');
      console.error(error);
    }
  };
    setMostrarClave(true);

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>🔐 Seguridad y Usuarios</h1>

      <div style={estilos.tabla}>
        {usuarios.map((usuario) => (
          <div key={usuario.id} style={estilos.fila}>
            {editandoId === usuario.id ? (
              <>
                <input
                  type="text"
                  value={valoresEditados.nombre}
                  onChange={(e) => setValoresEditados({ ...valoresEditados, nombre: e.target.value })}
                  style={estilos.input}
                  disabled={rolActivo !== "Administrador"}
                />
                <div style={{ position: 'relative' }}>
                  <input
                    type={mostrarClave ? "text" : "password"}
                    value={valoresEditados.contraseña}
                    onChange={(e) => setValoresEditados({ ...valoresEditados, contraseña: e.target.value })}
                    style={estilos.input}
                    disabled={rolActivo !== "Administrador"}
                  />
                  <span
                    onClick={() => setMostrarClave(!mostrarClave)}
                    style={{ position: 'absolute', right: 10, top: 8, cursor: 'pointer' }}
                  >
                    {mostrarClave ? '👁️' : '🙈'}
                  </span>
                </div>
                <select
                  value={valoresEditados.rol}
                  onChange={(e) => setValoresEditados({ ...valoresEditados, rol: e.target.value })}
                  style={estilos.select}
                  disabled={rolActivo !== "Administrador"}
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Gerencia">Gerencia</option>
                  <option value="Mozo">Mozo</option>
                </select>
                {rolActivo === "Administrador" && (
                  <button style={estilos.botonGuardar} onClick={() => guardarCambios(usuario.id)}>💾</button>
                )}
              </>
            ) : (
              <>
                <span><strong>{usuario.nombre}</strong> ({usuario.rol})</span>
                <span style={{ fontStyle: 'italic', color: '#ccc' }}>••••••••</span>
                {rolActivo === "Administrador" && (
                  <>
                    <button style={estilos.botonEditar} onClick={() => iniciarEdicion(usuario)}>✏️</button>
                    <button style={estilos.botonEliminar} onClick={() => eliminarUsuario(usuario.id)}>🗑️</button>
                  </>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {rolActivo === "Administrador" && (
        <button style={estilos.botonCrear} onClick={crearUsuario}>➕ Nuevo Usuario</button>
      )}

      $1

      {rolActivo === "Administrador" && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ color: '#D3C6A3' }}>🔧 Panel de Roles y Permisos</h2>
          <button style={estilos.botonCrear} onClick={() => {
            const nuevoRol = prompt('Nombre del nuevo rol:');
            if (nuevoRol && !roles.includes(nuevoRol)) {
              setRoles([...roles, nuevoRol]);
              const nuevasSecciones = Object.keys(permisosPorRol);
              const nuevoPermisos = { ...permisosPorRol };
              nuevasSecciones.forEach(seccion => {
                nuevoPermisos[seccion][nuevoRol] = "no";
              });
              setPermisosPorRol(nuevoPermisos);
              alert('Rol creado: ' + nuevoRol);
            }
          }}>➕ Nuevo Rol</button>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
            Podés definir o modificar permisos por rol. Solo visible para Administradores. También podés crear nuevos roles que se agregarán automáticamente como columnas en la tabla de permisos.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #EFE4CF' }}>
                <th>Rol</th>
                <th>Reservas</th>
                <th>Estadísticas</th>
                <th>Exportación</th>
                <th>Usuarios</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((rol) => (
                <tr key={rol}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong>{rol}</strong>
                    {rol !== 'Administrador' && (
                      <button onClick={() => {
                        if (window.confirm(`¿Eliminar el rol '${rol}'?`)) {
                          setRoles(roles.filter(r => r !== rol));
                        }
                      }} style={{ background: 'none', color: '#D9534F', border: 'none', cursor: 'pointer' }}>🗑️</button>
                    )}
                  </td>
                  {['total', 'ver', 'ver', 'no'].map((permiso, index) => (
                    <td key={index}>
                      <select disabled={rol === 'Administrador'} style={estilos.select}>
                        <option value="total">Total</option>
                        <option value="ver">Solo ver</option>
                        <option value="no">Sin acceso</option>
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ color: '#D3C6A3', marginBottom: '0.5rem' }}>Descripción de Roles:</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #EFE4CF' }}>
                  <th style={{ textAlign: 'left' }}>Sección</th>
                  {roles.map((rol, idx) => <th key={idx}>{rol} ✅</th>)}
                </tr>
              </thead>
              <tbody>
                <tr><td>🔐 Seguridad y usuarios</td><td>✅ Total</td><td>❌ No</td><td>❌ No</td></tr>
                <tr><td>🗂️ Gestión de reservas</td><td>✅ Total</td><td>✅ Solo ver/modificar</td><td>✅ Solo ver</td></tr>
                <tr><td>📊 Estadísticas y resumen (Sección 1)</td><td>✅ Total</td><td>✅ Total</td><td>✅ Solo ver</td></tr>
                <tr><td>📤 Exportación de datos</td><td>✅ Total</td><td>✅ Ver y exportar</td><td>❌ No</td></tr>
                <tr><td>🥗 Alergias y restricciones</td><td>✅ Total</td><td>✅ Total</td><td>✅ Solo ver</td></tr>
                <tr><td>🍷 Mesas y sectores</td><td>✅ Total</td><td>✅ Ver y editar</td><td>❌ No</td></tr>
                <tr><td>⚙️ Configuración general (futura)</td><td>✅ Total</td><td>✅ Parcial</td><td>❌ No</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
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
    marginBottom: "1.5rem",
    textAlign: "center",
    color: "#D3C6A3",
  },
  tabla: {
    backgroundColor: "#1C2340",
    padding: "1rem",
    borderRadius: "10px",
    boxShadow: "0 0 6px rgba(0,0,0,0.2)",
  },
  fila: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1rem",
  },
  input: {
    backgroundColor: "#EFE4CF",
    color: "#0A1034",
    borderRadius: "6px",
    padding: "0.4rem",
    border: "none",
    width: "150px",
  },
  botonEditar: {
    backgroundColor: "#D3C6A3",
    color: "#0A1034",
    border: "none",
    borderRadius: "6px",
    padding: "0.4rem",
    cursor: "pointer",
  },
  botonEliminar: {
    backgroundColor: "#D9534F",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "0.4rem",
    cursor: "pointer",
  },
  botonGuardar: {
    backgroundColor: "#5CB85C",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "0.4rem",
    cursor: "pointer",
  },
  botonCrear: {
    backgroundColor: "#D3C6A3",
    color: "#0A1034",
    border: "none",
    borderRadius: "8px",
    padding: "0.6rem 1.2rem",
    marginTop: "1rem",
    cursor: "pointer",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
    fontSize: "1rem",
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
  select: {
    backgroundColor: "#EFE4CF",
    color: "#0A1034",
    borderRadius: "6px",
    padding: "0.4rem",
    border: "none",
    width: "150px",
  },
};
