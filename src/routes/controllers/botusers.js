const { Router } = require('express');
const { Botuser, Client } = require('../../db.js')

const router = Router();

router.get('/', async (req, res) => {
    const { phone } = req.query;
    try {
        if (phone) {
            const botUsers = await Botuser.findAll({
                where: {
                    phone: phone
                },
                include: [Client] // Esto realiza un join con la tabla User
            });
            return res.status(200).json(botUsers);
        }
        
        // Si no se proporciona un número de teléfono, obtén todos los Botuser con sus usuarios relacionados.
        const allBotUsers = await Botuser.findAll({
            include: [Client] // Esto realiza un join con la tabla User
        });
        
        return res.status(200).json(allBotUsers);
    } catch (error) {
        return res.status(400).send(error.message);
    }
});

router.post('/', async (req, res) => {
    try {
        // Obtener los datos del cuerpo de la solicitud
        const { name, phone, email, createUser, canSOS, adminPdf, manager, area, clientId, createdBy } = req.body;

        console.log(req.body)

        // Verificar si existe un Botuser con el mismo número de teléfono
        const existingBotuser = await Botuser.findOne({
            where: {
                phone: phone
            }
        });

        if (existingBotuser) {

            await existingBotuser.update({name, phone, email, createUser, canSOS, adminPdf, manager, area, createdBy})
            // Si existe un Botuser con el mismo número de teléfono, verificamos la relación con el clientId
            const existingRelation = await existingBotuser.hasClient(clientId);

            if (!existingRelation) {
                // Si no existe una relación con el clientId proporcionado, verificamos si el clientId proporcionado existe
                const user = await Client.findByPk(clientId);

                if (!user) {
                    return res.status(404).json({ error: 'El usuario especificado no existe' });
                }

                // Establecer la relación entre el Botuser existente y el nuevo User
                await existingBotuser.addClient(user);
            }

            return res.status(200).json(existingBotuser);
        } else {


            // Verificamos si el clientId proporcionado existe y establecemos la relación
            const user = await Client.findByPk(clientId);

            console.log(user)

            if (!user) {
                return res.status(404).json({ error: 'El usuario especificado no existe' });
            }
            // Si no existe un Botuser con el mismo número de teléfono, creamos uno nuevo
            const newUser = await Botuser.create({
                name,
                phone,
                email,
                createUser,
                canSOS,
                adminPdf,
                manager,
                area,
                createdBy
            });

            // Establecer la relación entre el nuevo Botuser y el User existente
            await newUser.addClient(user);

            return res.status(201).json(newUser);
        }

    } catch (error) {
        // Manejar errores y devolver una respuesta de error
        return res.status(400).json({ error: error.message });
    }
});

module.exports = router;