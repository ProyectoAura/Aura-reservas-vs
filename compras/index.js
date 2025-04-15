// pages/compras/index.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

export default function Compras() {
  const router = useRouter();
  const [proveedor, setProveedor] = useState("");
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("unidad");
  const [precio, setPrecio] = useState("");
  const [itemsCompra, setItemsCompra] = useState([]);
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    const autorizado = localStorage.getItem("adminAutorizado") === "true" || Cookies.get("adminAutorizado") === "true";
    if (!autorizado) router.push("/");
    const data = JSON.parse(localStorage.getItem("comprasAura")) || [];
    setHistorial(data);
  }, [router]);

  const agregarItem = () => {
    if (!producto || !cantidad || !precio) return;
    const nuevo = { producto, cantidad, unidad, precio, id: Date.now() };
    setItemsCompra([...itemsCompra, nuevo]);
    setProducto("");
    setCantidad("");
    setPrecio("");
  };

  const guardarCompra = () => {
    if (itemsCompra.length === 0) return;
    const nuevaCompra = {
      id: Date.now(),
      proveedor,
      fecha: new Date().toLocaleDateString(),
      productos: itemsCompra,
    };
    const actualizadas = [...historial, nuevaCompra];
    setHistorial(actualizadas);
    localStorage.setItem("comprasAura", JSON.stringify(actualizadas));
    setProveedor("");
    setItemsCompra([]);
  };

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>📥 Control de Compras</h1>
      <div style={estilos.formulario}>
        <input placeholder="Proveedor" value={proveedor} onChange={(e) => setProveedor(e.target.value)} style={estilos.input} />
        <input placeholder="Producto" value={producto} onChange={(e) => setProducto(e.target.value)} style={estilos.input} />
        <input placeholder="Cantidad" type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} style={estilos.input} />
        <select value={unidad} onChange={(e) => setUnidad(e.target.value)} style={estilos.input}>
          <option value="unidad">Unidad</option>
          <option value="litro">Litro</option>
          <option value="kilo">Kilo</option>
        </select>
        <input placeholder="Precio unitario" type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} style={estilos.input} />
        <button onClick={agregarItem} style={estilos.boton}>➕ Agregar Producto</button>
        <button onClick={guardarCompra} style={{ ...estilos.boton, backgroundColor: '#D3C6A3' }}>💾 Guardar Compra</button>
      </div>

      {itemsCompra.length > 0 && (
        <div>
          <h3 style={estilos.subtitulo}>🧾 Productos cargados:</h3>
          <ul>
            {itemsCompra.map((item, i) => (
              <li key={i} style={estilos.item}>{item.producto} - {item.cantidad} {item.unidad} - ${item.precio}</li>
            ))}
          </ul>
        </div>
      )}

      <h2 style={estilos.subtitulo}>📚 Historial de Compras</h2>
      {historial.map((compra) => (
        <details key={compra.id} style={estilos.item}>
          <summary>{compra.fecha} - Proveedor: {compra.proveedor || "N/A"}</summary>
          <ul>
            {compra.productos.map((p, idx) => (
              <li key={idx}>{p.producto} - {p.cantidad} {p.unidad} - ${p.precio}</li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

const estilos = {
  contenedor: {
    minHeight: "100vh",
    background: "#0A1034",
    color: "#EFE4CF",
    padding: "2rem 1rem",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  titulo: { fontSize: "1.8rem", color: "#D3C6A3", marginBottom: "1rem" },
  subtitulo: { marginTop: "2rem", color: "#D3C6A3" },
  formulario: { display: "flex", flexDirection: "column", gap: "0.8rem", maxWidth: "400px" },
  input: {
    padding: "0.6rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  boton: {
    background: "#EFE4CF",
    color: "#2c1b0f",
    padding: "0.6rem",
    borderRadius: "10px",
    border: "1px solid #b49f82",
    cursor: "pointer",
    fontWeight: "bold",
  },
  item: { margin: "0.5rem 0", borderBottom: "1px solid #333", paddingBottom: "0.3rem" },
};