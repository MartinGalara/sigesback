const { Router } = require("express");
const { Botuser, Client, conn } = require("../../db.js");

const router = Router();

// GET all botusers or filter by phone/clientId
router.get("/", async (req, res) => {
  const { phone, clientId } = req.query;
  
  try {
    // Filter by phone
    if (phone) {
      const botUsers = await Botuser.findAll({
        where: {
          phone: phone,
        },
        include: [{
          model: Client,
          through: { attributes: [] }
        }]
      });
      return res.status(200).json(botUsers);
    }

    // Filter by clientId - get botusers for a specific client
    if (clientId) {
      const client = await Client.findByPk(clientId, {
        include: [{
          model: Botuser,
          through: { attributes: [] }, // Exclude join table attributes
          include: [{
            model: Client,
            through: { attributes: [] }
          }]
        }]
      });

      if (!client) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      const botusers = client.Botusers || client.botusers || [];
      return res.status(200).json(botusers);
    }

    // Get all botusers with their clients
    const allBotUsers = await Botuser.findAll({
      include: [{
        model: Client,
        through: { attributes: [] } // Exclude join table attributes
      }]
    });

    return res.status(200).json(allBotUsers);
  } catch (error) {
    return res.status(400).send(error.message);
  }
});

// GET botuser by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const botUser = await Botuser.findByPk(id, {
      include: [{
        model: Client,
        through: { attributes: [] }
      }]
    });

    if (!botUser) {
      return res.status(404).json({ error: "Botuser no encontrado" });
    }

    return res.status(200).json(botUser);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// POST - Create or update botuser
router.post("/", async (req, res) => {
  try {
    const { name, phone, email, createUser, canSOS, adminPdf, manager, area, clientIds, createdBy } =
      req.body;

    // Validate required fields
    if (!phone || !clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({ error: "Teléfono y al menos un clientId son requeridos" });
    }

    // Verify clients exist
    const clients = await Client.findAll({
      where: {
        id: clientIds
      }
    });

    if (clients.length !== clientIds.length) {
      return res.status(404).json({ error: "Uno o más clientes especificados no existen" });
    }

    // Check if botuser exists with this phone
    const existingBotuser = await Botuser.findOne({
      where: {
        phone: phone,
      },
    });

    if (existingBotuser) {
      // Update existing botuser
      await existingBotuser.update({
        name,
        email,
        createUser,
        canSOS,
        adminPdf,
        manager,
        area,
        createdBy,
      });

      // Set clients (this will add new relations and keep existing ones)
      await existingBotuser.addClients(clients);

      // Return with updated relations
      const updatedBotuser = await Botuser.findByPk(existingBotuser.id, {
        include: [{
          model: Client,
          through: { attributes: [] }
        }]
      });

      return res.status(200).json(updatedBotuser);
    } else {
      // Create new botuser
      const newBotuser = await Botuser.create({
        name,
        phone,
        email,
        createUser,
        canSOS,
        adminPdf,
        manager,
        area,
        createdBy,
      });

      // Establish relations with clients
      await newBotuser.setClients(clients);

      // Return with relations
      const createdBotuser = await Botuser.findByPk(newBotuser.id, {
        include: [{
          model: Client,
          through: { attributes: [] }
        }]
      });

      return res.status(201).json(createdBotuser);
    }
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message, details: error });
  }
});

// PUT - Update botuser
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, createUser, canSOS, adminPdf, manager, area, createdBy, clientIds } = req.body;

    const botUser = await Botuser.findByPk(id);

    if (!botUser) {
      return res.status(404).json({ error: "Botuser no encontrado" });
    }

    // Update fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (createUser !== undefined) updateData.createUser = createUser;
    if (canSOS !== undefined) updateData.canSOS = canSOS;
    if (adminPdf !== undefined) updateData.adminPdf = adminPdf;
    if (manager !== undefined) updateData.manager = manager;
    if (area !== undefined) updateData.area = area;
    if (createdBy !== undefined) updateData.createdBy = createdBy;

    await botUser.update(updateData);

    // If clientIds provided, update client relations
    if (clientIds && Array.isArray(clientIds)) {
      // Verify all clients exist
      const clients = await Client.findAll({
        where: {
          id: clientIds
        }
      });

      if (clients.length !== clientIds.length) {
        return res.status(400).json({ error: "Uno o más clientes no existen" });
      }

      // Set clients (this will remove old relations and create new ones)
      await botUser.setClients(clients);
    }

    // Return updated botuser with relations
    const updatedBotuser = await Botuser.findByPk(id, {
      include: [{
        model: Client,
        through: { attributes: [] }
      }]
    });

    return res.status(200).json(updatedBotuser);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
});

// DELETE - Delete botuser
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const botUser = await Botuser.findByPk(id);

    if (!botUser) {
      return res.status(404).json({ error: "Botuser no encontrado" });
    }

    await botUser.destroy();

    return res.status(200).json({ message: "Botuser eliminado exitosamente" });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;
