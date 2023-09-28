const { Router } = require('express');
const { Client,Botuser } = require('../../db.js')

const router = Router();

// Obtener todos los clientes o filtrar por ID si se proporciona en la query
router.get('/', async (req, res) => {
    try {
      const { id } = req.query;
      let clients;
  
      if (id) {
        clients = await Client.findOne({
          where: { id },
          include: [{ model: Botuser, through: 'Client_Botuser' }],
        });
      } else {
        clients = await Client.findAll({ include: [{ model: Botuser, through: 'Client_Botuser' }] });
      }
  
      if (!clients) {
        return res.status(404).json({ message: 'No se encontraron clientes.' });
      }
  
      return res.status(200).json(clients);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });
  
  

  router.post('/', async (req, res) => {
    try {
      const { id,email, info, vip, vipmail, testing } = req.body;

      const client = await Client.findAll({
        where: { id }
      });
      
      if(client.length) return res.status(201).send("Cliente ya existente")
  
      // Crear un nuevo cliente
      const newClient = await Client.create({
        id,
        email,
        info,
        vip,
        vipmail,
        testing,
      });
  
      return res.status(201).json(newClient);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });

// Actualizar un cliente por ID
router.put('/', async (req, res) => {
  try {
    const { id } = req.query; // Obtén el ID del cliente de los parámetros de consulta
    const {
      email,
      info,
      vip,
      vipmail,
      testing,
    } = req.body;

    // Busca el cliente por ID
    const client = await Client.findOne({
      where: { id },
    });

    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }

    // Actualiza los campos del cliente con los valores proporcionados en el cuerpo de la solicitud
    client.email = email;
    client.info = info;
    client.vip = vip;
    client.vipmail = vipmail;
    client.testing = testing;

    // Guarda los cambios en la base de datos
    await client.save();

    return res.status(200).json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});
  

module.exports = router;