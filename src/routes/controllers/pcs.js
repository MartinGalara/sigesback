const { Router } = require("express");
const { Pc, Client } = require("../../db.js");
const { Op } = require("sequelize");

const router = Router();

// Ruta para obtener una computadora por ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (id) {
      const computer = await Pc.findByPk(id);
      return res.status(200).json(computer);
    } else {
      return res.status(400).send("Missing id");
    }
  } catch (error) {
    console.log(error.message);
    return res.status(400).send(error.message);
  }
});

// Ruta para obtener todas las computadoras o filtrar por clientId y zona
router.get("/", async (req, res) => {
  const { clientId, area } = req.query;

  try {
    // Si viene clientId (con o sin area)
    if (clientId) {
      let computers;

      // Si viene clientId y area específica
      if (area) {
        if (area === "P") {
          computers = await Pc.findAll({
            where: {
              clientId: clientId,
              area: {
                [Op.in]: ["P", "N", "L", "B", "R"],
              },
            },
          });
        } else if (area === "A") {
          computers = await Pc.findAll({
            where: {
              clientId: clientId,
              area: {
                [Op.in]: ["A", "S", "V"],
              },
            },
          });
        } else {
          computers = await Pc.findAll({
            where: {
              clientId: clientId,
              area: area,
            },
          });
        }
      } else {
        // Si solo viene clientId (sin area), traer todas las PCs de ese cliente
        computers = await Pc.findAll({
          where: {
            clientId: clientId,
          },
        });
      }

      return res.status(200).json(computers);
    }

    // Si no viene clientId, traer todas las computadoras con información del cliente
    const allComputers = await Pc.findAll({
      include: {
        model: Client,
      },
    });

    return res.status(200).json(allComputers);
  } catch (error) {
    console.log(error.message);
    return res.status(400).send(error.message);
  }
});

// Ruta para actualizar una computadora por ID
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    alias,
    teamviewer_id,
    razonSocial,
    bandera,
    identificador,
    ciudad,
    area,
    prefijo,
    extras,
    clientId,
  } = req.body;

  try {
    const computerToUpdate = await Pc.findByPk(id);
    await computerToUpdate.update({
      alias,
      teamviewer_id,
      razonSocial,
      bandera,
      identificador,
      ciudad,
      area,
      prefijo,
      extras,
      clientId,
    });
    return res.status(200).send("Listo");
  } catch (error) {
    console.log(error.message);
    return res.status(400).send(error.message);
  }
});

router.put("/", async (req, res) => {
  const { from } = req.query;

  if (from === "tv") {
    const {
      alias,
      teamviewer_id,
      razonSocial,
      bandera,
      identificador,
      ciudad,
      area,
      prefijo,
      extras,
      clientId,
    } = req.body;

    try {
      const computersToUpdate = await Pc.findAll({
        where: {
          teamviewer_id,
        },
      });

      if (computersToUpdate.length) {
        // Actualiza cada computadora en el bucle forEach
        computersToUpdate.forEach(async (computer) => {
          await computer.update({
            teamviewer_id,
            razonSocial,
            bandera,
            identificador,
            ciudad,
            area,
            prefijo,
            extras,
            clientId,
          });
        });

        return res.status(200).send("Listo");
      } else {
        const computerCreate = await Pc.create({
          alias,
          teamviewer_id,
          razonSocial,
          bandera,
          identificador,
          ciudad,
          area,
          prefijo,
          extras,
          clientId,
        });

        return res.status(200).json(computerCreate);
      }
    } catch (error) {
      console.log(error.message);
      return res.status(400).send(error.message);
    }
  }
});

// Ruta para crear una nueva computadora
router.post("/", async (req, res) => {
  const {
    alias,
    teamviewer_id,
    razonSocial,
    bandera,
    identificador,
    ciudad,
    area,
    prefijo,
    extras,
    clientId,
  } = req.body;

  try {
    const pc = await Pc.findAll({
      where: {
        teamviewer_id,
      },
    });

    if (pc.length) {
      const pcToUpdate = await Pc.findOne({
        where: { teamviewer_id },
      });

      await pcToUpdate.update({
        alias,
        teamviewer_id,
        razonSocial,
        bandera,
        identificador,
        ciudad,
        area,
        prefijo,
        extras,
        clientId,
      });

      return res.status(201).json(pcToUpdate);
    }

    // Crea una nueva computadora en la base de datos
    const newComputer = await Pc.create({
      alias,
      teamviewer_id,
      razonSocial,
      bandera,
      identificador,
      ciudad,
      area,
      prefijo,
      extras,
      clientId,
    });

    return res.status(201).json(newComputer);
  } catch (error) {
    console.log(error.message);
    return res.status(400).send(error.message);
  }
});

module.exports = router;
