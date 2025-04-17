// pages/admin/seccion6.js
import { useState, useEffect } from "react";
import { db } from "../../firebase/firebaseConfig"; // <<< CORREGIDO: Ruta correcta
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import * as XLSX from "xlsx";

export default function Seccion6() {
  const exportarUsuarios = () => {
    // ... (código exportarUsuarios sin cambios) ...
    const encabezados = ["Nombre", "Apellido", "DNI", "Rol"]; const filas = usuarios.map(u => [u.nombre, u.apellido, u.dni, u.rol]); const csv = [encabezados, ...filas].map(fila => fila.join(",")).join("\n"); const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "usuarios_aura.csv"; link.click(); URL.revokeObjectURL(url);
  };

  // --- Estados ---
  const router = useRouter();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState(["Administrador", "Gerencia", "Mozo"]);
  const [editandoId, setEditandoId] = useState(null);
  const [valoresEditados, setValoresEditados] = useState({ nombre: "", apellido: "", dni: "", contraseña: "", rol: "" });
  const [mostrarClave, setMostrarClave] = useState(false);
  const [usuarioNuevoId, setUsuarioNuevoId] = useState(null);
  const [permisosPorRol, setPermisosPorRol] = useState({
    reservas: {}, seguridad: {}, compras: {}, stock: {}, ventasCaja: {},
  });
  const [loadingPermisos, setLoadingPermisos] = useState(true);
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [accessInfo, setAccessInfo] = useState({
      isOwner: false,
      canAccessSection: false, // Acceso a ESTA sección (Seguridad)
      canEditPermissions: false, // Puede editar la tabla de permisos
  });

  // --- useEffect para cargar datos y calcular acceso ---
  useEffect(() => {
    const obtenerDatosYAcceso = async () => {
      setIsLoadingClient(true); // Asegurar que esté cargando al inicio del efecto

      // 1. Obtener Usuario desde localStorage
      const usuarioLocalStorage = JSON.parse(localStorage.getItem("usuarioAura"));
      setCurrentUser(usuarioLocalStorage); // Guardar en estado

      if (!usuarioLocalStorage || !usuarioLocalStorage.rol) {
        console.error("Usuario o rol no encontrado en localStorage.");
        router.replace('/'); // Redirigir si no hay usuario/rol
        return; // Detener ejecución
      }

      // 2. Calcular si es Dueño (basado en contraseña)
      const esDueñoLocal = usuarioLocalStorage.contraseña === 'Aura2025';

      // 3. Obtener Permisos desde Firestore
      let loadedPermisos = {};
      let permisoSeguridad = 'no'; // Default a 'no'
      setLoadingPermisos(true);
      try {
        const permisosSnapshot = await getDocs(collection(db, "permisosAura"));
        if (!permisosSnapshot.empty) {
          const permisosData = permisosSnapshot.docs[0].data();
          const seccionesEsperadas = ['reservas', 'seguridad', 'compras', 'stock', 'ventasCaja'];
          seccionesEsperadas.forEach(sec => {
              loadedPermisos[sec] = permisosData[sec] || {};
          });
          setPermisosPorRol(loadedPermisos); // Actualizar estado de permisos
          // Calcular permiso específico para esta sección (seguridad)
          permisoSeguridad = loadedPermisos?.seguridad?.[usuarioLocalStorage.rol] || 'no';
        } else {
          console.warn("Documento de permisos no encontrado.");
          // Si no hay doc de permisos, por seguridad, denegar acceso a secciones no-dueño
          const seccionesEsperadas = ['reservas', 'seguridad', 'compras', 'stock', 'ventasCaja'];
          seccionesEsperadas.forEach(sec => { loadedPermisos[sec] = {}; });
          setPermisosPorRol(loadedPermisos);
          permisoSeguridad = 'no'; // Denegar si no hay config
        }
      } catch (error) {
        console.error("Error obteniendo permisos:", error);
        permisoSeguridad = 'no'; // Denegar en caso de error
      } finally {
        setLoadingPermisos(false);
      }

      // 4. Calcular Acceso Final (Combinando Dueño y Permisos)
      // El dueño SIEMPRE tiene acceso total a seguridad
      const accesoFinalSeguridad = esDueñoLocal ? 'total' : permisoSeguridad;
      const puedeAccederSeccion = accesoFinalSeguridad !== 'no';
      const puedeEditarPermisosLocal = esDueñoLocal || accesoFinalSeguridad === 'total'; // Solo dueño o con permiso total pueden editar

      setAccessInfo({
          isOwner: esDueñoLocal,
          canAccessSection: puedeAccederSeccion,
          canEditPermissions: puedeEditarPermisosLocal,
      });

      // 5. Redirigir SI NO PUEDE ACCEDER a esta sección
      if (!puedeAccederSeccion) {
          console.warn(`Acceso denegado a Seguridad para rol: ${usuarioLocalStorage.rol}`);
          alert("No tienes permiso para acceder a esta sección.");
          router.replace('/panel');
      }

      // 6. Obtener lista de usuarios (solo si tiene acceso)
      if (puedeAccederSeccion) {
          try {
              const snapshotUsuarios = await getDocs(collection(db, "usuariosAura"));
              const datosUsuarios = snapshotUsuarios.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              setUsuarios(datosUsuarios);
              const rolesDeUsuarios = [...new Set(datosUsuarios.map(u => u.rol))];
              setRoles(prevRoles => [...new Set([...prevRoles, ...rolesDeUsuarios])]);
          } catch (error) { console.error("Error obteniendo usuarios:", error); }
      }

      setIsLoadingClient(false); // Indicar que la carga cliente terminó
    };

    obtenerDatosYAcceso();
  }, [router]); // Dependencia solo del router


  // --- Funciones CRUD Usuarios (Modificar disabled) ---
  const iniciarEdicion = (usuario) => { setEditandoId(usuario.id); setValoresEditados({ nombre: usuario.nombre, apellido: usuario.apellido || "", dni: usuario.dni || "", contraseña: usuario.contraseña, rol: usuario.rol }); setMostrarClave(false); };
  const cancelarEdicion = () => { if (usuarioNuevoId) { setUsuarios(usuarios.filter((u) => u.id !== usuarioNuevoId)); setUsuarioNuevoId(null); } setEditandoId(null); };
  const guardarCambios = async (id) => { /* ... (lógica interna sin cambios) ... */ if (!valoresEditados.nombre || !valoresEditados.apellido || !valoresEditados.dni || !valoresEditados.contraseña || !valoresEditados.rol) { alert("Todos los campos son obligatorios."); return; } const dniExistente = usuarios.some(u => u.dni === valoresEditados.dni && u.id !== id); if (dniExistente) { alert("Ya existe un usuario con ese DNI."); return; } try { const usuarioRef = doc(db, "usuariosAura", id); await updateDoc(usuarioRef, valoresEditados); const nuevos = usuarios.map((u) => u.id === id ? { ...u, ...valoresEditados } : u ); setUsuarios(nuevos); setEditandoId(null); setUsuarioNuevoId(null); alert("✅ Usuario actualizado."); } catch (error) { console.error("Error guardando:", error); alert("❌ Error al guardar."); } };
  const eliminarUsuario = async (id) => { /* ... (lógica interna sin cambios) ... */ if (window.confirm("¿Eliminar usuario?")) { await deleteDoc(doc(db, "usuariosAura", id)); const actualizados = usuarios.filter((u) => u.id !== id); setUsuarios(actualizados); } };
  const crearUsuario = async () => { /* ... (lógica interna sin cambios) ... */ if (usuarioNuevoId) { const actualizado = usuarios.filter((u) => u.id !== usuarioNuevoId); setUsuarios(actualizado); setEditandoId(null); setUsuarioNuevoId(null); return; } const nuevo = { nombre: "", apellido: "", dni: "", contraseña: "", rol: roles[0] || "Mozo" }; try { const docRef = await addDoc(collection(db, "usuariosAura"), nuevo); const actualizados = [...usuarios, { ...nuevo, id: docRef.id }]; setUsuarios(actualizados); setEditandoId(docRef.id); setUsuarioNuevoId(docRef.id); setValoresEditados(nuevo); setMostrarClave(true); } catch (error) { console.error("Error creando usuario:", error); alert("Error al crear usuario."); } };

  // --- Función Permisos (sin cambios en lógica) ---
  const handlePermisoChange = async (seccion, rol, nuevoValor) => {
    const nuevoEstado = { ...permisosPorRol, [seccion]: { ...(permisosPorRol[seccion] || {}), [rol]: nuevoValor, } };
    setPermisosPorRol(nuevoEstado);
    try {
        const permisosRef = collection(db, "permisosAura");
        const snapshot = await getDocs(permisosRef);
        if (!snapshot.empty) { const docId = snapshot.docs[0].id; await updateDoc(doc(db, "permisosAura", docId), nuevoEstado); console.log("Permisos actualizados"); }
        else { await addDoc(permisosRef, nuevoEstado); console.log("Documento de permisos creado"); }
    } catch (error) { console.error("Error guardando permisos:", error); alert("Error al guardar permisos."); }
  };

  // --- Renderizado Condicional ---
  // Mostrar 'Cargando...' mientras se determina el acceso
  if (isLoadingClient) {
    return <div style={estilos.contenedor}><p style={{ color: 'white', textAlign: 'center', paddingTop: '2rem' }}>Verificando acceso...</p></div>;
  }

  // Si después de cargar, no tiene acceso (ya se habría redirigido, pero como fallback)
  if (!accessInfo.canAccessSection) {
     return <div style={estilos.contenedor}><p style={{ color: 'white', textAlign: 'center', paddingTop: '2rem' }}>Acceso denegado.</p></div>;
  }

  // --- Renderizado Principal ---
  return (
    <div style={estilos.contenedor}>
      <button onClick={() => router.push('/panel')} style={estilos.botonVolver}>← Volver</button>
      <h1 style={estilos.titulo}>🔐 Seguridad y Usuarios</h1>

      {/* Tabla de Usuarios */}
      <h2 style={{ color: '#D3C6A3', marginTop: '2rem' }}>👥 Gestión de Usuarios</h2>
      {/* <<< Usar accessInfo.isOwner para habilitar/deshabilitar >>> */}
      <button onClick={exportarUsuarios} style={{ ...estilos.botonCrear, marginBottom: '1rem', marginLeft: 0, background: '#0277bd' }}>📤 Exportar Usuarios (CSV)</button>
      <div style={estilos.tabla}>
        <div style={{ ...estilos.fila, fontWeight: 'bold', background: '#806C4F', color: '#0A1034', borderRadius: '6px 6px 0 0' }}> <div style={{ width: '150px', paddingLeft: '0.5rem' }}>Nombre</div> <div style={{ width: '150px' }}>Apellido</div> <div style={{ width: '150px' }}>DNI</div> <div style={{ width: '150px' }}>Contraseña</div> <div style={{ width: '150px' }}>Rol</div> <div style={{ width: '150px' }}>Acciones</div> </div>
        {usuarios.map((u) => ( <div key={u.id} style={estilos.fila}> {editandoId === u.id ? ( <> <input type="text" value={valoresEditados.nombre} onChange={(e) => setValoresEditados({ ...valoresEditados, nombre: e.target.value })} style={estilos.input} /> <input type="text" value={valoresEditados.apellido} onChange={(e) => setValoresEditados({ ...valoresEditados, apellido: e.target.value })} style={estilos.input} /> <input type="text" value={valoresEditados.dni} onChange={(e) => setValoresEditados({ ...valoresEditados, dni: e.target.value })} style={estilos.input} /> <div style={{ position: 'relative', width: '150px' }}> <input type={mostrarClave ? "text" : "password"} value={valoresEditados.contraseña} onChange={(e) => setValoresEditados({ ...valoresEditados, contraseña: e.target.value })} style={{ ...estilos.input, paddingRight: '2rem' }} /> <span onClick={() => setMostrarClave(!mostrarClave)} style={{ position: 'absolute', right: 10, top: 6, cursor: 'pointer' }}>{mostrarClave ? '👁️' : '🙈'}</span> </div> <select value={valoresEditados.rol} onChange={(e) => setValoresEditados({ ...valoresEditados, rol: e.target.value })} style={estilos.select} > {roles.map(r => <option key={r} value={r}>{r}</option>)} </select> <div style={{ display: 'flex', gap: '0.5rem', width: '150px', justifyContent: 'center' }}> <button style={estilos.botonGuardar} onClick={() => guardarCambios(u.id)}>💾</button> <button style={estilos.botonEliminar} onClick={() => eliminarUsuario(u.id)}>🗑️</button> <button onClick={cancelarEdicion} style={{ backgroundColor: '#999', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem', cursor: 'pointer' }}>❌</button> </div> </> ) : ( <> <div style={{ width: '150px' }}>{u.nombre}</div> <div style={{ width: '150px' }}>{u.apellido}</div> <div style={{ width: '150px' }}>{u.dni}</div> <div style={{ width: '150px', fontStyle: 'italic', color: '#ccc' }}>••••••••</div> <div style={{ width: '150px' }}>{u.rol}</div> <div style={{ display: 'flex', gap: '0.5rem', width: '150px', justifyContent: 'center' }}> {/* <<< Usar accessInfo.isOwner >>> */} <button style={estilos.botonEditar} onClick={() => iniciarEdicion(u)} disabled={!accessInfo.isOwner}>✏️</button> <button style={estilos.botonEliminar} onClick={() => eliminarUsuario(u.id)} disabled={!accessInfo.isOwner}>🗑️</button> </div> </> )} </div> ))}
      </div>
      {/* <<< Usar accessInfo.isOwner >>> */}
      <button style={estilos.botonCrear} onClick={crearUsuario} disabled={!accessInfo.isOwner}>
        {usuarioNuevoId ? '✖️ Cancelar creación' : '➕ Nuevo Usuario'}
      </button>

      {/* --- Tabla de Permisos --- */}
      {/* <<< Usar accessInfo.canEditPermissions >>> */}
      {accessInfo.canEditPermissions && (
        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ color: '#D3C6A3' }}>🔧 Panel de Roles y Permisos</h2>
          <button style={estilos.botonCrear} onClick={() => {
            const nuevoRol = prompt('Nombre del nuevo rol:');
            if (nuevoRol && !roles.includes(nuevoRol)) {
              setRoles([...roles, nuevoRol]);
              const nuevoPermisos = { ...permisosPorRol };
              Object.keys(nuevoPermisos).forEach(seccion => { nuevoPermisos[seccion] = { ...(nuevoPermisos[seccion] || {}), [nuevoRol]: "no" }; });
              setPermisosPorRol(nuevoPermisos);
              handlePermisoChange(Object.keys(nuevoPermisos)[0] || 'reservas', nuevoRol, "no");
              alert('Rol creado: ' + nuevoRol + '. Asigna sus permisos.');
            } else if (nuevoRol) { alert('Ese rol ya existe.'); }
          }}>➕ Nuevo Rol</button>

          {/* No necesitamos loadingPermisos aquí porque ya esperamos arriba */}
          <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
            <table style={estilos.permisosTabla}>
              <thead>
                <tr style={{ borderBottom: '1px solid #EFE4CF' }}>
                  <th style={estilos.permisosTdLabel}>Sección / Permiso</th>
                  {roles.map((rol) => (
                    <th key={rol} style={estilos.permisosTh}>
                      {rol}
                      {rol !== 'Administrador' && (
                        <button onClick={() => {
                          if (window.confirm(`¿Eliminar el rol '${rol}'?`)) {
                            setRoles(roles.filter(r => r !== rol));
                            const nuevoPermisos = { ...permisosPorRol };
                            Object.keys(nuevoPermisos).forEach(seccion => { delete nuevoPermisos[seccion][rol]; });
                            setPermisosPorRol(nuevoPermisos);
                            handlePermisoChange(Object.keys(nuevoPermisos)[0] || 'reservas', rol, undefined);
                          }
                        }} style={{ background: 'none', color: '#D9534F', border: 'none', cursor: 'pointer', marginLeft: '5px' }}>🗑️</button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { seccion: "reservas", label: "📊 Panel Admin y Reservas (Secc 1-5)" },
                  { seccion: "seguridad", label: "🔐 Seguridad y Usuarios (Secc 6)" },
                  { seccion: "compras", label: "📥 Compras" },
                  { seccion: "stock", label: "📦 Control de Stock" },
                  { seccion: "ventasCaja", label: "💰 Ventas y Caja" },
                  // Dentro del array que mapea las filas de la tabla de permisos en seccion6.js
                  { seccion: "recetas", label: "🍹 Recetas" }, // Añadir esta línea
                  { seccion: "ventas", label: "📈 Control Ventas" }, // Añadir esta línea (o el emoji/texto que prefieras)

                ].map(({ seccion, label }) => (
                  <tr key={seccion}>
                    <td style={estilos.permisosTdLabel}>{label}</td>
                    {roles.map((rol) => (
                      <td key={`${seccion}-${rol}`} style={estilos.permisosTd}>
                        <select
                          disabled={rol === "Administrador"}
                          value={rol === "Administrador" ? "total" : (permisosPorRol[seccion]?.[rol] || "no")}
                          onChange={(e) => handlePermisoChange(seccion, rol, e.target.value)}
                          style={{ ...estilos.select, width: '140px' }}
                        >
                          <option value="total">✅ Total</option>
                          <option value="editar">✏️ Ver y Editar</option>
                          <option value="ver">👁️ Solo Ver</option>
                          <option value="no">❌ Sin Acceso</option>
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Estilos (Añadidos estilos específicos para tabla permisos) ---
const estilos = {
  contenedor: { backgroundColor: "#0A1034", color: "#EFE4CF", minHeight: "100vh", padding: "2rem", fontFamily: "serif", },
  titulo: { fontSize: "2rem", marginBottom: "1.5rem", textAlign: "center", color: "#D3C6A3", },
  tabla: { backgroundColor: "#1C2340", padding: "1rem", borderRadius: "10px", boxShadow: "0 0 6px rgba(0,0,0,0.2)", overflowX: 'auto' },
  fila: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", minWidth: '950px' },
  input: { backgroundColor: "#EFE4CF", color: "#0A1034", borderRadius: "6px", padding: "0.4rem", border: "none", width: "150px", boxSizing: 'border-box' },
  botonEditar: { backgroundColor: "#D3C6A3", color: "#0A1034", border: "none", borderRadius: "6px", padding: "0.4rem", cursor: "pointer", },
  botonEliminar: { backgroundColor: "#D9534F", color: "#fff", border: "none", borderRadius: "6px", padding: "0.4rem", cursor: "pointer", },
  botonGuardar: { backgroundColor: "#5CB85C", color: "#fff", border: "none", borderRadius: "6px", padding: "0.4rem", cursor: "pointer", },
  botonCrear: { backgroundColor: "#D3C6A3", color: "#0A1034", border: "none", borderRadius: "8px", padding: "0.6rem 1.2rem", marginTop: "1rem", cursor: "pointer", display: "inline-block", fontSize: "1rem", },
  botonVolver: { background: "#806C4F", color: "#EFE4CF", border: "none", borderRadius: "12px", padding: "0.6rem 1.2rem", cursor: "pointer", display: "inline-block", fontSize: "1rem", position: 'absolute', top: '2rem', left: '2rem' },
  select: { backgroundColor: "#EFE4CF", color: "#0A1034", borderRadius: "6px", padding: "0.4rem", border: "none", width: "150px", boxSizing: 'border-box' },
  // <<< Estilos específicos para la tabla de permisos >>>
  permisosTabla: { width: '100%', minWidth: '800px', borderCollapse: 'collapse', marginTop: '1rem', fontSize: '0.9rem' },
  permisosTh: { textAlign: 'center', padding: '0.5rem', borderBottom: '1px solid #EFE4CF' },
  permisosTd: { textAlign: 'center', padding: '0.5rem', borderBottom: '1px solid #4a5568' },
  permisosTdLabel: { textAlign: 'left', padding: '0.5rem', fontWeight: 'bold', borderBottom: '1px solid #4a5568' },
};
