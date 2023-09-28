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

    // Procesar correos electrónicos en un array
    if (clients.email) {
      clients.email = clients.email.split(',').map(email => email.trim());
    }

    return res.status(200).json(clients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, emails, info, vip, vipmail, testing } = req.body;

    const client = await Client.findAll({
      where: { id }
    });
    
    if (client.length) return res.status(201).send("Cliente ya existente");

    // Convertir el array de correos electrónicos a una cadena separada por comas
    const emailString = emails.join(',');

    // Crear un nuevo cliente con la cadena de correos electrónicos
    const newClient = await Client.create({
      id,
      email: emailString, // Guardar como cadena separada por comas
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
    const {
      id,
      emails, // Cambiar el nombre del campo a "emails" para recibir un array
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

    // Convertir el array de correos electrónicos a una cadena separada por comas
    const emailString = emails.join(',');

    // Actualiza el campo de correo electrónico con la cadena
    client.email = emailString;

    // Actualiza los demás campos
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