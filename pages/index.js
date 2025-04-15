// pages/index.js
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Cookies from "js-cookie"; // Solo un import de js-cookie ✅

export default function Home() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const inputRef = useRef(null);

  const accederAdmin = () => {
  const usuariosGuardados = JSON.parse(localStorage.getItem("usuariosAura")) || [];

  const usuarioMadre = { contraseña: "Aura2025", rol: "Administrador" };
  const todosLosUsuarios = [usuarioMadre, ...usuariosGuardados];

  const usuarioValido = todosLosUsuarios.find((u) => u.contraseña === password);

  if (usuarioValido) {
    localStorage.setItem("adminAutorizado", "true");
    Cookies.set("adminAutorizado", "true");
    localStorage.setItem("rolActivo", usuarioValido.rol);
    router.push("/admin");
  } else {
    alert("Contraseña incorrecta");
  }
};

  useEffect(() => {
    if (showAdmin && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showAdmin]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && showAdmin && password !== "") {
      accederAdmin();
    }
  };

  const toggleAdminBox = () => {
    setShowAdmin((prev) => !prev);
  };

  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <div style={estilos.contenedor}>
        <img src="/logo-aura.png" alt="AURA" style={estilos.logoImg} />

        <div style={estilos.botones}>
          <button style={estilos.boton} onClick={() => router.push("/reservas")}>
            Reservas
          </button>
          <button style={estilos.boton} onClick={() => router.push("/menu")}>
            Menú
          </button>

          {showAdmin && (
            <div style={estilos.adminBox}>
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                style={estilos.input}
                ref={inputRef}
              />
              <button
                style={{ ...estilos.boton, ...estilos.botonAdmin }}
                onClick={accederAdmin}
              >
                Ingresar
              </button>
            </div>
          )}
        </div>

        <img
          src="/candado-admin.png"
          alt="admin"
          style={estilos.candado}
          onClick={toggleAdminBox}
          onKeyDown={(e) => e.key === "Enter" && toggleAdminBox()}
          tabIndex={0}
          title="Acceso administrador"
        />
      </div>
    </>
  );
}

const estilos = {
  contenedor: {
    backgroundImage: "url('/fondo-cuero.jpg')",
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
    width: "240px",
    margin: "2rem 0 3rem 0",
  },
  botones: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.3rem",
    width: "100%",
    maxWidth: "350px",
  },
  boton: {
    backgroundImage: "url('/boton-madera.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    color: "#2c1b0f",
    fontSize: "1.4rem",
    padding: "0.6rem 1.8rem",
    borderRadius: "14px",
    border: "none",
    width: "100%",
    textAlign: "center",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
    textShadow: "1px 1px 0 #00000088, 2px 2px 1px #00000055",
    boxShadow: "0 6px 12px rgba(0,0,0,0.3)",
    transition: "transform 0.1s ease, box-shadow 0.1s ease",
  },
  botonAdmin: {
    backgroundColor: "#806C4F",
    color: "#EFE4CF",
    backgroundImage: "none",
    textShadow: "1px 1px 0 #00000088, 2px 2px 1px #00000055",
  },
  input: {
    padding: "0.6rem 1rem",
    borderRadius: "12px",
    border: "none",
    fontSize: "1.1rem",
    backgroundColor: "#EFE4CF",
    color: "#2c1b0f",
    width: "100%",
    textAlign: "center",
    fontFamily: "'Space Grotesk', sans-serif",
    textShadow: "1px 1px 0 #00000088, 2px 2px 1px #00000055",
  },
  adminBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  },
  candado: {
    position: "absolute",
    bottom: "20px",
    width: "32px",
    height: "32px",
    cursor: "pointer",
    opacity: 0.6,
  },
};

// Estilo global para efecto al presionar botones:
if (typeof window !== 'undefined') {
  document.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') e.target.style.transform = 'scale(0.97)';
  });
  document.addEventListener('mouseup', (e) => {
    if (e.target.tagName === 'BUTTON') e.target.style.transform = 'scale(1)';
  });
}
