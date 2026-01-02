const { Router } = require("express");
const { Botticket } = require("../../db.js");
const { Botuser } = require("../../db.js");
const { Client } = require("../../db.js");
const { Pc } = require("../../db.js");

const { conn } = require("../../db"); // Importa la conexión desde db.js

const router = Router();

router.get("/adjust", async (req, res) => {
  const newIdValue = 180; // Establece el valor fijo que deseas

  try {
    // Ajusta la secuencia al nuevo valor proporcionado
    await conn.query(`SELECT setval('pcs_id_seq', ${newIdValue})`);

    return res.status(200).json({ message: "Secuencia ajustada correctamente", newIdValue });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete("/botusers", async (req, res) => {
  try {
    await Botuser.destroy({ where: {} }); // Elimina todos los registros de la tabla Botticket
    return res
      .status(200)
      .json({ message: "Todos los Botuser han sido eliminados correctamente." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al eliminar los Botuser de la base de datos." });
  }
});

router.post("/botusers", async (req, res) => {
  try {
    // Obtener todos los botusers existentes
    const existingBotusers = await Botuser.findAll({
      attributes: ["id"], // Solo necesitamos los IDs
      order: [["id", "ASC"]], // Ordenar por ID para facilitar el análisis
    });

    // Crear un array con los IDs existentes
    const existingIds = existingBotusers.map((user) => user.id);

    // Identificar los IDs faltantes en la secuencia
    const missingIds = [];
    const maxId = Math.max(...existingIds); // Obtener el ID más alto
    for (let i = 1; i <= maxId; i++) {
      if (!existingIds.includes(i)) {
        missingIds.push(i); // Agregar ID faltante al array
      }
    }

    // Crear los botusers faltantes con información dummy
    for (const missingId of missingIds) {
      await Botuser.create({
        id: missingId, // Se puede incluir el ID faltante
        name: `DummyUser${missingId}`,
        phone: `000000000${missingId}`,
        createUser: false,
        canSOS: false,
        adminPdf: false,
        manager: false,
        area: "P", // Valor predeterminado para el campo ENUM
        email: `dummy${missingId}@example.com`,
        createdBy: "system",
      });
    }

    return res
      .status(201)
      .json({ message: "Botusers faltantes insertados correctamente.", missingIds });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al procesar los botusers." });
  }
});

router.post("/clients", async (req, res) => {
  const { clients } = req.body; // El array se espera en el campo `tickets` del cuerpo

  if (!Array.isArray(clients)) {
    return res
      .status(400)
      .json({ message: "El cuerpo de la solicitud debe contener un array de clients." });
  }

  try {
    for (const client of clients) {
      await Client.create(client); // Inserta cada ticket uno a uno
    }
    return res.status(201).json({ message: "clients insertados correctamente." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al insertar clients en la base de datos." });
  }
});

router.post("/pcs", async (req, res) => {
  const { pcs } = req.body; // El array se espera en el campo `tickets` del cuerpo

  if (!Array.isArray(pcs)) {
    return res
      .status(400)
      .json({ message: "El cuerpo de la solicitud debe contener un array de pcs." });
  }

  try {
    for (const pc of pcs) {
      await Pc.create(pc); // Inserta cada ticket uno a uno
    }
    return res.status(201).json({ message: "pcs insertados correctamente." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al insertar pcs en la base de datos." });
  }
});

router.post("/client-botuser-relations", async (req, res) => {
  const { clients } = req.body; // Se espera que todo el array de clientes venga en el cuerpo de la solicitud

  if (!Array.isArray(clients)) {
    return res
      .status(400)
      .json({ message: "El cuerpo de la solicitud debe contener un array de clientes." });
  }

  try {
    for (const client of clients) {
      // Buscar o crear el cliente en la base de datos (opcional, si ya existe el cliente solo se puede asociar)
      const foundClient = await Client.findByPk(client.id);

      if (foundClient && Array.isArray(client.botusers)) {
        for (const botuser of client.botusers) {
          const foundBotUser = await Botuser.findByPk(botuser.id);

          if (foundBotUser) {
            // Relacionar el cliente con el botuser usando el método de Sequelize
            await foundClient.addBotuser(foundBotUser); // Esto inserta en la tabla intermedia automáticamente
          }
        }
      }
    }

    return res.status(201).json({ message: "Relaciones insertadas correctamente." });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error al insertar las relaciones en la base de datos." });
  }
});

module.exports = router;
