// pages/panel/index.js
import { useRouter } from "next/router";
import { useEffect } from "react";
import Cookies from "js-cookie";

export default function PanelPrincipal() {
  const router = useRouter();

  useEffect(() => {
    const autorizado = localStorage.getItem("adminAutorizado") === "true" || Cookies.get("adminAutorizado") === "true";
    if (!autorizado) {
      router.push("/");
    }
  }, [router]);

  const botones = [
    { texto: "📊 Panel Administrativo", ruta: "/admin" },
    { texto: "📥 Control de Compras", ruta: "/compras" },
    { texto: "📦 Control de Stock", ruta: "/control-stock" },
    { texto: "💵 Control de Ventas", ruta: "/ventas" },
    { texto: "📈 Reportes y Auditoría", ruta: "/reportes" },
  ];

  return (
    <div style={estilos.contenedor}>
      <img src="/logo-aura.png" alt="AURA" style={estilos.logoImg} />
      <div style={estilos.botones}>
        {botones.map((btn, idx) => (
          <button key={idx} style={estilos.boton} onClick={() => router.push(btn.ruta)}>
            {btn.texto}
          </button>
        ))}
      </div>
    </div>
  );
}

const estilos = {
  contenedor: {
    backgroundImage: "url('/fondo-cuero.jpg')",
    backgroundAttachment: "fixed",
    backgroundSize: "cover",
    backgroundPosition: "center",
    minHeight: "100vh",
    padding: "2rem 1rem 3rem 1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    fontFamily: "'Space Grotesk', sans-serif",
    position: "relative",
  },
  logoImg: {
    width: "220px",
    margin: "1.5rem 0 2.5rem 0",
  },
  botones: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.2rem",
    width: "100%",
    maxWidth: "340px",
  },
  boton: {
    backgroundColor: "#EFE4CF",
    color: "#2c1b0f",
    fontSize: "1.3rem",
    padding: "0.6rem 1.6rem",
    borderRadius: "14px",
    border: "1px solid #b49f82",
    width: "100%",
    textAlign: "center",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
    transition: "transform 0.1s ease, box-shadow 0.1s ease",
  },
};
