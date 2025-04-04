
export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A1034] text-white p-6 font-sans">
      <div className="max-w-xl mx-auto space-y-4">
        <input
          type="text"
          placeholder="Nombre y Apellido"
          className="w-full p-3 rounded-xl bg-[#EFE4CF] text-gray-700"
        />
        <input
          type="text"
          placeholder="DNI"
          className="w-full p-3 rounded-xl bg-[#EFE4CF] text-gray-700"
        />
        <input
          type="date"
          name="nacimiento"
          placeholder="Fecha de nacimiento"
          className="w-full p-3 rounded-xl bg-[#EFE4CF] text-gray-700"
        />
        <label className="text-[#D3C6A3] block">Fecha y hora de reserva</label>
        <input
          type="date"
          name="fecha"
          className="w-full p-3 rounded-xl bg-[#EFE4CF] text-gray-700"
        />
        <input
          type="time"
          name="horario"
          className="w-full p-3 rounded-xl bg-[#EFE4CF] text-gray-700"
        />
      </div>
    </main>
  );
}
