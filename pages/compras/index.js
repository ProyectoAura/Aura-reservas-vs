// pages/compras/index.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { db } from "../../firebase/firebaseConfig"; // Asegúrate que esta ruta sea correcta
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  increment, // <<< AÑADIDO: Para actualizar stock
  writeBatch // <<< AÑADIDO: Opcional para batch updates
} from "firebase/firestore";

export default function Compras() {
  const router = useRouter();

  // --- Estados del Formulario de Producto Individual (MODIFICADOS) ---
  const [selectedProductoBaseId, setSelectedProductoBaseId] = useState(""); // ID del Producto Base
  const [selectedPresentacion, setSelectedPresentacion] = useState(null); // Objeto de la presentación { nombre, contenidoEnUnidadBase, ... }
  const [cantidadPresentaciones, setCantidadPresentaciones] = useState(""); // Cantidad de la presentación seleccionada
  const [precioUnitarioPresentacion, setPrecioUnitarioPresentacion] = useState(""); // Precio por presentación
  const [proveedorInput, setProveedorInput] = useState("");
  // Estados antiguos eliminados: productoInput, marca, descripcion, volumen, unidad, precio

  // --- Estados de la Compra General ---
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [responsable, setResponsable] = useState("");
  const [productos, setProductos] = useState([]); // Lista de productos en la compra ACTUAL (con nueva estructura)

  // --- Estados de Edición ---
  const [editandoCompra, setEditandoCompra] = useState(false);
  const [idCompraEditando, setIdCompraEditando] = useState(null);
  const [productoEditandoIdx, setProductoEditandoIdx] = useState(null); // Índice del producto en la lista 'productos'

  // --- Estados de Datos Externos ---
  const [comprasHistorial, setComprasHistorial] = useState([]);
  const [articulosBase, setArticulosBase] = useState([]); // Lista de Productos Base {id, producto, marca, ..., presentaciones: []}
  const [proveedoresBase, setProveedoresBase] = useState([]);
  const [loadingArticulos, setLoadingArticulos] = useState(true);
  const [loadingProveedores, setLoadingProveedores] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Para deshabilitar botones al guardar

  // --- Efecto Inicial y de Autorización ---
  useEffect(() => {
    const autorizado = localStorage.getItem("adminAutorizado") === "true" || Cookies.get("adminAutorizado") === "true";
    if (!autorizado) { router.push("/"); return; }
    const usuarioGuardado = localStorage.getItem("usuarioAura");
    const nombreUsuario = usuarioGuardado ? JSON.parse(usuarioGuardado).nombre : "Administrador";
    setResponsable(nombreUsuario);
    cargarComprasFirestore();
    cargarArticulosBase(); // Carga los Productos Base
    cargarProveedoresBase();
  }, [router]);

  // --- Carga de Datos (Sin cambios en la lógica interna) ---
  const cargarComprasFirestore = async () => { /* ... (sin cambios) ... */
    try { const snapshot = await getDocs(collection(db, "comprasAura")); const comprasFirestore = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); comprasFirestore.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); setComprasHistorial(comprasFirestore); } catch (error) { console.error("Error cargando historial:", error); alert("Error al cargar historial."); }
  };
  const cargarArticulosBase = async () => { /* ... (sin cambios) ... */
    setLoadingArticulos(true); try { const snapshot = await getDocs(collection(db, "articulosAura")); const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); items.sort((a, b) => (a.producto || "").localeCompare(b.producto || "")); setArticulosBase(items); console.log("Productos Base cargados:", items); } catch (error) { console.error("Error cargando Productos Base:", error); setArticulosBase([]); alert("Error al cargar Productos Base."); } finally { setLoadingArticulos(false); }
  };
  const cargarProveedoresBase = async () => { /* ... (sin cambios) ... */
    setLoadingProveedores(true); try { const snapshot = await getDocs(collection(db, "proveedores")); const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); items.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "")); setProveedoresBase(items); console.log("Proveedores cargados:", items); } catch (error) { console.error("Error cargando proveedores:", error); setProveedoresBase([]); } finally { setLoadingProveedores(false); }
  };

  // --- Lógica para Agregar/Editar Producto en la Compra Actual (REESCRITA) ---
  const agregarProducto = () => {
    // Validar selección y campos numéricos
    if (!selectedProductoBaseId || !selectedPresentacion || !cantidadPresentaciones || !precioUnitarioPresentacion) {
      alert("Selecciona Producto Base, Presentación y completa Cantidad y Precio.");
      return;
    }
    const cantidadNum = parseFloat(cantidadPresentaciones);
    const precioNum = parseFloat(precioUnitarioPresentacion);
    if (isNaN(cantidadNum) || cantidadNum <= 0 || isNaN(precioNum) || precioNum < 0) {
        alert("Cantidad debe ser mayor a 0 y Precio no puede ser negativo.");
        return;
    }

    // Obtener datos del Producto Base seleccionado
    const productoBase = articulosBase.find(item => item.id === selectedProductoBaseId);
    if (!productoBase) {
        alert("Error: Producto Base seleccionado no encontrado.");
        return; // No debería pasar si el select está bien
    }

    // Crear el objeto para la lista local 'productos'
    const nuevoProductoParaLista = {
      tempId: Date.now() + Math.random(),
      productoBaseId: productoBase.id,
      productoNombre: productoBase.producto,
      marcaNombre: productoBase.marca || "",
      descripcion: productoBase.descripcion || "",
      // categoria: productoBase.categoria || "", // Si se usa
      presentacionNombre: selectedPresentacion.nombre,
      presentacionContenido: selectedPresentacion.contenidoEnUnidadBase, // Contenido por presentación
      unidadBase: productoBase.unidadBase,
      cantidadPresentaciones: cantidadNum, // Cantidad de esta presentación
      costoUnitarioPresentacion: precioNum, // Costo por presentación
      proveedor: proveedorInput.trim(),
    };

    // Agregar o actualizar en el estado 'productos'
    if (productoEditandoIdx !== null) {
      const actualizados = [...productos];
      actualizados[productoEditandoIdx] = nuevoProductoParaLista;
      setProductos(actualizados);
      setProductoEditandoIdx(null); // Terminar edición
    } else {
      setProductos([...productos, nuevoProductoParaLista]);
    }

    // Resetear formulario
    setSelectedProductoBaseId("");
    setSelectedPresentacion(null);
    setCantidadPresentaciones("");
    setPrecioUnitarioPresentacion("");
    setProveedorInput("");
  };

  // --- Funciones de Edición/Borrado de Productos en la Compra Actual (ADAPTADAS) ---
  const editarProductoDeLista = (index) => {
    const p = productos[index];
    setSelectedProductoBaseId(p.productoBaseId);
    // Encontrar el objeto presentación correspondiente (puede requerir cargar el producto base si no está en memoria)
    const productoBase = articulosBase.find(item => item.id === p.productoBaseId);
    const presentacionObj = productoBase?.presentaciones?.find(pres => pres.nombre === p.presentacionNombre);
    setSelectedPresentacion(presentacionObj || null); // Cargar el objeto presentación
    setCantidadPresentaciones(p.cantidadPresentaciones);
    setPrecioUnitarioPresentacion(p.costoUnitarioPresentacion);
    setProveedorInput(p.proveedor);
    setProductoEditandoIdx(index);
  };

  const borrarProductoDeLista = (index) => {
    if (!window.confirm("¿Eliminar este producto de la compra actual?")) return;
    const actualizados = productos.filter((_, i) => i !== index);
    setProductos(actualizados);
    if (productoEditandoIdx === index) { // Si se estaba editando este, resetear form
        setProductoEditandoIdx(null);
        setSelectedProductoBaseId(""); setSelectedPresentacion(null); setCantidadPresentaciones(""); setPrecioUnitarioPresentacion(""); setProveedorInput("");
    }
  };

  // --- Guardar la Compra Completa en Firestore y Actualizar Stock (MODIFICADO) ---
  const guardarCompra = async () => {
    if (productos.length === 0) {
      alert("Agrega al menos un producto antes de guardar la compra.");
      return;
    }
    if (!window.confirm(editandoCompra ? "¿Guardar los cambios en esta compra?" : "¿Confirmar y guardar esta compra completa? Se intentará actualizar el stock.")) return;

    setIsSaving(true); // Indicar que se está guardando

    // 1. Preparar datos para guardar en 'comprasAura' (Historial)
    const productosAgrupados = productos.reduce((acc, curr) => {
      const claveProveedor = curr.proveedor || "Sin Proveedor Asignado";
      if (!acc[claveProveedor]) acc[claveProveedor] = [];
      acc[claveProveedor].push(curr);
      return acc;
    }, {});

    const productosGuardados = [...productos]; // Copia para la actualización de stock posterior

    try {
      // Función interna para guardar un documento de compra
      const guardarOperacionCompra = async (proveedorNombre, productosDelProveedor, compraId = null) => {
          const itemsParaGuardar = productosDelProveedor.map(p => ({
            productoBaseId: p.productoBaseId, // ID del Producto Base
            productoNombre: p.productoNombre, // Nombres para historial
            marcaNombre: p.marcaNombre,
            descripcion: p.descripcion,
            presentacionNombre: p.presentacionNombre, // Nombre de la presentación comprada
            cantidadComprada: p.cantidadPresentaciones, // Cantidad de presentaciones
            unidadBase: p.unidadBase, // Unidad del stock
            contenidoPorPresentacion: p.presentacionContenido, // Contenido para referencia
            costoUnitario: p.costoUnitarioPresentacion, // Costo por presentación
            costoTotalItem: p.cantidadPresentaciones * p.costoUnitarioPresentacion
          }));
          const costoTotalCompra = itemsParaGuardar.reduce((sum, item) => sum + item.costoTotalItem, 0);

          const datosCompra = {
            fecha, responsable, proveedor: proveedorNombre, items: itemsParaGuardar, costoTotalCompra: costoTotalCompra, estado: "Recibida"
          };

          if (compraId) {
              await updateDoc(doc(db, "comprasAura", compraId), datosCompra);
          } else {
              // Guardar y devolver el ID por si se necesita
              const docRef = await addDoc(collection(db, "comprasAura"), datosCompra);
              return docRef.id;
          }
          return compraId; // Devolver el ID si se está editando
      };

      // 2. Guardar la(s) compra(s) en el historial
      const idsComprasGuardadas = [];
      if (editandoCompra && idCompraEditando) {
        const proveedorEditando = Object.keys(productosAgrupados)[0] || "Sin Proveedor Asignado";
        const idGuardado = await guardarOperacionCompra(proveedorEditando, productosAgrupados[proveedorEditando], idCompraEditando);
        if (idGuardado) idsComprasGuardadas.push(idGuardado);
        alert("Compra actualizada con éxito.");
      } else {
        for (const [proveedorNombre, productosDelProveedor] of Object.entries(productosAgrupados)) {
          const idGuardado = await guardarOperacionCompra(proveedorNombre, productosDelProveedor);
          if (idGuardado) idsComprasGuardadas.push(idGuardado);
        }
        alert("Compra(s) guardada(s) con éxito en el historial.");
      }

      // 3. Actualizar el Stock en 'articulosAura' (DESDE EL CLIENTE)
      console.log("Intentando actualizar stock para los productos:", productosGuardados);
      try {
          const batch = writeBatch(db); // Usar batch para agrupar actualizaciones
          let updatesInBatch = 0;

          productosGuardados.forEach(p => {
              if (!p.productoBaseId || !p.presentacionContenido || !p.cantidadPresentaciones) {
                  console.error("Datos incompletos para actualizar stock:", p);
                  return; // Saltar si falta info crítica
              }
              const totalAAgregar = p.cantidadPresentaciones * p.presentacionContenido;
              if (isNaN(totalAAgregar) || totalAAgregar <= 0) {
                  console.error("Cálculo inválido para agregar stock:", p);
                  return; // Saltar si el cálculo es inválido
              }

              const itemRef = doc(db, "articulosAura", p.productoBaseId);
              batch.update(itemRef, { cantidadActual: increment(totalAAgregar) });
              updatesInBatch++;
              console.log(`Añadiendo al batch: Update ${p.productoBaseId} +${totalAAgregar}`);
          });

          if (updatesInBatch > 0) {
              await batch.commit();
              console.log("Batch de actualización de stock completado.");
              alert("Stock actualizado correctamente.");
          } else {
              console.log("No hubo actualizaciones de stock válidas para ejecutar.");
          }

      } catch (stockError) {
          console.error("¡Error al actualizar el stock!", stockError);
          alert("¡ATENCIÓN! La compra se guardó en el historial, pero hubo un error al actualizar el stock automáticamente. Revisa la consola y/o ajusta manualmente.");
          // No revertimos la compra guardada, pero alertamos del problema de stock.
      }

      // 4. Limpiar estado y recargar historial
      setProductos([]);
      setEditandoCompra(false);
      setIdCompraEditando(null);
      setProductoEditandoIdx(null);
      // Resetear formulario individual
      setSelectedProductoBaseId(""); setSelectedPresentacion(null); setCantidadPresentaciones(""); setPrecioUnitarioPresentacion(""); setProveedorInput("");
      cargarComprasFirestore(); // Recargar historial

    } catch (error) {
      console.error("Error general al guardar la compra:", error);
      alert("Error al guardar la compra. Intenta nuevamente.");
    } finally {
        setIsSaving(false); // Terminar estado de guardado
    }
  };

  // --- Funciones para el Historial de Compras (ADAPTADAS) ---
  const eliminarCompra = async (id) => {
     if (!window.confirm("¿Eliminar esta compra del historial? NO revierte el stock.")) return;
    try { await deleteDoc(doc(db, "comprasAura", id)); cargarComprasFirestore(); alert("Compra eliminada."); }
    catch (error) { console.error("Error al eliminar compra:", error); alert("Error al eliminar."); }
   };

  const editarCompra = (compra) => {
     if (!window.confirm("¿Cargar esta compra para editarla? Se reemplazarán los productos actuales.")) return;
    setFecha(compra.fecha);
    setResponsable(compra.responsable);
    const itemsDeCompra = compra.items || []; // Asegurarse que 'items' existe

    // Reconstruir el estado 'productos' con la nueva estructura
    const productosParaEditar = itemsDeCompra.map(item => ({
        tempId: Date.now() + Math.random(),
        productoBaseId: item.productoBaseId || null, // ID del producto base
        productoNombre: item.productoNombre || "?",
        marcaNombre: item.marcaNombre || "",
        descripcion: item.descripcion || "",
        // categoria: item.categoria || "",
        presentacionNombre: item.presentacionNombre || "?",
        presentacionContenido: item.contenidoPorPresentacion || 0, // Contenido de la presentación
        unidadBase: item.unidadBase || "?",
        cantidadPresentaciones: item.cantidadComprada || 0, // Cantidad de presentaciones
        costoUnitarioPresentacion: item.costoUnitario || 0, // Costo por presentación
        proveedor: compra.proveedor || ""
    }));

    setProductos(productosParaEditar);
    setEditandoCompra(true);
    setIdCompraEditando(compra.id);
    setProductoEditandoIdx(null); // No preseleccionar un item para editar al cargar
    // Resetear formulario individual
    setSelectedProductoBaseId(""); setSelectedPresentacion(null); setCantidadPresentaciones(""); setPrecioUnitarioPresentacion(""); setProveedorInput("");
    window.scrollTo(0, 0); // Ir al inicio de la página
   };

  // --- Agrupación Visual de Productos en la Compra Actual ---
  const productosAgrupadosVisual = productos.reduce((acc, curr) => {
     const clave = curr.proveedor || "Sin Proveedor Asignado";
    if (!acc[clave]) acc[clave] = [];
    acc[clave].push(curr);
    return acc;
   }, {});

   // --- Filtrar presentaciones disponibles para el producto base seleccionado ---
   const presentacionesCompraDisponibles = articulosBase
        .find(item => item.id === selectedProductoBaseId)
        ?.presentaciones?.filter(p => p.esCompra) || [];

  // --- Renderizado del Componente ---
  return (
    <div style={estilos.contenedor}>
      <button onClick={() => router.push('/panel')} style={estilos.botonVolver}>
        ← Volver al Panel
      </button>
      <h1 style={estilos.titulo}>📥 Control de Compras</h1>

      {/* --- Formulario (MODIFICADO para Selects) --- */}
      <div style={estilos.formulario}>
        <h2 style={estilos.subtituloForm}>
          {productoEditandoIdx !== null ? "Editando Producto" : "Agregar Producto a la Compra"}
        </h2>
        {/* Fecha y Responsable */}
         <div style={estilos.filaInput}>
            <label style={estilos.label}>Fecha Compra:</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={estilos.input} />
        </div>
        <div style={estilos.filaInput}>
            <label style={estilos.label}>Responsable:</label>
            <input placeholder="Responsable" value={responsable} disabled style={estilos.input} />
        </div>

        {/* <<< NUEVO: Select Producto Base >>> */}
        <div style={estilos.filaInput}>
            <label style={estilos.label}>Producto Base:</label>
            <select
                value={selectedProductoBaseId}
                onChange={(e) => {
                    setSelectedProductoBaseId(e.target.value);
                    setSelectedPresentacion(null); // Resetear presentación al cambiar producto
                }}
                style={estilos.input}
                disabled={loadingArticulos || isSaving}
            >
                <option value="" disabled>
                    {loadingArticulos ? "Cargando..." : "-- Selecciona Producto --"}
                </option>
                {articulosBase.map((item) => (
                    <option key={item.id} value={item.id}>
                        {item.producto} ({item.marca || 'Sin marca'}) {item.descripcion ? `- ${item.descripcion}` : ''}
                    </option>
                ))}
            </select>
        </div>

        {/* <<< NUEVO: Select Presentación (Compra) >>> */}
        <div style={estilos.filaInput}>
            <label style={estilos.label}>Presentación:</label>
            <select
                value={selectedPresentacion ? selectedPresentacion.nombre : ""} // Usar nombre como value, pero guardar objeto
                onChange={(e) => {
                    const nombrePresentacion = e.target.value;
                    const presentacionObj = presentacionesCompraDisponibles.find(p => p.nombre === nombrePresentacion);
                    setSelectedPresentacion(presentacionObj || null);
                }}
                style={estilos.input}
                disabled={!selectedProductoBaseId || presentacionesCompraDisponibles.length === 0 || isSaving}
            >
                <option value="" disabled>
                    {!selectedProductoBaseId ? "Selecciona Producto Base" :
                     presentacionesCompraDisponibles.length === 0 ? "No hay presentaciones de compra" :
                     "-- Selecciona Presentación --"}
                </option>
                {presentacionesCompraDisponibles.map((p) => (
                    <option key={p.nombre} value={p.nombre}>
                        {p.nombre} ({p.contenidoEnUnidadBase} {articulosBase.find(item => item.id === selectedProductoBaseId)?.unidadBase})
                    </option>
                ))}
            </select>
        </div>

        {/* Cantidad (de la presentación) */}
        <div style={estilos.filaInput}>
            <label style={estilos.label}>Cantidad:</label>
            <input
                placeholder="Cantidad de esta presentación"
                type="number" min="0" step="any"
                value={cantidadPresentaciones}
                onChange={(e) => setCantidadPresentaciones(e.target.value)}
                style={estilos.input}
                disabled={isSaving}
            />
        </div>

        {/* Precio Unitario (de la presentación) */}
        <div style={estilos.filaInput}>
            <label style={estilos.label}>Precio Unitario:</label>
            <input
                placeholder="Precio por presentación"
                type="number" min="0" step="any"
                value={precioUnitarioPresentacion}
                onChange={(e) => setPrecioUnitarioPresentacion(e.target.value)}
                style={estilos.input}
                disabled={isSaving}
            />
        </div>

        {/* Proveedor */}
        <div style={estilos.filaInput}>
            <label style={estilos.label}>Proveedor:</label>
            <input
                list="proveedoresDataList"
                placeholder="Proveedor (Selecciona o escribe)"
                value={proveedorInput}
                onChange={(e) => setProveedorInput(e.target.value)}
                style={estilos.input}
                disabled={loadingProveedores || isSaving}
            />
            <datalist id="proveedoresDataList">
                {proveedoresBase.map((prov) => ( <option key={prov.id} value={prov.nombre} /> ))}
            </datalist>
             {loadingProveedores && <span style={{fontSize: '0.8em'}}> Cargando...</span>}
        </div>

        {/* Botones Agregar/Cancelar */}
        <button onClick={agregarProducto} style={estilos.botonAgregar} disabled={loadingArticulos || loadingProveedores || isSaving}>
          {isSaving ? "Guardando..." : (productoEditandoIdx !== null ? "✓ Guardar Cambios Producto" : "➕ Agregar Producto a Compra")}
        </button>
        {productoEditandoIdx !== null && (
            <button onClick={() => {
                setProductoEditandoIdx(null); setSelectedProductoBaseId(""); setSelectedPresentacion(null); setCantidadPresentaciones(""); setPrecioUnitarioPresentacion(""); setProveedorInput("");
             }} style={estilos.botonCancelarEdicion} disabled={isSaving}>
                ✗ Cancelar Edición
            </button>
        )}
      </div>

      {/* --- Tabla Resumen Compra Actual (MODIFICADA) --- */}
      {productos.length > 0 && (
        <div style={estilos.resumenCompra}>
           <h2 style={estilos.subtitulo}>🛒 Resumen de Compra Actual {editandoCompra ? `(Editando Compra ID: ${idCompraEditando})` : ''}</h2>
          {Object.entries(productosAgrupadosVisual).map(([prov, listaProductosProveedor], idx) => (
            <div key={idx} style={{ marginBottom: '1.5rem' }}>
              <h3 style={estilos.subtituloProveedor}>Proveedor: {prov}</h3>
              <div style={estilos.tablaContenedor}>
                <table style={estilos.tabla}>
                   <thead>
                    <tr>
                      {/* <<< Columnas ajustadas >>> */}
                      <th style={estilos.th}>Producto</th>
                      <th style={estilos.th}>Marca</th>
                      <th style={estilos.th}>Descripción</th>
                      <th style={estilos.th}>Presentación</th>
                      <th style={estilos.th}>Cantidad</th>
                      <th style={estilos.th}>Precio Unit.</th>
                      <th style={estilos.th}>Subtotal</th>
                      <th style={estilos.th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaProductosProveedor.map((p) => {
                      const originalIndex = productos.findIndex(prod => prod.tempId === p.tempId);
                      const subtotal = p.cantidadPresentaciones * p.costoUnitarioPresentacion;
                      return (
                        <tr key={p.tempId} style={productoEditandoIdx === originalIndex ? estilos.filaEditando : {}}>
                          {/* <<< Celdas ajustadas >>> */}
                          <td style={estilos.td}>{p.productoNombre}</td>
                          <td style={estilos.td}>{p.marcaNombre || "-"}</td>
                          <td style={estilos.td}>{p.descripcion || "-"}</td>
                          <td style={estilos.td}>{p.presentacionNombre} ({p.presentacionContenido} {p.unidadBase})</td>
                          <td style={estilos.td}>{p.cantidadPresentaciones}</td>
                          <td style={estilos.td}>${p.costoUnitarioPresentacion.toFixed(2)}</td>
                          <td style={estilos.td}>${subtotal.toFixed(2)}</td>
                          <td style={estilos.td}>
                            <button onClick={() => editarProductoDeLista(originalIndex)} style={estilos.botonAccion} disabled={isSaving}>✏️</button>
                            <button onClick={() => borrarProductoDeLista(originalIndex)} style={estilos.botonAccion} disabled={isSaving}>🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {/* Botones Guardar/Cancelar Compra */}
          <button onClick={guardarCompra} style={estilos.botonGuardarCompra} disabled={isSaving}>
            {isSaving ? "Guardando..." : (editandoCompra ? "💾 Guardar Cambios en Compra" : "💾 Guardar Compra Completa")}
          </button>
          {editandoCompra && (
              <button onClick={() => { setEditandoCompra(false); setIdCompraEditando(null); setProductos([]); }} style={estilos.botonCancelarEdicion} disabled={isSaving}>
                  ✗ Cancelar Edición Compra
              </button>
          )}
        </div>
      )}

      {/* --- Historial de Compras (MODIFICADO) --- */}
      <div style={estilos.historial}>
         <h2 style={estilos.subtitulo}>🧾 Historial de Compras Guardadas</h2>
        {comprasHistorial.length === 0 && <p>No hay compras registradas.</p>}
        {comprasHistorial.map((c) => {
            const itemsHistorial = c.items || [];
            const totalMostrado = c.costoTotalCompra?.toFixed(2) ?? 'N/A';

            return (
              <div key={c.id} style={estilos.itemHistorial}>
                 <div style={estilos.cabeceraHistorial}>
                  <div>
                    <strong>Fecha:</strong> {c.fecha} <br />
                    <strong>Proveedor:</strong> {c.proveedor || "N/A"} <br />
                    <strong>Responsable:</strong> {c.responsable} <br/>
                    <strong>Total:</strong> ${totalMostrado}
                  </div>
                  <div style={estilos.accionesHistorial}>
                    <button onClick={() => editarCompra(c)} style={estilos.botonAccionHistorial}>✏️ Editar</button>
                    <button onClick={() => eliminarCompra(c.id)} style={estilos.botonAccionHistorialRojo}>🗑️ Eliminar</button>
                  </div>
                </div>
                <details style={estilos.detailsHistorial}>
                    <summary style={estilos.summaryHistorial}>Ver detalles ({itemsHistorial.length} productos)</summary>
                    <ul style={estilos.listaDetallesHistorial}>
                    {itemsHistorial.map((p, idx) => (
                        <li key={idx}>
                        ▪ {p.cantidadComprada || 0} x {p.presentacionNombre || "?"} de {p.productoNombre || "?"} ({p.marcaNombre || 'Sin marca'})
                        {p.descripcion ? ` - ${p.descripcion}` : ''}
                         a ${p.costoUnitario?.toFixed(2) || 'N/A'} c/u
                        </li>
                    ))}
                    </ul>
                </details>
              </div>
            );
        })}
      </div>
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
