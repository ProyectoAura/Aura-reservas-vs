import Link from "next/link";

export default function Admin() {
  return (
    <div style={{ color: "white", padding: "2rem" }}>
      <h1>Panel de Administrador</h1>
      <ul style={{ marginTop: "1rem", listStyle: "none", padding: 0 }}>
        <li><Link href="/admin/reservas">📋 Reservas</Link></li>
        <li><Link href="/admin/turnos">🕒 Turnos y Horarios</Link></li>
        <li><Link href="/admin/sectores">🪑 Mesas y Sectores</Link></li>
        <li><Link href="/admin/usuarios">🔐 Seguridad y Usuarios</Link></li>
        <li><Link href="/admin/estadisticas">📊 Panel Principal</Link></li>
        <li><Link href="/admin/exportacion">📤 Exportación de Datos</Link></li>
      </ul>
    </div>
  );
}
