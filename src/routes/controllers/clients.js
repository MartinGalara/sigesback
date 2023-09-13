const { Router } = require('express');
const { Client,Botuser } = require('../../db.js')

const router = Router();

// Obtener todos los clientes o filtrar por ID si se proporciona en la query
router.get('/', async (req, res) => {
    try {
      console.log("entre aca")
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
      const { email, info, vip, vipmail, testing } = req.body;
  
      // Crear un nuevo cliente
      const newClient = await Client.create({
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
  

module.exports = router;