// pages/turnos-caja.js
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  updateDoc,
  deleteDoc, // <<< NUEVO: Importar deleteDoc >>>
  Timestamp,
  serverTimestamp
} from "firebase/firestore";

// Helper para formatear Timestamp
const formatTimestamp = (timestamp) => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
  return timestamp ? String(timestamp) : 'Fecha inválida';
};

export default function TurnosCaja() {
  const router = useRouter();

  // --- Estados ---
  const [activeShift, setActiveShift] = useState(null); // Turno activo actual { id, data }
  const [loadingActiveShift, setLoadingActiveShift] = useState(true);
  const [fondoInicial, setFondoInicial] = useState(""); // Para abrir turno
  const [isOpening, setIsOpening] = useState(false); // Evitar doble click al abrir
  // Estados para Cierre de Turno
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [loadingCloseData, setLoadingCloseData] = useState(false);
  const [expectedTotals, setExpectedTotals] = useState({}); // { Efectivo: 1000, Tarjeta: 500, ... }
  const [countedTotals, setCountedTotals] = useState({}); // { Efectivo: '', Tarjeta: '', ... } - Inputs
  const [diferencias, setDiferencias] = useState({}); // { Efectivo: -50, Tarjeta: 0, ... }
  const [isClosing, setIsClosing] = useState(false); // Evitar doble click al cerrar
  // <<< NUEVO: Estado para total ventas del turno >>>
  const [totalSalesDuringShift, setTotalSalesDuringShift] = useState(0);
  // Estados para Historial
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // Estados para permisos y carga cliente
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [turnosPermissionLevel, setTurnosPermissionLevel] = useState('no');
  // <<< Estados para resumen de movimientos >>>
  const [totalIngresosExtra, setTotalIngresosExtra] = useState(0);
  const [totalEgresosExtra, setTotalEgresosExtra] = useState(0);
  // <<< NUEVO: Estado para Notas de Cierre >>>
  const [closingNotes, setClosingNotes] = useState("");

  // --- Carga Inicial: Auth, Permisos, Turno Activo ---
  useEffect(() => {
    const checkAuthAndLoad = async () => {
        setIsLoadingClient(true);
        setLoadingActiveShift(true);
  
        // 1. Autorización y Usuario
        const autorizado = localStorage.getItem("adminAutorizado") === "true" || Cookies.get("adminAutorizado") === "true";
        if (!autorizado) { router.replace("/"); return; }
        const usuarioJson = localStorage.getItem("usuarioAura");
        if (!usuarioJson) { router.replace("/"); return; }
        let usuarioGuardado;
        try { usuarioGuardado = JSON.parse(usuarioJson); }
        catch (e) { router.replace("/"); return; }
        if (!usuarioGuardado || !usuarioGuardado.id || !usuarioGuardado.rol) { router.replace("/"); return; }
        setCurrentUser(usuarioGuardado);
        setCurrentUserRole(usuarioGuardado.rol);
        const isOwner = usuarioGuardado.contraseña === 'Aura2025';
        // 2. Permisos para 'turnosCaja'
        let permissionFromDb = 'no'; let finalPermission = 'no';
        try {
            const permisosSnapshot = await getDocs(collection(db, "permisosAura"));
            if (!permisosSnapshot.empty) { const d = permisosSnapshot.docs[0].data(); permissionFromDb = d?.turnosCaja?.[usuarioGuardado.rol] || 'no'; }
            else { console.warn("Permisos no encontrados."); }
        } catch (error) { console.error("Error permisos:", error); }
        if (isOwner) { finalPermission = 'total'; } else { finalPermission = permissionFromDb; }
        setTurnosPermissionLevel(finalPermission);
        if (finalPermission === 'no') { alert("Sin permiso para gestionar turnos."); router.replace('/panel'); setIsLoadingClient(false); setLoadingActiveShift(false); return; }

                // 3. Buscar Turno Activo para ESTE usuario
                try {
                  const q = query(
                      collection(db, "turnosCajaAura"),
                      where("estado", "==", "activo"),
                      where("usuarioAperturaId", "==", usuarioGuardado.id),
                      limit(1)
                  );
                  const activeShiftSnapshot = await getDocs(q);
                  if (!activeShiftSnapshot.empty) {
                      const shiftDoc = activeShiftSnapshot.docs[0];
                      setActiveShift({ id: shiftDoc.id, ...shiftDoc.data() });
                      console.log("Turno activo encontrado:", shiftDoc.id);
                  } else {
                      setActiveShift(null);
                      console.log("No hay turno activo para este usuario.");
                  }
              } catch (error) {
                  console.error("Error buscando turno activo:", error);
                  setActiveShift(null); // Asumir que no hay turno activo en caso de error
              } finally {
                  setLoadingActiveShift(false);
                  setIsLoadingClient(false);
              }
          };
          checkAuthAndLoad();
        }, [router]);
      
  // --- Variables de Permisos ---
  const canManageShifts = !isLoadingClient && !!currentUser && (turnosPermissionLevel === 'total' || turnosPermissionLevel === 'editar');
  const canViewHistory = !isLoadingClient && !!currentUser && turnosPermissionLevel !== 'no';
  // <<< NUEVO: Permiso específico para eliminar (más seguro que canManageShifts) >>>
  const canDeleteShifts = !isLoadingClient && !!currentUser && turnosPermissionLevel === 'total';



  // --- Abrir Turno ---
  const handleAbrirTurno = async () => {
    if (!canManageShifts) { alert("Sin permiso para abrir turno."); return; }
    if (activeShift) { alert("Ya hay un turno activo para ti."); return; }
    const fondoNum = parseFloat(fondoInicial);
    if (isNaN(fondoNum) || fondoNum < 0) { alert("Ingresa un fondo inicial válido (número mayor o igual a 0)."); return; }
    if (!window.confirm(`¿Abrir turno con un fondo inicial de $${fondoNum.toFixed(2)}?`)) return;
    setIsOpening(true);
    try {
      const nuevoTurnoData = { fechaHoraApertura: serverTimestamp(), usuarioAperturaId: currentUser.id, usuarioAperturaNombre: currentUser.nombre, fondoInicial: fondoNum, estado: "activo", fechaHoraCierre: null, usuarioCierreId: null, usuarioCierreNombre: null, totalesEsperados: {}, totalesContados: {}, diferencias: {}, };
      const docRef = await addDoc(collection(db, "turnosCajaAura"), nuevoTurnoData);
      setActiveShift({ id: docRef.id, ...nuevoTurnoData, fechaHoraApertura: Timestamp.now() });
      setFondoInicial("");
      alert("Turno abierto con éxito.");
    } catch (error) { console.error("Error al abrir turno:", error); alert(`Error al abrir turno: ${error.message}`); }
    finally { setIsOpening(false); }
  };

  // --- Iniciar Cierre de Turno (MODIFICADO: Calcular Total Ventas) ---
  // --- Iniciar Cierre de Turno (MODIFICADO: Incluir Movimientos) ---
  const iniciarCierreTurno = async () => {
    if (!canManageShifts) { alert("Sin permiso para cerrar turno."); return; }
    if (!activeShift || !activeShift.fechaHoraApertura || !activeShift.id) { // Asegurar que activeShift.id exista
      alert("Error: No se encontró un turno activo válido para cerrar.");
      console.error("[DEBUG Cierre] Error: activeShift inválido", activeShift);
      return;
    }

    console.log("[DEBUG Cierre] Iniciando cierre para turno ID:", activeShift.id); // Log ID Turno
    console.log("[DEBUG Cierre] Hora apertura turno:", activeShift.fechaHoraApertura); // Log Hora Apertura

    setLoadingCloseData(true); setShowCloseForm(true); setExpectedTotals({}); setCountedTotals({}); setDiferencias({}); setTotalSalesDuringShift(0);
    setTotalIngresosExtra(0); setTotalEgresosExtra(0); // <<< Resetear totales movimientos

    try {
      // 1. Obtener Ventas del Turno
      const qVentas = query(
        collection(db, "ventasAura"),
        where("fechaHora", ">", activeShift.fechaHoraApertura),
        // where("usuarioId", "==", currentUser.id), // Descomentar si es estrictamente por usuario
        orderBy("fechaHora")
      );
      const ventasSnapshot = await getDocs(qVentas);
      const calculoEsperados = {};
      let calculoTotalVentas = 0;
      console.log(`[DEBUG Cierre] Ventas encontradas: ${ventasSnapshot.docs.length}`); // Log Ventas
      ventasSnapshot.forEach(doc => {
        const venta = doc.data();
        const medioPago = venta.medioPago || "Desconocido";
        const ventaTotal = venta.totalVenta || 0;
        calculoEsperados[medioPago] = (calculoEsperados[medioPago] || 0) + ventaTotal;
        calculoTotalVentas += ventaTotal;
      });
      console.log("[DEBUG Cierre] Totales por ventas (antes de fondo/mov):", JSON.stringify(calculoEsperados)); // Log Totales Ventas

      // <<< NUEVO: 2. Obtener Movimientos de Caja del Turno >>>
      let calculoIngresosExtra = 0;
      let calculoEgresosExtra = 0;
      const qMovimientos = query(
          collection(db, "movimientosCajaAura"),
          where("turnoId", "==", activeShift.id) // <<< ¿Es activeShift.id correcto aquí? // Filtrar por ID del turno activo
      );
      const movimientosSnapshot = await getDocs(qMovimientos);
      console.log("Movimientos encontrados:", movimientosSnapshot.docs.length); // <<< Log para ver si encuentra algo
      movimientosSnapshot.forEach(doc => {
          const mov = doc.data();
          console.log("Procesando movimiento:", mov); // <<< Log para ver cada movimiento
          if (mov.tipo === 'ingreso') {
              calculoIngresosExtra += mov.monto || 0;
          } else if (mov.tipo === 'egreso') { // <<< ¿Entra aquí?
              calculoEgresosExtra += mov.monto || 0; // <<< ¿Suma correctamente?
          }
      });
      setTotalIngresosExtra(calculoIngresosExtra);
      setTotalEgresosExtra(calculoEgresosExtra);
      console.log("Movimientos extra - Ingresos:", calculoIngresosExtra, "Egresos:", calculoEgresosExtra); // <<< Log clave
// <<< FIN NUEVO >>>

            // 3. Calcular Efectivo Esperado Final (incluyendo fondo inicial y movimientos)
      //    Se calcula sumando las ventas en efectivo (si las hubo), el fondo inicial,
      //    los ingresos extra y restando los egresos extra.
      calculoEsperados["Efectivo"] = (calculoEsperados["Efectivo"] || 0) // Suma de ventas en efectivo
                                    + (activeShift.fondoInicial || 0)   // Fondo inicial
                                    + calculoIngresosExtra              // Suma ingresos extra
                                    - calculoEgresosExtra;              // Resta egresos extra
      // 3. Calcular Efectivo Esperado Final
      const fondoInicialNum = activeShift.fondoInicial || 0;
      const ventasEfectivo = calculoEsperados["Efectivo"] || 0; // Ventas en efectivo ANTES de sumar fondo/mov
      const efectivoEsperadoFinal = ventasEfectivo + fondoInicialNum + calculoIngresosExtra - calculoEgresosExtra;
      console.log(`[DEBUG Cierre] Cálculo Efectivo Esperado: ${ventasEfectivo} (Ventas) + ${fondoInicialNum} (Fondo) + ${calculoIngresosExtra} (Ingresos) - ${calculoEgresosExtra} (Egresos) = ${efectivoEsperadoFinal}`); // Log Cálculo Efectivo

      
      // 4. Actualizar Estados
      setExpectedTotals(calculoEsperados);
      setTotalSalesDuringShift(calculoTotalVentas);
      console.log("Totales esperados (final):", calculoEsperados);

      // Inicializar campos contados
      const initialCounted = {};
      Object.keys(calculoEsperados).forEach(medio => { initialCounted[medio] = ''; });
      // Asegurar que Efectivo exista aunque no haya ventas ni movimientos
      if (!initialCounted.hasOwnProperty('Efectivo')) {
          initialCounted['Efectivo'] = '';
          // Si no había ventas en efectivo, el esperado es Fondo + Ingresos - Egresos
          if (!calculoEsperados.hasOwnProperty('Efectivo')) {
              calculoEsperados['Efectivo'] = (activeShift.fondoInicial || 0) + calculoIngresosExtra - calculoEgresosExtra;
              setExpectedTotals(calculoEsperados); // Actualizar estado si se añadió Efectivo
          }
      }
      setCountedTotals(initialCounted);

    } catch (error) {
        console.error("[DEBUG Cierre] Error calculando totales esperados:", error);
        alert(`Error al obtener datos para el cierre: ${error.message}`);
        setShowCloseForm(false);
    }
    finally { setLoadingCloseData(false); }
  };


  // --- Manejar Input de Montos Contados ---
  const handleCountedChange = (medioPago, valor) => {
    setCountedTotals(prev => ({ ...prev, [medioPago]: valor }));
    const contadoNum = parseFloat(valor);
    const esperadoNum = expectedTotals[medioPago] || 0;
    if (!isNaN(contadoNum)) { setDiferencias(prev => ({ ...prev, [medioPago]: contadoNum - esperadoNum })); }
    else { setDiferencias(prev => ({ ...prev, [medioPago]: -esperadoNum })); }
  };

  // --- Confirmar Cierre de Turno (MODIFICADO: Guardar Notas) ---
  const handleConfirmarCierre = async () => {
    if (!canManageShifts) { alert("Sin permiso para cerrar turno."); return; }
    if (!activeShift) { alert("Error: No hay turno activo."); return; }
    const contadoEfectivoNum = parseFloat(countedTotals['Efectivo']);
    if (countedTotals['Efectivo'] === '' || isNaN(contadoEfectivoNum) || contadoEfectivoNum < 0) { alert("Ingresa el monto contado en Efectivo (puede ser 0)."); return; }
    const finalContados = {}; const finalDiferencias = {}; let hayDiferenciaSignificativa = false;
    Object.keys(expectedTotals).forEach(medio => {
        const contadoNum = parseFloat(countedTotals[medio] || '0');
        finalContados[medio] = isNaN(contadoNum) ? 0 : contadoNum;
        finalDiferencias[medio] = finalContados[medio] - (expectedTotals[medio] || 0);
        if (Math.abs(finalDiferencias[medio]) > 0.01) { hayDiferenciaSignificativa = true; }
    });
    if (!finalContados.hasOwnProperty('Efectivo')) {
        const contadoNum = parseFloat(countedTotals['Efectivo'] || '0');
        finalContados['Efectivo'] = isNaN(contadoNum) ? 0 : contadoNum;
        finalDiferencias['Efectivo'] = finalContados['Efectivo'] - (expectedTotals['Efectivo'] || 0);
        if (Math.abs(finalDiferencias['Efectivo']) > 0.01) { hayDiferenciaSignificativa = true; }
    }
    let confirmMsg = "Resumen del Cierre:\n";
    Object.entries(finalDiferencias).forEach(([medio, diff]) => { confirmMsg += `- ${medio}: ${diff === 0 ? 'OK' : (diff > 0 ? `Sobrante $${diff.toFixed(2)}` : `Faltante $${Math.abs(diff).toFixed(2)}`)}\n`; });
    confirmMsg += "\n¿Confirmar cierre de turno?";
    if (hayDiferenciaSignificativa) { if (!window.confirm(`¡ATENCIÓN! Hay diferencias en el arqueo.\n${confirmMsg}`)) return; }
    else { if (!window.confirm(confirmMsg)) return; }

    setIsClosing(true);
    try {
      const turnoRef = doc(db, "turnosCajaAura", activeShift.id);
      // <<< MODIFICADO: Añadir notaCierre >>>
    // Extraer ventas por medio para guardar en Firestore
// Recalcular ventasPorMedio desde ventasAura reales del turno
// Extraer ventas REALES por medio desde Firestore
const ventasPorMedio = {};
const qVentas = query(
  collection(db, "ventasAura"),
  where("fechaHora", ">", activeShift.fechaHoraApertura),
  orderBy("fechaHora")
);
const ventasSnapshot = await getDocs(qVentas);
ventasSnapshot.forEach(doc => {
  const venta = doc.data();
  const medio = venta.medioPago || 'Otro';
  const monto = venta.totalVenta || 0;
  if (!ventasPorMedio[medio]) {
    ventasPorMedio[medio] = 0;
  }
  ventasPorMedio[medio] += monto;
});

      await updateDoc(turnoRef, {
        fechaHoraCierre: serverTimestamp(),
        usuarioCierreId: currentUser.id,
        usuarioCierreNombre: currentUser.nombre,
        totalesEsperados: expectedTotals,
        totalesContados: finalContados,
        diferencias: finalDiferencias,
        notaCierre: closingNotes.trim() || null,
        totalSalesDuringShift: totalSalesDuringShift, // <<< GUARDAR TOTAL VENTAS
        totalIngresosExtra: totalIngresosExtra,     // <<< GUARDAR INGRESOS
        totalEgresosExtra: totalEgresosExtra,       // <<< GUARDAR EGRESOS
        ventasPorMedio: ventasPorMedio,
        estado: "cerrado",
      });
      setActiveShift(null); setShowCloseForm(false); setClosingNotes("");
      alert("Turno cerrado con éxito.");
      cargarHistorialTurnos();
    } catch (error) { console.error("Error al cerrar turno:", error); alert(`Error al cerrar turno: ${error.message}`); }
    finally { setIsClosing(false); }
  };

  // --- Cargar Historial de Turnos ---
  const cargarHistorialTurnos = async () => {
      if (!canViewHistory) return; setLoadingHistory(true);
      try {
          const q = query( collection(db, "turnosCajaAura"), orderBy("fechaHoraApertura", "desc"), limit(50) );
          const snapshot = await getDocs(q);
          const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setShiftHistory(history);
      } catch (error) { console.error("Error cargando historial de turnos:", error); }
      finally { setLoadingHistory(false); }
  };
  useEffect(() => { if (canViewHistory) { cargarHistorialTurnos(); } }, [canViewHistory]);


        {/* Formulario de Cierre (MODIFICADO: Añadir Textarea Notas) */}
        {showCloseForm && activeShift && (
          <div style={estilos.formCerrar}>
            <h2 style={estilos.subtitulo}>Cerrar Turno - Arqueo</h2>
            {loadingCloseData && <p style={estilos.loading}>Calculando totales esperados...</p>}
            {!loadingCloseData && (
              <>
                <p>Turno abierto por <strong>{activeShift.usuarioAperturaNombre}</strong> el {formatTimestamp(activeShift.fechaHoraApertura)}</p>
                <p>Fondo Inicial: ${activeShift.fondoInicial?.toFixed(2)}</p>
                <p style={estilos.totalVentasTurno}> Total Ventas del Turno (Todos los Medios): <strong>${totalSalesDuringShift.toFixed(2)}</strong> </p>
                {(totalIngresosExtra > 0 || totalEgresosExtra > 0) && ( <div style={estilos.resumenMovimientos}> {totalIngresosExtra > 0 && <span>+ Ingresos Extra: ${totalIngresosExtra.toFixed(2)}</span>} {totalEgresosExtra > 0 && <span>- Egresos Extra: ${totalEgresosExtra.toFixed(2)}</span>} </div> )}
                <h3 style={estilos.subSubtitulo}>Totales Esperados vs. Contados</h3>
                <div style={estilos.tablaArqueo}>
                  {/* ... (Tabla de arqueo sin cambios) ... */}
                  <div style={estilos.filaArqueoHeader}> <div>Medio de Pago</div> <div>Esperado ($)</div> <div>Contado ($)</div> <div>Diferencia ($)</div> </div> {(!expectedTotals || !Object.keys(expectedTotals).includes('Efectivo')) && ( <div style={estilos.filaArqueo}> <div>Efectivo</div> <div>{((activeShift.fondoInicial || 0) + totalIngresosExtra - totalEgresosExtra).toFixed(2)}</div> <div> <input type="number" value={countedTotals['Efectivo'] || ''} onChange={(e) => handleCountedChange('Efectivo', e.target.value)} style={estilos.inputArqueo} placeholder="Contado" min="0" step="any" disabled={isClosing} /> </div> <div style={{ color: diferencias['Efectivo'] < 0 ? 'red' : (diferencias['Efectivo'] > 0 ? 'orange' : 'inherit') }}> {(diferencias['Efectivo'] || -((activeShift.fondoInicial || 0) + totalIngresosExtra - totalEgresosExtra)).toFixed(2)} </div> </div> )} {Object.entries(expectedTotals).map(([medio, esperado]) => { if (medio === 'Efectivo' && (!expectedTotals || !Object.keys(expectedTotals).includes('Efectivo'))) return null; const diferencia = diferencias[medio] || -esperado; return ( <div key={medio} style={estilos.filaArqueo}> <div>{medio}</div> <div>{esperado.toFixed(2)}</div> <div> <input type="number" value={countedTotals[medio] || ''} onChange={(e) => handleCountedChange(medio, e.target.value)} style={estilos.inputArqueo} placeholder="Contado" min="0" step="any" disabled={isClosing} /> </div> <div style={{ color: diferencia < 0 ? 'red' : (diferencia > 0 ? 'orange' : 'inherit') }}> {diferencia.toFixed(2)} </div> </div> ); })}
                </div>
                {/* <<< NUEVO: Campo Notas Cierre >>> */}
                <div style={estilos.campoGrupoNotas}>
                    <label style={estilos.labelCampoNotas} htmlFor="closingNotes">Notas Cierre (Opcional):</label>
                    <textarea
                        id="closingNotes"
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                        style={estilos.textareaNotas}
                        placeholder="Justificar diferencias, observaciones..."
                        rows="3"
                        disabled={isClosing}
                    />
                </div>
                {/* <<< FIN NUEVO >>> */}
                <div style={estilos.botonesCierre}>
                    <button onClick={handleConfirmarCierre} style={estilos.botonAccionPrincipal} disabled={isClosing || loadingCloseData} > {isClosing ? "Cerrando..." : "✔️ Confirmar Cierre"} </button>
                    <button onClick={() => {setShowCloseForm(false); setClosingNotes(""); /*<<< Resetear notas >>>*/}} style={estilos.botonCancelar} disabled={isClosing} > ✗ Cancelar Cierre </button>
                </div>
              </>
            )}
          </div>
        )}

  // <<< NUEVO: Función para Eliminar Turno Cerrado >>>
  const handleEliminarTurnoCerrado = async (turnoId, fechaApertura) => {
      if (!canDeleteShifts) {
          alert("No tienes permiso para eliminar turnos.");
          return;
      }
      const fechaFormateada = formatTimestamp(fechaApertura);
      if (!window.confirm(`¿Estás seguro de eliminar el turno cerrado del ${fechaFormateada}? Esta acción no se puede deshacer.`)) {
          return;
      }

      try {
          const turnoRef = doc(db, "turnosCajaAura", turnoId);
          await deleteDoc(turnoRef);
          alert("Turno cerrado eliminado con éxito.");
          cargarHistorialTurnos(); // Recargar el historial para reflejar el cambio
      } catch (error) {
          console.error("Error al eliminar turno cerrado:", error);
          alert(`Error al eliminar el turno: ${error.message}`);
      }
  };

  // --- Renderizado ---
  if (isLoadingClient || loadingActiveShift) { return <div style={estilos.contenedor}><p style={estilos.loading}>Cargando...</p></div>; }

  return (
    <div style={estilos.contenedor}>
      <button onClick={() => router.push('/panel')} style={estilos.botonVolver}> ← Volver </button>
      <h1 style={estilos.titulo}>⏱️ Gestión de Turnos de Caja</h1>

      {/* Sección Principal: Abrir o Cerrar */}
      <div style={estilos.seccionPrincipal}>
        {/* Formulario Abrir */}
        {!activeShift && !showCloseForm && ( <div style={estilos.formAbrir}> <h2 style={estilos.subtitulo}>Abrir Nuevo Turno</h2> <div style={estilos.campoGrupo}> <label style={estilos.labelCampo} htmlFor="fondoInicial">Fondo Inicial ($):</label> <input type="number" id="fondoInicial" value={fondoInicial} onChange={(e) => setFondoInicial(e.target.value)} style={estilos.inputInline} placeholder="Efectivo inicial en caja" min="0" step="any" disabled={!canManageShifts || isOpening} /> </div> <button onClick={handleAbrirTurno} style={estilos.botonAccionPrincipal} disabled={!canManageShifts || isOpening || !fondoInicial} > {isOpening ? "Abriendo..." : "☀️ Abrir Turno"} </button> </div> )}
        {/* Info Turno Activo */}
        {activeShift && !showCloseForm && ( <div style={estilos.turnoActivoInfo}> <h2 style={estilos.subtitulo}>Turno Activo</h2> <p>Abierto por: <strong>{activeShift.usuarioAperturaNombre}</strong></p> <p>Desde: <strong>{formatTimestamp(activeShift.fechaHoraApertura)}</strong></p> <p>Fondo Inicial: <strong>${activeShift.fondoInicial?.toFixed(2)}</strong></p> <button onClick={iniciarCierreTurno} style={estilos.botonAccionPrincipalRojo} disabled={!canManageShifts || loadingCloseData} > {loadingCloseData ? "Calculando..." : "🌙 Iniciar Cierre de Turno"} </button> </div> )}
        {/* Formulario de Cierre */}
        {showCloseForm && activeShift && ( <div style={estilos.formCerrar}> <h2 style={estilos.subtitulo}>Cerrar Turno - Arqueo</h2> {loadingCloseData && <p style={estilos.loading}>Calculando totales esperados...</p>} {!loadingCloseData && ( <> <p>Turno abierto por <strong>{activeShift.usuarioAperturaNombre}</strong> el {formatTimestamp(activeShift.fechaHoraApertura)}</p> <p>Fondo Inicial: ${activeShift.fondoInicial?.toFixed(2)}</p> <p style={estilos.totalVentasTurno}> Total Ventas del Turno (Todos los Medios): <strong>${totalSalesDuringShift.toFixed(2)}</strong> </p> {(totalIngresosExtra > 0 || totalEgresosExtra > 0) && ( <div style={estilos.resumenMovimientos}> {totalIngresosExtra > 0 && <span>+ Ingresos Extra: ${totalIngresosExtra.toFixed(2)}</span>} {totalEgresosExtra > 0 && <span>- Egresos Extra: ${totalEgresosExtra.toFixed(2)}</span>} </div> )} <h3 style={estilos.subSubtitulo}>Totales Esperados vs. Contados</h3> <div style={estilos.tablaArqueo}> <div style={estilos.filaArqueoHeader}> <div>Medio de Pago</div> <div>Esperado ($)</div> <div>Contado ($)</div> <div>Diferencia ($)</div> </div> {(!expectedTotals || !Object.keys(expectedTotals).includes('Efectivo')) && ( <div style={estilos.filaArqueo}> <div>Efectivo</div> <div>{(activeShift.fondoInicial || 0).toFixed(2)}</div> <div> <input type="number" value={countedTotals['Efectivo'] || ''} onChange={(e) => handleCountedChange('Efectivo', e.target.value)} style={estilos.inputArqueo} placeholder="Contado" min="0" step="any" disabled={isClosing} /> </div> <div style={{ color: diferencias['Efectivo'] < 0 ? 'red' : (diferencias['Efectivo'] > 0 ? 'orange' : 'inherit') }}> {(diferencias['Efectivo'] || -(activeShift.fondoInicial || 0)).toFixed(2)} </div> </div> )} {Object.entries(expectedTotals).map(([medio, esperado]) => { if (medio === 'Efectivo' && (!expectedTotals || !Object.keys(expectedTotals).includes('Efectivo'))) return null; const diferencia = diferencias[medio] || -esperado; return ( <div key={medio} style={estilos.filaArqueo}> <div>{medio}</div> <div>{esperado.toFixed(2)}</div> <div> <input type="number" value={countedTotals[medio] || ''} onChange={(e) => handleCountedChange(medio, e.target.value)} style={estilos.inputArqueo} placeholder="Contado" min="0" step="any" disabled={isClosing} /> </div> <div style={{ color: diferencia < 0 ? 'red' : (diferencia > 0 ? 'orange' : 'inherit') }}> {diferencia.toFixed(2)} </div> </div> ); })} </div> <div style={estilos.botonesCierre}> <button onClick={handleConfirmarCierre} style={estilos.botonAccionPrincipal} disabled={isClosing || loadingCloseData} > {isClosing ? "Cerrando..." : "✔️ Confirmar Cierre"} </button> <button onClick={() => setShowCloseForm(false)} style={estilos.botonCancelar} disabled={isClosing} > ✗ Cancelar Cierre </button> </div> </> )} </div> )}
      </div>


      {/* Historial de Turnos (CORREGIDO: Sin duplicados y con detalle diferencia efectivo) */}
      {canViewHistory && (
          <div style={estilos.seccionHistorial}>
              <h2 style={estilos.subtitulo}>Historial de Turnos Cerrados</h2>
              <button onClick={cargarHistorialTurnos} style={estilos.botonRecargar} disabled={loadingHistory}> {loadingHistory ? 'Cargando...' : 'Recargar Historial'} </button>
              {loadingHistory && <p style={estilos.loading}>Cargando historial...</p>}
              {!loadingHistory && shiftHistory.length === 0 && <p>No hay turnos cerrados registrados.</p>}
              {!loadingHistory && shiftHistory.map(turno => {
                  // Calcular la diferencia de efectivo para mostrarla en el resumen
                  const diffEfectivo = turno.diferencias?.Efectivo ?? 0; // Usar ?? 0 por si no existe
                  let statusText = '✅ OK';
                  let statusColor = 'inherit'; // Color por defecto o verde implícito

                  if (diffEfectivo > 0.01) { // Sobrante (mayor a 1 centavo)
                      statusText = `⚠️ Sobrante $${diffEfectivo.toFixed(2)}`;
                      statusColor = 'orange';
                  } else if (diffEfectivo < -0.01) { // Faltante (menor a -1 centavo)
                      statusText = `❌ Faltante $${Math.abs(diffEfectivo).toFixed(2)}`;
                      statusColor = '#f44336'; // Rojo
                  }
                  // Si es 0 o muy cercano, se queda con '✅ OK' y 'inherit'

                  return (
                    <details key={turno.id} style={estilos.itemHistorial}>
                        <summary style={estilos.summaryHistorial}>
                            <div style={estilos.summaryContenido}>
                                <span><strong>{formatTimestamp(turno.fechaHoraApertura)}</strong> - <strong>{formatTimestamp(turno.fechaHoraCierre)}</strong></span>
                                <span>Usuario: {turno.usuarioAperturaNombre}</span>
                                <span style={{ color: statusColor, fontWeight: 'bold' }}>{statusText}</span>
                            </div>
                            {canDeleteShifts && ( <button onClick={(e) => { e.preventDefault(); handleEliminarTurnoCerrado(turno.id, turno.fechaHoraApertura); }} style={estilos.botonEliminarHistorial} title="Eliminar este turno cerrado">🗑️</button> )}
                        </summary>
                        {/* <<< MODIFICADO: Detalles del turno >>> */}
                        <div style={estilos.detallesHistorial}>
                            <p><strong>Abierto por:</strong> {turno.usuarioAperturaNombre} ({formatTimestamp(turno.fechaHoraApertura)})</p>
                            <p><strong>Cerrado por:</strong> {turno.usuarioCierreNombre || '?'} ({formatTimestamp(turno.fechaHoraCierre)})</p>
                            <hr style={estilos.hrSeparador} />
                            {/* Resumen Financiero */}
                            <div style={estilos.detalleFinanciero}>
                                <span>Total Ventas Turno:</span>
                                <span style={estilos.detalleFinancieroMonto}>${(turno.totalSalesDuringShift || 0).toFixed(2)}</span>
                            </div>
                            <div style={estilos.detalleFinanciero}>
    <span> ↳ Ventas Efectivo:</span>
    <span style={estilos.detalleFinancieroMonto}>
        ${turno.ventasPorMedio?.Efectivo?.toFixed(2) || "0.00"}
    </span>
</div>
<div style={estilos.detalleFinanciero}>
    <span> ↳ Ventas Electrónico:</span>
    <span style={estilos.detalleFinancieroMonto}>
  ${(
    Object.entries(turno.ventasPorMedio || {})
      .filter(([medio]) => medio !== "Efectivo")
      .reduce((acc, [_, val]) => acc + val, 0)
  ).toFixed(2)}
</span>
</div>
                            <hr style={estilos.hrSeparador} />
                            {/* Movimientos y Fondo */}
                            <div style={estilos.detalleFinanciero}>
                                <span>Fondo Inicial:</span>
                                <span style={estilos.detalleFinancieroMonto}> ${turno.fondoInicial?.toFixed(2)}</span>
                            </div>
                            {(turno.totalIngresosExtra > 0) && (
                                <div style={{...estilos.detalleFinanciero, color: '#66bb6a'}}> {/* Verde */}
                                    <span>(+) Ingresos Extra:</span>
                                    <span style={estilos.detalleFinancieroMonto}> ${(turno.totalIngresosExtra || 0).toFixed(2)}</span>
                                </div>
                            )}
                            {(turno.totalEgresosExtra > 0) && (
                                <div style={{...estilos.detalleFinanciero, color: '#ef5350'}}> {/* Rojo */}
                                    <span>(-) Egresos Extra:</span>
                                    <span style={estilos.detalleFinancieroMonto}> ${(turno.totalEgresosExtra || 0).toFixed(2)}</span>
                                </div>
                            )}
                            {/* Nota de Cierre */}
                            {turno.notaCierre && (
                                <p style={estilos.notaCierreHistorial}><strong>Nota Cierre:</strong> {turno.notaCierre}</p>
                            )}
                            <hr style={estilos.hrSeparador} />
                            {/* Tabla de Arqueo */}
                            <h4 style={estilos.subSubtituloDetalle}>Arqueo Final</h4>
                            <div style={estilos.tablaArqueo}>
                                <div style={estilos.filaArqueoHeader}> <div>Medio Pago</div> <div>Esperado ($)</div> <div>Contado ($)</div> <div>Diferencia ($)</div> </div>
                                {Object.entries(turno.totalesEsperados || {}).map(([medio, esperado]) => {
                                    const contado = turno.totalesContados?.[medio] || 0;
                                    const diferencia = turno.diferencias?.[medio] || 0;
                                    return (
                                        <div key={medio} style={estilos.filaArqueo}>
                                            <div>{medio}</div>
                                            <div>{esperado.toFixed(2)}</div>
                                            <div>{contado.toFixed(2)}</div>
                                            <div style={{ color: diferencia < -0.01 ? 'red' : (diferencia > 0.01 ? 'orange' : 'inherit') }}>{diferencia.toFixed(2)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {/* <<< FIN MODIFICADO >>> */}
                    </details>
                );
            })}
        </div>
    )}

</div> // Fin contenedor principal
  );
}
// --- Estilos (Añadidos estilos para botón eliminar historial) ---
const estilos = {
  contenedor: { minHeight: "100vh", background: "#0A1034", color: "#EFE4CF", padding: "2rem 1.5rem", fontFamily: "'Space Grotesk', sans-serif", },
  botonVolver: { position: 'absolute', top: '1rem', left: '1rem', background: "#806C4F", color: "#EFE4CF", padding: "0.5rem 1rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", zIndex: 10, },
  titulo: { fontSize: "2rem", color: "#D3C6A3", marginBottom: "2rem", textAlign: "center", borderBottom: "2px solid #806C4F", paddingBottom: "0.5rem", },
  subtitulo: { marginTop: 0, marginBottom: "1rem", color: "#D3C6A3", fontSize: "1.5rem", },
  subSubtitulo: { marginTop: '1.5rem', marginBottom: "0.8rem", color: "#EFE4CF", fontSize: "1.1rem", borderBottom: '1px dashed #4a5568', paddingBottom: '0.3rem'},
  loading: { color: 'white', textAlign: 'center', paddingTop: '1rem', fontSize: '1rem' },
  seccionPrincipal: { background: "#1C2340", padding: "1.5rem", borderRadius: "12px", marginBottom: "2rem", maxWidth: "600px", margin: "0 auto 2rem auto", boxShadow: "0 4px 10px rgba(0,0,0,0.3)", },
  formAbrir: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  turnoActivoInfo: { textAlign: 'center' },
  formCerrar: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  campoGrupo: { display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' },
  labelCampo: { fontSize: '0.9rem', color: '#D3C6A3', minWidth: '90px', textAlign: 'right' },
  inputInline: { padding: "0.6rem", fontSize: "1rem", borderRadius: "6px", border: "1px solid #4a5568", backgroundColor: "#EFE4CF", color: "#2c1b0f", flex: 1 },
  botonAccionPrincipal: { background: "#4CAF50", color: "white", padding: "0.8rem 1.5rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1.1rem", '&:disabled': { backgroundColor: "#555", cursor: 'not-allowed', opacity: 0.7 } },
  botonAccionPrincipalRojo: { background: "#e57373", color: "white", padding: "0.8rem 1.5rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1.1rem", '&:disabled': { backgroundColor: "#555", cursor: 'not-allowed', opacity: 0.7 } },
  botonCancelar: { background: "#666", color: "#EFE4CF", padding: "0.7rem 1rem", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1rem", },
  botonesCierre: { display: 'flex', gap: '1rem', marginTop: '1.5rem' },
  tablaArqueo: { display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid #4a5568', borderRadius: '8px', padding: '0.8rem', background: 'rgba(10, 16, 52, 0.3)' },
  filaArqueoHeader: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', fontWeight: 'bold', paddingBottom: '0.5rem', borderBottom: '1px solid #806C4F', marginBottom: '0.5rem', textAlign: 'right' },
  filaArqueo: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', alignItems: 'center', textAlign: 'right' },
  inputArqueo: { padding: "0.4rem", fontSize: "0.9rem", borderRadius: "6px", border: "1px solid #4a5568", backgroundColor: "#EFE4CF", color: "#2c1b0f", width: '100%', textAlign: 'right' },
  seccionHistorial: { marginTop: '3rem', maxWidth: '900px', margin: '3rem auto 0 auto' },
  botonRecargar: { background: "#806C4F", color: "#EFE4CF", padding: "0.5rem 1rem", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", marginBottom: '1rem', '&:disabled': { opacity: 0.6 } },
  itemHistorial: { marginBottom: "1rem", background: "#1C2340", padding: "0", borderRadius: "8px", boxShadow: "0 2px 5px rgba(0,0,0,0.2)", fontSize: '0.9rem', overflow: 'hidden' },
  summaryHistorial: { cursor: 'pointer', color: '#D3C6A3', fontWeight: 'bold', padding: '0.8rem 1.2rem', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }, // Añadido alignItems
  summaryContenido: { display: 'flex', justifyContent: 'space-between', flexGrow: 1, gap: '1rem', flexWrap: 'wrap' }, // Para que el contenido se alinee y el botón quede a la derecha
  detallesHistorial: { padding: '0.5rem 1.2rem 1.2rem 1.2rem', borderTop: '1px solid #4a5568' },
  totalVentasTurno: { fontSize: '1.1rem', fontWeight: 'bold', color: '#D3C6A3', marginTop: '0.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px dashed #4a5568', },
  resumenMovimientos: { fontSize: '0.9rem', color: '#bdc1c6', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px dashed #4a5568', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', },
  // <<< NUEVO: Estilo Botón Eliminar Historial >>>
  botonEliminarHistorial: {
      background: 'none',
      border: 'none',
      color: '#f44336', // Rojo
      cursor: 'pointer',
      fontSize: '1.2rem', // Un poco más grande
      padding: '0 0.5rem', // Padding para área de click
      marginLeft: '1rem', // Espacio del contenido
      flexShrink: 0, // Evitar que se achique
  },
  // <<< NUEVO: Estilos Notas Cierre >>>
  campoGrupoNotas: {
    display: 'flex',
    flexDirection: 'column', // Label arriba
    gap: '0.5rem',
    marginTop: '1rem',
},
labelCampoNotas: {
    fontSize: '0.9rem',
    color: '#D3C6A3',
    textAlign: 'left', // Alinear a la izquierda
},
textareaNotas: {
    padding: "0.7rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "1px solid #4a5568",
    backgroundColor: "#EFE4CF",
    color: "#2c1b0f",
    width: '100%',
    minHeight: '60px', // Altura mínima
    resize: 'vertical', // Permitir redimensionar verticalmente
    boxSizing: 'border-box',
},
notaCierreHistorial: {
    marginTop: '1rem',
    paddingTop: '0.8rem',
    borderTop: '1px dashed #4a5568',
    fontSize: '0.9em',
    color: '#bdc1c6',
    whiteSpace: 'pre-wrap', // Conservar saltos de línea
},
// <<< NUEVO: Estilos para Detalles Financieros en Historial >>>
hrSeparador: {
  border: 'none',
  borderTop: '1px dashed #4a5568',
  margin: '1rem 0',
},
detalleFinanciero: {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.95em',
  marginBottom: '0.4rem',
  color: '#bdc1c6', // Gris claro por defecto
},
detalleFinancieroMonto: {
  fontWeight: 'bold',
  color: '#EFE4CF', // Color principal para montos
},
subSubtituloDetalle: { // Para "Arqueo Final"
  marginTop: '1rem',
  marginBottom: "0.8rem",
  color: "#D3C6A3",
  fontSize: "1.1rem",
  fontWeight: 'bold',
},
notaCierreHistorial: { // Ajuste para consistencia
  marginTop: '0.5rem', // Menos espacio si viene después de otros detalles
  paddingTop: '0.5rem',
  borderTop: '1px dashed #4a5568',
  fontSize: '0.9em',
  color: '#bdc1c6',
  whiteSpace: 'pre-wrap',
},
};
