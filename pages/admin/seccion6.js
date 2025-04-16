// Sección 6 – Seguridad y Usuarios
import { useState, useEffect } from "react";
import { db } from "../../firebase/firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";

import { useRouter } from "next/router";

export default function Seccion6() {
  const exportarUsuarios = () => {
    const encabezados = ["Nombre", "Apellido", "DNI", "Rol"];
    const filas = usuarios.map(u => [u.nombre, u.apellido, u.dni, u.rol]);
    const csv = [encabezados, ...filas].map(fila => fila.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "usuarios_aura.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  if (typeof window !== 'undefined') {
    const usuario = JSON.parse(localStorage.getItem("usuarioAura"));
    if (!usuario || !usuario.rol) {
      return <p style={{ color: 'white', textAlign: 'center', paddingTop: '2rem' }}>Acceso denegado. Iniciá sesión.</p>;
    }
    const esDueño = usuario?.contraseña === 'Aura2025';
  const acceso = esDueño ? 'total' : permisosPorRol?.seguridad?.[usuario.rol] || 'no';
    if (acceso === 'no') {
      return <p style={{ color: 'white', textAlign: 'center', paddingTop: '2rem' }}>Acceso restringido para tu rol.</p>;
    }
  }
  const router = useRouter();
  const [usuarios, setUsuarios] = useState([]);
  const [rolActivo, setRolActivo] = useState("Administrador");
  const [roles, setRoles] = useState(["Administrador", "Gerencia", "Mozo"]);
  const [editandoId, setEditandoId] = useState(null);
  const [valoresEditados, setValoresEditados] = useState({ nombre: "", apellido: "", dni: "", contraseña: "", rol: "" });
  const [mostrarClave, setMostrarClave] = useState(false);
  const [usuarioNuevoId, setUsuarioNuevoId] = useState(null);
  const [permisosPorRol, setPermisosPorRol] = useState({
    reservas: {},
    estadisticas: {},
    exportacion: {},
    usuarios: {}
  });

  useEffect(() => {
    const obtenerUsuarios = async () => {
      const snapshot = await getDocs(collection(db, "usuariosAura"));
      const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsuarios(datos);

      // 🔽 Obtener permisos guardados
      const permisosSnapshot = await getDocs(collection(db, "permisosAura"));
      if (!permisosSnapshot.empty) {
        const permisosData = permisosSnapshot.docs[0].data();
        setPermisosPorRol(permisosData);
      }
    };
    obtenerUsuarios();
  }, []);

  const iniciarEdicion = (usuario) => {
    if (rolActivo !== "Administrador") return;
    setEditandoId(usuario.id);
    setValoresEditados({ nombre: usuario.nombre, apellido: usuario.apellido || "", dni: usuario.dni || "", contraseña: usuario.contraseña, rol: usuario.rol });
    setMostrarClave(false);
  };

  const cancelarEdicion = () => {
    if (usuarioNuevoId) {
      setUsuarios(usuarios.filter((u) => u.id !== usuarioNuevoId));
      setUsuarioNuevoId(null);
    }
    setEditandoId(null);
  };

  const guardarCambios = async (id) => {
    if (!valoresEditados.nombre || !valoresEditados.apellido || !valoresEditados.dni || !valoresEditados.contraseña || !valoresEditados.rol) {
      alert("Todos los campos son obligatorios.");
      return;
    }
    const dniExistente = usuarios.some(u => u.dni === valoresEditados.dni && u.id !== id);
    if (dniExistente) {
      alert("Ya existe un usuario con ese DNI.");
      return;
    }
    try {
      const usuarioRef = doc(db, "usuariosAura", id);
      await updateDoc(usuarioRef, valoresEditados);
      const nuevos = usuarios.map((u) =>
        u.id === id ? { ...u, ...valoresEditados } : u
      );
      setUsuarios(nuevos);
      setEditandoId(null);
      setUsuarioNuevoId(null);
      alert("✅ Usuario actualizado correctamente.");
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      alert("❌ Hubo un problema al guardar los cambios.");
    }
  };

  const eliminarUsuario = async (id) => {
    if (rolActivo !== "Administrador") return;
    if (window.confirm("¿Estás seguro que deseas eliminar este usuario?")) {
      await deleteDoc(doc(db, "usuariosAura", id));
      const actualizados = usuarios.filter((u) => u.id !== id);
      setUsuarios(actualizados);
    }
  };

  const crearUsuario = async () => {
    if (rolActivo !== "Administrador") return;
    if (usuarioNuevoId) {
      // cancelar creación si ya hay uno en edición
      const actualizado = usuarios.filter((u) => u.id !== usuarioNuevoId);
      setUsuarios(actualizado);
      setEditandoId(null);
      setUsuarioNuevoId(null);
      return;
    }
    const nuevo = { nombre: "", apellido: "", dni: "", contraseña: "", rol: "" };
    const docRef = await addDoc(collection(db, "usuariosAura"), nuevo);
    const actualizados = [...usuarios, { ...nuevo, id: docRef.id }];
    setUsuarios(actualizados);
    setEditandoId(docRef.id);
    setUsuarioNuevoId(docRef.id);
    setValoresEditados(nuevo);
    setMostrarClave(true);

  };

  const handlePermisoChange = (seccion, rol, nuevoValor) => {
    const nuevoEstado = {
      ...permisosPorRol,
      [seccion]: {
        ...permisosPorRol[seccion],
        [rol]: nuevoValor,
      }
    };
    setPermisosPorRol(nuevoEstado);
    // 🔽 Guardar en Firestore (sobrescribimos el documento "actual")
    const permisosRef = collection(db, "permisosAura");
    getDocs(permisosRef).then((snapshot) => {
      if (!snapshot.empty) {
        const id = snapshot.docs[0].id;
        updateDoc(doc(db, "permisosAura", id), nuevoEstado);
      } else {
        addDoc(permisosRef, nuevoEstado);
      }
    });
  };

  const usuario = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("usuarioAura")) : null;

  if (!usuario || !usuario.rol) {
    return <p style={{ color: 'white', textAlign: 'center', paddingTop: '2rem' }}>Acceso denegado. Iniciá sesión.</p>;
  }

  const esDueño = usuario?.contraseña === 'Aura2025';
  const acceso = esDueño ? 'total' : permisosPorRol?.seguridad?.[usuario.rol] || 'no';

  if (acceso === 'no') {
    return <p style={{ color: 'white', textAlign: 'center', paddingTop: '2rem' }}>Acceso restringido para tu rol.</p>;
  }

  return (
    <div style={estilos.contenedor}>
      <button onClick={exportarUsuarios} style={{ ...estilos.botonCrear, marginBottom: '1rem' }}>📤 Exportar Usuarios</button>
      <h1 style={estilos.titulo}>🔐 Seguridad y Usuarios</h1>

      <div style={estilos.tabla}>
        <div style={{ ...estilos.fila, fontWeight: 'bold' }}>
          <div style={{ width: '150px' }}>Nombre</div>
          <div style={{ width: '150px' }}>Apellido</div>
          <div style={{ width: '150px' }}>DNI</div>
          <div style={{ width: '150px' }}>Contraseña</div>
          <div style={{ width: '150px' }}>Rol</div>
          <div style={{ width: '150px' }}>Acciones</div>
        </div>

        {usuarios.map((usuario) => (
          <div key={usuario.id} style={estilos.fila}>
            {editandoId === usuario.id ? (
              <>
                <input
                  type="text"
                  value={valoresEditados.nombre}
                  onChange={(e) => setValoresEditados({ ...valoresEditados, nombre: e.target.value })}
                  style={estilos.input}
                />
                <input
                  type="text"
                  value={valoresEditados.apellido}
                  onChange={(e) => setValoresEditados({ ...valoresEditados, apellido: e.target.value })}
                  style={estilos.input}
                />
                <input
                  type="text"
                  value={valoresEditados.dni}
                  onChange={(e) => setValoresEditados({ ...valoresEditados, dni: e.target.value })}
                  style={estilos.input}
                />
                <div style={{ position: 'relative', width: '150px' }}>
                  <input
                    type={mostrarClave ? "text" : "password"}
                    value={valoresEditados.contraseña}
                    onChange={(e) => setValoresEditados({ ...valoresEditados, contraseña: e.target.value })}
                    style={{ ...estilos.input, paddingRight: '2rem' }}
                  />
                  <span
                    onClick={() => setMostrarClave(!mostrarClave)}
                    style={{ position: 'absolute', right: 10, top: 6, cursor: 'pointer' }}
                  >
                    {mostrarClave ? '👁️' : '🙈'}
                  </span>
                </div>
                <select
                  value={valoresEditados.rol}
                  onChange={(e) => setValoresEditados({ ...valoresEditados, rol: e.target.value })}
                  style={estilos.select}
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Gerencia">Gerencia</option>
                  <option value="Mozo">Mozo</option>
                </select>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={estilos.botonGuardar} onClick={() => guardarCambios(usuario.id)}>💾</button>
                  <button style={estilos.botonEliminar} onClick={() => eliminarUsuario(usuario.id)}>🗑️</button>
                  <button onClick={cancelarEdicion} style={{ backgroundColor: '#999', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem', cursor: 'pointer' }}>❌ Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ width: '150px' }}>{usuario.nombre}</div>
                <div style={{ width: '150px' }}>{usuario.apellido}</div>
                <div style={{ width: '150px' }}>{usuario.dni}</div>
                <div style={{ width: '150px', fontStyle: 'italic', color: '#ccc' }}>••••••••</div>
                <div style={{ width: '150px' }}>{usuario.rol}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={estilos.botonEditar} onClick={() => iniciarEdicion(usuario)}>✏️</button>
                  <button style={estilos.botonEliminar} onClick={() => eliminarUsuario(usuario.id)}>🗑️</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <button style={estilos.botonCrear} onClick={crearUsuario}>
        {usuarioNuevoId ? '✖️ Cancelar creación' : '➕ Nuevo Usuario'}
      </button>

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

          {/* (acá continúa tu tabla y descripción como ya estaban) */}
        </div>
      )}

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
              {['reservas', 'estadisticas', 'exportacion', 'usuarios'].map((seccion, index) => (
                <td key={index}>
                  <select
                    disabled={rol === 'Administrador'}
                    style={estilos.select}
                    value={(permisosPorRol[seccion] && permisosPorRol[seccion][rol]) || 'no'}
                    onChange={(e) => handlePermisoChange(seccion, rol, e.target.value)}
                  >
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

      <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
  <h3 style={{ color: '#D3C6A3', marginBottom: '0.5rem' }}>Descripción de Roles:</h3>
  <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
    <thead>
      <tr style={{ borderBottom: '1px solid #EFE4CF' }}>
        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Sección</th>
        {roles.map((rol, idx) => (
          <th key={idx} style={{ textAlign: 'center', padding: '0.5rem' }}>{rol}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {[
        { seccion: "seguridad", label: "🔐 Seguridad y usuarios" },
        { seccion: "reservas", label: "🗂️ Gestión de reservas" },
        { seccion: "estadisticas", label: "📊 Estadísticas y resumen (Sección 1)" },
        { seccion: "exportacion", label: "📤 Exportación de datos" },
        { seccion: "alergias", label: "🥗 Alergias y restricciones" },
        { seccion: "mesas", label: "🍷 Mesas y sectores" },
        { seccion: "configuracion", label: "⚙️ Configuración general (futura)" }
      ].map(({ seccion, label }) => (
        <tr key={seccion}>
          <td style={{ padding: '0.5rem' }}>{label}</td>
          {roles.map((rol) => (
            <td key={rol} style={{ textAlign: 'center', padding: '0.5rem' }}>
              <select
                disabled={rol === "Administrador"}
                value={permisosPorRol[seccion]?.[rol] || "no"}
                onChange={(e) => handlePermisoChange(seccion, rol, e.target.value)}
                style={{ ...estilos.select, width: '140px' }}
              >
                <option value="total">✅ Total</option>
                <option value="ver">👁️ Solo ver</option>
                <option value="editar">✏️ Ver y editar</option>
                <option value="no">❌ No</option>
              </select>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
</div>
        </div>
      )
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
