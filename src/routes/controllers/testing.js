const { Router } = require("express");
const { Botticket } = require("../../db.js");
const { Botuser } = require("../../db.js");
const { Client } = require("../../db.js");
const { Pc } = require("../../db.js");

const router = Router();

// Ruta GET para pruebas
router.get("/", async (req, res) => {
  try {
    return res.status(200).json("Testing");
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

router.get("/bottickets", async (req, res) => {
  try {
    const bottickets = await Botticket.findAll();

    return res.status(200).json(bottickets);
  } catch (error) {
    return res.status(400).send(error.message);
  }
});

router.get("/botusers", async (req, res) => {
  try {
    const botusers = await Botuser.findAll();

    return res.status(200).json(botusers);
  } catch (error) {
    return res.status(400).send(error.message);
  }
});

router.get("/clients", async (req, res) => {
  try {
    const clients = await Client.findAll();

    return res.status(200).json(clients);
  } catch (error) {
    return res.status(400).send(error.message);
  }
});

router.get("/pcs", async (req, res) => {
  try {
    const pcs = await Pc.findAll();

    return res.status(200).json(pcs);
  } catch (error) {
    return res.status(400).send(error.message);
  }
});

router.get("/client-botusers", async (req, res) => {
  try {
    // Encuentra todos los clientes con sus botusers asociados
    const clients = await Client.findAll({
      include: {
        model: Botuser,
        through: { attributes: [] }, // Esto asegura que no se devuelvan los atributos de la tabla intermedia
      },
    });

    return res.status(200).json(clients);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
});

module.exports = router;
