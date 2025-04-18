// pages/recetas.js
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  writeBatch
} from "firebase/firestore";
import Papa from 'papaparse';

// --- Componente FormularioReceta (Sin cambios) ---
const FormularioReceta = ({ receta, onSave, onCancel, articulosBase }) => {
  const [formData, setFormData] = useState({ nombre: "", categoria: "", precioVenta: "", });
  const [ingredientes, setIngredientes] = useState([]);
  const [ingredienteActual, setIngredienteActual] = useState({ productoBaseId: "", cantidadUsada: "", });
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (receta) { setFormData({ nombre: receta.nombre || "", categoria: receta.categoria || "", precioVenta: receta.precioVenta || "", }); setIngredientes(receta.ingredientes || []); } else { setFormData({ nombre: "", categoria: "", precioVenta: "" }); setIngredientes([]); } setIngredienteActual({ productoBaseId: "", cantidadUsada: "" }); }, [receta]);
  const handleChange = (e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, [name]: value })); };
  const handleIngredienteChange = (e) => { const { name, value } = e.target; setIngredienteActual((prev) => ({ ...prev, [name]: value })); };
  const handleAddIngrediente = () => { const { productoBaseId, cantidadUsada } = ingredienteActual; const cantidadNum = parseFloat(cantidadUsada); if (!productoBaseId) { alert("Selecciona ingrediente."); return; } if (isNaN(cantidadNum) || cantidadNum <= 0) { alert("Cantidad inválida."); return; } if (ingredientes.some(ing => ing.productoBaseId === productoBaseId)) { alert("Ingrediente ya existe."); return; } const prodBase = articulosBase.find(p => p.id === productoBaseId); if (!prodBase) { alert("Error ingrediente."); return; } const nuevo = { productoBaseId: productoBaseId, productoNombre: prodBase.producto || "?", cantidadUsada: cantidadNum, unidadBase: prodBase.unidadBase || "?", }; setIngredientes((prev) => [...prev, nuevo]); setIngredienteActual({ productoBaseId: "", cantidadUsada: "" }); };
  const handleRemoveIngrediente = (idToRemove) => { setIngredientes((prev) => prev.filter(ing => ing.productoBaseId !== idToRemove)); };
  const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); const precioNum = parseFloat(formData.precioVenta); if (!formData.nombre.trim()) { alert("Nombre obligatorio."); setLoading(false); return; } if (isNaN(precioNum) || precioNum < 0) { alert("Precio inválido."); setLoading(false); return; } if (ingredientes.length === 0) { alert("Añade ingredientes."); setLoading(false); return; } const datos = { ...formData, precioVenta: precioNum, ingredientes: ingredientes, }; await onSave(datos); setLoading(false); };
  const unidadIngredienteSel = articulosBase.find(p => p.id === ingredienteActual.productoBaseId)?.unidadBase || "...";
  return ( <form onSubmit={handleSubmit} style={estilos.formulario}> <h2 style={estilos.subtituloForm}>{receta ? "Editar" : "Nueva"} Receta</h2> <div style={estilos.filaInput}><label style={estilos.label}>Nombre:</label><input name="nombre" placeholder="Ej: Gin Tonic" value={formData.nombre} onChange={handleChange} style={estilos.input} required /></div> <div style={estilos.filaInput}><label style={estilos.label}>Categoría:</label><input name="categoria" placeholder="Ej: Cocktails" value={formData.categoria} onChange={handleChange} style={estilos.input} /></div> <div style={estilos.filaInput}><label style={estilos.label}>Precio Venta ($):</label><input name="precioVenta" type="number" step="any" min="0" placeholder="Precio final" value={formData.precioVenta} onChange={handleChange} style={estilos.input} required /></div> <div style={estilos.seccionIngredientes}><h4 style={estilos.subtituloIngredientes}>Ingredientes</h4> <div style={estilos.formAddIngrediente}><select name="productoBaseId" value={ingredienteActual.productoBaseId} onChange={handleIngredienteChange} style={{ ...estilos.input, flex: 2 }}><option value="" disabled>-- Selecciona Ingrediente --</option>{articulosBase.sort((a, b) => (a.producto || "").localeCompare(b.producto || "")).map(p => (<option key={p.id} value={p.id}>{p.producto} ({p.marca || '-'}) [{p.unidadBase}]</option>))}</select><input name="cantidadUsada" type="number" step="any" min="0" placeholder="Cantidad" value={ingredienteActual.cantidadUsada} onChange={handleIngredienteChange} style={{ ...estilos.input, flex: 1 }}/><span style={{ minWidth: '30px', textAlign: 'left' }}>{unidadIngredienteSel}</span><button type="button" onClick={handleAddIngrediente} style={estilos.botonAddIngrediente} title="Añadir">➕</button></div> {ingredientes.length > 0 && (<ul style={estilos.listaIngredientes}>{ingredientes.map((ing) => (<li key={ing.productoBaseId} style={estilos.itemIngrediente}><span><strong>{ing.productoNombre}</strong>: {ing.cantidadUsada} {ing.unidadBase}</span><button type="button" onClick={() => handleRemoveIngrediente(ing.productoBaseId)} style={estilos.botonRemoveIngrediente} title="Quitar">🗑️</button></li>))}</ul>)} {ingredientes.length === 0 && <p style={{textAlign: 'center', fontSize: '0.9em', color: '#aaa'}}>Añade ingredientes.</p>} </div> <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}><button type="submit" style={estilos.botonGuardar} disabled={loading}>{loading ? "..." : (receta ? "✓ Guardar" : "➕ Crear")}</button><button type="button" onClick={onCancel} style={estilos.botonCancelar} disabled={loading}>✗ Cancelar</button></div> </form> );
};

// --- Componente Principal Recetas ---
export default function Recetas() {
  const router = useRouter();
  const [recetas, setRecetas] = useState([]);
  const [articulosBase, setArticulosBase] = useState([]);
  const [loadingRecetas, setLoadingRecetas] = useState(true);
  const [loadingArticulos, setLoadingArticulos] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [recetaEditando, setRecetaEditando] = useState(null);
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [recetasPermissionLevel, setRecetasPermissionLevel] = useState('no');
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // useEffect para carga inicial (Corregido para dueño)
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
        setIsLoadingClient(true);
        const autorizado = localStorage.getItem("adminAutorizado") === "true" || Cookies.get("adminAutorizado") === "true";
        if (!autorizado) { router.replace("/"); return; }
        const usuarioGuardado = JSON.parse(localStorage.getItem("usuarioAura"));
        const userRole = usuarioGuardado?.rol;
        const isOwner = usuarioGuardado?.contraseña === 'Aura2025';
        if (!userRole) { router.replace("/"); return; }
        setCurrentUserRole(userRole);
        let permissionFromDb = 'no'; let finalPermission = 'no';
        try {
            const permisosSnapshot = await getDocs(collection(db, "permisosAura"));
            if (!permisosSnapshot.empty) {
                const permisosData = permisosSnapshot.docs[0].data();
                permissionFromDb = permisosData?.recetas?.[userRole] || 'no';
            } else { console.warn("Permisos no encontrados."); }
        } catch (error) { console.error("Error permisos:", error); }
        if (isOwner) { finalPermission = 'total'; } else { finalPermission = permissionFromDb; }
        setRecetasPermissionLevel(finalPermission);
        if (finalPermission === 'no') { alert("Sin permiso."); router.replace('/panel'); setIsLoadingClient(false); return; }
        await Promise.all([ cargarRecetas(), cargarArticulosBase() ]);
        setIsLoadingClient(false);
    };
    checkAuthAndLoadData();
  }, [router]);

  // Funciones de Carga (sin cambios)
  const cargarRecetas = async () => { setLoadingRecetas(true); try { const q = query(collection(db, "recetasAura"), orderBy("nombre")); const snapshot = await getDocs(q); const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); setRecetas(lista); } catch (error) { console.error("Error recetas:", error); setRecetas([]); } finally { setLoadingRecetas(false); } };
  const cargarArticulosBase = async () => { setLoadingArticulos(true); try { const q = query(collection(db, "articulosAura"), orderBy("producto")); const snapshot = await getDocs(q); const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); setArticulosBase(items); } catch (error) { console.error("Error artículos:", error); setArticulosBase([]); } finally { setLoadingArticulos(false); } };

  // Variables de Permisos (sin cambios)
  const canEdit = !isLoadingClient && (recetasPermissionLevel === 'total' || recetasPermissionLevel === 'editar');
  const canView = !isLoadingClient && (canEdit || recetasPermissionLevel === 'ver');
  const canDoTotal = !isLoadingClient && recetasPermissionLevel === 'total';

  // Funciones CRUD (sin cambios)
  const handleGuardarReceta = async (datosReceta) => { if (!canEdit) { alert("Sin permiso."); return; } try { if (recetaEditando && recetaEditando.id) { const ref = doc(db, "recetasAura", recetaEditando.id); await updateDoc(ref, datosReceta); alert("Receta actualizada."); } else { await addDoc(collection(db, "recetasAura"), datosReceta); alert("Receta creada."); } setShowForm(false); setRecetaEditando(null); cargarRecetas(); } catch (error) { console.error("Error guardando:", error); alert(`Error: ${error.message}`); } };
  const handleEditarReceta = (receta) => { if (!canEdit) { alert("Sin permiso."); return; } setRecetaEditando(receta); setShowForm(true); };
  const handleEliminarReceta = async (id, nombre) => { if (!canDoTotal) { alert("Sin permiso."); return; } if (!window.confirm(`¿Eliminar "${nombre}"?`)) return; try { await deleteDoc(doc(db, "recetasAura", id)); cargarRecetas(); alert("Receta eliminada."); } catch (error) { console.error("Error eliminando:", error); alert(`Error: ${error.message}`); } };
  const handleAgregarClick = () => { if (!canEdit) { alert("Sin permiso."); return; } setRecetaEditando(null); setShowForm(true); };
  const handleCancelarForm = () => { setShowForm(false); setRecetaEditando(null); };

  // --- <<< MODIFICADO: Funciones de Exportación/Importación (Formato Filas con DELIMITADOR PUNTO Y COMA) >>> ---
  const handleExportRecetas = () => {
    if (!canView) { alert("Sin permiso."); return; }
    if (recetas.length === 0) { alert("No hay recetas para exportar."); return; }

    const dataToExport = [];
    // Encabezados
    dataToExport.push([
        "TipoFila", "NombreReceta", "Categoria", "PrecioVenta",
        "Ingrediente_ID", "Ingrediente_Cantidad", "Ingrediente_NombreRef", "Ingrediente_UnidadRef"
    ]);

    // Datos
    recetas.forEach(receta => {
      // Fila RECETA
      dataToExport.push([
        "RECETA",
        receta.nombre || "",
        receta.categoria || "",
        receta.precioVenta !== undefined ? receta.precioVenta : "",
        "", "", "", "", // Vacíos para columnas de ingredientes
      ]);

      // Filas INGREDIENTE
      (receta.ingredientes || []).forEach(ing => {
        const articuloBase = articulosBase.find(a => a.id === ing.productoBaseId);
        dataToExport.push([
          "INGREDIENTE",
          receta.nombre || "", // Repetir nombre receta
          "", "", // Vacíos para Categoria y PrecioVenta
          ing.productoBaseId || "",
          ing.cantidadUsada !== undefined ? ing.cantidadUsada : "",
          articuloBase?.producto || ing.productoNombre || "",
          articuloBase?.unidadBase || ing.unidadBase || "",
        ]);
      });
    });

    // Convertir a CSV usando PapaParse, especificando el delimitador
    const csv = Papa.unparse(dataToExport, {
        delimiter: ";" // <<< ¡CAMBIO CLAVE AQUÍ!
    });

    // Crear Blob y enlace de descarga (con BOM para Excel)
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const fechaHoy = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `recetas_aura_${fechaHoy}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) { setImportFile(event.target.files[0]); }
    else { setImportFile(null); }
  };

  const handleImportRecetas = () => {
    if (!canEdit) { alert("Sin permiso."); return; }
    if (!importFile) { alert("Selecciona archivo CSV."); return; }
    if (!window.confirm("Importar CREARÁ NUEVAS Recetas desde CSV (según columna 'NombreReceta'). No actualiza existentes. ¿Continuar?")) return;

    setIsImporting(true);
    Papa.parse(importFile, {
      header: true, // Los encabezados son importantes ahora
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        const errors = [];
        const recetasParaGuardar = {}; // Objeto para agrupar ingredientes por nombre de receta

        // 1. Procesar filas y agrupar
        rows.forEach((row, index) => {
          const rowIndex = index + 2; // Para mensajes de error
          const tipo = row.TipoFila?.toUpperCase();
          const nombreReceta = row.NombreReceta?.trim();

          if (!nombreReceta) {
            errors.push(`Fila ${rowIndex}: Falta NombreReceta.`); return;
          }

          if (tipo === "RECETA") {
            // Validar datos de la receta
            if (recetasParaGuardar[nombreReceta]) {
              errors.push(`Fila ${rowIndex}: Nombre de receta duplicado en el archivo: '${nombreReceta}'.`); return;
            }
            const precioNum = parseFloat(row.PrecioVenta);
            if (row.PrecioVenta === undefined || row.PrecioVenta === null || row.PrecioVenta === '' || isNaN(precioNum) || precioNum < 0) {
              errors.push(`Fila ${rowIndex}: PrecioVenta inválido para '${nombreReceta}'.`); return;
            }
            // Crear entrada para la receta
            recetasParaGuardar[nombreReceta] = {
              nombre: nombreReceta,
              categoria: (row.Categoria || "").trim(),
              precioVenta: precioNum,
              ingredientes: [], // Inicializar array vacío
              filaOrigen: rowIndex // Guardar fila para referencia en errores
            };
          } else if (tipo === "INGREDIENTE") {
            // Validar datos del ingrediente
            if (!recetasParaGuardar[nombreReceta]) {
              // Permitir ingredientes sin fila RECETA previa? O requerirla?
              // Por ahora, la requerimos para asegurar datos completos.
              errors.push(`Fila ${rowIndex}: Fila INGREDIENTE para '${nombreReceta}' encontrada antes de su fila RECETA.`); return;
            }
            const ingredienteId = row.Ingrediente_ID?.trim();
            const cantidadNum = parseFloat(row.Ingrediente_Cantidad);
            if (!ingredienteId || isNaN(cantidadNum) || cantidadNum <= 0) {
              errors.push(`Fila ${rowIndex}: Datos de ingrediente inválidos (ID o Cantidad) para '${nombreReceta}'.`); return;
            }
            // Verificar si el ID del ingrediente existe en articulosBase (opcional pero MUY recomendado)
            const articuloBaseExiste = articulosBase.find(a => a.id === ingredienteId);
            if (!articuloBaseExiste) {
                errors.push(`Fila ${rowIndex}: El Ingrediente_ID '${ingredienteId}' para '${nombreReceta}' no existe en Control de Stock.`); return;
            }
            // Evitar duplicados del mismo ingrediente en la misma receta
            if (recetasParaGuardar[nombreReceta].ingredientes.some(ing => ing.productoBaseId === ingredienteId)) {
                errors.push(`Fila ${rowIndex}: Ingrediente '${ingredienteId}' duplicado en la receta '${nombreReceta}'.`); return;
            }

            // Añadir ingrediente a la receta correspondiente
            recetasParaGuardar[nombreReceta].ingredientes.push({
              productoBaseId: ingredienteId,
              cantidadUsada: cantidadNum,
              // Guardar refs opcionalmente si vienen del CSV o buscarlas
              productoNombre: row.Ingrediente_NombreRef || articuloBaseExiste.producto || "?",
              unidadBase: row.Ingrediente_UnidadRef || articuloBaseExiste.unidadBase || "?",
            });
          } else {
            errors.push(`Fila ${rowIndex}: TipoFila inválido ('${row.TipoFila}'). Usar 'RECETA' o 'INGREDIENTE'.`); return;
          }
        });

        // 2. Validar recetas completas
        Object.values(recetasParaGuardar).forEach(receta => {
            if (receta.ingredientes.length === 0) {
                errors.push(`Receta '${receta.nombre}' (Fila ${receta.filaOrigen}): No tiene ingredientes definidos.`);
            }
        });


        // 3. Mostrar errores o proceder a guardar
        if (errors.length > 0) {
          alert(`Errores en CSV:\n${errors.join("\n")}\nNo se importó.`);
          setIsImporting(false); setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; return;
        }

        const recetasFinales = Object.values(recetasParaGuardar);
        if (recetasFinales.length === 0) {
          alert("No se encontraron recetas válidas para importar.");
          setIsImporting(false); setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; return;
        }

        // 4. Guardar en Batch
        try {
          const batch = writeBatch(db);
          recetasFinales.forEach(recetaData => {
            // Quitar filaOrigen antes de guardar
            const { filaOrigen, ...dataToSave } = recetaData;
            // TODO: Añadir verificación de duplicados por nombre si se desea antes de añadir al batch
            const newDocRef = doc(collection(db, "recetasAura"));
            batch.set(newDocRef, dataToSave);
          });
          await batch.commit();
          alert(`${recetasFinales.length} receta(s) importada(s).`);
          cargarRecetas(); // Recargar lista
        } catch (error) {
          console.error("Error importando:", error); alert(`Error: ${error.message}`);
        } finally {
          setIsImporting(false); setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
      error: (error) => { console.error("Error parseando:", error); alert(`Error CSV: ${error.message}`); setIsImporting(false); }
    });
  };
  // --- <<< FIN Funciones Import/Export >>> ---


  // --- Renderizado ---
  if (isLoadingClient || loadingRecetas || loadingArticulos) { return <div style={estilos.contenedor}><p style={estilos.loading}>Cargando...</p></div>; }
  if (!canView) { return <div style={estilos.contenedor}><p style={estilos.loading}>Acceso denegado.</p></div>; }

  return (
    <div style={estilos.contenedor}>
      <button onClick={() => router.push('/panel')} style={estilos.botonVolver}>← Volver</button>
      <h1 style={estilos.titulo}>🍹 Gestión de Recetas</h1>

      {canEdit && !showForm && (<button onClick={handleAgregarClick} style={estilos.botonAgregarNuevo}>➕ Definir Nueva Receta</button>)}

      {canEdit && showForm && ( <FormularioReceta receta={recetaEditando} onSave={handleGuardarReceta} onCancel={handleCancelarForm} articulosBase={articulosBase} /> )}

      {/* Sección Import/Export Recetas (Modificada) */}
      {canView && (
        <div style={estilos.seccionImportExport}>
          <h3 style={estilos.subtituloImportExport}>Importar / Exportar Recetas</h3>
          <button onClick={handleExportRecetas} style={estilos.botonExportar} disabled={recetas.length === 0}>
            📥 Descargar Recetas (CSV - Formato Detallado)
          </button>
          {canEdit && (
            <div style={estilos.importContainer}>
                <p style={estilos.importInstrucciones}>
                    Importar <strong>NUEVAS</strong> Recetas desde CSV (Formato Detallado).<br/>
                    Columnas: <strong>TipoFila, NombreReceta, Categoria, PrecioVenta, Ingrediente_ID, Ingrediente_Cantidad, Ingrediente_NombreRef, Ingrediente_UnidadRef</strong>.<br/>
                    Una fila 'RECETA' por cada receta, seguida de filas 'INGREDIENTE'.<br/>
                    'NombreReceta' debe coincidir entre RECETA y sus INGREDIENTES.<br/>
                    'Ingrediente_ID' debe existir en Control de Stock.
                </p>
                <input type="file" accept=".csv" onChange={handleFileChange} ref={fileInputRef} style={{ display: 'block', margin: '0.5rem 0' }} />
                <button onClick={handleImportRecetas} style={estilos.botonImportar} disabled={!importFile || isImporting}>
                    {isImporting ? "Importando..." : "📤 Importar Recetas CSV"}
                </button>
            </div>
          )}
        </div>
      )}

      {/* Lista/Tabla de Recetas */}
      <div style={estilos.tablaContenedor}>
        <h2 style={estilos.subtitulo}>Recetas Definidas</h2>
        {recetas.length === 0 && <p>No hay recetas definidas.</p>}
        {recetas.length > 0 && (
          <table style={estilos.tabla}>
            <thead><tr><th style={estilos.th}>Nombre</th><th style={estilos.th}>Categoría</th><th style={estilos.th}>Precio</th><th style={estilos.th}>Ingredientes</th><th style={estilos.th}>Acciones</th></tr></thead>
            <tbody>
              {recetas.map((receta) => (
                <tr key={receta.id}>
                  <td style={estilos.td}>{receta.nombre}</td><td style={estilos.td}>{receta.categoria || "-"}</td><td style={estilos.td}>${receta.precioVenta?.toFixed(2) || 'N/A'}</td>
                  <td style={estilos.td}>
                    {receta.ingredientes?.map((ing, idx) => (<span key={idx} style={{ display: 'block', fontSize: '0.8em' }}>{ing.cantidadUsada} {ing.unidadBase || '?'} - {ing.productoNombre || '?'}</span>))}
                    {(!receta.ingredientes || receta.ingredientes.length === 0) && "-"}
                  </td>
                  <td style={estilos.td}>
                    {canEdit && (<button onClick={() => handleEditarReceta(receta)} style={estilos.botonAccion} title="Editar">✏️</button>)}
                    {canDoTotal && (<button onClick={() => handleEliminarReceta(receta.id, receta.nombre)} style={estilos.botonAccionRojo} title="Eliminar">🗑️</button>)}
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

// --- Estilos (Sin cambios respecto a la versión anterior con JSON import/export) ---
const estilos = {
  contenedor: { minHeight: "100vh", background: "#0A1034", color: "#EFE4CF", padding: "2rem 1.5rem", fontFamily: "'Space Grotesk', sans-serif", },
  botonVolver: { position: 'absolute', top: '1rem', left: '1rem', background: "#806C4F", color: "#EFE4CF", padding: "0.5rem 1rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", zIndex: 10, },
  titulo: { fontSize: "2rem", color: "#D3C6A3", marginBottom: "2rem", textAlign: "center", borderBottom: "2px solid #806C4F", paddingBottom: "0.5rem", },
  subtitulo: { marginTop: "1.5rem", marginBottom: "1rem", color: "#D3C6A3", fontSize: "1.5rem", },
  loading: { color: 'white', textAlign: 'center', paddingTop: '2rem', fontSize: '1.2rem' },
  botonAgregarNuevo: { background: "#4CAF50", color: "white", padding: "0.8rem 1.5rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1.1rem", display: 'block', maxWidth: '400px', margin: "1rem auto 2rem auto", },
  formulario: { background: "#1C2340", padding: "1.5rem", borderRadius: "12px", marginBottom: "2rem", maxWidth: "700px", margin: "1rem auto", boxShadow: "0 4px 10px rgba(0,0,0,0.3)", },
  subtituloForm: { color: "#EFE4CF", fontSize: "1.3rem", marginBottom: "1rem", textAlign: 'center', },
  filaInput: { display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '1rem', },
  label: { minWidth: '110px', textAlign: 'right', fontSize: '0.9rem', color: '#D3C6A3', },
  input: { padding: "0.7rem", fontSize: "1rem", borderRadius: "8px", border: "1px solid #4a5568", backgroundColor: "#EFE4CF", color: "#2c1b0f", flex: 1, boxSizing: 'border-box' },
  botonGuardar: { background: "#4CAF50", color: "white", padding: "0.7rem 1rem", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1rem", flex: 1, },
  botonCancelar: { background: "#666", color: "#EFE4CF", padding: "0.7rem 1rem", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1rem", flex: 1, },
  tablaContenedor: { overflowX: 'auto', marginTop: '2rem', background: "#1C2340", padding: "1rem", borderRadius: "12px", },
  tabla: { width: "100%", borderCollapse: 'collapse', marginTop: "1rem", color: "#EFE4CF", fontSize: "0.9rem", },
  th: { background: "#806C4F", color: "#0A1034", padding: "0.8rem", textAlign: "left", border: "1px solid #4a5568", whiteSpace: 'nowrap', },
  td: { padding: "0.7rem", border: "1px solid #4a5568", verticalAlign: 'middle', },
  botonAccion: { background: "none", border: "none", color: "#D3C6A3", cursor: "pointer", fontSize: "1.1rem", margin: "0 0.3rem", },
  botonAccionRojo: { background: "none", border: "none", color: "#e57373", cursor: "pointer", fontSize: "1.1rem", margin: "0 0.3rem", },
  seccionIngredientes: { marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #4a5568', },
  subtituloIngredientes: { color: '#D3C6A3', fontSize: '1.1rem', marginBottom: '1rem', },
  formAddIngrediente: { display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '1rem', background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '8px', },
  botonAddIngrediente: { background: '#806C4F', color: '#EFE4CF', border: 'none', borderRadius: '50%', width: '35px', height: '35px', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, },
  listaIngredientes: { listStyle: 'none', padding: 0, marginTop: '1rem', },
  itemIngrediente: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.8rem', marginBottom: '0.5rem', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '6px', fontSize: '0.9rem', },
  botonRemoveIngrediente: { background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontSize: '1rem', marginLeft: '0.5rem', },
  seccionImportExport: { background: "#1C2340", padding: "1.5rem", borderRadius: "12px", marginBottom: "2rem", maxWidth: "700px", margin: "2rem auto", boxShadow: "0 4px 10px rgba(0,0,0,0.3)", },
  subtituloImportExport: { color: "#D3C6A3", fontSize: "1.3rem", marginBottom: "1rem", textAlign: 'center', borderBottom: '1px solid #4a5568', paddingBottom: '0.5rem', },
  botonExportar: { background: "#0277bd", color: "white", padding: "0.7rem 1.2rem", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1rem", display: 'block', width: '100%', marginBottom: '1.5rem', },
  importContainer: { borderTop: '1px solid #4a5568', paddingTop: '1rem', },
  importInstrucciones: { fontSize: '0.85rem', color: '#bdc1c6', marginBottom: '0.5rem', lineHeight: 1.4, },
  codeSnippet: { background: '#2a3352', padding: '0.2em 0.4em', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.9em'},
  botonImportar: { background: "#f57f17", color: "#2c1b0f", padding: "0.7rem 1.2rem", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1rem", display: 'block', width: '100%', marginTop: '0.5rem', },
};
