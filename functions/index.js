// functions/index.js

// Asegúrate que estas líneas estén al principio si no lo están ya
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

// Inicializar admin solo una vez
try {
  admin.initializeApp();
} catch (e) {
  console.log("Admin already initialized.");
}

const db = admin.firestore();

// Helper (sin cambios)
const getSpanishDayName = (date) => {
  if (!(date instanceof Date)) {
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const parts = date.split('-');
      date = new Date(Date.UTC(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
      ));
    } else {
      console.error("Fecha inválida para getSpanishDayName:", date);
      return "ErrorDia";
    }
  }
  const days = [
    "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado",
  ];
  return days[date.getUTCDay()];
};

// --- Función crearReservaConValidacion ---
exports.crearReservaConValidacion = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const {
      nombre, dni, nacimiento, email, telefono, sector,
      fecha, horario, personas, restricciones,
    } = req.body;

    // Validación básica de campos (puedes añadir más)
    const camposObligatoriosBase = [
      "nombre", "dni", "nacimiento", "email", "telefono",
      "fecha", "horario", "personas",
    ];
    const camposActualesObligatorios = personas === "evento_privado" ?
      camposObligatoriosBase :
      [...camposObligatoriosBase, "sector"];

    for (const campo of camposActualesObligatorios) {
      if (!req.body[campo]) {
        // Línea larga dividida
        return res.status(400).json({
          error: `Campo obligatorio faltante: ${campo}`,
        });
      }
    }
// functions/index.js (Asegúrate que esta función esté presente y correcta)

// ... (imports de functions, admin, db, etc.) ...

exports.actualizarStockPorCompra = functions.firestore
  .document('comprasAura/{compraId}') // Escucha la colección de compras
  .onCreate(async (snap, context) => {
    const compraData = snap.data();
    // <<< Asegúrate que el nombre del array sea 'items' o ajústalo >>>
    const items = compraData.items;

    if (!items || items.length === 0) {
      console.log(`Compra ${context.params.compraId} sin items, no se actualiza stock.`);
      return null;
    }

    console.log(`Procesando compra ${context.params.compraId} para actualizar stock...`);

    const updatesPromises = items.map(async (item) => {
      // <<< Asegúrate que los nombres de campo sean correctos >>>
      const stockItemId = item.stockItemId;
      const cantidadComprada = item.cantidadComprada;

      if (!stockItemId || typeof cantidadComprada !== 'number' || cantidadComprada <= 0) {
        console.error(`Item inválido en compra ${context.params.compraId}:`, item);
        return null; // Saltar este item
      }

      // <<< Asegúrate que el nombre de la colección de stock sea correcto >>>
      const stockItemRef = db.collection('articulosAura').doc(stockItemId);

      try {
        // Usar increment para la actualización atómica
        await stockItemRef.update({
          cantidadActual: admin.firestore.FieldValue.increment(cantidadComprada)
        });
        console.log(`Stock actualizado para item ${stockItemId} (+${cantidadComprada})`);
        return true;

      } catch (error) {
        console.error(`Error actualizando stock para item ${stockItemId} en compra ${context.params.compraId}:`, error);
        // Podrías intentar crear el campo si no existe? O solo loguear.
        // Ejemplo si el campo 'cantidadActual' no existiera:
        if (error.code === 5) { // Código de Firestore para 'NOT_FOUND' (puede variar)
             console.log(`Campo cantidadActual no existe para ${stockItemId}, intentando inicializar.`);
             try {
                 // Intenta establecerlo en la cantidad comprada si no existe
                 await stockItemRef.set({ cantidadActual: cantidadComprada }, { merge: true });
                 console.log(`Stock inicializado para item ${stockItemId} en ${cantidadComprada}`);
                 return true;
             } catch (initError) {
                 console.error(`Error inicializando stock para ${stockItemId}:`, initError);
                 return null;
             }
        }
        return null; // Indicar fallo para este item
      }
    });

    // Esperar a que todas las actualizaciones terminen
    await Promise.all(updatesPromises);
    console.log(`Stock actualizado para compra ${context.params.compraId}`);
    return null;
  });

// ... (Tu función crearReservaConValidacion y otras) ...

    // *** CORRECCIÓN: Declarar con const y usar el nombre correcto ***
    const personasSolicitadas = personas === "evento_privado" ?
      0 : // Para eventos, no contamos numéricamente aquí
      parseInt(personas, 10);

    // Validar que personas sea un número válido si no es evento
    if (personas !== "evento_privado" && isNaN(personasSolicitadas)) {
      return res.status(400).json({ error: "Cantidad de personas inválida" });
    }

    try {
      // Cargar configuración de turnos
      const configRef = doc(db, "configuracionAura", "turnosHorarios");
      const configSnap = await getDoc(configRef);

      if (!configSnap.exists()) {
        // Línea larga dividida
        return res.status(500).json({
          error: "Error interno: No se encontró configuración de turnos.",
        });
      }
      const configData = configSnap.data();

      // Validar día y horario según configuración
      const parts = fecha.split('-');
      const fechaObj = new Date(Date.UTC(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
      ));
      const diaSemana = getSpanishDayName(fechaObj);

      if (!configData[diaSemana] || !configData[diaSemana].visible) {
        return res.status(400).json({ error: "No hay reservas para este día." });
      }

      const turnoConfig = configData[diaSemana].turnos.find(
          (t) => t.hora === horario && t.activo,
      );

      if (!turnoConfig) {
        // Línea larga dividida
        return res.status(400).json({
          error: "El horario seleccionado no está disponible o no es válido.",
        });
      }

      // *** Lógica de Transacción ***
      await db.runTransaction(async (transaction) => {
        // Referencia a las reservas para esa fecha y hora
        const reservasRef = collection(db, "reservasAura");
        const q = query(
            reservasRef,
            where("fecha", "==", fecha),
            where("horario", "==", horario),
            // Añadir filtro por estado si es necesario (ej: solo confirmadas)
            // where("estado", "==", "confirmada")
        );

        const snapshot = await transaction.get(q);
        let personasActuales = 0;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Sumar solo si no es evento privado y es un número
          if (data.personas !== "evento_privado" &&
              typeof data.personas === 'number') {
            personasActuales += data.personas;
          }
          // Considerar si reservas de evento privado ocupan toda la capacidad
          if (data.personas === "evento_privado") {
              // Si ya hay un evento privado, no permitir más reservas numéricas
              // O si se intenta reservar numéricamente y hay evento, fallar
              // O si se intenta reservar evento y ya hay numéricas/otro evento
              // Esta lógica depende de tus reglas de negocio exactas
              // Por ahora, asumimos que un evento bloquea todo
              personasActuales = Infinity; // Forma simple de bloquear
          }
        });

        // Obtener capacidad del turno
        const capacidadTurno = turnoConfig.capacidad || 0;

        // Validar capacidad (considerando evento privado)
        if (personas === "evento_privado") {
            // Si se intenta reservar evento y ya hay gente o otro evento
            if (personasActuales > 0) {
                // Línea larga dividida
                throw new Error(
                    "Conflicto: Ya existen reservas para este horario," +
                    " no se puede registrar como evento privado.",
                );
            }
            // Si es evento, la capacidad numérica no importa directamente aquí
            // pero la reserva marcará el slot como ocupado por evento
        } else {
            // Si se intenta reservar numéricamente
            if (personasActuales === Infinity) { // Si ya hay un evento
                // Línea larga dividida
                throw new Error(
                    "Conflicto: Este horario está reservado para un evento privado.",
                );
            }
            // *** CORRECCIÓN: Usar la variable correcta ***
            if (personasActuales + personasSolicitadas > capacidadTurno) {
                // Línea larga dividida
                throw new Error(
                    `Capacidad excedida. Disponibles: ${capacidadTurno - personasActuales}`,
                );
            }
        }


        // Si pasa la validación, crear la nueva reserva DENTRO de la transacción
        const nuevaReservaRef = doc(collection(db, "reservasAura"));
        transaction.set(nuevaReservaRef, {
          nombre,
          dni,
          nacimiento,
          email,
          telefono,
          sector: personas === "evento_privado" ? "Evento Privado" : sector,
          fecha,
          horario,
          // Guardar 'evento_privado' o el número
          personas: personas === "evento_privado" ?
            "evento_privado" :
            personasSolicitadas,
          restricciones: restricciones || "",
          timestamp: Timestamp.now(),
          // Estado inicial: 'confirmada' o 'pendiente_evento'
          estado: personas === "evento_privado" ?
            "pendiente_evento" :
            "confirmada",
        });
      }); // Fin de la transacción

      // Si la transacción fue exitosa
      // Línea larga dividida
      res.status(201).json({
        success: true,
        message: "Reserva creada con éxito.",
      });

    } catch (error) {
      console.error("Error en transacción o validación:", error);
      // Devolver error específico de capacidad si es el caso
      if (error.message.includes("Capacidad excedida") ||
          error.message.includes("Conflicto")) {
        return res.status(409).json({ success: false, error: error.message });
      }
      // Devolver error genérico para otros problemas
      // Línea larga dividida
      return res.status(500).json({
        success: false,
        error: "Error interno al procesar la reserva.",
      });
    }
  });
});

// --- Función actualizarStockPorCompra (Asegúrate que esté aquí) ---
// (El código de esta función que te pasé antes debería estar aquí)
// ...
exports.actualizarStockPorCompra = functions.firestore
    .document('comprasAura/{compraId}')
    .onCreate(async (snap, context) => {
        // ... (código completo de la función) ...
        // Asegúrate que las líneas largas aquí también estén divididas si es necesario
    });
// ...
