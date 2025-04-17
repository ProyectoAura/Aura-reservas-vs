// pages/control-stock.js
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  writeBatch,
  increment // <<< AÑADIDO: Para ajuste manual
} from "firebase/firestore";
import Papa from 'papaparse';

// --- Componente FormularioStockItem (Sin cambios) ---
const FormularioStockItem = ({ item, onSave, onCancel }) => {
  // ... (código interno del formulario sin cambios) ...
  const [formData, setFormData] = useState({ producto: "", marca: "", descripcion: "", categoria: "", unidadBase: "ml", });
  const [presentaciones, setPresentaciones] = useState([]);
  const [presentacionEditando, setPresentacionEditando] = useState({ nombre: "", esCompra: true, esVenta: false, contenidoEnUnidadBase: "" });
  const [editandoPresentacionIndex, setEditandoPresentacionIndex] = useState(null);
  useEffect(() => { if (item) { setFormData({ producto: item.producto || "", marca: item.marca || "", descripcion: item.descripcion || "", categoria: item.categoria || "", unidadBase: item.unidadBase || "ml", }); setPresentaciones(item.presentaciones || []); } else { setFormData({ producto: "", marca: "", descripcion: "", categoria: "", unidadBase: "ml" }); setPresentaciones([]); } setPresentacionEditando({ nombre: "", esCompra: true, esVenta: false, contenidoEnUnidadBase: "" }); setEditandoPresentacionIndex(null); }, [item]);
  const handleChange = (e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, [name]: value })); };
  const handlePresentacionChange = (e) => { const { name, value, type, checked } = e.target; setPresentacionEditando(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };
  const handleAddOrUpdatePresentacion = () => { const contenidoNum = parseFloat(presentacionEditando.contenidoEnUnidadBase); if (!presentacionEditando.nombre || isNaN(contenidoNum) || contenidoNum <= 0) { alert("Completa Nombre y Contenido numérico positivo."); return; } const nuevaPresentacion = { ...presentacionEditando, contenidoEnUnidadBase: contenidoNum }; let nuevasPresentaciones = [...presentaciones]; if (editandoPresentacionIndex !== null) { nuevasPresentaciones[editandoPresentacionIndex] = nuevaPresentacion; } else { if (presentaciones.some(p => p.nombre.toLowerCase() === nuevaPresentacion.nombre.toLowerCase())) { alert("Ya existe una presentación con ese nombre."); return; } nuevasPresentaciones.push(nuevaPresentacion); } setPresentaciones(nuevasPresentaciones); setPresentacionEditando({ nombre: "", esCompra: true, esVenta: false, contenidoEnUnidadBase: "" }); setEditandoPresentacionIndex(null); };
  const handleEditPresentacion = (index) => { setPresentacionEditando(presentaciones[index]); setEditandoPresentacionIndex(index); };
  const handleDeletePresentacion = (index) => { if (!window.confirm(`¿Eliminar "${presentaciones[index].nombre}"?`)) return; const nuevasPresentaciones = presentaciones.filter((_, i) => i !== index); setPresentaciones(nuevasPresentaciones); if (editandoPresentacionIndex === index) { setPresentacionEditando({ nombre: "", esCompra: true, esVenta: false, contenidoEnUnidadBase: "" }); setEditandoPresentacionIndex(null); } };
  const handleCancelEditPresentacion = () => { setPresentacionEditando({ nombre: "", esCompra: true, esVenta: false, contenidoEnUnidadBase: "" }); setEditandoPresentacionIndex(null); };
  const handleSubmit = (e) => { e.preventDefault(); if (!formData.producto || !formData.unidadBase) { alert("Producto y Unidad Base obligatorios."); return; } if (presentaciones.length === 0) { alert("Define al menos una presentación."); return; } onSave({ ...formData, presentaciones: presentaciones }); };
  return ( <form onSubmit={handleSubmit} style={estilos.formulario}> <h3 style={estilos.subtituloForm}>{item ? "Editar" : "Agregar"} Producto Base</h3> {/* Campos Principales */} <div style={estilos.filaInput}><label style={estilos.label}>Producto:</label><input name="producto" placeholder="Nombre" value={formData.producto} onChange={handleChange} style={estilos.input} required /></div> <div style={estilos.filaInput}><label style={estilos.label}>Marca:</label><input name="marca" placeholder="Marca" value={formData.marca} onChange={handleChange} style={estilos.input} /></div> <div style={estilos.filaInput}><label style={estilos.label}>Descripción:</label><input name="descripcion" placeholder="Descripción" value={formData.descripcion} onChange={handleChange} style={estilos.input} /></div> <div style={estilos.filaInput}><label style={estilos.label}>Categoría:</label><input name="categoria" placeholder="Categoría" value={formData.categoria} onChange={handleChange} style={estilos.input} /></div> <div style={estilos.filaInput}><label style={estilos.label}>Unidad Base:</label><select name="unidadBase" value={formData.unidadBase} onChange={handleChange} style={estilos.input} required ><option value="ml">ml</option><option value="g">g</option><option value="unidad">Unidad</option></select></div> {/* Sección Presentaciones */} <div style={estilos.seccionPresentaciones}><h4 style={estilos.subtituloPresentaciones}>Presentaciones</h4><div style={estilos.formPresentacion}><input name="nombre" placeholder="Nombre (Ej: Botella 1L)" value={presentacionEditando.nombre} onChange={handlePresentacionChange} style={{...estilos.input, marginBottom:'0.5rem'}}/><div style={{display: 'flex', gap: '1rem', alignItems: 'center', marginBottom:'0.5rem'}}><input name="contenidoEnUnidadBase" type="number" step="any" min="0" placeholder={`Contenido en ${formData.unidadBase}`} value={presentacionEditando.contenidoEnUnidadBase} onChange={handlePresentacionChange} style={{...estilos.input, flex: 1}}/><label style={estilos.labelCheckbox}><input type="checkbox" name="esCompra" checked={presentacionEditando.esCompra} onChange={handlePresentacionChange} /> Compra</label><label style={estilos.labelCheckbox}><input type="checkbox" name="esVenta" checked={presentacionEditando.esVenta} onChange={handlePresentacionChange} /> Venta</label></div><div style={{display: 'flex', gap: '0.5rem'}}><button type="button" onClick={handleAddOrUpdatePresentacion} style={{...estilos.botonAgregar, fontSize: '0.9rem', padding: '0.5rem', width: 'auto', marginTop: 0}}>{editandoPresentacionIndex !== null ? '✓ Actualizar' : '➕ Agregar'}</button>{editandoPresentacionIndex !== null && (<button type="button" onClick={handleCancelEditPresentacion} style={{...estilos.botonCancelar, fontSize: '0.9rem', padding: '0.5rem', width: 'auto', marginTop: 0}}>✗ Cancelar</button>)}</div></div>{presentaciones.length > 0 && (<ul style={estilos.listaPresentaciones}>{presentaciones.map((p, index) => (<li key={index} style={editandoPresentacionIndex === index ? estilos.presentacionEditando : estilos.listaPresentaciones_li}><span><strong>{p.nombre}</strong> = {p.contenidoEnUnidadBase} {formData.unidadBase} ({p.esCompra ? 'C' : ''}{p.esVenta ? 'V' : ''})</span><div><button type="button" onClick={() => handleEditPresentacion(index)} style={estilos.botonAccionPresentacion}>✏️</button><button type="button" onClick={() => handleDeletePresentacion(index)} style={estilos.botonAccionPresentacionRojo}>🗑️</button></div></li>))}</ul>)}</div> {/* Botones Principales */} <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}><button type="submit" style={estilos.botonGuardar}>{item ? "✓ Guardar Cambios" : "➕ Agregar Producto"}</button><button type="button" onClick={onCancel} style={estilos.botonCancelar}>✗ Cancelar</button></div> </form> );
};

// --- <<< AÑADIDO: Componente Modal para Ajuste Manual >>> ---
const ModalAjusteStock = ({ item, onClose, onAjustar }) => {
  const [ajuste, setAjuste] = useState("");
  const [motivo, setMotivo] = useState("");
  const [rolUsuario, setRolUsuario] = useState(""); // Para verificar permiso

  useEffect(() => {
    // Leer rol del localStorage al montar el modal
    const rol = localStorage.getItem("rolActivo");
    setRolUsuario(rol || "");
  }, []);

  const handleAjustarClick = () => {
    // <<< Verificación de Rol (Cliente - Mejorar con Reglas Firestore) >>>
    if (rolUsuario !== "Administrador") {
        alert("No tienes permiso para realizar ajustes manuales de stock.");
        return;
    }

    const valorAjuste = parseFloat(ajuste);
    if (isNaN(valorAjuste)) {
      alert("Ingresa un número válido para el ajuste (puede ser negativo).");
      return;
    }
    if (!motivo.trim()) {
        alert("Debes ingresar un motivo para el ajuste.");
        return;
    }
    onAjustar(item.id, valorAjuste, motivo.trim());
    onClose();
  };

  return (
    <div style={estilos.modalOverlay}>
      <div style={estilos.modalContent}>
        <h4 style={estilos.modalTitle}>Ajuste Manual: {item.producto} ({item.marca || '-'})</h4>
        <p>Stock Actual: {item.cantidadActual !== undefined ? item.cantidadActual : 0} {item.unidadBase}</p>
        <div style={estilos.filaInput}>
          <label style={estilos.label}>Ajuste (+/-):</label>
          <input
            type="number"
            step="any"
            placeholder={`Ej: 100 o -50 (${item.unidadBase})`}
            value={ajuste}
            onChange={(e) => setAjuste(e.target.value)}
            style={estilos.input}
            autoFocus
          />
        </div>
         <div style={estilos.filaInput}>
          <label style={estilos.label}>Motivo:</label>
          <input
            type="text"
            placeholder="Obligatorio (Ej: Merma, Inventario, Corrección)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            style={estilos.input}
            required // Añadir validación visual básica
          />
        </div>
        {/* Mostrar advertencia si no es admin */}
        {rolUsuario !== "Administrador" && (
            <p style={{color: 'orange', fontSize: '0.8rem', textAlign: 'center'}}>Solo administradores pueden aplicar ajustes.</p>
        )}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={handleAjustarClick}
            style={estilos.botonGuardar}
            disabled={rolUsuario !== "Administrador"} // Deshabilitar si no es admin
          >
            ✓ Aplicar Ajuste
          </button>
          <button onClick={onClose} style={estilos.botonCancelar}>✗ Cancelar</button>
        </div>
      </div>
    </div>
  );
};


// --- Página Principal de Control de Stock ---
export default function ControlStock() {
  const router = useRouter();
  const [stockItems, setStockItems] = useState([]); // Productos Base
  const [loading, setLoading] = useState(true);
  const [itemEditando, setItemEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [itemParaAjuste, setItemParaAjuste] = useState(null); // <<< AÑADIDO: Estado para modal de ajuste

  // --- Autorización y Carga de Datos ---
  useEffect(() => {
    // ... (código de autorización sin cambios) ...
    const autorizado = localStorage.getItem("adminAutorizado") === "true" || Cookies.get("adminAutorizado") === "true";
    if (!autorizado) { router.push("/"); return; }

    setLoading(true);
    const q = query(collection(db, "articulosAura"), orderBy("producto"), orderBy("marca"), orderBy("descripcion"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const items = [];
      querySnapshot.forEach((doc) => { items.push({ id: doc.id, ...doc.data() }); });
      setStockItems(items);
      setLoading(false);
      console.log("Stock (Productos Base) actualizado:", items);
    }, (error) => {
      console.error("Error al obtener stock en tiempo real:", error);
      alert("Error al cargar el stock. Intenta recargar la página.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // --- Funciones CRUD ---
  const handleGuardarItem = async (formDataConPresentaciones) => { /* ... (sin cambios) ... */
    try { if (itemEditando) { const itemRef = doc(db, "articulosAura", itemEditando.id); await updateDoc(itemRef, formDataConPresentaciones); alert("Producto Base actualizado."); } else { await addDoc(collection(db, "articulosAura"), { ...formDataConPresentaciones, cantidadActual: 0 }); alert("Nuevo Producto Base agregado."); } setShowForm(false); setItemEditando(null); } catch (error) { console.error("Error al guardar:", error); alert(`Error: ${error.message}`); }
  };
  const handleEditarItem = (item) => { setItemEditando(item); setShowForm(true); };
  const handleAgregarClick = () => { setItemEditando(null); setShowForm(true); };
  const handleCancelarForm = () => { setShowForm(false); setItemEditando(null); };
  const handleEliminarItem = async (id, nombreProducto) => { /* ... (sin cambios) ... */
    if (!window.confirm(`¿Eliminar "${nombreProducto}"?`)) return; try { await deleteDoc(doc(db, "articulosAura", id)); alert(`"${nombreProducto}" eliminado.`); } catch (error) { console.error("Error al eliminar:", error); alert(`Error: ${error.message}`); }
   };

  // --- Funciones de Exportación CSV ---
  const handleExportCSV = () => { /* ... (sin cambios) ... */
    if (stockItems.length === 0) { alert("No hay datos para exportar."); return; } const dataToExport = stockItems.map(item => ({ Producto: item.producto || "", Marca: item.marca || "", Descripcion: item.descripcion || "", Categoria: item.categoria || "", UnidadBase: item.unidadBase || "", StockActual: item.cantidadActual !== undefined ? item.cantidadActual : 0, })); const csv = Papa.unparse(dataToExport); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); const url = URL.createObjectURL(blob); link.setAttribute("href", url); const fechaHoy = new Date().toISOString().split('T')[0]; link.setAttribute("download", `stock_aura_${fechaHoy}.csv`); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  // --- Funciones de Importación CSV ---
  const handleFileChange = (event) => { /* ... (sin cambios) ... */
    if (event.target.files && event.target.files[0]) { setImportFile(event.target.files[0]); } else { setImportFile(null); }
  };
  const handleImportCSV = () => { /* ... (sin cambios) ... */
    if (!importFile) { alert("Selecciona un archivo CSV."); return; } if (!window.confirm("Importar CREARÁ NUEVOS Productos Base desde el CSV (no actualiza existentes ni stock). ¿Continuar?")) { return; } setIsImporting(true); Papa.parse(importFile, { header: true, skipEmptyLines: true, complete: async (results) => { console.log("CSV Parseado:", results); const rows = results.data; const errors = []; const validProducts = []; rows.forEach((row, index) => { if (!row.Producto || !row.UnidadBase) { errors.push(`Fila ${index + 2}: Faltan Producto o UnidadBase.`); return; } if (!["ml", "g", "unidad"].includes(row.UnidadBase)) { errors.push(`Fila ${index + 2}: UnidadBase inválida ('${row.UnidadBase}').`); return; } validProducts.push({ producto: row.Producto.trim(), marca: (row.Marca || "").trim(), descripcion: (row.Descripcion || "").trim(), categoria: (row.Categoria || "").trim(), unidadBase: row.UnidadBase, cantidadActual: 0, presentaciones: [], }); }); if (errors.length > 0) { alert(`Errores en CSV:\n${errors.join("\n")}\nNo se importó.`); setIsImporting(false); setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; return; } if (validProducts.length === 0) { alert("No se encontraron productos válidos."); setIsImporting(false); setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; return; } try { const batch = writeBatch(db); let operationsCount = 0; validProducts.forEach(productData => { const newDocRef = doc(collection(db, "articulosAura")); batch.set(newDocRef, productData); operationsCount++; if (operationsCount >= 499) { console.warn("Límite de batch casi alcanzado."); } }); await batch.commit(); alert(`${validProducts.length} producto(s) importado(s). Añade presentaciones manualmente.`); } catch (error) { console.error("Error importando:", error); alert(`Error: ${error.message}`); } finally { setIsImporting(false); setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; } }, error: (error) => { console.error("Error parseando CSV:", error); alert(`Error al leer CSV: ${error.message}`); setIsImporting(false); } });
  };

  // --- <<< AÑADIDO: Funciones para Ajuste Manual >>> ---
  const handleAbrirModalAjuste = (item) => {
      setItemParaAjuste(item);
  };

  const handleAplicarAjusteStock = async (itemId, valorAjuste, motivo) => {
      // Doble verificación de rol (ya hecha en modal, pero por seguridad)
      const rol = localStorage.getItem("rolActivo");
      if (rol !== "Administrador") {
          alert("Acción no permitida.");
          return;
      }
      if (isNaN(valorAjuste) || !motivo) return; // Ya validado en modal

      const itemRef = doc(db, "articulosAura", itemId);
      try {
          await updateDoc(itemRef, {
              cantidadActual: increment(valorAjuste)
          });
          console.log(`Ajuste manual aplicado a ${itemId}: ${valorAjuste}. Motivo: ${motivo}`);
          alert("Ajuste de stock aplicado correctamente.");
          // Opcional: Guardar un registro de auditoría en otra colección
          // await addDoc(collection(db, "ajustesStockManual"), { itemId, valorAjuste, motivo, fecha: Timestamp.now(), usuario: localStorage.getItem("usuarioAura") ? JSON.parse(localStorage.getItem("usuarioAura")).nombre : "Desconocido" });

      } catch (error) {
          console.error("Error al aplicar ajuste manual:", error);
          alert(`Error al aplicar ajuste: ${error.message}. Asegúrate que las reglas de Firestore lo permitan.`);
      }
  };

  // --- Renderizado ---
  return (
    <div style={estilos.contenedor}>
      <button onClick={() => router.push('/panel')} style={estilos.botonVolver}>← Volver</button>
      <h1 style={estilos.titulo}>📦 Control de Stock</h1>

      {/* Botón Agregar */}
      {/* <<< Ocultar si se muestra form O modal de ajuste >>> */}
      {!showForm && !itemParaAjuste && (
        <button onClick={handleAgregarClick} style={estilos.botonAgregarNuevo}>➕ Agregar Producto Base</button>
      )}

      {/* Formulario */}
      {showForm && (<FormularioStockItem item={itemEditando} onSave={handleGuardarItem} onCancel={handleCancelarForm} />)}

      {/* <<< AÑADIDO: Renderizado condicional del Modal de Ajuste >>> */}
      {itemParaAjuste && (
        <ModalAjusteStock
          item={itemParaAjuste}
          onClose={() => setItemParaAjuste(null)}
          onAjustar={handleAplicarAjusteStock}
        />
      )}

      {/* Sección Import/Export */}
      <div style={estilos.seccionImportExport}>
        <h3 style={estilos.subtituloImportExport}>Importar / Exportar</h3>
        <button onClick={handleExportCSV} style={estilos.botonExportar} disabled={stockItems.length === 0}>📥 Descargar Stock (CSV)</button>
        <div style={estilos.importContainer}>
            <p style={estilos.importInstrucciones}>Importar <strong>NUEVOS</strong> Productos Base desde CSV.<br/>Encabezados: <strong>Producto, Marca, Descripcion, Categoria, UnidadBase</strong> (ml, g, unidad).<br/>(Stock inicia en 0, presentaciones se añaden manualmente).</p>
            <input type="file" accept=".csv" onChange={handleFileChange} ref={fileInputRef} style={{ display: 'block', margin: '0.5rem 0' }} />
            <button onClick={handleImportCSV} style={estilos.botonImportar} disabled={!importFile || isImporting}>{isImporting ? "Importando..." : "📤 Importar CSV"}</button>
        </div>
      </div>

      {/* Tabla de Stock (Columnas Reordenadas y Botón Ajuste) */}
      <div style={estilos.tablaContenedor}>
        <h2 style={estilos.subtitulo}>Inventario Actual</h2>
        {loading ? (<p>Cargando...</p>) : stockItems.length === 0 ? (<p>No hay artículos base.</p>) : (
          <table style={estilos.tabla}>
            <thead>
              <tr>
                {/* <<< Columnas Reordenadas >>> */}
                <th style={estilos.th}>Producto</th>
                <th style={estilos.th}>Marca</th>
                <th style={estilos.th}>Descripción</th>
                <th style={estilos.th}>Stock Actual</th>
                <th style={estilos.th}>Unidad Base</th>
                <th style={estilos.th}>Categoría</th> {/* <<< Movida aquí >>> */}
                <th style={estilos.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {stockItems.map((item) => (
                <tr key={item.id}>
                  {/* <<< Celdas Reordenadas >>> */}
                  <td style={estilos.td}>{item.producto}</td>
                  <td style={estilos.td}>{item.marca || "-"}</td>
                  <td style={estilos.td}>{item.descripcion || "-"}</td>
                  <td style={estilos.td}>{item.cantidadActual !== undefined ? item.cantidadActual : 0}</td>
                  <td style={estilos.td}>{item.unidadBase}</td>
                  <td style={estilos.td}>{item.categoria || "-"}</td> {/* <<< Movida aquí >>> */}
                  <td style={estilos.td}>
                    {/* <<< AÑADIDO: Botón Ajuste Manual >>> */}
                    <button onClick={() => handleAbrirModalAjuste(item)} style={estilos.botonAccionAjuste} title="Ajuste Manual Stock">📈</button>
                    {/* Botones existentes */}
                    <button onClick={() => handleEditarItem(item)} style={estilos.botonAccion} title="Editar">✏️</button>
                    <button onClick={() => handleEliminarItem(item.id, item.producto)} style={estilos.botonAccionRojo} title="Eliminar">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
 
// --- Estilos (Adaptados de compras/index.js) ---
const estilos = {
  contenedor: {
    minHeight: "100vh",
    background: "#0A1034",
    color: "#EFE4CF",
    padding: "2rem 1.5rem",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  botonVolver: {
    background: "#806C4F",
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
    fontSize: "2rem",
    color: "#D3C6A3",
    marginBottom: "2rem",
    textAlign: "center",
    borderBottom: "2px solid #806C4F",
    paddingBottom: "0.5rem",
  },
  subtitulo: {
    marginTop: "1.5rem", // Menos margen superior para la tabla
    marginBottom: "1rem",
    color: "#D3C6A3",
    fontSize: "1.5rem",
  },
  subtituloForm: {
    color: "#EFE4CF",
    fontSize: "1.3rem",
    marginBottom: "1rem",
    textAlign: 'center',
  },
  formulario: {
    background: "#1C2340",
    padding: "1.5rem",
    borderRadius: "12px",
    marginBottom: "2rem",
    maxWidth: "600px",
    margin: "1rem auto", // Margen arriba y abajo
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
  },
  filaInput: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1rem',
    gap: '1rem',
  },
  label: {
    minWidth: '80px', // Ancho un poco menor
    textAlign: 'right',
    fontSize: '0.9rem',
    color: '#D3C6A3',
  },
  input: {
    padding: "0.7rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "1px solid #4a5568",
    backgroundColor: "#EFE4CF",
    color: "#2c1b0f",
    flex: 1,
  },
  botonAgregarNuevo: {
    background: "#4CAF50", // Verde
    color: "white",
    padding: "0.8rem 1.5rem",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1.1rem",
    display: 'block',
    maxWidth: '400px',
    margin: "1rem auto 2rem auto", // Centrado
  },
  botonGuardar: {
    background: "#4CAF50", // Verde
    color: "white",
    padding: "0.7rem 1rem",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1rem",
    flex: 1, // Ocupar espacio
  },
  botonCancelar: {
    background: "#666", // Gris
    color: "#EFE4CF",
    padding: "0.7rem 1rem",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1rem",
    flex: 1,
  },
  tablaContenedor: {
    overflowX: 'auto',
    marginTop: '2rem',
    background: "#1C2340",
    padding: "1rem",
    borderRadius: "12px",
  },
  tabla: {
    width: "100%",
    borderCollapse: 'collapse',
    marginTop: "1rem",
    color: "#EFE4CF",
    fontSize: "0.9rem",
  },
  th: {
    background: "#806C4F",
    color: "#0A1034",
    padding: "0.8rem", // Más padding
    textAlign: "left",
    border: "1px solid #4a5568",
    whiteSpace: 'nowrap', // Evitar que el texto se rompa
  },
  td: {
    padding: "0.7rem",
    border: "1px solid #4a5568",
    verticalAlign: 'middle',
  },
  botonAccion: {
    background: "none",
    border: "none",
    color: "#D3C6A3",
    cursor: "pointer",
    fontSize: "1.1rem",
    margin: "0 0.3rem",
  },
  botonAccionRojo: {
    background: "none",
    border: "none",
    color: "#e57373", // Rojo más claro para visibilidad
    cursor: "pointer",
    fontSize: "1.1rem",
    margin: "0 0.3rem",
  },

  seccionPresentaciones: {
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #4a5568',
},
subtituloPresentaciones: {
    color: '#D3C6A3',
    fontSize: '1.1rem',
    marginBottom: '1rem',
},
formPresentacion: {
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
},
labelCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.9rem',
    cursor: 'pointer',
},
listaPresentaciones: {
    listStyle: 'none',
    padding: 0,
    marginTop: '1rem',
},
listaPresentaciones_li: { // Estilo base para item de lista
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0.8rem',
    marginBottom: '0.5rem',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    fontSize: '0.9rem',
},
presentacionEditando: { // Estilo para resaltar la que se edita
    // Copia el estilo base y añade un borde o fondo diferente
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0.8rem',
    marginBottom: '0.5rem',
    background: 'rgba(211, 198, 163, 0.2)', // Fondo resaltado
    borderRadius: '6px',
    fontSize: '0.9rem',
    border: '1px solid #D3C6A3',
},
botonAccionPresentacion: {
    background: 'none',
    border: 'none',
    color: '#D3C6A3',
    cursor: 'pointer',
    fontSize: '1rem',
    marginLeft: '0.5rem',
},
botonAccionPresentacionRojo: {
    background: 'none',
    border: 'none',
    color: '#e57373',
    cursor: 'pointer',
    fontSize: '1rem',
    marginLeft: '0.5rem',
  },

  // <<< NUEVOS ESTILOS para Import/Export >>>
  seccionImportExport: {
    background: "#1C2340",
    padding: "1.5rem",
    borderRadius: "12px",
    marginBottom: "2rem",
    maxWidth: "600px",
    margin: "2rem auto",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
  },
  subtituloImportExport: {
    color: "#D3C6A3",
    fontSize: "1.3rem",
    marginBottom: "1rem",
    textAlign: 'center',
    borderBottom: '1px solid #4a5568',
    paddingBottom: '0.5rem',
  },
  botonExportar: {
    background: "#0277bd", // Azul
    color: "white",
    padding: "0.7rem 1.2rem",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1rem",
    display: 'block',
    width: '100%',
    marginBottom: '1.5rem',
    // Estilos :disabled se manejan en JSX con style condicional o clases
  },
  importContainer: {
    borderTop: '1px solid #4a5568',
    paddingTop: '1rem',
  },
  importInstrucciones: {
    fontSize: '0.85rem',
    color: '#bdc1c6',
    marginBottom: '0.5rem',
    lineHeight: 1.4,
  },
  botonImportar: {
    background: "#f57f17", // Naranja/Amarillo
    color: "#2c1b0f",
    padding: "0.7rem 1.2rem",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1rem",
    display: 'block',
    width: '100%',
    marginTop: '0.5rem',
    // Estilos :disabled se manejan en JSX
  },
  // <<< NUEVOS ESTILOS para Modal y Botón Ajuste >>>
  botonAccionAjuste: { // Estilo para el nuevo botón de ajuste
    background: "none",
    border: "none",
    color: "#81c784", // Verde claro
    cursor: "pointer",
    fontSize: "1.2rem", // Un poco más grande
    margin: "0 0.4rem",
    padding: 0,
    lineHeight: 1,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000, // Asegurar que esté por encima
  },
  modalContent: {
    background: "#1C2340", // Mismo fondo que formularios
    padding: "2rem",
    borderRadius: "12px",
    color: "#EFE4CF",
    width: '90%',
    maxWidth: '500px',
    boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
  },
  modalTitle: {
    marginTop: 0,
    marginBottom: "1.5rem",
    color: "#D3C6A3",
    fontSize: "1.4rem",
    textAlign: 'center',
  },
};
