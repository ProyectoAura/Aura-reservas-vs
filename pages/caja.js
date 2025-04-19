// pages/caja.js
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  increment,
  writeBatch,
  serverTimestamp,
  query,
  orderBy,
  where,
  limit,
  Timestamp // <<< Añadido por si acaso
} from "firebase/firestore";

// --- Componente Modal Movimiento (Nuevo) ---
const ModalMovimientoCaja = ({ show, onClose, onSave, tipo, turnoId, usuario }) => {
    const [monto, setMonto] = useState("");
    const [motivo, setMotivo] = useState("");
    const [isSavingMov, setIsSavingMov] = useState(false);

    useEffect(() => {
        // Resetear al abrir/cerrar
        if (show) {
            setMonto("");
            setMotivo("");
        }
    }, [show]);

    const handleGuardar = async () => {
        const montoNum = parseFloat(monto);
        if (isNaN(montoNum) || montoNum <= 0) {
            alert("Ingresa un monto válido mayor a cero.");
            return;
        }
        if (!motivo.trim()) {
            alert("El motivo es obligatorio.");
            return;
        }
        if (!turnoId || !usuario || !usuario.id) {
            alert("Error: No se pudo identificar el turno o usuario activo.");
            return;
        }

        setIsSavingMov(true);
        const data = {
            turnoId: turnoId,
            fechaHora: serverTimestamp(),
            usuarioId: usuario.id,
            usuarioNombre: usuario.nombre,
            tipo: tipo, // 'ingreso' o 'egreso'
            monto: montoNum,
            motivo: motivo.trim(),
        };
        await onSave(data); // Llama a la función de guardado pasada por props
        setIsSavingMov(false);
    };

    if (!show) return null;

    return (
        <div style={estilosModal.overlay}>
            <div style={estilosModal.modal}>
                <h3 style={estilosModal.titulo}>
                    Registrar {tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} de Efectivo
                </h3>
                <div style={estilosModal.campo}>
                    <label style={estilosModal.label}>Monto ($):</label>
                    <input
                        type="number"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        style={estilosModal.input}
                        placeholder="0.00"
                        min="0.01"
                        step="any"
                        disabled={isSavingMov}
                    />
                </div>
                <div style={estilosModal.campo}>
                    <label style={estilosModal.label}>Motivo:</label>
                    <input
                        type="text"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        style={estilosModal.input}
                        placeholder="Ej: Compra de hielo, Ingreso de cambio"
                        disabled={isSavingMov}
                    />
                </div>
                <div style={estilosModal.botones}>
                    <button onClick={handleGuardar} style={estilosModal.botonGuardar} disabled={isSavingMov}>
                        {isSavingMov ? "Guardando..." : "✓ Guardar Movimiento"}
                    </button>
                    <button onClick={onClose} style={estilosModal.botonCancelar} disabled={isSavingMov}>
                        ✗ Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};
// --- Fin Componente Modal ---


export default function Caja() {
  const router = useRouter();

  // --- Estados ---
  // ... (estados existentes sin cambios) ...
  const [articulosBase, setArticulosBase] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [ventaActual, setVentaActual] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Guardando VENTA
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState("Mostrador");
  const [mesaNumero, setMesaNumero] = useState("");
  const [selectedTipoCliente, setSelectedTipoCliente] = useState("Consumidor Final");
  const [notaCliente, setNotaCliente] = useState("");
  const [selectedMedioPago, setSelectedMedioPago] = useState("Efectivo");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [isInvitation, setIsInvitation] = useState(false);
  const [discountObservation, setDiscountObservation] = useState("");
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [cajaPermissionLevel, setCajaPermissionLevel] = useState('no');
  const [montoRecibido, setMontoRecibido] = useState("");
  const [activeShiftData, setActiveShiftData] = useState(null);
  const [loadingShiftCheck, setLoadingShiftCheck] = useState(true);
  // <<< NUEVO: Estados para Modal Movimiento >>>
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [movimientoType, setMovimientoType] = useState('egreso'); // 'ingreso' o 'egreso'

  // --- Carga Inicial ---
  useEffect(() => { /* ... (sin cambios) ... */ const checkAuthAndLoadData = async () => { setIsLoadingClient(true); setLoadingData(true); setLoadingShiftCheck(true); setActiveShiftData(null); const autorizado = localStorage.getItem("adminAutorizado") === "true" || Cookies.get("adminAutorizado") === "true"; if (!autorizado) { router.replace("/"); return; } const usuarioJson = localStorage.getItem("usuarioAura"); if (!usuarioJson) { router.replace("/"); return; } let usuarioGuardado; try { usuarioGuardado = JSON.parse(usuarioJson); } catch (e) { console.error("CAJA: Error parseando usuarioAura JSON:", e); router.replace("/"); return; } const userRole = usuarioGuardado?.rol; const isOwner = usuarioGuardado?.contraseña === 'Aura2025'; if (!usuarioGuardado || !usuarioGuardado.id || !userRole) { router.replace("/"); return; } setCurrentUser(usuarioGuardado); setCurrentUserRole(userRole); let permissionFromDb = 'no'; let finalPermission = 'no'; try { const permisosSnapshot = await getDocs(collection(db, "permisosAura")); if (!permisosSnapshot.empty) { const d = permisosSnapshot.docs[0].data(); permissionFromDb = d?.ventasCaja?.[userRole] || 'no'; } else { console.warn("CAJA: Permisos no encontrados."); } } catch (error) { console.error("CAJA: Error permisos:", error); } if (isOwner) { finalPermission = 'total'; } else { finalPermission = permissionFromDb; } setCajaPermissionLevel(finalPermission); if (finalPermission === 'no') { alert("Sin permiso para acceder a la Caja."); router.replace('/panel'); setIsLoadingClient(false); setLoadingData(false); setLoadingShiftCheck(false); return; } setIsLoadingClient(false); try { const qShift = query( collection(db, "turnosCajaAura"), where("estado", "==", "activo"), where("usuarioAperturaId", "==", usuarioGuardado.id), limit(1) ); const shiftSnapshot = await getDocs(qShift); if (!shiftSnapshot.empty) { setActiveShiftData({ id: shiftSnapshot.docs[0].id, ...shiftSnapshot.docs[0].data() }); console.log("CAJA: Turno activo encontrado:", shiftSnapshot.docs[0].id); } else { console.log("CAJA: No hay turno activo para este usuario."); } } catch (error) { console.error("CAJA: Error buscando turno activo:", error); } finally { setLoadingShiftCheck(false); } try { const [articulosSnapshot, recetasSnapshot] = await Promise.all([ getDocs(query(collection(db, "articulosAura"), orderBy("producto"))), getDocs(query(collection(db, "recetasAura"), orderBy("nombre"))) ]); const itemsBase = articulosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); setArticulosBase(itemsBase); const itemsRecetas = recetasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); setRecetas(itemsRecetas); } catch (error) { console.error("CAJA: Error cargando datos:", error); alert("Error al cargar datos de productos/recetas."); } finally { setLoadingData(false); } }; checkAuthAndLoadData(); }, [router]);

  // --- Variables de Permisos ---
  const canEdit = !isLoadingClient && !!currentUser && (cajaPermissionLevel === 'total' || cajaPermissionLevel === 'editar');
  // ... (otras variables de permiso sin cambios) ...
  const canView = !isLoadingClient && !!currentUser && (canEdit || cajaPermissionLevel === 'ver');
  const canDoTotal = !isLoadingClient && !!currentUser && cajaPermissionLevel === 'total';

  // --- Combinar y Filtrar Items Vendibles ---
  const itemsVendibles = useMemo(() => { /* ... (sin cambios) ... */ if (loadingData) return []; const vendibles = []; const st = searchTerm.toLowerCase(); articulosBase.forEach(p => { const mS = !searchTerm || p.producto?.toLowerCase().includes(st) || p.marca?.toLowerCase().includes(st) || p.descripcion?.toLowerCase().includes(st); if (mS && p.presentaciones?.length) { p.presentaciones.forEach(pr => { if (pr.esVenta && typeof pr.precioVenta === 'number' && pr.precioVenta >= 0) { vendibles.push({ idUnico: `simple-${p.id}-${pr.nombre}`, tipo: 'simple', nombreMostrado: `${p.producto} - ${pr.nombre}`, productoBaseId: p.id, productoNombre: p.producto, marcaNombre: p.marca, descripcion: p.descripcion, presentacion: { ...pr }, precioVenta: pr.precioVenta, unidadBase: p.unidadBase }); } }); } }); recetas.forEach(r => { const mR = !searchTerm || r.nombre?.toLowerCase().includes(st) || r.categoria?.toLowerCase().includes(st); if (mR && typeof r.precioVenta === 'number' && r.precioVenta >= 0) { vendibles.push({ idUnico: `receta-${r.id}`, tipo: 'receta', nombreMostrado: r.nombre, recetaId: r.id, ingredientes: r.ingredientes || [], precioVenta: r.precioVenta }); } }); vendibles.sort((a, b) => a.nombreMostrado.localeCompare(b.nombreMostrado)); return vendibles; }, [articulosBase, recetas, searchTerm, loadingData]);

  // --- Lógica de la Venta Actual ---
  const handleAddItemToSale = (itemVendible) => { /* ... (sin cambios) ... */ if (isSaving || !canEdit) return; if (itemVendible.precioVenta <= 0 && itemVendible.tipo !== 'receta') { alert(`"${itemVendible.nombreMostrado}" sin precio válido.`); return; } setVentaActual(prev => { const idx = prev.findIndex(i => i.idUnico === itemVendible.idUnico); if (idx > -1) { const upd = [...prev]; upd[idx].cantidad += 1; upd[idx].subtotal = upd[idx].cantidad * upd[idx].precioUnitario; return upd; } else { const newItem = { idTemporal: Date.now()+Math.random(), idUnico: itemVendible.idUnico, tipo: itemVendible.tipo, nombreMostrado: itemVendible.nombreMostrado, cantidad: 1, precioUnitario: itemVendible.precioVenta, subtotal: itemVendible.precioVenta }; if (itemVendible.tipo === 'simple') { newItem.productoBaseId = itemVendible.productoBaseId; newItem.presentacion = itemVendible.presentacion; newItem.unidadBase = itemVendible.unidadBase; } else { newItem.recetaId = itemVendible.recetaId; newItem.ingredientes = itemVendible.ingredientes; } return [...prev, newItem]; } }); };
  const handleUpdateQuantity = (idTemporal, delta) => { /* ... (sin cambios) ... */ if (isSaving || !canEdit) return; setVentaActual(prev => { const idx = prev.findIndex(i => i.idTemporal === idTemporal); if (idx === -1) return prev; const upd = [...prev]; const curr = upd[idx]; const nQ = curr.cantidad + delta; if (nQ <= 0) { return upd.filter(i => i.idTemporal !== idTemporal); } else { upd[idx] = { ...curr, cantidad: nQ, subtotal: nQ * curr.precioUnitario }; return upd; } }); };
  const handleRemoveItem = (idTemporal) => { /* ... (sin cambios) ... */ if (isSaving || !canEdit) return; setVentaActual(prev => prev.filter(i => i.idTemporal !== idTemporal)); };

  // Calcular Total, Descuento y Cantidad de Items
  const { subtotalGeneral, descuentoAplicado, totalFinal, cantidadItems } = useMemo(() => { /* ... (sin cambios) ... */ const subtotal = ventaActual.reduce((sum, item) => sum + item.subtotal, 0); const count = ventaActual.length; let discount = 0; let final = subtotal; const percentage = parseFloat(discountPercentage); if (isInvitation) { final = 0; discount = subtotal; } else if (!isNaN(percentage) && percentage > 0 && percentage <= 100) { discount = (subtotal * percentage) / 100; final = subtotal - discount; } return { subtotalGeneral: subtotal, descuentoAplicado: discount, totalFinal: final, cantidadItems: count }; }, [ventaActual, discountPercentage, isInvitation]);

  // Calcular Vuelto/Falta para efectivo
  const { vuelto, falta } = useMemo(() => { /* ... (sin cambios) ... */ if (selectedMedioPago !== 'Efectivo' || !montoRecibido) { return { vuelto: 0, falta: 0 }; } const recibidoNum = parseFloat(montoRecibido); if (isNaN(recibidoNum) || recibidoNum < 0) { return { vuelto: 0, falta: 0 }; } if (recibidoNum >= totalFinal) { return { vuelto: recibidoNum - totalFinal, falta: 0 }; } else { return { vuelto: 0, falta: totalFinal - recibidoNum }; } }, [selectedMedioPago, montoRecibido, totalFinal]);

  // --- Confirmar Venta ---
  const handleConfirmarVenta = async () => { /* ... (sin cambios) ... */ if (ventaActual.length === 0) { alert("Agrega productos."); return; } let usuarioParaVenta = null; let errorUsuario = null; if (currentUser && currentUser.id) { usuarioParaVenta = currentUser; } else { errorUsuario = "Estado currentUser inválido o sin ID."; const usuarioJson = localStorage.getItem("usuarioAura"); if (usuarioJson) { try { const usuarioLocalStorage = JSON.parse(usuarioJson); if (usuarioLocalStorage && usuarioLocalStorage.id) { usuarioParaVenta = usuarioLocalStorage; errorUsuario = null; } else { errorUsuario = "Objeto de localStorage parseado inválido o sin ID."; } } catch (e) { errorUsuario = `Error parseando JSON de localStorage: ${e.message}`; } } else { errorUsuario = "No se encontró 'usuarioAura' en localStorage al re-leer."; } } if (!usuarioParaVenta || !usuarioParaVenta.id) { alert(`Error Crítico: No se pudo identificar al usuario (${errorUsuario || 'Razón desconocida'}). Recarga o inicia sesión.`); console.error("CAJA: handleConfirmarVenta - Fallo final.", currentUser, errorUsuario); return; } if (!canEdit) { alert("No tienes permiso para registrar ventas."); return; } if (selectedSector === "Mesas" && !mesaNumero.trim()) { alert("Ingresa el número de mesa."); return; } const requiereNotaCliente = ["Cuenta Corriente Admin", "Cortesia Invitado", "Cortesia Cliente"].includes(selectedTipoCliente); if (requiereNotaCliente && !notaCliente.trim()) { alert(`Completa la nota para "${selectedTipoCliente}".`); return; } const discountValue = parseFloat(discountPercentage); const requiresDiscountObservation = isInvitation || (!isNaN(discountValue) && discountValue > 0); if (requiresDiscountObservation && !discountObservation.trim()) { alert("Completa la observación del descuento/invitación."); return; } if (selectedMedioPago === 'Efectivo') { const recibidoNum = parseFloat(montoRecibido); if (isNaN(recibidoNum) || recibidoNum < totalFinal) { alert("El monto recibido en efectivo es inválido o insuficiente."); return; } } if (!window.confirm(`Confirmar venta por $${totalFinal.toFixed(2)}?`)) return; setIsSaving(true); const itemsParaHistorial = ventaActual.map(item => ({ nombreVendido: item.nombreMostrado, cantidadVendida: item.cantidad, precioUnitario: item.precioUnitario, subtotalItem: item.subtotal, tipo: item.tipo, productoBaseId: item.tipo === 'simple' ? item.productoBaseId : null, presentacionNombre: item.tipo === 'simple' ? item.presentacion.nombre : null, recetaId: item.tipo === 'receta' ? item.recetaId : null, })); const datosVenta = { fechaHora: serverTimestamp(), usuarioId: usuarioParaVenta.id, usuarioNombre: usuarioParaVenta.nombre, items: itemsParaHistorial, subtotalGeneral: subtotalGeneral, descuentoPorcentaje: isNaN(discountValue) ? 0 : discountValue, esInvitacion: isInvitation, descuentoObservacion: requiresDiscountObservation ? discountObservation.trim() : null, descuentoAplicado: descuentoAplicado, totalVenta: totalFinal, sector: selectedSector, mesaNumero: selectedSector === "Mesas" ? mesaNumero.trim() : null, tipoCliente: selectedTipoCliente, notaCliente: requiereNotaCliente ? notaCliente.trim() : null, medioPago: selectedMedioPago, estado: "Completada", }; const batch = writeBatch(db); let stockUpdatesValidos = true; let erroresStock = []; ventaActual.forEach(item => { if (item.tipo === 'simple') { const cantR = item.cantidad * item.presentacion.contenidoEnUnidadBase; if (isNaN(cantR) || cantR <= 0) { erroresStock.push(`Inválido ${item.nombreMostrado}`); stockUpdatesValidos = false; return; } const ref = doc(db, "articulosAura", item.productoBaseId); batch.update(ref, { cantidadActual: increment(-cantR) }); } else if (item.tipo === 'receta') { if (!item.ingredientes?.length) { erroresStock.push(`Receta ${item.nombreMostrado} sin ingredientes.`); stockUpdatesValidos = false; return; } item.ingredientes.forEach(ing => { const cantR = item.cantidad * ing.cantidadUsada; if (!ing.productoBaseId || isNaN(cantR) || cantR <= 0) { erroresStock.push(`Ingrediente inválido en ${item.nombreMostrado}`); stockUpdatesValidos = false; return; } const ref = doc(db, "articulosAura", ing.productoBaseId); batch.update(ref, { cantidadActual: increment(-cantR) }); }); } }); if (!stockUpdatesValidos) { alert(`Error stock:\n${erroresStock.join("\n")}\nVenta cancelada.`); setIsSaving(false); return; } try { const ventaDocRef = await addDoc(collection(db, "ventasAura"), datosVenta); await batch.commit(); alert(`Venta registrada ($${totalFinal.toFixed(2)}) y stock actualizado.`); setVentaActual([]); setSearchTerm(""); setSelectedSector("Mostrador"); setMesaNumero(""); setSelectedTipoCliente("Consumidor Final"); setNotaCliente(""); setSelectedMedioPago("Efectivo"); setDiscountPercentage(""); setIsInvitation(false); setDiscountObservation(""); setMontoRecibido(""); } catch (error) { console.error("Error:", error); alert(`Error al procesar la venta: ${error.message || 'Error desconocido'}.`); } finally { setIsSaving(false); } };

  // <<< NUEVO: Funciones para Modal Movimiento >>>
  const handleOpenMovimientoModal = (type) => {
      if (!canEdit) { alert("Sin permiso."); return; } // O un permiso más específico?
      setMovimientoType(type);
      setShowMovimientoModal(true);
  };

  const handleCloseMovimientoModal = () => {
      setShowMovimientoModal(false);
      // No reseteamos los inputs aquí, se hace en el useEffect del modal
  };

  const handleSaveMovimiento = async (movimientoData) => {
      // La validación ya se hizo en el modal
      try {
          await addDoc(collection(db, "movimientosCajaAura"), movimientoData);
          alert(`Movimiento de ${movimientoData.tipo} registrado con éxito.`);
          handleCloseMovimientoModal();
      } catch (error) {
          console.error("Error guardando movimiento de caja:", error);
          alert(`Error al guardar el movimiento: ${error.message}`);
          // No cerramos el modal en caso de error para que pueda reintentar
      }
  };
  // <<< FIN Funciones Modal >>>


  // --- Renderizado ---
  if (isLoadingClient || loadingData || loadingShiftCheck) { return <div style={estilos.contenedor}><p style={estilos.loading}>Cargando...</p></div>; }
  if (!activeShiftData) { return ( <div style={estilos.contenedor}> <div style={estilos.header}> <button onClick={() => router.push('/panel')} style={estilos.botonVolver}>← Volver</button> <span style={estilos.usuarioInfo}>Usuario: {currentUser?.nombre || 'N/A'}</span> </div> <h1 style={estilos.titulo}>💰 Caja</h1> <div style={estilos.turnoRequeridoMensaje}> <p>⚠️ Debes abrir un turno antes de poder usar la Caja.</p> <button onClick={() => router.push('/turnos-caja')} style={estilos.botonIrATurnos}> Ir a Gestión de Turnos </button> </div> </div> ); }

  return (
    <div style={estilos.contenedor}>
      {/* Header */}
      <div style={estilos.header}> <button onClick={() => router.push('/panel')} style={estilos.botonVolver}>← Volver</button> <span style={estilos.usuarioInfo}>Usuario: {currentUser?.nombre || 'N/A'}</span> </div>
      <h1 style={estilos.titulo}>💰 Caja</h1>

      {/* Layout Principal */}
      <div style={estilos.layoutCaja}>
        {/* Columna Izquierda: Selección */}
        <div style={estilos.columnaSeleccion}> <h2 style={estilos.subtitulo}>Seleccionar Productos / Recetas</h2> <input type="search" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={estilos.inputSearch} /> {/* Botones Rápidos */} {itemsVendibles.length > 0 && ( <div style={estilos.botonesRapidosContainer}> {itemsVendibles.slice(0, 6).map((item) => ( <button key={`rapido-${item.idUnico}`} style={estilos.botonProductoRapido} onClick={() => handleAddItemToSale(item)} disabled={isSaving || !canEdit} title={item.tipo === 'simple' ? `${item.productoNombre} ${item.marcaNombre}` : item.nombreMostrado}><span style={estilos.nombreProductoBoton}>{item.nombreMostrado}</span><span style={estilos.precioProductoBoton}>${item.precioVenta.toFixed(2)}</span></button> ))} </div> )} {/* Lista completa */} <div style={estilos.listaProductosVendibles}> {itemsVendibles.length === 0 && <p>No hay items vendibles o que coincidan.</p>} {itemsVendibles.map((item) => ( <div key={item.idUnico} style={estilos.itemVendibleLista} onClick={() => handleAddItemToSale(item)} title={item.tipo === 'simple' ? `${item.productoNombre} ${item.marcaNombre}` : item.nombreMostrado}><span style={estilos.nombreItemLista}>{item.nombreMostrado}</span><span style={estilos.precioItemLista}>${item.precioVenta.toFixed(2)}</span></div> ))} </div> </div>

        {/* Columna Derecha: Venta Actual */}
        <div style={estilos.columnaVenta}>
          <h2 style={estilos.subtitulo}>Venta Actual</h2>
          {/* Campos Adicionales */}
          <div style={estilos.camposAdicionales}> {/* Sector */} <div style={estilos.campoGrupo}><label style={estilos.labelCampo}>Sector:</label><select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)} style={estilos.inputSelect} disabled={isSaving || !canEdit}><option value="Mostrador">Mostrador</option><option value="Mesas">Mesas</option><option value="Terraza">Terraza</option></select>{selectedSector === "Mesas" && (<input type="number" placeholder="N° Mesa" value={mesaNumero} onChange={(e) => setMesaNumero(e.target.value)} style={{...estilos.inputInline, width: '80px'}} disabled={isSaving || !canEdit} />)}</div> {/* Cliente */} <div style={estilos.campoGrupo}><label style={estilos.labelCampo}>Cliente:</label><select value={selectedTipoCliente} onChange={(e) => setSelectedTipoCliente(e.target.value)} style={estilos.inputSelect} disabled={isSaving || !canEdit}><option value="Consumidor Final">Consumidor Final</option><option value="Cuenta Corriente Admin">Cta Cte Admin</option><option value="Cortesia Invitado">Cortesía Invitado</option><option value="Cortesia Cliente">Cortesía Cliente</option></select></div> {["Cuenta Corriente Admin", "Cortesia Invitado", "Cortesia Cliente"].includes(selectedTipoCliente) && (<div style={estilos.campoGrupo}><label style={estilos.labelCampo}>Nota:</label><input type="text" placeholder="Autoriza / Motivo" value={notaCliente} onChange={(e) => setNotaCliente(e.target.value)} style={estilos.inputInline} disabled={isSaving || !canEdit} /></div>)} {/* Pago */} <div style={estilos.campoGrupo}><label style={estilos.labelCampo}>Pago:</label><select value={selectedMedioPago} onChange={(e) => {setSelectedMedioPago(e.target.value); if(e.target.value !== 'Efectivo') setMontoRecibido('');}} style={estilos.inputSelect} disabled={isSaving || !canEdit}><option value="Efectivo">Efectivo</option><option value="Tarjeta Credito">T. Crédito</option><option value="Tarjeta Debito">T. Débito</option><option value="Transferencia">Transferencia</option><option value="MercadoPago">MercadoPago</option><option value="Modo">Modo</option><option value="Banco">Banco</option></select></div> {/* Campos Efectivo */} {selectedMedioPago === 'Efectivo' && ( <> <div style={estilos.campoGrupo}><label style={estilos.labelCampo}>Recibido ($):</label><input type="number" placeholder="Monto cliente" value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} style={estilos.inputInline} disabled={isSaving || !canEdit} min="0" step="any" /></div> {montoRecibido && !isNaN(parseFloat(montoRecibido)) && ( <> {vuelto > 0 && ( <div style={estilos.cambioDisplay}> Cambio: ${vuelto.toFixed(2)} </div> )} {falta > 0 && ( <div style={estilos.faltanDisplay}> Faltan: ${falta.toFixed(2)} </div> )} </> )} </> )} </div>

          {/* Ticket */}
          <div style={estilos.ticketVenta}> {ventaActual.length === 0 && <p style={estilos.ticketVacio}>Agrega items...</p>} {ventaActual.map((item) => ( <div key={item.idTemporal} style={estilos.itemTicket}><div style={estilos.itemTicketInfo}><span>{item.nombreMostrado}</span></div><div style={estilos.itemTicketControles}><button onClick={() => handleUpdateQuantity(item.idTemporal, -1)} disabled={isSaving || !canEdit} style={estilos.botonControlTicket}>-</button><span style={estilos.cantidadTicket}>{item.cantidad}</span><button onClick={() => handleUpdateQuantity(item.idTemporal, 1)} disabled={isSaving || !canEdit} style={estilos.botonControlTicket}>+</button><span style={estilos.subtotalTicket}>${item.subtotal.toFixed(2)}</span><button onClick={() => handleRemoveItem(item.idTemporal)} disabled={isSaving || !canEdit} style={estilos.botonEliminarTicket}>🗑️</button></div></div> ))} </div>

          {/* Descuento/Invitación */}
          <div style={estilos.descuentoContainer}> <div style={estilos.campoGrupo}><label style={estilos.labelCampo}>Desc (%):</label><input type="number" min="0" max="100" step="1" placeholder="0-100" value={discountPercentage} onChange={(e) => { setDiscountPercentage(e.target.value); setIsInvitation(false); }} style={{...estilos.inputInline, width: '80px'}} disabled={isSaving || !canEdit || isInvitation} /><label style={{...estilos.labelCampo, marginLeft: '1rem', minWidth: 'auto'}}><input type="checkbox" checked={isInvitation} onChange={(e) => { setIsInvitation(e.target.checked); if(e.target.checked) setDiscountPercentage(''); }} disabled={isSaving || !canEdit} style={{marginRight: '0.3rem'}} /> Invitación ($0)</label></div> {(isInvitation || (parseFloat(discountPercentage) > 0)) && ( <div style={estilos.campoGrupo}><label style={estilos.labelCampo}>Obs:</label><input type="text" placeholder="Motivo Descuento/Invitación" value={discountObservation} onChange={(e) => setDiscountObservation(e.target.value)} style={estilos.inputInline} disabled={isSaving || !canEdit} required /></div> )} </div>

          {/* Total */}
          <div style={estilos.totalContainer}> <span style={estilos.itemCount}>Items: {cantidadItems}</span> {descuentoAplicado > 0 && (<span style={estilos.subtotalGeneral}>Subtotal: ${subtotalGeneral.toFixed(2)}</span>)} <span style={estilos.totalVenta}>Total: ${totalFinal.toFixed(2)}</span> </div>

          {/* <<< MODIFICADO: Acciones Venta (con Ingreso/Egreso) >>> */}
          <div style={estilos.accionesVenta}>
            <button style={estilos.botonCobrar} onClick={handleConfirmarVenta} disabled={ isLoadingClient || isSaving || ventaActual.length === 0 || !canEdit }> {isSaving ? "Procesando..." : "Confirmar Venta"} </button>
            <button style={estilos.botonLimpiar} onClick={() => { if(window.confirm('Limpiar?')) { setVentaActual([]); setSearchTerm(''); setDiscountPercentage(''); setIsInvitation(false); setDiscountObservation(''); setMontoRecibido(''); } }} disabled={ isLoadingClient || isSaving || ventaActual.length === 0 || !canEdit }> Limpiar </button>
            <button style={estilos.botonCerrarTurno} onClick={() => router.push('/turnos-caja')} disabled={isLoadingClient || isSaving} > 🌙 Cerrar Turno </button>
          </div>
          {/* <<< NUEVO: Botones Ingreso/Egreso >>> */}
          <div style={estilos.movimientosCajaContainer}>
              <button
                  style={estilos.botonMovimientoIngreso}
                  onClick={() => handleOpenMovimientoModal('ingreso')}
                  disabled={isLoadingClient || isSaving || !canEdit} // Deshabilitar si carga, guarda o no puede editar
              >
                  + Ingreso Efectivo
              </button>
              <button
                  style={estilos.botonMovimientoEgreso}
                  onClick={() => handleOpenMovimientoModal('egreso')}
                  disabled={isLoadingClient || isSaving || !canEdit}
              >
                  - Egreso Efectivo
              </button>
          </div>
          {/* <<< FIN Botones Ingreso/Egreso >>> */}

        </div> {/* Fin Columna Derecha */}
      </div> {/* Fin Layout Caja */}

      {/* <<< NUEVO: Renderizar Modal >>> */}
      <ModalMovimientoCaja
          show={showMovimientoModal}
          onClose={handleCloseMovimientoModal}
          onSave={handleSaveMovimiento}
          tipo={movimientoType}
          turnoId={activeShiftData?.id} // Pasar ID del turno activo
          usuario={currentUser} // Pasar info del usuario actual
      />

    </div> // Fin Contenedor Principal
  );
}

// --- Estilos ---
const estilos = {
  contenedor: { display: 'flex', flexDirection: 'column', minHeight: "100vh", background: "#0A1034", color: "#EFE4CF", padding: "1rem 1.5rem", fontFamily: "'Space Grotesk', sans-serif", },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '0.5rem', padding: '0.5rem 0' },
  botonVolver: { background: "#806C4F", color: "#EFE4CF", padding: "0.5rem 1rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", zIndex: 10, },
  usuarioInfo: { fontSize: '0.9rem', color: '#D3C6A3', textAlign: 'right' },
  titulo: { fontSize: "2rem", color: "#D3C6A3", marginBottom: "1rem", textAlign: "center", width: '100%', },
  subtitulo: { marginTop: 0, marginBottom: "1rem", color: "#D3C6A3", fontSize: "1.5rem", borderBottom: "1px solid #4a5568", paddingBottom: "0.3rem", },
  loading: { color: 'white', textAlign: 'center', paddingTop: '2rem', fontSize: '1.2rem' },
  layoutCaja: { display: 'flex', flexGrow: 1, gap: '1.5rem', marginTop: '1rem', flexDirection: 'row', '@media (max-width: 900px)': { flexDirection: 'column', } },
  columnaSeleccion: { flex: '1 1 55%', display: 'flex', flexDirection: 'column', background: "#1C2340", padding: "1rem", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.3)", minHeight: '70vh' },
  columnaVenta: { flex: '1 1 45%', display: 'flex', flexDirection: 'column', background: "#1C2340", padding: "1rem", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.3)", minHeight: '70vh' },
  inputSearch: { padding: "0.8rem", fontSize: "1rem", borderRadius: "8px", border: "1px solid #4a5568", backgroundColor: "#EFE4CF", color: "#2c1b0f", width: '100%', boxSizing: 'border-box', marginBottom: '1rem', },
  botonesRapidosContainer: { display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px dashed #4a5568' },
  botonProductoRapido: { background: "#806C4F", color: "#EFE4CF", border: "none", borderRadius: "8px", padding: "0.6rem 0.8rem", cursor: "pointer", textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '55px', width: 'calc(33.33% - 0.6rem)', '@media (max-width: 600px)': { width: 'calc(50% - 0.4rem)' }, boxSizing: 'border-box', transition: 'background-color 0.2s', '&:hover': { backgroundColor: "#6b5b40" }, '&:disabled': { backgroundColor: "#555", cursor: 'not-allowed', opacity: 0.7 } },
  nombreProductoBoton: { fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.3rem', },
  precioProductoBoton: { fontSize: '1rem', fontWeight: 'bold', color: '#D3C6A3', },
  listaProductosVendibles: { flexGrow: 1, overflowY: 'auto', border: '1px solid #4a5568', borderRadius: '8px', background: 'rgba(10, 16, 52, 0.3)', padding: '0.5rem', '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-track': { background: '#2a3352' }, '&::-webkit-scrollbar-thumb': { background: '#806C4F', borderRadius: '4px' }, },
  itemVendibleLista: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', marginBottom: '0.3rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.2s', '&:hover': { backgroundColor: 'rgba(211, 198, 163, 0.1)' } },
  nombreItemLista: { flexGrow: 1, marginRight: '1rem', fontSize: '0.95rem', fontWeight: '500' },
  precioItemLista: { fontSize: '1rem', fontWeight: 'bold', color: '#D3C6A3', },
  camposAdicionales: { display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px dashed #4a5568' },
  campoGrupo: { display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' },
  labelCampo: { fontSize: '0.9rem', color: '#D3C6A3', minWidth: '50px', textAlign: 'right' },
  inputSelect: { padding: "0.5rem", fontSize: "0.9rem", borderRadius: "6px", border: "1px solid #4a5568", backgroundColor: "#EFE4CF", color: "#2c1b0f", flex: 1, minWidth: '120px' },
  inputInline: { padding: "0.5rem", fontSize: "0.9rem", borderRadius: "6px", border: "1px solid #4a5568", backgroundColor: "#EFE4CF", color: "#2c1b0f", flex: 1 },
  cambioDisplay: { fontSize: '1.1rem', fontWeight: 'bold', color: '#4CAF50', textAlign: 'right', padding: '0.3rem 0', marginTop: '0.5rem' },
  faltanDisplay: { fontSize: '1.1rem', fontWeight: 'bold', color: '#f44336', textAlign: 'right', padding: '0.3rem 0', marginTop: '0.5rem' },
  ticketVenta: { flexGrow: 1, overflowY: 'auto', border: '1px solid #4a5568', borderRadius: '8px', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(10, 16, 52, 0.5)', minHeight: '150px' },
  ticketVacio: { textAlign: 'center', color: '#a0a0a0', fontStyle: 'italic', paddingTop: '1rem', },
  itemTicket: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.4rem', borderBottom: '1px dashed #4a5568', '&:last-child': { borderBottom: 'none' } },
  itemTicketInfo: { flexGrow: 1, marginRight: '1rem', fontSize: '0.9rem', fontWeight: '500' },
  itemTicketControles: { display: 'flex', alignItems: 'center', gap: '0.5rem', },
  botonControlTicket: { background: '#4a5568', color: '#EFE4CF', border: 'none', borderRadius: '4px', width: '25px', height: '25px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', lineHeight: '25px', textAlign: 'center', '&:disabled': { opacity: 0.5, cursor: 'not-allowed'} },
  cantidadTicket: { minWidth: '25px', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem', },
  subtotalTicket: { minWidth: '70px', textAlign: 'right', fontWeight: 'bold', fontSize: '0.95rem', },
  botonEliminarTicket: { background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontSize: '1.1rem', padding: '0 0.2rem', '&:disabled': { opacity: 0.5, cursor: 'not-allowed'} },
  descuentoContainer: { padding: '0.8rem 0.5rem', borderTop: '1px dashed #4a5568', marginTop: '0.5rem' },
  totalContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', padding: '1rem 0.5rem', borderTop: '2px solid #806C4F', },
  itemCount: { fontSize: '1rem', color: '#bdc1c6', marginRight: '1rem' },
  subtotalGeneral: { fontSize: '1rem', color: '#bdc1c6', textDecoration: 'line-through', marginRight: '1rem' },
  totalVenta: { fontSize: '1.8rem', fontWeight: 'bold', color: '#D3C6A3', textAlign: 'right', },
  accionesVenta: { display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }, // Permitir wrap
  botonCobrar: { flexGrow: 1, background: "#4CAF50", color: "white", padding: "1rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1.2rem", minWidth: '150px', '&:disabled': { backgroundColor: "#555", cursor: 'not-allowed', opacity: 0.7 } },
  botonLimpiar: { background: "#e57373", color: "white", padding: "0.5rem 1rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem", '&:disabled': { backgroundColor: "#555", cursor: 'not-allowed', opacity: 0.7 } },
  botonCerrarTurno: { background: "#ff9800", color: "#2c1b0f", padding: "0.5rem 1rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem", '&:disabled': { backgroundColor: "#555", cursor: 'not-allowed', opacity: 0.7 } },
  turnoRequeridoMensaje: { background: "#1C2340", padding: "2rem", borderRadius: "12px", textAlign: 'center', maxWidth: '500px', margin: '3rem auto', boxShadow: "0 4px 10px rgba(0,0,0,0.3)", border: '1px solid #ff9800' },
  botonIrATurnos: { background: "#806C4F", color: "#EFE4CF", padding: "0.7rem 1.5rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1rem", marginTop: '1.5rem', },
  // <<< NUEVO: Estilos Movimientos Caja >>>
  movimientosCajaContainer: {
      display: 'flex',
      justifyContent: 'space-around', // Espaciado
      gap: '1rem',
      marginTop: '1.5rem',
      paddingTop: '1rem',
      borderTop: '1px dashed #4a5568',
  },
  botonMovimientoIngreso: {
      background: '#66bb6a', // Verde más claro
      color: '#0A1034',
      padding: '0.6rem 1rem',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '0.9rem',
      flex: 1, // Ocupar espacio similar
      '&:disabled': { backgroundColor: "#555", cursor: 'not-allowed', opacity: 0.7 }
  },
  botonMovimientoEgreso: {
      background: '#ef5350', // Rojo más claro
      color: 'white',
      padding: '0.6rem 1rem',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '0.9rem',
      flex: 1,
      '&:disabled': { backgroundColor: "#555", cursor: 'not-allowed', opacity: 0.7 }
  },
};

// <<< NUEVO: Estilos para el Modal >>>
const estilosModal = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, },
    modal: { background: '#1C2340', padding: '2rem', borderRadius: '12px', color: '#EFE4CF', width: '90%', maxWidth: '450px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '1rem', },
    titulo: { marginTop: 0, marginBottom: '1rem', color: '#D3C6A3', fontSize: '1.4rem', textAlign: 'center' },
    campo: { display: 'flex', flexDirection: 'column', gap: '0.5rem', },
    label: { fontSize: '0.9rem', color: '#D3C6A3', },
    input: { padding: "0.7rem", fontSize: "1rem", borderRadius: "8px", border: "1px solid #4a5568", backgroundColor: "#EFE4CF", color: "#2c1b0f", },
    botones: { display: 'flex', gap: '1rem', marginTop: '1rem', },
    botonGuardar: { background: "#4CAF50", color: "white", padding: "0.7rem 1rem", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1rem", flex: 1, '&:disabled': { backgroundColor: "#555", cursor: 'not-allowed', opacity: 0.7 } },
    botonCancelar: { background: "#666", color: "#EFE4CF", padding: "0.7rem 1rem", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1rem", flex: 1, '&:disabled': { opacity: 0.7 } },
};
