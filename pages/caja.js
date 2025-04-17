// pages/caja.js
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { db } from "../firebase/firebaseConfig"; // Ajusta la ruta si es necesario
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  increment,
  writeBatch,
  serverTimestamp, // Para la fecha/hora de la venta
  query,
  orderBy // Para ordenar productos
} from "firebase/firestore";

export default function Caja() {
  const router = useRouter();

  // --- Estados ---
  const [articulosBase, setArticulosBase] = useState([]); // Todos los productos base
  const [ventaActual, setVentaActual] = useState([]); // Items en la venta actual { idTemporal, productoBaseId, productoNombre, presentacion, cantidad, precioUnitario, subtotal }
  const [loadingArticulos, setLoadingArticulos] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // Usuario logueado { id, nombre, rol }
  const [searchTerm, setSearchTerm] = useState(""); // Para buscar productos

  // --- Carga Inicial ---
  useEffect(() => {
    // 1. Verificar autorización básica
    const autorizado = localStorage.getItem("adminAutorizado") === "true" || Cookies.get("adminAutorizado") === "true";
    if (!autorizado) { router.replace("/"); return; }

    // 2. Obtener usuario actual
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuarioAura"));
    if (!usuarioGuardado || !usuarioGuardado.rol) {
      console.error("Usuario o rol no encontrado.");
      alert("Error: No se pudo identificar tu sesión.");
      router.replace("/");
      return;
    }
    setCurrentUser({ id: usuarioGuardado.id, nombre: usuarioGuardado.nombre, rol: usuarioGuardado.rol }); // Asumiendo que el objeto usuario tiene 'id'

    // 3. Cargar Productos Base
    const cargarProductos = async () => {
      setLoadingArticulos(true);
      try {
        // TODO: Implementar lectura de permisos para 'ventasCaja' aquí antes de cargar
        // const permission = await checkPermission(usuarioGuardado.rol, 'ventasCaja');
        // if (permission === 'no') { router.replace('/panel'); return; }

        const q = query(collection(db, "articulosAura"), orderBy("producto"));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setArticulosBase(items);
        console.log("Productos Base cargados para Caja:", items);
      } catch (error) {
        console.error("Error cargando Productos Base:", error);
        alert("Error al cargar productos.");
        setArticulosBase([]);
      } finally {
        setLoadingArticulos(false);
      }
    };
    cargarProductos();

  }, [router]);

  // --- Filtrar Artículos Vendibles ---
  const articulosVendibles = useMemo(() => {
    if (!articulosBase || articulosBase.length === 0) return [];

    const vendibles = [];
    articulosBase.forEach(producto => {
      // Filtrar por término de búsqueda (nombre, marca, descripción)
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
                            producto.producto?.toLowerCase().includes(searchTermLower) ||
                            producto.marca?.toLowerCase().includes(searchTermLower) ||
                            producto.descripcion?.toLowerCase().includes(searchTermLower);

      if (matchesSearch && producto.presentaciones && producto.presentaciones.length > 0) {
        producto.presentaciones.forEach(pres => {
          if (pres.esVenta) { // Solo incluir presentaciones marcadas para venta
            vendibles.push({
              productoBaseId: producto.id,
              productoNombre: producto.producto,
              marcaNombre: producto.marca || "",
              descripcion: producto.descripcion || "",
              unidadBase: producto.unidadBase,
              presentacion: { ...pres }, // Copiar objeto presentación
              // Asegurarse que el precio exista, si no, poner 0 o manejarlo
              precioVenta: typeof pres.precioVenta === 'number' ? pres.precioVenta : 0,
            });
          }
        });
      }
    });
    return vendibles;
  }, [articulosBase, searchTerm]);

  // --- Lógica de la Venta Actual ---
  const handleAddItemToSale = (itemVendible) => {
    if (isSaving) return; // No agregar si se está guardando

    // Verificar si el precio es válido
    if (itemVendible.precioVenta <= 0) {
        alert(`El producto "${itemVendible.productoNombre} - ${itemVendible.presentacion.nombre}" no tiene un precio de venta definido o es inválido. Defínelo en Control de Stock.`);
        return;
    }

    setVentaActual(prevVenta => {
      const existingItemIndex = prevVenta.findIndex(
        item => item.productoBaseId === itemVendible.productoBaseId && item.presentacion.nombre === itemVendible.presentacion.nombre
      );

      if (existingItemIndex > -1) {
        // Incrementar cantidad si ya existe
        const updatedVenta = [...prevVenta];
        updatedVenta[existingItemIndex] = {
          ...updatedVenta[existingItemIndex],
          cantidad: updatedVenta[existingItemIndex].cantidad + 1,
          subtotal: (updatedVenta[existingItemIndex].cantidad + 1) * updatedVenta[existingItemIndex].precioUnitario,
        };
        return updatedVenta;
      } else {
        // Agregar nuevo item
        return [
          ...prevVenta,
          {
            idTemporal: Date.now() + Math.random(), // ID único para la lista
            productoBaseId: itemVendible.productoBaseId,
            productoNombre: itemVendible.productoNombre,
            presentacion: itemVendible.presentacion, // Guardar objeto presentación completo
            cantidad: 1,
            precioUnitario: itemVendible.precioVenta,
            subtotal: itemVendible.precioVenta, // Subtotal inicial
            unidadBase: itemVendible.unidadBase, // Necesario para cálculo de stock
          }
        ];
      }
    });
  };

  const handleUpdateQuantity = (idTemporal, delta) => {
    if (isSaving) return;
    setVentaActual(prevVenta => {
      const itemIndex = prevVenta.findIndex(item => item.idTemporal === idTemporal);
      if (itemIndex === -1) return prevVenta; // No encontrado

      const updatedVenta = [...prevVenta];
      const currentItem = updatedVenta[itemIndex];
      const newQuantity = currentItem.cantidad + delta;

      if (newQuantity <= 0) {
        // Eliminar si la cantidad llega a 0 o menos
        return updatedVenta.filter(item => item.idTemporal !== idTemporal);
      } else {
        // Actualizar cantidad y subtotal
        updatedVenta[itemIndex] = {
          ...currentItem,
          cantidad: newQuantity,
          subtotal: newQuantity * currentItem.precioUnitario,
        };
        return updatedVenta;
      }
    });
  };

  const handleRemoveItem = (idTemporal) => {
    if (isSaving) return;
    setVentaActual(prevVenta => prevVenta.filter(item => item.idTemporal !== idTemporal));
  };

  // Calcular Total
  const totalVenta = useMemo(() => {
    return ventaActual.reduce((sum, item) => sum + item.subtotal, 0);
  }, [ventaActual]);

  // --- Confirmar Venta ---
  const handleConfirmarVenta = async () => {
    if (ventaActual.length === 0) {
      alert("Agrega productos a la venta.");
      return;
    }
    if (!currentUser || !currentUser.id) {
        alert("Error: No se pudo identificar al usuario. Recarga la página.");
        return;
    }
    // TODO: Añadir verificación de permiso para 'registrar venta' aquí

    if (!window.confirm(`Confirmar venta por un total de $${totalVenta.toFixed(2)}?`)) {
      return;
    }

    setIsSaving(true);

    // 1. Preparar datos para guardar en 'ventasAura'
    const itemsParaGuardar = ventaActual.map(item => ({
      productoBaseId: item.productoBaseId,
      productoNombre: item.productoNombre,
      presentacionNombre: item.presentacion.nombre,
      cantidadVendida: item.cantidad,
      precioUnitario: item.precioUnitario,
      subtotalItem: item.subtotal,
      // Datos necesarios para el decremento de stock (se usan en el siguiente paso)
      contenidoPorPresentacion: item.presentacion.contenidoEnUnidadBase,
      unidadBase: item.unidadBase,
    }));

    const datosVenta = {
      fechaHora: serverTimestamp(), // Fecha/Hora del servidor
      usuarioId: currentUser.id,
      usuarioNombre: currentUser.nombre,
      items: itemsParaGuardar,
      totalVenta: totalVenta,
      metodoPago: "Efectivo", // Simplificado para Fase 1
      estado: "Completada", // O 'Pagada'
    };

    // 2. Preparar actualizaciones de stock en batch
    const batch = writeBatch(db);
    let stockUpdatesValidos = true;
    ventaActual.forEach(item => {
        const cantidadARestar = item.cantidad * item.presentacion.contenidoEnUnidadBase;
        if (isNaN(cantidadARestar) || cantidadARestar <= 0) {
            console.error("Cálculo inválido para restar stock:", item);
            stockUpdatesValidos = false; // Marcar que algo falló
            return; // Saltar este item
        }
        const itemRef = doc(db, "articulosAura", item.productoBaseId);
        batch.update(itemRef, { cantidadActual: increment(-cantidadARestar) });
        console.log(`Batch Stock: Update ${item.productoBaseId} -${cantidadARestar}`);
    });

    if (!stockUpdatesValidos) {
        alert("Error interno al calcular las cantidades para actualizar el stock. Venta cancelada.");
        setIsSaving(false);
        return;
    }

    // 3. Ejecutar guardado y batch
    try {
      // Guardar la venta
      const ventaDocRef = await addDoc(collection(db, "ventasAura"), datosVenta);
      console.log("Venta guardada con ID:", ventaDocRef.id);

      // Ejecutar actualizaciones de stock
      await batch.commit();
      console.log("Stock actualizado correctamente.");

      alert(`Venta registrada con éxito por $${totalVenta.toFixed(2)}`);
      setVentaActual([]); // Limpiar venta actual
      setSearchTerm(""); // Limpiar búsqueda

    } catch (error) {
      console.error("Error al confirmar venta o actualizar stock:", error);
      alert(`Error al procesar la venta: ${error.message}. Es posible que la venta se haya guardado pero el stock no. Revisa el historial y el stock.`);
      // Aquí se podría intentar revertir la venta si falló el stock, pero es complejo.
      // Por ahora, solo alertamos.
    } finally {
      setIsSaving(false);
    }
  };


  // --- Renderizado ---
  if (loadingArticulos) {
    return <div style={estilos.contenedor}><p style={estilos.loading}>Cargando productos...</p></div>;
  }

  return (
    <div style={estilos.contenedor}>
      <button onClick={() => router.push('/panel')} style={estilos.botonVolver}>
        ← Volver al Panel
      </button>
      <h1 style={estilos.titulo}>💰 Caja</h1>

      <div style={estilos.layoutCaja}>
        {/* Columna Izquierda: Selección de Productos */}
        <div style={estilos.columnaSeleccion}>
          <h2 style={estilos.subtitulo}>Seleccionar Productos</h2>
          <input
            type="search"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={estilos.inputSearch}
          />
          <div style={estilos.listaProductosVendibles}>
            {articulosVendibles.length === 0 && !loadingArticulos && <p>No hay productos vendibles o que coincidan.</p>}
            {articulosVendibles.map((item, index) => (
              <button
                key={`${item.productoBaseId}-${item.presentacion.nombre}-${index}`} // Key más única
                style={estilos.botonProducto}
                onClick={() => handleAddItemToSale(item)}
                disabled={isSaving}
                title={`${item.productoNombre} ${item.marcaNombre} ${item.descripcion}`}
              >
                <span style={estilos.nombreProductoBoton}>{item.productoNombre} - {item.presentacion.nombre}</span>
                <span style={estilos.precioProductoBoton}>${item.precioVenta.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Columna Derecha: Venta Actual */}
        <div style={estilos.columnaVenta}>
          <h2 style={estilos.subtitulo}>Venta Actual</h2>
          <div style={estilos.ticketVenta}>
            {ventaActual.length === 0 && <p style={estilos.ticketVacio}>Agrega productos para iniciar la venta.</p>}
            {ventaActual.map((item, index) => (
              <div key={item.idTemporal} style={estilos.itemTicket}>
                <div style={estilos.itemTicketInfo}>
                  <span>{item.productoNombre} ({item.presentacion.nombre})</span>
                  <span>${item.precioUnitario.toFixed(2)}</span>
                </div>
                <div style={estilos.itemTicketControles}>
                  <button onClick={() => handleUpdateQuantity(item.idTemporal, -1)} disabled={isSaving} style={estilos.botonControlTicket}>-</button>
                  <span style={estilos.cantidadTicket}>{item.cantidad}</span>
                  <button onClick={() => handleUpdateQuantity(item.idTemporal, 1)} disabled={isSaving} style={estilos.botonControlTicket}>+</button>
                  <span style={estilos.subtotalTicket}>${item.subtotal.toFixed(2)}</span>
                  <button onClick={() => handleRemoveItem(item.idTemporal)} disabled={isSaving} style={estilos.botonEliminarTicket}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
          <div style={estilos.totalVenta}>
            Total: ${totalVenta.toFixed(2)}
          </div>
          <div style={estilos.accionesVenta}>
            {/* --- Simplificado para Fase 1 --- */}
            <button
              style={estilos.botonCobrar}
              onClick={handleConfirmarVenta}
              disabled={isSaving || ventaActual.length === 0}
            >
              {isSaving ? "Procesando..." : "Confirmar Venta"}
            </button>
            {/* Botón para limpiar venta (opcional) */}
            <button
                style={estilos.botonLimpiar}
                onClick={() => { if(window.confirm('¿Limpiar venta actual?')) { setVentaActual([]); setSearchTerm(''); } }}
                disabled={isSaving || ventaActual.length === 0}
            >
                Limpiar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Estilos (Nuevos para Caja) ---
const estilos = {
  contenedor: { display: 'flex', flexDirection: 'column', minHeight: "100vh", background: "#0A1034", color: "#EFE4CF", padding: "2rem 1.5rem", fontFamily: "'Space Grotesk', sans-serif", },
  botonVolver: { position: 'absolute', top: '1rem', left: '1rem', background: "#806C4F", color: "#EFE4CF", padding: "0.5rem 1rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", zIndex: 10, },
  titulo: { fontSize: "2rem", color: "#D3C6A3", marginBottom: "1rem", textAlign: "center", width: '100%', },
  subtitulo: { marginTop: 0, marginBottom: "1rem", color: "#D3C6A3", fontSize: "1.5rem", borderBottom: "1px solid #4a5568", paddingBottom: "0.3rem", },
  loading: { color: 'white', textAlign: 'center', paddingTop: '2rem', fontSize: '1.2rem' },
  layoutCaja: { display: 'flex', flexGrow: 1, gap: '1.5rem', marginTop: '1rem', },
  columnaSeleccion: { flex: '1 1 55%', display: 'flex', flexDirection: 'column', background: "#1C2340", padding: "1rem", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.3)", },
  columnaVenta: { flex: '1 1 45%', display: 'flex', flexDirection: 'column', background: "#1C2340", padding: "1rem", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.3)", },
  inputSearch: { padding: "0.8rem", fontSize: "1rem", borderRadius: "8px", border: "1px solid #4a5568", backgroundColor: "#EFE4CF", color: "#2c1b0f", width: '100%', boxSizing: 'border-box', marginBottom: '1rem', },
  listaProductosVendibles: { flexGrow: 1, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignContent: 'flex-start', paddingRight: '0.5rem', // Espacio para scrollbar
    // Estilo scrollbar (opcional)
    '&::-webkit-scrollbar': { width: '8px' },
    '&::-webkit-scrollbar-track': { background: '#2a3352' },
    '&::-webkit-scrollbar-thumb': { background: '#806C4F', borderRadius: '4px' },
  },
  botonProducto: { background: "#806C4F", color: "#EFE4CF", border: "none", borderRadius: "8px", padding: "0.8rem 1rem", cursor: "pointer", textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '60px', width: 'calc(33.33% - 1rem)', // Aprox 3 por fila
    boxSizing: 'border-box', transition: 'background-color 0.2s', '&:hover': { backgroundColor: "#6b5b40" }, '&:disabled': { backgroundColor: "#555", cursor: 'not-allowed' }
  },
  nombreProductoBoton: { fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.3rem', },
  precioProductoBoton: { fontSize: '1rem', fontWeight: 'bold', color: '#D3C6A3', },
  ticketVenta: { flexGrow: 1, overflowY: 'auto', border: '1px solid #4a5568', borderRadius: '8px', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(10, 16, 52, 0.5)', },
  ticketVacio: { textAlign: 'center', color: '#a0a0a0', fontStyle: 'italic', paddingTop: '1rem', },
  itemTicket: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.4rem', borderBottom: '1px dashed #4a5568', '&:last-child': { borderBottom: 'none' } },
  itemTicketInfo: { flexGrow: 1, marginRight: '1rem', fontSize: '0.9rem', },
  itemTicketControles: { display: 'flex', alignItems: 'center', gap: '0.5rem', },
  botonControlTicket: { background: '#4a5568', color: '#EFE4CF', border: 'none', borderRadius: '4px', width: '25px', height: '25px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', lineHeight: '25px', textAlign: 'center', },
  cantidadTicket: { minWidth: '25px', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem', },
  subtotalTicket: { minWidth: '70px', textAlign: 'right', fontWeight: 'bold', fontSize: '0.95rem', },
  botonEliminarTicket: { background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontSize: '1.1rem', padding: '0 0.2rem', },
  totalVenta: { fontSize: '1.8rem', fontWeight: 'bold', color: '#D3C6A3', textAlign: 'right', padding: '1rem 0.5rem', borderTop: '2px solid #806C4F', },
  accionesVenta: { display: 'flex', gap: '1rem', marginTop: '0.5rem', },
  botonCobrar: { flexGrow: 1, background: "#4CAF50", color: "white", padding: "1rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1.2rem", '&:disabled': { backgroundColor: "#555", cursor: 'not-allowed' } },
  botonLimpiar: { background: "#e57373", color: "white", padding: "0.5rem 1rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem", '&:disabled': { backgroundColor: "#555", cursor: 'not-allowed' } },
};
