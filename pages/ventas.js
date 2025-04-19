// pages/ventas.js
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp
} from "firebase/firestore";
import Papa from 'papaparse'; // <<< Añadido para CSV

// Helper para obtener fecha de hoy en formato YYYY-MM-DD
const getTodayDateString = () => { /* ... (sin cambios) ... */ const today = new Date(); const yyyy = today.getFullYear(); const mm = String(today.getMonth() + 1).padStart(2, '0'); const dd = String(today.getDate()).padStart(2, '0'); return `${yyyy}-${mm}-${dd}`; };

export default function Ventas() {
  const router = useRouter();

  // --- Estados ---
  const [ventasHistorial, setVentasHistorial] = useState([]);
  const [loadingVentas, setLoadingVentas] = useState(true);
  const [fechaDesde, setFechaDesde] = useState(getTodayDateString());
  const [fechaHasta, setFechaHasta] = useState(getTodayDateString());
  const [totalFiltrado, setTotalFiltrado] = useState(0);
  // <<< NUEVO: Estados para filtros adicionales >>>
  const [usuariosLista, setUsuariosLista] = useState([]); // Para el dropdown de usuarios
  const [selectedUserFilter, setSelectedUserFilter] = useState(""); // ID del usuario a filtrar
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState(""); // Medio de pago a filtrar
  
  const [filtroInvitacion, setFiltroInvitacion] = useState("");
  const [filtroConDescuento, setFiltroConDescuento] = useState(false);
  const [filtroAnuladas, setFiltroAnuladas] = useState(false);
  
  // Estados para permisos y carga cliente
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [ventasPermissionLevel, setVentasPermissionLevel] = useState('no');

  // --- Carga Inicial: Autorización, Permisos, Lista de Usuarios ---
  useEffect(() => {
    const checkAuthAndLoadUsers = async () => {
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
            if (!permisosSnapshot.empty) { const d = permisosSnapshot.docs[0].data(); permissionFromDb = d?.ventas?.[userRole] || 'no'; }
            else { console.warn("Permisos no encontrados."); }
        } catch (error) { console.error("Error permisos:", error); }
        if (isOwner) { finalPermission = 'total'; } else { finalPermission = permissionFromDb; }
        setVentasPermissionLevel(finalPermission);
        if (finalPermission === 'no') { alert("Sin permiso."); router.replace('/panel'); setIsLoadingClient(false); return; }

        // Cargar lista de usuarios para el filtro
        try {
            const usersSnapshot = await getDocs(query(collection(db, "usuariosAura"), orderBy("nombre")));
            const users = usersSnapshot.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre }));
            // Añadir opción para el usuario madre si no está en la DB (opcional)
            if (!users.some(u => u.id === "ADMIN_MADRE")) {
                users.unshift({ id: "ADMIN_MADRE", nombre: "admin (Dueño)" });
            }
            setUsuariosLista(users);
        } catch (error) {
            console.error("Error cargando lista de usuarios:", error);
            // Continuar sin filtro de usuario si falla
        }

        setIsLoadingClient(false); // Terminar carga cliente/permisos/usuarios
    };
    checkAuthAndLoadUsers();
  }, [router]);

 
  // --- MODIFICADO: Función de Carga de Ventas (con más filtros) ---
  const cargarVentas = async () => {
    if (isLoadingClient || !fechaDesde || !fechaHasta) {
        setVentasHistorial([]); setTotalFiltrado(0); return;
    }
    setLoadingVentas(true); setVentasHistorial([]); setTotalFiltrado(0);

    try {
      const startOfDay = new Date(`${fechaDesde}T00:00:00`);
      const endOfDay = new Date(`${fechaHasta}T23:59:59`);
      const timestampDesde = Timestamp.fromDate(startOfDay);
      const timestampHasta = Timestamp.fromDate(endOfDay);

      // Construir la consulta dinámicamente
      let constraints = [
        where("fechaHora", ">=", timestampDesde),
        where("fechaHora", "<=", timestampHasta),
        // orderBy("fechaHora", "desc") // Ordenar DESPUÉS de otros 'where' si es posible, o al final
      ];

      // Añadir filtro de usuario si está seleccionado
      if (selectedUserFilter) {
        constraints.push(where("usuarioId", "==", selectedUserFilter));
      }
      // Añadir filtro de medio de pago si está seleccionado
      if (selectedPaymentFilter) {
        constraints.push(where("medioPago", "==", selectedPaymentFilter));
      }
      if (filtroInvitacion === "si") {
        constraints.push(where("esInvitacion", "==", true));
      } else if (filtroInvitacion === "no") {
        constraints.push(where("esInvitacion", "==", false));
      }
      constraints.push(orderBy("fechaHora", "desc"));

      const q = query(collection(db, "ventasAura"), ...constraints);

      const snapshot = await getDocs(q);
      let listaVentas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`Ventas cargadas (Filtros: ${fechaDesde}-${fechaHasta}, User: ${selectedUserFilter || 'Todos'}, Pago: ${selectedPaymentFilter || 'Todos'}):`, listaVentas.length);
      const total = listaVentas.reduce((sum, venta) => sum + (venta.totalVenta || 0), 0);
      setTotalFiltrado(total);
      setVentasHistorial(listaVentas);

      if (filtroConDescuento) {
        listaVentas = listaVentas.filter(v => v.descuentoAplicado > 0);
      }
      if (filtroAnuladas) {
        listaVentas = listaVentas.filter(v => v.anulada === true);
      }

    } catch (error) {
      console.error("Error cargando historial de ventas filtrado:", error);
      setVentasHistorial([]); setTotalFiltrado(0);
      alert(`Error al cargar el historial de ventas: ${error.message}`);
    } finally {
      setLoadingVentas(false);
    }
  };

  // --- useEffect para cargar/filtrar ventas cuando cambian los filtros ---
  useEffect(() => {
    if (!isLoadingClient) {
      cargarVentas();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaDesde, fechaHasta, selectedUserFilter, selectedPaymentFilter, isLoadingClient]); // Añadidas dependencias de filtros

  // --- Variables de Permisos ---
  const canView = !isLoadingClient && ventasPermissionLevel !== 'no';
  // const canExport = canView; // Asumimos que si puede ver, puede exportar

  // --- Función para formatear Timestamp ---
  const formatTimestamp = (timestamp) => { /* ... (sin cambios) ... */ if (timestamp instanceof Timestamp) { return timestamp.toDate().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } return timestamp ? String(timestamp) : 'Fecha inválida'; };

  // --- <<< NUEVO: Función de Exportación CSV >>> ---
  const handleExportVentas = () => {
    if (!canView) { alert("Sin permiso."); return; }
    if (ventasHistorial.length === 0) { alert("No hay ventas para exportar según los filtros actuales."); return; }

    // Preparar datos para exportar (incluyendo detalles de items si es necesario)
    const dataToExport = [];
    // Encabezados
    dataToExport.push([
        "ID Venta", "Fecha", "Hora", "Usuario", "Sector", "Mesa", "Tipo Cliente", "Nota Cliente",
        "Medio Pago", "Subtotal Gral", "Desc %", "Invitación", "Desc Obs", "Desc Aplicado", "Total Venta",
        "Items Vendidos (Detalle)" // Columna para detalles
    ]);

    // Datos
    ventasHistorial.forEach(venta => {
        const fechaHora = venta.fechaHora instanceof Timestamp ? venta.fechaHora.toDate() : null;
        const fechaStr = fechaHora ? fechaHora.toLocaleDateString('es-AR') : 'N/A';
        const horaStr = fechaHora ? fechaHora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit'}) : 'N/A';

        // Formatear detalles de items en una sola cadena
        const itemsDetalle = (venta.items || [])
            .map(item => `${item.cantidadVendida}x ${item.nombreVendido} ($${item.subtotalItem?.toFixed(2)})`)
            .join(" | "); // Separador para los items

        dataToExport.push([
            venta.id,
            fechaStr,
            horaStr,
            venta.usuarioNombre || 'N/A',
            venta.sector || 'N/A',
            venta.mesaNumero || '',
            venta.tipoCliente || 'N/A',
            venta.notaCliente || '',
            venta.medioPago || 'N/A',
            venta.subtotalGeneral?.toFixed(2) || '0.00',
            venta.descuentoPorcentaje || 0,
            venta.esInvitacion ? 'SI' : 'NO',
            venta.descuentoObservacion || '',
            venta.descuentoAplicado?.toFixed(2) || '0.00',
            venta.totalVenta?.toFixed(2) || '0.00',
            itemsDetalle // Añadir la cadena de detalles
        ]);
    });

    // Convertir a CSV usando PapaParse con punto y coma
    const csv = Papa.unparse(dataToExport, { delimiter: ";" });

    // Crear Blob y enlace de descarga (con BOM para Excel)
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const fechaHoy = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `ventas_aura_${fechaDesde}_a_${fechaHasta}_${fechaHoy}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  // --- Renderizado ---
  if (isLoadingClient) { return <div style={estilos.contenedor}><p style={estilos.loading}>Verificando acceso...</p></div>; }
  if (!canView) { return <div style={estilos.contenedor}><p style={estilos.loading}>Acceso denegado.</p></div>; }

  return (
    <div style={estilos.contenedor}>
      <button onClick={() => router.push('/panel')} style={estilos.botonVolver}> ← Volver </button>
      <h1 style={estilos.titulo}>📈 Control de Ventas</h1>

      {/* --- MODIFICADO: Filtros --- */}
      <div style={estilos.filtrosContainer}>
          {/* Fechas */}
          <div style={estilos.filtroGrupo}>
              <label htmlFor="fechaDesde" style={estilos.labelFiltro}>Desde:</label>
              <input type="date" id="fechaDesde" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={estilos.inputFiltro} />
          </div>
          <div style={estilos.filtroGrupo}>
              <label htmlFor="fechaHasta" style={estilos.labelFiltro}>Hasta:</label>
              <input type="date" id="fechaHasta" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={estilos.inputFiltro} min={fechaDesde} />
          </div>
          {/* <<< NUEVO: Filtro Usuario >>> */}
          <div style={estilos.filtroGrupo}>
              <label htmlFor="filtroUsuario" style={estilos.labelFiltro}>Usuario:</label>
              <select id="filtroUsuario" value={selectedUserFilter} onChange={(e) => setSelectedUserFilter(e.target.value)} style={estilos.inputFiltro}>
                  <option value="">Todos</option>
                  {usuariosLista.map(user => (
                      <option key={user.id} value={user.id}>{user.nombre}</option>
                  ))}
              </select>
          </div>
          {/* <<< NUEVO: Filtro Medio de Pago >>> */}
          <div style={estilos.filtroGrupo}>
              <label htmlFor="filtroPago" style={estilos.labelFiltro}>Medio Pago:</label>
              <select id="filtroPago" value={selectedPaymentFilter} onChange={(e) => setSelectedPaymentFilter(e.target.value)} style={estilos.inputFiltro}>
                  <option value="">Todos</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta Credito">T. Crédito</option>
                  <option value="Tarjeta Debito">T. Débito</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="MercadoPago">MercadoPago</option>
                  <option value="Modo">Modo</option>
                  <option value="Banco">Banco</option>
                  {/* Añadir otros si existen */}
              </select>
          </div>
          {/* Total Filtrado */}
          <div style={estilos.totalFiltradoDisplay}>
              Total Periodo: ${totalFiltrado.toFixed(2)}
          </div>
          {/* <<< NUEVO: Botón Exportar >>> */}
          <button onClick={handleExportVentas} style={estilos.botonExportar} disabled={loadingVentas || ventasHistorial.length === 0}>
            📥 Exportar CSV
          </button>
      </div>

      {/* Lista de Ventas */}
      <div style={estilos.historialContainer}>
        {loadingVentas && <p style={estilos.loading}>Cargando ventas...</p>}
        {!loadingVentas && ventasHistorial.length === 0 && <p>No hay ventas registradas para los filtros seleccionados.</p>}

        {!loadingVentas && ventasHistorial.map((venta) => (
          <div key={venta.id} style={estilos.itemHistorial}>
            <div style={estilos.cabeceraHistorial}>
              <div>
                <strong>Fecha:</strong> {formatTimestamp(venta.fechaHora)} <br />
                <strong>Usuario:</strong> {venta.usuarioNombre || 'N/A'} <br />
                <strong>Sector:</strong> {venta.sector || 'N/A'} {venta.sector === 'Mesas' && venta.mesaNumero ? `(Mesa: ${venta.mesaNumero})` : ''} <br/>
                <strong>Cliente:</strong> {venta.tipoCliente || 'N/A'} {venta.notaCliente ? `(${venta.notaCliente})` : ''} <br/>
                <strong>Pago:</strong> {venta.medioPago || 'N/A'}
              </div>
              <div style={estilos.totalesHistorial}>
                {venta.descuentoAplicado > 0 && ( <span style={estilos.subtotalTachado}>Subt: ${venta.subtotalGeneral?.toFixed(2) || '0.00'}</span> )}
                 <span style={estilos.totalFinal}>Total: ${venta.totalVenta?.toFixed(2) || '0.00'}</span>
                 {venta.descuentoAplicado > 0 && ( <span style={estilos.infoDescuento}> {venta.esInvitacion ? 'Invitación' : `Desc. ${venta.descuentoPorcentaje?.toFixed(0) || 0}%`} {venta.descuentoObservacion ? ` (${venta.descuentoObservacion})` : ''} </span> )}
              </div>
            </div>
            <details style={estilos.detailsHistorial}>
              <summary style={estilos.summaryHistorial}> Ver detalles ({venta.items?.length || 0} items) </summary>
              <ul style={estilos.listaDetallesHistorial}>
                {(venta.items || []).map((item, idx) => ( <li key={idx}> ▪ {item.cantidadVendida || 0} x {item.nombreVendido || '?'} (@ ${item.precioUnitario?.toFixed(2) || 'N/A'} c/u = ${item.subtotalItem?.toFixed(2) || 'N/A'}) </li> ))}
              </ul>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Estilos (Añadido estilo para botón exportar) ---
const estilos = {
  contenedor: { minHeight: "100vh", background: "#0A1034", color: "#EFE4CF", padding: "2rem 1.5rem", fontFamily: "'Space Grotesk', sans-serif", },
  botonVolver: { position: 'absolute', top: '1rem', left: '1rem', background: "#806C4F", color: "#EFE4CF", padding: "0.5rem 1rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", zIndex: 10, },
  titulo: { fontSize: "2rem", color: "#D3C6A3", marginBottom: "2rem", textAlign: "center", borderBottom: "2px solid #806C4F", paddingBottom: "0.5rem", },
  loading: { color: 'white', textAlign: 'center', paddingTop: '2rem', fontSize: '1.2rem' },
  filtrosContainer: { background: "#1C2340", padding: "1rem 1.5rem", borderRadius: "12px", marginBottom: "2rem", maxWidth: "1000px", margin: "0 auto 2rem auto", boxShadow: "0 4px 10px rgba(0,0,0,0.3)", display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'flex-start' }, // Alineado a la izquierda
  filtroGrupo: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  labelFiltro: { fontSize: '0.9rem', color: '#D3C6A3' },
  inputFiltro: { padding: "0.5rem", fontSize: "0.9rem", borderRadius: "6px", border: "1px solid #4a5568", backgroundColor: "#EFE4CF", color: "#2c1b0f", minWidth: '120px' }, // Ancho mínimo
  totalFiltradoDisplay: { marginLeft: 'auto', fontSize: '1.1rem', fontWeight: 'bold', color: '#4CAF50', padding: '0.5rem 0', minWidth: '150px', textAlign: 'right', },
  // <<< NUEVO: Estilo Botón Exportar >>>
  botonExportar: {
    background: "#0277bd", // Azul
    color: "white",
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "0.9rem",
    marginLeft: '1rem', // Espacio respecto al total
    '&:disabled': {
        backgroundColor: "#555",
        cursor: 'not-allowed',
    }
  },
  // <<< FIN Estilo Botón Exportar >>>
  historialContainer: { maxWidth: '900px', margin: '0 auto' },
  itemHistorial: { marginBottom: "1.5rem", background: "#1C2340", padding: "1rem 1.5rem", borderRadius: "8px", boxShadow: "0 2px 5px rgba(0,0,0,0.2)", fontSize: '0.9rem', lineHeight: 1.5 },
  cabeceraHistorial: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem", flexWrap: 'wrap', gap: '1rem', },
  totalesHistorial: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', flexShrink: 0 },
  subtotalTachado: { fontSize: '0.9em', color: '#a0a0a0', textDecoration: 'line-through' },
  totalFinal: { fontSize: '1.2em', fontWeight: 'bold', color: '#D3C6A3' },
  infoDescuento: { fontSize: '0.8em', color: '#ffab91', fontStyle: 'italic', maxWidth: '200px' },
  detailsHistorial: { marginTop: '0.5rem', borderTop: '1px solid #4a5568', paddingTop: '0.5rem', },
  summaryHistorial: { cursor: 'pointer', color: '#D3C6A3', fontSize: '0.9rem', fontWeight: 'bold', },
  listaDetallesHistorial: { listStyle: 'none', paddingLeft: '1rem', marginTop: '0.5rem', fontSize: '0.85rem', color: '#bdc1c6', }
};
