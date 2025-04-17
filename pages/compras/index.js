// pages/compras/index.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { db } from "../../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  increment,
  writeBatch,
} from "firebase/firestore";

export default function Compras() {
  const router = useRouter();

  // --- Estados del Formulario ---
  const [selectedProductoBaseId, setSelectedProductoBaseId] = useState("");
  const [selectedPresentacion, setSelectedPresentacion] = useState(null);
  const [cantidadPresentaciones, setCantidadPresentaciones] = useState("");
  const [precioUnitarioPresentacion, setPrecioUnitarioPresentacion] = useState("");
  const [proveedorInput, setProveedorInput] = useState("");

  // --- Estados de la Compra ---
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [responsable, setResponsable] = useState("");
  const [productos, setProductos] = useState([]);

  // --- Estados de Edición ---
  const [editandoCompra, setEditandoCompra] = useState(false);
  const [idCompraEditando, setIdCompraEditando] = useState(null);
  const [productoEditandoIdx, setProductoEditandoIdx] = useState(null);

  // --- Estados de Datos Externos ---
  const [comprasHistorial, setComprasHistorial] = useState([]);
  const [articulosBase, setArticulosBase] = useState([]);
  const [proveedoresBase, setProveedoresBase] = useState([]);
  const [loadingArticulos, setLoadingArticulos] = useState(true);
  const [loadingProveedores, setLoadingProveedores] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // <<< NUEVOS ESTADOS para permisos >>>
  const [isLoadingClient, setIsLoadingClient] = useState(true); // Carga inicial cliente + permisos
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [comprasPermissionLevel, setComprasPermissionLevel] = useState('no'); // Permiso específico

 // --- Efecto Inicial: Autorización, Rol, Permisos y Carga de Datos (CORREGIDO) ---
 useEffect(() => {
  const checkAuthAndLoadData = async () => {
      setIsLoadingClient(true);

      // 1. Autorización básica
      const autorizado = localStorage.getItem("adminAutorizado") === "true" || Cookies.get("adminAutorizado") === "true";
      if (!autorizado) { router.replace("/"); return; }

      // 2. Obtener Rol y verificar si es Dueño
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuarioAura"));
      const userRole = usuarioGuardado?.rol;
      const userName = usuarioGuardado?.nombre || "Usuario";
      const isOwner = usuarioGuardado?.contraseña === 'Aura2025'; // <<< Verificar si es dueño AQUÍ
      setResponsable(userName);

      if (!userRole) {
          console.error("Rol no encontrado en localStorage.");
          alert("Error: No se pudo identificar tu rol.");
          router.replace("/");
          return;
      }
      setCurrentUserRole(userRole);

      // 3. Cargar Permisos y Determinar Acceso Final
      let permissionFromDb = 'no'; // Permiso leído de Firestore
      let finalPermission = 'no'; // Permiso final a aplicar
      try {
          const permisosSnapshot = await getDocs(collection(db, "permisosAura"));
          if (!permisosSnapshot.empty) {
              const permisosData = permisosSnapshot.docs[0].data();
              permissionFromDb = permisosData?.compras?.[userRole] || 'no'; // Leer permiso específico
          } else {
              console.warn("Documento de permisos no encontrado.");
              // Si no hay config, el permiso leído es 'no'
          }
      } catch (error) {
          console.error("Error cargando permisos:", error);
          permissionFromDb = 'no'; // Denegar en caso de error de lectura
      }

      // <<< LÓGICA CORREGIDA: Priorizar al dueño >>>
      if (isOwner) {
          finalPermission = 'total'; // El dueño SIEMPRE tiene acceso total
      } else {
          finalPermission = permissionFromDb; // Los demás usan el permiso de la DB
      }
      // <<< FIN LÓGICA CORREGIDA >>>

      setComprasPermissionLevel(finalPermission); // Establecer el permiso final

      // 4. Redirigir si no tiene acceso
      if (finalPermission === 'no') {
          console.warn(`Acceso denegado a Compras para rol: ${userRole}`);
          alert("No tienes permiso para acceder a esta sección.");
          router.replace('/panel');
          setIsLoadingClient(false);
          return;
      }

      // 5. Cargar datos necesarios si tiene acceso
      await Promise.all([
          cargarComprasFirestore(),
          cargarArticulosBase(),
          cargarProveedoresBase()
      ]);

      setIsLoadingClient(false);
  };

  checkAuthAndLoadData();
}, [router]);

  // --- Carga de Datos (Funciones internas) ---
  const cargarComprasFirestore = async () => {
    try { const snapshot = await getDocs(collection(db, "comprasAura")); const comprasFirestore = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); comprasFirestore.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); setComprasHistorial(comprasFirestore); } catch (error) { console.error("Error cargando historial:", error); /* No alertar aquí para no interrumpir carga inicial */ }
  };
  const cargarArticulosBase = async () => {
    setLoadingArticulos(true); try { const snapshot = await getDocs(collection(db, "articulosAura")); const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); items.sort((a, b) => (a.producto || "").localeCompare(b.producto || "")); setArticulosBase(items); } catch (error) { console.error("Error cargando Productos Base:", error); setArticulosBase([]); } finally { setLoadingArticulos(false); }
  };
  const cargarProveedoresBase = async () => {
    setLoadingProveedores(true); try { const snapshot = await getDocs(collection(db, "proveedores")); const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); items.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "")); setProveedoresBase(items); } catch (error) { console.error("Error cargando proveedores:", error); setProveedoresBase([]); } finally { setLoadingProveedores(false); }
  };

  // --- Variables booleanas para permisos (usar después de cargar) ---
  const canEdit = !isLoadingClient && (comprasPermissionLevel === 'total' || comprasPermissionLevel === 'editar');
  const canView = !isLoadingClient && (canEdit || comprasPermissionLevel === 'ver'); // 'ver' solo podría ver historial
  const canDoTotal = !isLoadingClient && comprasPermissionLevel === 'total';

  // --- Lógica para Agregar/Editar Producto (Añadir verificación) ---
  const agregarProducto = () => {
    if (!canEdit) {
        alert("No tienes permiso para agregar o modificar productos en la compra.");
        return;
    }
    // ... (resto de la lógica de validación y agregado sin cambios) ...
    if (!selectedProductoBaseId || !selectedPresentacion || !cantidadPresentaciones || !precioUnitarioPresentacion) { alert("Selecciona Producto Base, Presentación y completa Cantidad y Precio."); return; } const cantidadNum = parseFloat(cantidadPresentaciones); const precioNum = parseFloat(precioUnitarioPresentacion); if (isNaN(cantidadNum) || cantidadNum <= 0 || isNaN(precioNum) || precioNum < 0) { alert("Cantidad debe ser mayor a 0 y Precio no puede ser negativo."); return; } const productoBase = articulosBase.find(item => item.id === selectedProductoBaseId); if (!productoBase) { alert("Error: Producto Base seleccionado no encontrado."); return; } const nuevoProductoParaLista = { tempId: Date.now() + Math.random(), productoBaseId: productoBase.id, productoNombre: productoBase.producto, marcaNombre: productoBase.marca || "", descripcion: productoBase.descripcion || "", presentacionNombre: selectedPresentacion.nombre, presentacionContenido: selectedPresentacion.contenidoEnUnidadBase, unidadBase: productoBase.unidadBase, cantidadPresentaciones: cantidadNum, costoUnitarioPresentacion: precioNum, proveedor: proveedorInput.trim(), }; if (productoEditandoIdx !== null) { const actualizados = [...productos]; actualizados[productoEditandoIdx] = nuevoProductoParaLista; setProductos(actualizados); setProductoEditandoIdx(null); } else { setProductos([...productos, nuevoProductoParaLista]); } setSelectedProductoBaseId(""); setSelectedPresentacion(null); setCantidadPresentaciones(""); setPrecioUnitarioPresentacion(""); setProveedorInput("");
  };

  // --- Funciones de Edición/Borrado en Compra Actual (Añadir verificación) ---
  const editarProductoDeLista = (index) => {
    if (!canEdit) {
        alert("No tienes permiso para editar productos en esta compra.");
        return;
    }
    // ... (resto de la lógica sin cambios) ...
    const p = productos[index]; setSelectedProductoBaseId(p.productoBaseId); const productoBase = articulosBase.find(item => item.id === p.productoBaseId); const presentacionObj = productoBase?.presentaciones?.find(pres => pres.nombre === p.presentacionNombre); setSelectedPresentacion(presentacionObj || null); setCantidadPresentaciones(p.cantidadPresentaciones); setPrecioUnitarioPresentacion(p.costoUnitarioPresentacion); setProveedorInput(p.proveedor); setProductoEditandoIdx(index);
  };

  const borrarProductoDeLista = (index) => {
    if (!canEdit) {
        alert("No tienes permiso para eliminar productos de esta compra.");
        return;
    }
    // ... (resto de la lógica sin cambios) ...
    if (!window.confirm("¿Eliminar este producto de la compra actual?")) return; const actualizados = productos.filter((_, i) => i !== index); setProductos(actualizados); if (productoEditandoIdx === index) { setProductoEditandoIdx(null); setSelectedProductoBaseId(""); setSelectedPresentacion(null); setCantidadPresentaciones(""); setPrecioUnitarioPresentacion(""); setProveedorInput(""); }
  };

  // --- Guardar Compra y Actualizar Stock (Añadir verificación) ---
  const guardarCompra = async () => {
    if (!canEdit) {
        alert("No tienes permiso para guardar compras.");
        return;
    }
    // ... (resto de la lógica de guardado y actualización de stock sin cambios) ...
    if (productos.length === 0) { alert("Agrega al menos un producto."); return; } if (!window.confirm(editandoCompra ? "¿Guardar cambios?" : "¿Confirmar y guardar compra?")) return; setIsSaving(true); const productosAgrupados = productos.reduce((acc, curr) => { const claveProveedor = curr.proveedor || "Sin Proveedor"; if (!acc[claveProveedor]) acc[claveProveedor] = []; acc[claveProveedor].push(curr); return acc; }, {}); const productosGuardados = [...productos]; try { const guardarOperacionCompra = async (provNombre, prodsProveedor, compId = null) => { const itemsGuardar = prodsProveedor.map(p => ({ productoBaseId: p.productoBaseId, productoNombre: p.productoNombre, marcaNombre: p.marcaNombre, descripcion: p.descripcion, presentacionNombre: p.presentacionNombre, cantidadComprada: p.cantidadPresentaciones, unidadBase: p.unidadBase, contenidoPorPresentacion: p.presentacionContenido, costoUnitario: p.costoUnitarioPresentacion, costoTotalItem: p.cantidadPresentaciones * p.costoUnitarioPresentacion })); const costoTotal = itemsGuardar.reduce((sum, item) => sum + item.costoTotalItem, 0); const datos = { fecha, responsable, proveedor: provNombre, items: itemsGuardar, costoTotalCompra: costoTotal, estado: "Recibida" }; if (compId) { await updateDoc(doc(db, "comprasAura", compId), datos); } else { const docRef = await addDoc(collection(db, "comprasAura"), datos); return docRef.id; } return compId; }; const idsGuardadas = []; if (editandoCompra && idCompraEditando) { const provEditando = Object.keys(productosAgrupados)[0] || "Sin Proveedor"; const idGuardado = await guardarOperacionCompra(provEditando, productosAgrupados[provEditando], idCompraEditando); if (idGuardado) idsGuardadas.push(idGuardado); alert("Compra actualizada."); } else { for (const [provNombre, prodsProveedor] of Object.entries(productosAgrupados)) { const idGuardado = await guardarOperacionCompra(provNombre, prodsProveedor); if (idGuardado) idsGuardadas.push(idGuardado); } alert("Compra(s) guardada(s)."); } try { const batch = writeBatch(db); let updates = 0; productosGuardados.forEach(p => { if (!p.productoBaseId || !p.presentacionContenido || !p.cantidadPresentaciones) { console.error("Datos incompletos:", p); return; } const total = p.cantidadPresentaciones * p.presentacionContenido; if (isNaN(total) || total <= 0) { console.error("Cálculo inválido:", p); return; } const itemRef = doc(db, "articulosAura", p.productoBaseId); batch.update(itemRef, { cantidadActual: increment(total) }); updates++; console.log(`Batch: Update ${p.productoBaseId} +${total}`); }); if (updates > 0) { await batch.commit(); console.log("Stock actualizado."); alert("Stock actualizado."); } else { console.log("Sin actualizaciones de stock."); } } catch (stockErr) { console.error("Error stock:", stockErr); alert("¡ATENCIÓN! Compra guardada, pero error al actualizar stock. Revisa consola/ajusta manualmente."); } setProductos([]); setEditandoCompra(false); setIdCompraEditando(null); setProductoEditandoIdx(null); setSelectedProductoBaseId(""); setSelectedPresentacion(null); setCantidadPresentaciones(""); setPrecioUnitarioPresentacion(""); setProveedorInput(""); cargarComprasFirestore(); } catch (error) { console.error("Error guardando compra:", error); alert("Error al guardar."); } finally { setIsSaving(false); }
  };

  // --- Funciones para el Historial (Añadir verificación) ---
  const eliminarCompra = async (id) => {
     // Requiere permiso 'total' para eliminar historial
     if (!canDoTotal) {
         alert("No tienes permiso para eliminar compras del historial.");
         return;
     }
     if (!window.confirm("¿Eliminar esta compra del historial? NO revierte el stock.")) return;
    try { await deleteDoc(doc(db, "comprasAura", id)); cargarComprasFirestore(); alert("Compra eliminada."); }
    catch (error) { console.error("Error al eliminar compra:", error); alert("Error al eliminar."); }
   };

  const editarCompra = (compra) => {
     // Requiere permiso 'editar' o 'total' para cargar y editar
     if (!canEdit) {
         alert("No tienes permiso para editar compras del historial.");
         return;
     }
     // ... (resto de la lógica sin cambios) ...
     if (!window.confirm("¿Cargar esta compra para editarla?")) return; setFecha(compra.fecha); setResponsable(compra.responsable); const itemsCompra = compra.items || []; const prodsEditar = itemsCompra.map(item => ({ tempId: Date.now() + Math.random(), productoBaseId: item.productoBaseId || null, productoNombre: item.productoNombre || "?", marcaNombre: item.marcaNombre || "", descripcion: item.descripcion || "", presentacionNombre: item.presentacionNombre || "?", presentacionContenido: item.contenidoPorPresentacion || 0, unidadBase: item.unidadBase || "?", cantidadPresentaciones: item.cantidadComprada || 0, costoUnitarioPresentacion: item.costoUnitario || 0, proveedor: compra.proveedor || "" })); setProductos(prodsEditar); setEditandoCompra(true); setIdCompraEditando(compra.id); setProductoEditandoIdx(null); setSelectedProductoBaseId(""); setSelectedPresentacion(null); setCantidadPresentaciones(""); setPrecioUnitarioPresentacion(""); setProveedorInput(""); window.scrollTo(0, 0);
   };

  // --- Agrupación Visual y Filtro Presentaciones (sin cambios) ---
  const productosAgrupadosVisual = productos.reduce((acc, curr) => { const clave = curr.proveedor || "Sin Proveedor"; if (!acc[clave]) acc[clave] = []; acc[clave].push(curr); return acc; }, {});
  const presentacionesCompraDisponibles = articulosBase.find(item => item.id === selectedProductoBaseId)?.presentaciones?.filter(p => p.esCompra) || [];

  // --- Renderizado Condicional ---
  if (isLoadingClient) {
    return <div style={estilos.contenedor}><p style={{ color: 'white', textAlign: 'center', paddingTop: '2rem' }}>Verificando acceso...</p></div>;
  }
  // Si no tiene acceso (ya se habría redirigido, pero como fallback)
  if (comprasPermissionLevel === 'no') {
     return <div style={estilos.contenedor}><p style={{ color: 'white', textAlign: 'center', paddingTop: '2rem' }}>Acceso denegado.</p></div>;
  }

  // --- Renderizado Principal (Añadir disabled a botones) ---
  return (
    <div style={estilos.contenedor}>
      <button onClick={() => router.push('/panel')} style={estilos.botonVolver}>
        ← Volver al Panel
      </button>
      <h1 style={estilos.titulo}>📥 Control de Compras</h1>

      {/* --- Formulario (Deshabilitar campos si no puede editar) --- */}
      <div style={estilos.formulario}>
        <h2 style={estilos.subtituloForm}>
          {productoEditandoIdx !== null ? "Editando Producto" : "Agregar Producto a la Compra"}
        </h2>
        <div style={estilos.filaInput}>
            <label style={estilos.label}>Fecha Compra:</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={estilos.input} disabled={!canEdit || isSaving}/> {/* Deshabilitar */}
        </div>
        <div style={estilos.filaInput}>
            <label style={estilos.label}>Responsable:</label>
            <input placeholder="Responsable" value={responsable} disabled style={estilos.input} />
        </div>
        <div style={estilos.filaInput}>
            <label style={estilos.label}>Producto Base:</label>
            <select value={selectedProductoBaseId} onChange={(e) => { setSelectedProductoBaseId(e.target.value); setSelectedPresentacion(null); }} style={estilos.input} disabled={!canEdit || loadingArticulos || isSaving}> {/* Deshabilitar */}
                <option value="" disabled>{loadingArticulos ? "Cargando..." : "-- Selecciona Producto --"}</option>
                {articulosBase.map((item) => (<option key={item.id} value={item.id}>{item.producto} ({item.marca || 'Sin marca'}) {item.descripcion ? `- ${item.descripcion}` : ''}</option>))}
            </select>
        </div>
        <div style={estilos.filaInput}>
            <label style={estilos.label}>Presentación:</label>
            <select value={selectedPresentacion ? selectedPresentacion.nombre : ""} onChange={(e) => { const nombre = e.target.value; const obj = presentacionesCompraDisponibles.find(p => p.nombre === nombre); setSelectedPresentacion(obj || null); }} style={estilos.input} disabled={!canEdit || !selectedProductoBaseId || presentacionesCompraDisponibles.length === 0 || isSaving}> {/* Deshabilitar */}
                <option value="" disabled>{!selectedProductoBaseId ? "Selecciona Producto" : presentacionesCompraDisponibles.length === 0 ? "No hay presentaciones" : "-- Selecciona Presentación --"}</option>
                {presentacionesCompraDisponibles.map((p) => (<option key={p.nombre} value={p.nombre}>{p.nombre} ({p.contenidoEnUnidadBase} {articulosBase.find(item => item.id === selectedProductoBaseId)?.unidadBase})</option>))}
            </select>
        </div>
        <div style={estilos.filaInput}>
            <label style={estilos.label}>Cantidad:</label>
            <input placeholder="Cantidad" type="number" min="0" step="any" value={cantidadPresentaciones} onChange={(e) => setCantidadPresentaciones(e.target.value)} style={estilos.input} disabled={!canEdit || isSaving}/> {/* Deshabilitar */}
        </div>
        <div style={estilos.filaInput}>
            <label style={estilos.label}>Precio Unitario:</label>
            <input placeholder="Precio" type="number" min="0" step="any" value={precioUnitarioPresentacion} onChange={(e) => setPrecioUnitarioPresentacion(e.target.value)} style={estilos.input} disabled={!canEdit || isSaving}/> {/* Deshabilitar */}
        </div>
        <div style={estilos.filaInput}>
            <label style={estilos.label}>Proveedor:</label>
            <input list="proveedoresDataList" placeholder="Proveedor" value={proveedorInput} onChange={(e) => setProveedorInput(e.target.value)} style={estilos.input} disabled={!canEdit || loadingProveedores || isSaving}/> {/* Deshabilitar */}
            <datalist id="proveedoresDataList">{proveedoresBase.map((prov) => ( <option key={prov.id} value={prov.nombre} /> ))}</datalist>
             {loadingProveedores && <span style={{fontSize: '0.8em'}}> Cargando...</span>}
        </div>
        {/* Botones Agregar/Cancelar (Deshabilitar si no puede editar) */}
        <button onClick={agregarProducto} style={estilos.botonAgregar} disabled={!canEdit || loadingArticulos || loadingProveedores || isSaving}>
          {isSaving ? "Guardando..." : (productoEditandoIdx !== null ? "✓ Guardar Cambios" : "➕ Agregar Producto")}
        </button>
        {productoEditandoIdx !== null && (
            <button onClick={() => { setProductoEditandoIdx(null); setSelectedProductoBaseId(""); setSelectedPresentacion(null); setCantidadPresentaciones(""); setPrecioUnitarioPresentacion(""); setProveedorInput(""); }} style={estilos.botonCancelarEdicion} disabled={!canEdit || isSaving}> {/* Deshabilitar */}
                ✗ Cancelar Edición
            </button>
        )}
      </div>

      {/* --- Tabla Resumen Compra Actual (Deshabilitar botones si no puede editar) --- */}
      {productos.length > 0 && (
        <div style={estilos.resumenCompra}>
           <h2 style={estilos.subtitulo}>🛒 Resumen Compra Actual {editandoCompra ? `(Editando Compra ID: ${idCompraEditando})` : ''}</h2>
          {Object.entries(productosAgrupadosVisual).map(([prov, listaProds], idx) => (
            <div key={idx} style={{ marginBottom: '1.5rem' }}>
              <h3 style={estilos.subtituloProveedor}>Proveedor: {prov}</h3>
              <div style={estilos.tablaContenedor}>
                <table style={estilos.tabla}>
                   <thead><tr><th style={estilos.th}>Producto</th><th style={estilos.th}>Marca</th><th style={estilos.th}>Descripción</th><th style={estilos.th}>Presentación</th><th style={estilos.th}>Cantidad</th><th style={estilos.th}>Precio Unit.</th><th style={estilos.th}>Subtotal</th><th style={estilos.th}>Acciones</th></tr></thead>
                  <tbody>
                    {listaProds.map((p) => {
                      const originalIndex = productos.findIndex(prod => prod.tempId === p.tempId);
                      const subtotal = p.cantidadPresentaciones * p.costoUnitarioPresentacion;
                      return (
                        <tr key={p.tempId} style={productoEditandoIdx === originalIndex ? estilos.filaEditando : {}}>
                          <td style={estilos.td}>{p.productoNombre}</td><td style={estilos.td}>{p.marcaNombre || "-"}</td><td style={estilos.td}>{p.descripcion || "-"}</td><td style={estilos.td}>{p.presentacionNombre} ({p.presentacionContenido} {p.unidadBase})</td><td style={estilos.td}>{p.cantidadPresentaciones}</td><td style={estilos.td}>${p.costoUnitarioPresentacion.toFixed(2)}</td><td style={estilos.td}>${subtotal.toFixed(2)}</td>
                          <td style={estilos.td}>
                            <button onClick={() => editarProductoDeLista(originalIndex)} style={estilos.botonAccion} disabled={!canEdit || isSaving}>✏️</button> {/* Deshabilitar */}
                            <button onClick={() => borrarProductoDeLista(originalIndex)} style={estilos.botonAccion} disabled={!canEdit || isSaving}>🗑️</button> {/* Deshabilitar */}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {/* Botones Guardar/Cancelar Compra (Deshabilitar si no puede editar) */}
          <button onClick={guardarCompra} style={estilos.botonGuardarCompra} disabled={!canEdit || isSaving}>
            {isSaving ? "Guardando..." : (editandoCompra ? "💾 Guardar Cambios" : "💾 Guardar Compra")}
          </button>
          {editandoCompra && (
              <button onClick={() => { setEditandoCompra(false); setIdCompraEditando(null); setProductos([]); }} style={estilos.botonCancelarEdicion} disabled={!canEdit || isSaving}> {/* Deshabilitar */}
                  ✗ Cancelar Edición Compra
              </button>
          )}
        </div>
      )}

      {/* --- Historial de Compras (Deshabilitar botones según permiso) --- */}
      {/* La visibilidad del historial podría depender de 'canView' */}
      {canView && (
          <div style={estilos.historial}>
             <h2 style={estilos.subtitulo}>🧾 Historial de Compras</h2>
            {comprasHistorial.length === 0 && <p>No hay compras registradas.</p>}
            {comprasHistorial.map((c) => {
                const itemsHistorial = c.items || [];
                const totalMostrado = c.costoTotalCompra?.toFixed(2) ?? 'N/A';
                return (
                  <div key={c.id} style={estilos.itemHistorial}>
                     <div style={estilos.cabeceraHistorial}>
                      <div><strong>Fecha:</strong> {c.fecha} <br /><strong>Proveedor:</strong> {c.proveedor || "N/A"} <br /><strong>Responsable:</strong> {c.responsable} <br/><strong>Total:</strong> ${totalMostrado}</div>
                      <div style={estilos.accionesHistorial}>
                        <button onClick={() => editarCompra(c)} style={estilos.botonAccionHistorial} disabled={!canEdit}>✏️ Editar</button> {/* Deshabilitar si no puede editar */}
                        <button onClick={() => eliminarCompra(c.id)} style={estilos.botonAccionHistorialRojo} disabled={!canDoTotal}>🗑️ Eliminar</button> {/* Deshabilitar si no tiene permiso total */}
                      </div>
                    </div>
                    <details style={estilos.detailsHistorial}>
                        <summary style={estilos.summaryHistorial}>Ver detalles ({itemsHistorial.length} productos)</summary>
                        <ul style={estilos.listaDetallesHistorial}>{itemsHistorial.map((p, idx) => (<li key={idx}>▪ {p.cantidadComprada || 0} x {p.presentacionNombre || "?"} de {p.productoNombre || "?"} ({p.marcaNombre || 'Sin marca'}){p.descripcion ? ` - ${p.descripcion}` : ''} a ${p.costoUnitario?.toFixed(2) || 'N/A'} c/u</li>))}</ul>
                    </details>
                  </div>
                );
            })}
          </div>
      )}
    </div>
  );
}

// --- Estilos ---
const estilos = {
  // ... (Tus estilos existentes sin cambios) ...
  contenedor: {
    minHeight: "100vh",
    background: "#0A1034", // Azul oscuro
    color: "#EFE4CF", // Crema claro
    padding: "2rem 1.5rem",
    fontFamily: "'Space Grotesk', sans-serif", // Fuente consistente
  },
  botonVolver: {
    background: "#806C4F", // Marrón medio
    color: "#EFE4CF",
    padding: "0.5rem 1rem",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    marginBottom: "1.5rem",
    display: 'inline-block',
  },
  titulo: {
    fontSize: "2rem", // Más grande
    color: "#D3C6A3", // Dorado pálido
    marginBottom: "2rem",
    textAlign: "center",
    borderBottom: "2px solid #806C4F",
    paddingBottom: "0.5rem",
  },
  subtitulo: {
    marginTop: "2.5rem",
    marginBottom: "1rem",
    color: "#D3C6A3",
    fontSize: "1.5rem",
    borderBottom: "1px solid #4a5568", // Línea sutil
    paddingBottom: "0.3rem",
  },
  subtituloForm: {
    color: "#EFE4CF",
    fontSize: "1.3rem",
    marginBottom: "1rem",
    textAlign: 'center',
  },
  formulario: {
    background: "#1C2340", // Azul más claro
    padding: "1.5rem",
    borderRadius: "12px",
    marginBottom: "2rem",
    maxWidth: "600px",
    margin: "0 auto",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
  },
  filaInput: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1rem',
    gap: '1rem',
  },
  label: {
    minWidth: '100px', // Ancho fijo para alinear
    textAlign: 'right',
    fontSize: '0.9rem',
    color: '#D3C6A3',
  },
  input: {
    padding: "0.7rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "1px solid #4a5568", // Borde más oscuro
    backgroundColor: "#EFE4CF", // Fondo crema
    color: "#2c1b0f", // Texto oscuro
    flex: 1, // Ocupar espacio disponible
  },
  botonAgregar: {
    background: "#806C4F", // Marrón
    color: "#EFE4CF",
    padding: "0.8rem",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1rem",
    marginTop: "1rem",
    width: "100%",
    transition: "background-color 0.2s",
    '&:hover': {
        backgroundColor: "#6b5b40", // Oscurecer al pasar el mouse
    },
    '&:disabled': {
        backgroundColor: "#555",
        cursor: 'not-allowed',
    }
  },
  botonCancelarEdicion: {
    background: "#666", // Gris
    color: "#EFE4CF",
    padding: "0.6rem",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "0.9rem",
    marginTop: "0.5rem",
    width: "100%",
  },
  resumenCompra: {
    marginTop: "2rem",
    background: "#1C2340",
    padding: "1.5rem",
    borderRadius: "12px",
  },
  subtituloProveedor: {
    color: "#D3C6A3",
    fontSize: "1.1rem",
    marginBottom: "0.8rem",
    borderBottom: "1px dashed #4a5568",
    paddingBottom: "0.2rem",
  },
  tablaContenedor: {
    overflowX: 'auto', // Para tablas anchas en móviles
  },
  tabla: {
    width: "100%",
    borderCollapse: 'collapse',
    marginTop: "1rem",
    color: "#EFE4CF",
    fontSize: "0.9rem",
  },
  th: {
    background: "#806C4F", // Fondo marrón para cabeceras
    color: "#0A1034", // Texto oscuro
    padding: "0.6rem",
    textAlign: "left",
    border: "1px solid #4a5568",
  },
  td: {
    padding: "0.6rem",
    border: "1px solid #4a5568", // Bordes más sutiles
    verticalAlign: 'middle',
  },
  filaEditando: {
      backgroundColor: 'rgba(211, 198, 163, 0.2)', // Resaltar fila en edición
  },
  botonAccion: {
    background: "none",
    border: "none",
    color: "#D3C6A3",
    cursor: "pointer",
    fontSize: "1.1rem",
    margin: "0 0.3rem",
  },
  botonGuardarCompra: {
    background: "#4CAF50", // Verde para guardar
    color: "white",
    padding: "0.8rem 1.5rem",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1.1rem",
    marginTop: "1.5rem",
    display: 'block',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  historial: {
    marginTop: "3rem",
  },
  itemHistorial: {
    marginBottom: "1.5rem",
    background: "#1C2340", // Fondo azul claro
    padding: "1rem 1.5rem",
    borderRadius: "8px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
  },
  cabeceraHistorial: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.8rem",
    flexWrap: 'wrap', // Para que se ajuste en pantallas pequeñas
    gap: '1rem',
  },
  accionesHistorial: {
    display: "flex",
    gap: "0.8rem",
    flexShrink: 0, // Evitar que los botones se achiquen demasiado
  },
  botonAccionHistorial: {
    background: "#806C4F",
    color: "#EFE4CF",
    padding: "0.4rem 0.8rem",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  botonAccionHistorialRojo: {
    background: "#b71c1c", // Rojo oscuro para eliminar
    color: "#EFE4CF",
    padding: "0.4rem 0.8rem",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  detailsHistorial: {
      marginTop: '0.5rem',
      borderTop: '1px solid #4a5568',
      paddingTop: '0.5rem',
  },
  summaryHistorial: {
      cursor: 'pointer',
      color: '#D3C6A3',
      fontSize: '0.9rem',
      fontWeight: 'bold',
  },
  listaDetallesHistorial: {
      listStyle: 'none',
      paddingLeft: '1rem',
      marginTop: '0.5rem',
      fontSize: '0.85rem',
      color: '#bdc1c6', // Gris claro para detalles
  }
};
