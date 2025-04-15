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
    <div className="bg-[#0A1034] p-6 rounded-2xl shadow-lg border border-[#806C4F] max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-[#EFE4CF] text-center">Ingreso de Stock</h2>

      <label className="block mb-2 text-[#EFE4CF]">ID del producto</label>
      <input
        type="text"
        placeholder="Ej: prod_whisky_01"
        value={productoId}
        onChange={(e) => setProductoId(e.target.value)}
        className="w-full mb-4 p-2 rounded-lg text-black bg-[#EFE4CF] focus:outline-none"
      />

      <label className="block mb-2 text-[#EFE4CF]">Cantidad de botellas</label>
      <input
        type="number"
        min={1}
        placeholder="Ej: 2"
        value={cantidadBotellas}
        onChange={(e) => setCantidadBotellas(Number(e.target.value))}
        className="w-full mb-4 p-2 rounded-lg text-black bg-[#EFE4CF] focus:outline-none"
      />

      <button
        onClick={handleCargarStock}
        className="w-full bg-[#806C4F] hover:bg-[#a18765] text-white py-3 rounded-xl font-semibold text-lg transition-all"
      >
        Confirmar ingreso
      </button>
    </div>
  );
};

export default AgregarStock;
