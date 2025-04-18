// pages/panel/index.js
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react"; // Añadido useState
import Cookies from "js-cookie";
// <<< AÑADIR SI VAS A CHEQUEAR PERMISOS AQUÍ >>>
// import { db } from '../firebase/firebaseConfig'; // Ajusta la ruta
// import { collection, getDocs } from 'firebase/firestore';

export default function PanelPrincipal() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true); // Estado de carga inicial
  const [usuario, setUsuario] = useState(null); // Estado para guardar info del usuario
  // <<< ESTADOS OPCIONALES PARA PERMISOS >>>
  // const [permisos, setPermisos] = useState(null);
  // const [loadingPermisos, setLoadingPermisos] = useState(true);

  useEffect(() => {
    setIsLoading(true); // Iniciar carga
    const autorizado = localStorage.getItem("adminAutorizado") === "true" || Cookies.get("adminAutorizado") === "true";
    const usuarioLogueado = localStorage.getItem('usuarioAura');

    if (!autorizado || !usuarioLogueado) {
      router.replace("/"); // Redirigir si falta autorización o datos de usuario
    } else {
      setUsuario(JSON.parse(usuarioLogueado));
      // <<< LÓGICA OPCIONAL PARA CARGAR PERMISOS >>>
      /*
      const fetchPermisos = async () => {
          setLoadingPermisos(true);
          try {
              const permisosSnapshot = await getDocs(collection(db, "permisosAura"));
              if (!permisosSnapshot.empty) {
                  setPermisos(permisosSnapshot.docs[0].data());
              }
          } catch (error) {
              console.error("Error cargando permisos en panel:", error);
          } finally {
              setLoadingPermisos(false);
          }
      };
      fetchPermisos();
      */
      setIsLoading(false); // Terminar carga si está autorizado
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // Ejecutar solo si cambia el router

  const handleLogout = () => {
    localStorage.removeItem('usuarioAura');
    localStorage.removeItem('adminAutorizado');
    Cookies.remove('adminAutorizado');
    router.push('/');
  };

  // <<< LÓGICA OPCIONAL PARA VERIFICAR PERMISOS >>>
  /*
  const tieneAcceso = (seccion) => {
      if (loadingPermisos || !usuario || !permisos) return false;
      const rol = usuario.rol;
      // Asumiendo que el dueño tiene acceso total (ajusta la condición si es necesario)
      if (usuario.contraseña === 'Aura2025') return true;
      return permisos?.[seccion]?.[rol] && permisos[seccion][rol] !== 'no';
  };
  */

  // Mostrar "Cargando..." mientras se verifica
  if (isLoading) {
      return <div style={estilos.loadingContainer}>Cargando...</div>;
  }

  // Definición de botones (Añadido Caja)
  const botones = [
    { texto: "📊 Panel Administrativo", ruta: "/admin", seccion: 'reservas' }, // O 'seguridad' si prefieres
    { texto: "⏱️ Gestión de Turnos", ruta: "/turnos-caja", seccion: 'turnosCaja' },
    { texto: "💰 Caja", ruta: "/caja", seccion: 'ventasCaja' }, // <<< AÑADIDO >>>
    { texto: "📥 Control de Compras", ruta: "/compras", seccion: 'compras' },
    { texto: "📦 Control de Stock", ruta: "/control-stock", seccion: 'stock' },
    { texto: "🍹 Recetas", ruta: "/recetas", seccion: 'recetas' }, // Añadir esta línea
    { texto: "💵 Control de Ventas", ruta: "/ventas" },
    { texto: "📈 Reportes y Auditoría", ruta: "/reportes" },
  ];

  return (
    <div style={estilos.contenedor}>
      <img src="/logo-aura.png" alt="AURA" style={estilos.logoImg} />
      <p style={estilos.bienvenida}>
          Bienvenido, {usuario?.nombre || 'Usuario'} ({usuario?.rol || 'Rol desconocido'})
      </p>

      <div style={estilos.botones}>
        {botones.map((btn, idx) => (
          // <<< Envolver en condición de permiso (comentado por ahora) >>>
          /* {tieneAcceso(btn.seccion) && ( */
            <button key={idx} style={estilos.boton} onClick={() => router.push(btn.ruta)}>
              {btn.texto}
            </button>
          /* )} */
        ))}
      </div>

      <button style={estilos.botonLogout} onClick={handleLogout}>
          Cerrar Sesión
      </button>
    </div>
  );
}

// --- Estilos (Añadidos estilos para bienvenida, logout y loading) ---
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
    justifyContent: "flex-start", // Alinear arriba
    fontFamily: "'Space Grotesk', sans-serif",
    position: "relative",
  },
  logoImg: {
    width: "200px", // Un poco más pequeño
    margin: "1rem 0 2rem 0", // Ajustar márgenes
  },
  bienvenida: {
    fontSize: '1.1rem',
    color: '#D3C6A3',
    marginBottom: '2rem',
    textAlign: 'center',
  },
  botones: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.2rem",
    width: "100%",
    maxWidth: "360px", // Ligeramente más ancho
    marginBottom: '3rem', // Espacio antes del logout
  },
  boton: {
    backgroundColor: "#EFE4CF", // Crema
    color: "#2c1b0f", // Marrón oscuro
    fontSize: "1.2rem", // Ligeramente más pequeño
    padding: "0.8rem 1.6rem", // Ajustar padding
    borderRadius: "14px",
    border: "1px solid #b49f82", // Borde sutil
    width: "100%",
    textAlign: "center",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
    transition: "transform 0.1s ease, box-shadow 0.1s ease",
    // Estilos hover se manejan mejor con CSS Modules o Tailwind
  },
  botonLogout: {
    backgroundColor: '#b71c1c', // Rojo oscuro
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.7rem 1.5rem',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: 'auto', // Empujar al final
    // '&:hover': { backgroundColor: '#9a1010' }, // Oscurecer al pasar el mouse
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#0A1034',
    color: '#EFE4CF',
    fontSize: '1.5rem',
  },
};
