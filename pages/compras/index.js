import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { db } from "../../firebase/firebaseConfig";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc} from "firebase/firestore";

export default function Compras() {
  const router = useRouter();
  const [producto, setProducto] = useState("");
  const [marca, setMarca] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("unidad");
  const [precio, setPrecio] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [responsable, setResponsable] = useState("");
  const [productos, setProductos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [editando, setEditando] = useState(false);
  const [idCompraEditando, setIdCompraEditando] = useState(null);
  const [productoEditandoIdx, setProductoEditandoIdx] = useState(null);
  const [articulosBase, setArticulosBase] = useState([]);

  useEffect(() => {
    const autorizado = localStorage.getItem("adminAutorizado") === "true" || Cookies.get("adminAutorizado") === "true";
    if (!autorizado) router.push("/");
    const nombreUsuario = localStorage.getItem("usuarioActivo") || "Administrador";
    setResponsable(nombreUsuario);
    cargarComprasFirestore();
    cargarArticulosBase();
  }, [router]);

  const cargarComprasFirestore = async () => {
    const snapshot = await getDocs(collection(db, "comprasAura"));
    const comprasFirestore = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCompras(comprasFirestore);
  };

  const cargarArticulosBase = async () => {
    const snapshot = await getDocs(collection(db, "articulosAura"));
    const articulos = snapshot.docs.map(doc => doc.data());
    setArticulosBase(articulos);
  };

  const agregarProducto = async () => {
    if (!producto || !cantidad || !precio) return;

    const existente = articulosBase.find(a => a.producto === producto && a.marca === marca);

    if (!existente) {
      await addDoc(collection(db, "articulosAura"), {
        producto,
        marca,
        unidad,
        bebida: true,
      });
    }

    const nuevo = {
      id: Date.now(),
      producto,
      marca,
      cantidad: parseFloat(cantidad),
      unidad,
      precio: parseFloat(precio),
      proveedor,
    };

    if (productoEditandoIdx !== null) {
      const actualizados = [...productos];
      actualizados[productoEditandoIdx] = nuevo;
      setProductos(actualizados);
      setProductoEditandoIdx(null);
    } else {
      setProductos([...productos, nuevo]);
    }

    setProducto("");
    setMarca("");
    setCantidad("");
    setPrecio("");
    setProveedor("");
  };

  const editarProducto = (idx) => {
    const p = productos[idx];
    setProducto(p.producto);
    setMarca(p.marca);
    setCantidad(p.cantidad);
    setUnidad(p.unidad);
    setPrecio(p.precio);
    setProveedor(p.proveedor);
    setProductoEditandoIdx(idx);
  };

  const borrarProducto = (idx) => {
    if (!window.confirm("¿Estás seguro de eliminar este producto de la compra?")) return;
    const actualizados = productos.filter((_, i) => i !== idx);
    setProductos(actualizados);
  };

  const guardarCompra = async () => {
    if (productos.length === 0) return;
    if (!window.confirm(editando ? "¿Guardar cambios en esta compra?" : "¿Guardar esta compra completa?")) return;

    const productosAgrupados = productos.reduce((acc, curr) => {
      const clave = curr.proveedor || "Sin proveedor";
      if (!acc[clave]) acc[clave] = [];
      acc[clave].push(curr);
      return acc;
    }, {});

    const comprasPorProveedor = Object.entries(productosAgrupados).map(([proveedor, productos]) => ({
      fecha,
      responsable,
      proveedor,
      productos,
    }));

    if (editando) {
      await updateDoc(doc(db, "comprasAura", idCompraEditando), comprasPorProveedor[0]);
    } else {
      for (let compra of comprasPorProveedor) {
        await addDoc(collection(db, "comprasAura"), compra);
      }
    }

    setProductos([]);
    setEditando(false);
    setIdCompraEditando(null);
    cargarComprasFirestore();
  };

  const eliminarCompra = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar esta compra?")) return;
    await deleteDoc(doc(db, "comprasAura", id));
    cargarComprasFirestore();
  };

  const editarCompra = (compra) => {
    if (!window.confirm("¿Editar esta compra?")) return;
    setFecha(compra.fecha);
    setResponsable(compra.responsable);
    setProductos(compra.productos);
    setEditando(true);
    setIdCompraEditando(compra.id);
  };

  const productosAgrupadosVisual = productos.reduce((acc, curr) => {
    const clave = curr.proveedor || "Sin proveedor";
    if (!acc[clave]) acc[clave] = [];
    acc[clave].push(curr);
    return acc;
  }, {});

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>📥 Control de Compras</h1>
      <div style={estilos.formulario}>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={estilos.input} />
        <input placeholder="Responsable" value={responsable} disabled style={estilos.input} />
        <input placeholder="Producto" value={producto} onChange={(e) => setProducto(e.target.value)} style={estilos.input} />
        <input placeholder="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} style={estilos.input} />
        <input placeholder="Cantidad" type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} style={estilos.input} />
        <select value={unidad} onChange={(e) => setUnidad(e.target.value)} style={estilos.input}>
          <option value="unidad">Unidad</option>
          <option value="ml/s">ml/s</option>
          <option value="Litro/s">Litro/s</option>
          <option value="gr/s">gr/s</option>
          <option value="Kilo/s">Kilo/s</option>
        </select>
        <input placeholder="Precio unitario" type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} style={estilos.input} />
        <input placeholder="Proveedor" value={proveedor} onChange={(e) => setProveedor(e.target.value)} style={estilos.input} />
        <button onClick={agregarProducto} style={estilos.boton}>➕ {productoEditandoIdx !== null ? "Guardar edición" : "Agregar producto"}</button>
      </div>

      {Object.entries(productosAgrupadosVisual).map(([prov, lista], idx) => (
        <div key={idx}>
          <h3 style={estilos.subtitulo}>🧾 Proveedor: {prov}</h3>
          <table style={{ width: "100%", marginTop: "1rem", color: "#EFE4CF" }}>
            <thead>
              <tr>
                <th>Producto</th><th>Marca</th><th>Cantidad</th><th>Unidad</th><th>Precio</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p, i) => (
                <tr key={i}>
                  <td>{p.producto}</td><td>{p.marca}</td><td>{p.cantidad}</td><td>{p.unidad}</td><td>${p.precio}</td>
                  <td>
                    <button onClick={() => editarProducto(productos.indexOf(p))}>✏️</button>
                    <button onClick={() => borrarProducto(productos.indexOf(p))}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {productos.length > 0 && (
        <button onClick={guardarCompra} style={estilos.boton}>💾 {editando ? "Guardar cambios" : "Guardar compra completa"}</button>
      )}

      <h2 style={estilos.subtitulo}>🧾 Historial de Compras</h2>
      {compras.map((c) => (
        <div key={c.id} style={{ marginBottom: "1.5rem", background: "#1c2541", padding: "1rem", borderRadius: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong>{c.fecha}</strong> - <em>{c.responsable}</em> {c.proveedor && `- ${c.proveedor}`}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => editarCompra(c)} style={estilos.boton}>✏️ Editar</button>
              <button onClick={() => eliminarCompra(c.id)} style={estilos.boton}>🗑️ Eliminar</button>
            </div>
          </div>
          {c.productos.map((p, idx) => (
            <div key={idx} style={{ fontSize: "0.9rem", paddingLeft: "1rem" }}>
              ▪ {p.producto} ({p.marca}) - {p.cantidad} {p.unidad} a ${p.precio} [{p.proveedor}]
            </div>
          ))}
        </div>
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
  formulario: { display: "flex", flexDirection: "column", gap: "0.8rem", maxWidth: "500px" },
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
};
