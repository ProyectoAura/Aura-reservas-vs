// pages/index.js
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Cookies from "js-cookie";
import { getDocs, collection } from "firebase/firestore";
// <<< CORRECCIÓN IMPORTACIÓN DB >>>
// Asegúrate que la ruta sea correcta. Si firebaseConfig.js está en la raíz,
// y pages está en la raíz, debería ser:
import { db } from "../firebaseConfig";
// O si lib está en la raíz: import { db } from "../lib/firebase";

export default function Home() {
  const router = useRouter();
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const inputRef = useRef(null);

  const accederAdmin = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "usuariosAura"));
      const usuariosGuardados = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // <<< ¡¡¡CORRECCIÓN APLICADA AQUÍ!!! >>>
      const usuarioMadre = {
        id: "ADMIN_MADRE", // ID único para el usuario madre
        nombre: "admin",
        dni: "0000",
        contraseña: "Aura2025",
        rol: "Administrador"
      };
      // <<< FIN CORRECCIÓN >>>

      const todosLosUsuarios = [usuarioMadre, ...usuariosGuardados];

      const usuarioValido = todosLosUsuarios.find((u) => {
        // Permitir acceso al usuario madre si solo se ingresa la contraseña madre
        // Asegurarse que la comparación sea estricta
        if (!dni && u.contraseña === password && u.id === "ADMIN_MADRE") return true;
        // Acceso normal por DNI y contraseña
        return u.dni === dni && u.contraseña === password;
      });

      if (usuarioValido) {
        localStorage.setItem("adminAutorizado", "true");
        Cookies.set("adminAutorizado", "true");
        localStorage.setItem("rolActivo", usuarioValido.rol);
        // Ahora usuarioValido (sea madre o de DB) siempre tendrá un 'id'
        localStorage.setItem("usuarioAura", JSON.stringify(usuarioValido));
        router.push("/panel");
      } else {
        alert("DNI o contraseña incorrectos");
      }
    } catch (e) {
      console.error("Error al acceder:", e);
      alert("Error al intentar ingresar. Intenta nuevamente.");
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

  // --- Renderizado (sin cambios) ---
  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <div style={estilos.contenedor}>
        <div style={estilos.logoYBotones}>
          <img src="/logo-aura.png" alt="AURA" style={estilos.logoImg} />
          <div style={estilos.botones}>
            <button style={estilos.boton} onClick={() => router.push("/reservas")}>Reservas</button>
            <button style={estilos.boton} onClick={() => router.push("/menu")}>Menú</button>
            {showAdmin && (
              <div style={estilos.adminBox}>
                <input type="text" placeholder="DNI" value={dni} onChange={(e) => setDni(e.target.value)} style={estilos.input} />
                <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} style={estilos.input} ref={inputRef} />
                <button style={{ ...estilos.boton, ...estilos.botonAdmin }} onClick={accederAdmin}>Ingresar</button>
              </div>
            )}
          </div>
        </div>
        <div style={estilos.candadoContainer}>
          <img src="/candado-admin.png" alt="admin" style={estilos.candado} onClick={toggleAdminBox} onKeyDown={(e) => e.key === "Enter" && toggleAdminBox()} tabIndex={0} title="Acceso administrador" />
        </div>
      </div>
    </>
  );
}

// --- Estilos (sin cambios) ---
const estilos = {
  contenedor: { backgroundImage: "url('/fondo-cuero.jpg')", backgroundAttachment: "fixed", backgroundSize: "cover", backgroundPosition: "center", minHeight: "100vh", padding: "2rem 1rem 3rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", fontFamily: "'Space Grotesk', sans-serif", position: "relative", },
  logoYBotones: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", width: "100%", maxWidth: "500px", marginTop: "2rem", },
  logoImg: { width: "240px", marginBottom: "2rem", },
  botones: { display: "flex", flexDirection: "column", alignItems: "center", gap: "1.3rem", width: "100%", maxWidth: "350px", },
  boton: { backgroundImage: "url('/boton-madera.jpg')", backgroundSize: "cover", backgroundPosition: "center", color: "#2c1b0f", fontSize: "1.4rem", padding: "0.6rem 1.8rem", borderRadius: "14px", border: "none", width: "100%", textAlign: "center", fontWeight: "500", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", textShadow: "1px 1px 0 #00000088, 2px 2px 1px #00000055", boxShadow: "0 6px 12px rgba(0,0,0,0.3)", transition: "transform 0.1s ease, box-shadow 0.1s ease", },
  botonAdmin: { backgroundColor: "#806C4F", color: "#EFE4CF", backgroundImage: "none", textShadow: "1px 1px 0 #00000088, 2px 2px 1px #00000055", },
  input: { padding: "0.6rem 1rem", borderRadius: "12px", border: "none", fontSize: "1.1rem", backgroundColor: "#EFE4CF", color: "#2c1b0f", width: "100%", textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", textShadow: "1px 1px 0 #00000088, 2px 2px 1px #00000055", marginBottom: "10px", },
  adminBox: { display: "flex", flexDirection: "column", alignItems: "center", width: "100%", },
  candadoContainer: { display: "flex", justifyContent: "center", width: "100%", marginTop: "4rem", },
  candado: { width: "32px", height: "32px", cursor: "pointer", opacity: 0.5, },
};

// --- Efecto para botones (sin cambios) ---
if (typeof window !== 'undefined') { document.addEventListener('mousedown', (e) => { if (e.target.tagName === 'BUTTON') e.target.style.transform = 'scale(0.97)'; }); document.addEventListener('mouseup', (e) => { if (e.target.tagName === 'BUTTON') e.target.style.transform = 'scale(1)'; }); }
