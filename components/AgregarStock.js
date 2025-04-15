
import React, { useState } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, doc, updateDoc, addDoc, getDoc } from "firebase/firestore";

const AgregarStock = () => {
  const [productoId, setProductoId] = useState("");
  const [cantidadBotellas, setCantidadBotellas] = useState(1);
  const [usuario, setUsuario] = useState("empleado1"); // o sacar de contexto

  const handleCargarStock = async () => {
    if (!productoId || cantidadBotellas <= 0) {
      alert("Por favor completa los campos correctamente.");
      return;
    }

    try {
      const prodRef = doc(db, "productos", productoId);
      const prodSnap = await getDoc(prodRef);

      if (!prodSnap.exists()) {
        alert("Producto no encontrado.");
        return;
      }

      const producto = prodSnap.data();
      const medidasPorBotella = producto.unidadTotalMl / producto.medidaVentaMl;
      const medidasTotales = medidasPorBotella * cantidadBotellas;

      await updateDoc(prodRef, {
        stockDisponibleMedidas: producto.stockDisponibleMedidas + medidasTotales,
        stockRealMedidas: producto.stockRealMedidas + medidasTotales
      });

      await addDoc(collection(db, "stock_movimientos"), {
        productoId: productoId,
        tipo: "ingreso",
        cantidad: medidasTotales,
        motivo: "Compra proveedor",
        fecha: new Date(),
        usuario: usuario
      });

      alert("Stock ingresado correctamente.");
      setCantidadBotellas(1);
    } catch (error) {
      console.error("Error al cargar stock:", error);
      alert("Error al cargar el stock.");
    }
  };

  return (
    <div className="bg-[#0A1034] p-4 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-2">Agregar Stock</h2>
      <input
        type="text"
        placeholder="ID del producto"
        value={productoId}
        onChange={(e) => setProductoId(e.target.value)}
        className="w-full mb-2 p-2 rounded text-black"
      />
      <input
        type="number"
        placeholder="Cantidad de botellas"
        value={cantidadBotellas}
        onChange={(e) => setCantidadBotellas(Number(e.target.value))}
        className="w-full mb-2 p-2 rounded text-black"
      />
      <button
        onClick={handleCargarStock}
        className="bg-yellow-700 hover:bg-yellow-600 text-white px-4 py-2 rounded"
      >
        Cargar Stock
      </button>
    </div>
  );
};

export default AgregarStock;
