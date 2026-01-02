const { Router } = require('express');
const { Client, Botuser } = require('../../db.js'); // Importa los modelos Client y Botuser desde la base de datos

const router = Router(); // Crea una nueva instancia del enrutador de Express

// GET /clients: Obtiene todos los clientes o filtra por ID si se proporciona
router.get('/', async (req, res) => {
    try {
        const { id } = req.query; // Obtiene el ID del cliente de los parámetros de consulta (opcional)
        let clients;

        if (id) {
            // Si se proporciona un ID, busca un único cliente por su ID
            clients = await Client.findOne({
                where: { id }
            });
        } else {
            // Si no se proporciona ID, obtiene todos los clientes
            clients = await Client.findAll();
        }

        // Si no se encontró ningún cliente o no hay clientes en la base de datos
        if (!clients) {
            return res.status(404).json({ message: 'No se encontraron clientes.' });
        }

        // Procesa el campo 'email': si es una cadena separada por comas, la convierte a un array de emails.
        // Aplica a un solo cliente (si se buscó por ID) o a cada cliente en un array.
        if (clients.email && typeof clients.email === 'string') {
            clients.email = clients.email.split(',').map(email => email.trim());
        } else if (Array.isArray(clients)) {
            clients = clients.map(client => {
                if (client.email && typeof client.email === 'string') {
                    client.email = client.email.split(',').map(email => email.trim());
                }
                return client;
            });
        }

        return res.status(200).json(clients); // Devuelve los datos del cliente(s)
    } catch (error) {
        // Manejo de error del servidor
        console.error(error); // Mantiene el console.error original
        res.status(500).json({ message: 'Error interno del servidor al obtener clientes.' });
    }
});

// POST /clients: Crea un nuevo cliente
router.post('/', async (req, res) => {
    try {
        const { id, email, info, vip, vipmail, testing } = req.body; // Extrae los datos del cuerpo de la solicitud

        // Verifica si ya existe un cliente con el ID proporcionado
        const client = await Client.findAll({
            where: { id }
        });

        if (client.length) {
            return res.status(201).send("Cliente ya existente"); // Retorna si el cliente ya existe
        }

        // Convierte el array de correos electrónicos a una cadena separada por comas para su almacenamiento
        const emailString = email.join(',');

        // Crea un nuevo cliente en la base de datos
        const newClient = await Client.create({
            id,
            email: emailString, // Almacena los emails como una cadena
            info,
            vip,
            vipmail,
            testing,
        });

        return res.status(201).json(newClient); // Devuelve el cliente recién creado
    } catch (error) {
        // Manejo de error del servidor
        console.error(error); // Mantiene el console.error original
        res.status(500).json({ message: 'Error interno del servidor al crear el cliente.' });
    }
});

// PUT /clients: Actualiza un cliente existente por ID
router.put('/', async (req, res) => {
    try {
        const {
            id,
            email,
            info,
            vip,
            vipmail,
            testing,
        } = req.body; // Extrae los datos del cuerpo de la solicitud

        // Busca el cliente por su ID para actualizarlo
        const client = await Client.findOne({
            where: { id },
        });

        if (!client) {
            return res.status(404).json({ message: 'Cliente no encontrado.' });
        }

        // Convierte el array de correos electrónicos a una cadena separada por comas para su actualización
        const emailString = email.join(',');

        // Actualiza los campos del cliente con los nuevos valores
        client.email = emailString;
        client.info = info;
        client.vip = vip;
        client.vipmail = vipmail;
        client.testing = testing;
        await client.save();

        return res.status(200).json(client); // Devuelve el cliente actualizado
    } catch (error) {
        // Manejo de error del servidor
        console.error(error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar el cliente.' });
    }
});

// GET /clients/:clientId/email: Obtiene el email global (primer email) de un cliente específico por ID
router.get('/:clientId/email', async (req, res) => {
    const { clientId } = req.params; // Captura el ID del cliente desde los parámetros de la URL

    try {
        // Busca el cliente por el ID proporcionado
        const client = await Client.findOne({
            where: { id: clientId },
        });

        if (!client) {
            return res.status(404).json({ message: 'Cliente no encontrado.' }); 
        }

        // Extrae el primer email de la cadena de emails como el "email global"
        let globalEmail = '';
        if (client.email) {
            const emailsArray = client.email.split(',').map(email => email.trim());
            if (emailsArray.length > 0) {
                globalEmail = emailsArray[0]; // Toma el primer email del array
            }
        }

        if (!globalEmail) {
            return res.status(404).json({ message: 'Email global no encontrado para este cliente.' });
        }

        return res.status(200).json({ email: globalEmail }); // Devuelve el email global del cliente
    } catch (error) {
        // Manejo de error del servidor
        console.error(error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el email del cliente.' });
    }
});

module.exports = router;