// pages/turnos-caja.js
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { db } from "../firebase/firebaseConfig"; // Ajusta la ruta si es necesario
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

  // Estados para Historial
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Estados para permisos y carga cliente
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  // <<< Usaremos 'turnosCaja' como clave de permiso. ¡Añadir en Seccion6! >>>
  const [turnosPermissionLevel, setTurnosPermissionLevel] = useState('no');

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
  // 'editar' o 'total' para abrir/cerrar, 'ver' para historial
  const canManageShifts = !isLoadingClient && !!currentUser && (turnosPermissionLevel === 'total' || turnosPermissionLevel === 'editar');
  const canViewHistory = !isLoadingClient && !!currentUser && turnosPermissionLevel !== 'no';

  // --- Abrir Turno ---
  const handleAbrirTurno = async () => {
    if (!canManageShifts) { alert("Sin permiso para abrir turno."); return; }
    if (activeShift) { alert("Ya hay un turno activo para ti."); return; }

    const fondoNum = parseFloat(fondoInicial);
    if (isNaN(fondoNum) || fondoNum < 0) {
      alert("Ingresa un fondo inicial válido (número mayor o igual a 0).");
      return;
    }
    if (!window.confirm(`¿Abrir turno con un fondo inicial de $${fondoNum.toFixed(2)}?`)) return;

    setIsOpening(true);
    try {
      const nuevoTurnoData = {
        fechaHoraApertura: serverTimestamp(),
        usuarioAperturaId: currentUser.id,
        usuarioAperturaNombre: currentUser.nombre,
        fondoInicial: fondoNum,
        estado: "activo",
        // Campos que se llenarán al cerrar
        fechaHoraCierre: null,
        usuarioCierreId: null,
        usuarioCierreNombre: null,
        totalesEsperados: {},
        totalesContados: {},
        diferencias: {},
      };
      const docRef = await addDoc(collection(db, "turnosCajaAura"), nuevoTurnoData);
      // Actualizar estado local inmediatamente (fechaHora será null hasta leer de nuevo)
      setActiveShift({ id: docRef.id, ...nuevoTurnoData, fechaHoraApertura: Timestamp.now() });
      setFondoInicial("");
      alert("Turno abierto con éxito.");
    } catch (error) {
      console.error("Error al abrir turno:", error);
      alert(`Error al abrir turno: ${error.message}`);
    } finally {
      setIsOpening(false);
    }
  };

  // --- Iniciar Cierre de Turno (Calcular Esperados) ---
  const iniciarCierreTurno = async () => {
    if (!canManageShifts) { alert("Sin permiso para cerrar turno."); return; }
    if (!activeShift || !activeShift.fechaHoraApertura) {
      alert("Error: No se encontró un turno activo válido para cerrar.");
      return;
    }

    setLoadingCloseData(true);
    setShowCloseForm(true); // Mostrar formulario de cierre
    setExpectedTotals({}); // Resetear
    setCountedTotals({});
    setDiferencias({});

    try {
      // Obtener ventas realizadas DESDE que se abrió el turno
      const qVentas = query(
        collection(db, "ventasAura"),
        where("fechaHora", ">", activeShift.fechaHoraApertura),
        // Opcional: Filtrar también por usuario si los turnos son estrictamente personales
        // where("usuarioId", "==", currentUser.id),
        orderBy("fechaHora") // Ordenar no es estrictamente necesario para sumar
      );
      const ventasSnapshot = await getDocs(qVentas);

      // Calcular totales esperados por medio de pago
      const calculoEsperados = {};
      ventasSnapshot.forEach(doc => {
        const venta = doc.data();
        const medioPago = venta.medioPago || "Desconocido";
        calculoEsperados[medioPago] = (calculoEsperados[medioPago] || 0) + (venta.totalVenta || 0);
      });

      // Añadir el fondo inicial al efectivo esperado
      calculoEsperados["Efectivo"] = (calculoEsperados["Efectivo"] || 0) + (activeShift.fondoInicial || 0);

      setExpectedTotals(calculoEsperados);
      console.log("Totales esperados calculados:", calculoEsperados);

      // Inicializar los campos contados (para que existan en el estado)
      const initialCounted = {};
      Object.keys(calculoEsperados).forEach(medio => { initialCounted[medio] = ''; });
      // Asegurar que Efectivo exista aunque no haya ventas en efectivo
      if (!initialCounted.hasOwnProperty('Efectivo')) {
          initialCounted['Efectivo'] = '';
      }
      setCountedTotals(initialCounted);


    } catch (error) {
      console.error("Error calculando totales esperados:", error);
      alert(`Error al obtener datos para el cierre: ${error.message}`);
      setShowCloseForm(false); // Ocultar form si hay error
    } finally {
      setLoadingCloseData(false);
    }
  };

  // --- Manejar Input de Montos Contados ---
  const handleCountedChange = (medioPago, valor) => {
    setCountedTotals(prev => ({
      ...prev,
      [medioPago]: valor
    }));

    // Calcular diferencia al cambiar
    const contadoNum = parseFloat(valor);
    const esperadoNum = expectedTotals[medioPago] || 0;
    if (!isNaN(contadoNum)) {
        setDiferencias(prev => ({
            ...prev,
            [medioPago]: contadoNum - esperadoNum
        }));
    } else {
         setDiferencias(prev => ({
            ...prev,
            [medioPago]: -esperadoNum // Si borra el input, la diferencia es lo esperado negativo
        }));
    }
  };


  // --- Confirmar Cierre de Turno ---
  const handleConfirmarCierre = async () => {
    if (!canManageShifts) { alert("Sin permiso para cerrar turno."); return; }
    if (!activeShift) { alert("Error: No hay turno activo."); return; }

    // Validar que se hayan ingresado los montos contados (al menos efectivo)
    const contadoEfectivoNum = parseFloat(countedTotals['Efectivo']);
    if (countedTotals['Efectivo'] === '' || isNaN(contadoEfectivoNum) || contadoEfectivoNum < 0) {
        alert("Ingresa el monto contado en Efectivo (puede ser 0).");
        return;
    }
    // Podrías añadir validación para otros métodos si es necesario

    // Recalcular diferencias finales por si acaso
    const finalContados = {};
    const finalDiferencias = {};
    let hayDiferenciaSignificativa = false;
    Object.keys(expectedTotals).forEach(medio => {
        const contadoNum = parseFloat(countedTotals[medio] || '0'); // Asumir 0 si está vacío
        finalContados[medio] = isNaN(contadoNum) ? 0 : contadoNum;
        finalDiferencias[medio] = finalContados[medio] - (expectedTotals[medio] || 0);
        if (Math.abs(finalDiferencias[medio]) > 0.01) { // Considerar diferencia si es mayor a 1 centavo
            hayDiferenciaSignificativa = true;
        }
    });
     // Asegurar que Efectivo esté si no estaba en expected
     if (!finalContados.hasOwnProperty('Efectivo')) {
        const contadoNum = parseFloat(countedTotals['Efectivo'] || '0');
        finalContados['Efectivo'] = isNaN(contadoNum) ? 0 : contadoNum;
        finalDiferencias['Efectivo'] = finalContados['Efectivo'] - (activeShift.fondoInicial || 0);
         if (Math.abs(finalDiferencias['Efectivo']) > 0.01) {
             hayDiferenciaSignificativa = true;
         }
     }


    let confirmMsg = "Resumen del Cierre:\n";
    Object.entries(finalDiferencias).forEach(([medio, diff]) => {
        confirmMsg += `- ${medio}: ${diff === 0 ? 'OK' : (diff > 0 ? `Sobrante $${diff.toFixed(2)}` : `Faltante $${Math.abs(diff).toFixed(2)}`)}\n`;
    });
    confirmMsg += "\n¿Confirmar cierre de turno?";

    if (hayDiferenciaSignificativa) {
        if (!window.confirm(`¡ATENCIÓN! Hay diferencias en el arqueo.\n${confirmMsg}`)) return;
    } else {
         if (!window.confirm(confirmMsg)) return;
    }


    setIsClosing(true);
    try {
      const turnoRef = doc(db, "turnosCajaAura", activeShift.id);
      await updateDoc(turnoRef, {
        fechaHoraCierre: serverTimestamp(),
        usuarioCierreId: currentUser.id,
        usuarioCierreNombre: currentUser.nombre,
        totalesEsperados: expectedTotals,
        totalesContados: finalContados,
        diferencias: finalDiferencias,
        estado: "cerrado",
      });

      setActiveShift(null); // Ya no hay turno activo
      setShowCloseForm(false); // Ocultar formulario
      alert("Turno cerrado con éxito.");
      cargarHistorialTurnos(); // Recargar historial

    } catch (error) {
      console.error("Error al cerrar turno:", error);
      alert(`Error al cerrar turno: ${error.message}`);
    } finally {
      setIsClosing(false);
    }
  };

  // --- Cargar Historial de Turnos ---
  const cargarHistorialTurnos = async () => {
      if (!canViewHistory) return; // No cargar si no puede ver
      setLoadingHistory(true);
      try {
          const q = query(
              collection(db, "turnosCajaAura"),
              orderBy("fechaHoraApertura", "desc"), // Más recientes primero
              limit(50) // Limitar historial inicial
          );
          const snapshot = await getDocs(q);
          const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setShiftHistory(history);
      } catch (error) {
          console.error("Error cargando historial de turnos:", error);
      } finally {
          setLoadingHistory(false);
      }
  };

  // Cargar historial la primera vez que se pueda ver
  useEffect(() => {
      if (canViewHistory) {
          cargarHistorialTurnos();
      }
  }, [canViewHistory]); // Depende de si puede ver


  // --- Renderizado ---
  if (isLoadingClient || loadingActiveShift) {
    return <div style={estilos.contenedor}><p style={estilos.loading}>Cargando...</p></div>;
  }

  return (
    <div style={estilos.contenedor}>
      <button onClick={() => router.push('/panel')} style={estilos.botonVolver}> ← Volver </button>
      <h1 style={estilos.titulo}>⏱️ Gestión de Turnos de Caja</h1>

      {/* Sección Principal: Abrir o Cerrar */}
      <div style={estilos.seccionPrincipal}>
        {!activeShift && !showCloseForm && (
          // Formulario para Abrir Turno
          <div style={estilos.formAbrir}>
            <h2 style={estilos.subtitulo}>Abrir Nuevo Turno</h2>
            <div style={estilos.campoGrupo}>
              <label style={estilos.labelCampo} htmlFor="fondoInicial">Fondo Inicial ($):</label>
              <input
                type="number"
                id="fondoInicial"
                value={fondoInicial}
                onChange={(e) => setFondoInicial(e.target.value)}
                style={estilos.inputInline}
                placeholder="Efectivo inicial en caja"
                min="0"
                step="any"
                disabled={!canManageShifts || isOpening}
              />
            </div>
            <button
              onClick={handleAbrirTurno}
              style={estilos.botonAccionPrincipal}
              disabled={!canManageShifts || isOpening || !fondoInicial}
            >
              {isOpening ? "Abriendo..." : "☀️ Abrir Turno"}
            </button>
          </div>
        )}

        {activeShift && !showCloseForm && (
          // Mostrar info del turno activo y botón para cerrar
          <div style={estilos.turnoActivoInfo}>
            <h2 style={estilos.subtitulo}>Turno Activo</h2>
            <p>Abierto por: <strong>{activeShift.usuarioAperturaNombre}</strong></p>
            <p>Desde: <strong>{formatTimestamp(activeShift.fechaHoraApertura)}</strong></p>
            <p>Fondo Inicial: <strong>${activeShift.fondoInicial?.toFixed(2)}</strong></p>
            <button
              onClick={iniciarCierreTurno}
              style={estilos.botonAccionPrincipalRojo}
              disabled={!canManageShifts || loadingCloseData}
            >
              {loadingCloseData ? "Calculando..." : "🌙 Iniciar Cierre de Turno"}
            </button>
          </div>
        )}

        {/* Formulario de Cierre de Turno */}
        {showCloseForm && activeShift && (
          <div style={estilos.formCerrar}>
            <h2 style={estilos.subtitulo}>Cerrar Turno - Arqueo</h2>
            {loadingCloseData && <p style={estilos.loading}>Calculando totales esperados...</p>}
            {!loadingCloseData && (
              <>
                <p>Turno abierto por <strong>{activeShift.usuarioAperturaNombre}</strong> el {formatTimestamp(activeShift.fechaHoraApertura)}</p>
                <p>Fondo Inicial: ${activeShift.fondoInicial?.toFixed(2)}</p>
                <h3 style={estilos.subSubtitulo}>Totales Esperados vs. Contados</h3>
                <div style={estilos.tablaArqueo}>
                  <div style={estilos.filaArqueoHeader}>
                    <div>Medio de Pago</div>
                    <div>Esperado ($)</div>
                    <div>Contado ($)</div>
                    <div>Diferencia ($)</div>
                  </div>
                  {/* Asegurar que Efectivo siempre aparezca */}
                  {(!expectedTotals || !Object.keys(expectedTotals).includes('Efectivo')) && (
                      <div style={estilos.filaArqueo}>
                          <div>Efectivo</div>
                          <div>{(activeShift.fondoInicial || 0).toFixed(2)}</div>
                          <div>
                              <input
                                  type="number"
                                  value={countedTotals['Efectivo'] || ''}
                                  onChange={(e) => handleCountedChange('Efectivo', e.target.value)}
                                  style={estilos.inputArqueo}
                                  placeholder="Contado"
                                  min="0" step="any"
                                  disabled={isClosing}
                              />
                          </div>
                          <div style={{ color: diferencias['Efectivo'] < 0 ? 'red' : (diferencias['Efectivo'] > 0 ? 'orange' : 'inherit') }}>
                              {(diferencias['Efectivo'] || -(activeShift.fondoInicial || 0)).toFixed(2)}
                          </div>
                      </div>
                  )}
                  {/* Mapear otros medios de pago */}
                  {Object.entries(expectedTotals)
                    // .sort(([medioA], [medioB]) => medioA.localeCompare(medioB)) // Ordenar opcional
                    .map(([medio, esperado]) => {
                      // Si es efectivo, ya lo mostramos arriba si no había ventas
                      if (medio === 'Efectivo' && !Object.keys(expectedTotals).includes('Efectivo')) return null;

                      const diferencia = diferencias[medio] || -esperado; // Diferencia inicial si no se contó
                      return (
                          <div key={medio} style={estilos.filaArqueo}>
                              <div>{medio}</div>
                              <div>{esperado.toFixed(2)}</div>
                              <div>
                                  <input
                                      type="number"
                                      value={countedTotals[medio] || ''}
                                      onChange={(e) => handleCountedChange(medio, e.target.value)}
                                      style={estilos.inputArqueo}
                                      placeholder="Contado"
                                      min="0" step="any"
                                      disabled={isClosing}
                                  />
                              </div>
                              <div style={{ color: diferencia < 0 ? 'red' : (diferencia > 0 ? 'orange' : 'inherit') }}>
                                  {diferencia.toFixed(2)}
                              </div>
                          </div>
                      );
                  })}
                </div>
                <div style={estilos.botonesCierre}>
                    <button
                        onClick={handleConfirmarCierre}
                        style={estilos.botonAccionPrincipal}
                        disabled={isClosing || loadingCloseData}
                    >
                        {isClosing ? "Cerrando..." : "✔️ Confirmar Cierre"}
                    </button>
                    <button
                        onClick={() => setShowCloseForm(false)}
                        style={estilos.botonCancelar}
                        disabled={isClosing}
                    >
                        ✗ Cancelar Cierre
                    </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Historial de Turnos */}
      {canViewHistory && (
          <div style={estilos.seccionHistorial}>
              <h2 style={estilos.subtitulo}>Historial de Turnos Cerrados</h2>
              <button onClick={cargarHistorialTurnos} style={estilos.botonRecargar} disabled={loadingHistory}>
                  {loadingHistory ? 'Cargando...' : 'Recargar Historial'}
              </button>
              {loadingHistory && <p style={estilos.loading}>Cargando historial...</p>}
              {!loadingHistory && shiftHistory.length === 0 && <p>No hay turnos cerrados registrados.</p>}
              {!loadingHistory && shiftHistory.map(turno => (
                  <details key={turno.id} style={estilos.itemHistorial}>
                      <summary style={estilos.summaryHistorial}>
                          <span><strong>{formatTimestamp(turno.fechaHoraApertura)}</strong> - <strong>{formatTimestamp(turno.fechaHoraCierre)}</strong></span>
                          <span>Usuario: {turno.usuarioAperturaNombre}</span>
                          <span style={{ color: Object.values(turno.diferencias || {}).some(d => Math.abs(d) > 0.01) ? 'orange' : 'inherit' }}>
                              {Object.values(turno.diferencias || {}).some(d => Math.abs(d) > 0.01) ? '⚠️ Con Diferencias' : '✅ OK'}
                          </span>
                      </summary>
                      <div style={estilos.detallesHistorial}>
                          <p><strong>Abierto por:</strong> {turno.usuarioAperturaNombre} ({formatTimestamp(turno.fechaHoraApertura)})</p>
                          <p><strong>Cerrado por:</strong> {turno.usuarioCierreNombre || '?'} ({formatTimestamp(turno.fechaHoraCierre)})</p>
                          <p><strong>Fondo Inicial:</strong> ${turno.fondoInicial?.toFixed(2)}</p>
                          <div style={estilos.tablaArqueo}>
                              <div style={estilos.filaArqueoHeader}>
                                  <div>Medio Pago</div>
                                  <div>Esperado ($)</div>
                                  <div>Contado ($)</div>
                                  <div>Diferencia ($)</div>
                              </div>
                              {Object.entries(turno.totalesEsperados || {}).map(([medio, esperado]) => {
                                  const contado = turno.totalesContados?.[medio] || 0;
                                  const diferencia = turno.diferencias?.[medio] || 0;
                                  return (
                                      <div key={medio} style={estilos.filaArqueo}>
                                          <div>{medio}</div>
                                          <div>{esperado.toFixed(2)}</div>
                                          <div>{contado.toFixed(2)}</div>
                                          <div style={{ color: diferencia < 0 ? 'red' : (diferencia > 0 ? 'orange' : 'inherit') }}>
                                              {diferencia.toFixed(2)}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </details>
              ))}
          </div>
      )}

    </div>
  );
}

// --- Estilos ---
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
  itemHistorial: { marginBottom: "1rem", background: "#1C2340", padding: "0", borderRadius: "8px", boxShadow: "0 2px 5px rgba(0,0,0,0.2)", fontSize: '0.9rem', overflow: 'hidden' }, // overflow hidden para bordes
  summaryHistorial: { cursor: 'pointer', color: '#D3C6A3', fontWeight: 'bold', padding: '0.8rem 1.2rem', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', gap: '1rem' },
  detallesHistorial: { padding: '0.5rem 1.2rem 1.2rem 1.2rem', borderTop: '1px solid #4a5568' },
};
