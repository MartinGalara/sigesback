const { Router } = require('express');
const { Botuser, User } = require('../../db.js')

const router = Router();

router.get('/', async (req, res) => {
    const { phone } = req.query;
    try {
        if (phone) {
            const botUsers = await Botuser.findAll({
                where: {
                    phone: phone
                },
                include: [User] // Esto realiza un join con la tabla User
            });
            return res.status(200).json(botUsers);
        }
        
        // Si no se proporciona un número de teléfono, obtén todos los Botuser con sus usuarios relacionados.
        const allBotUsers = await Botuser.findAll({
            include: [User] // Esto realiza un join con la tabla User
        });
        
        return res.status(200).json(allBotUsers);
    } catch (error) {
        return res.status(400).send(error.message);
    }
});

router.post('/', async (req, res) => {
    try {
        // Obtener los datos del cuerpo de la solicitud
        const { name, phone, email, createUser, canSOS, adminPdf, manager, area, userId, createdBy } = req.body;

        // Verificar si el usuario con userId proporcionado existe
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ error: 'El usuario especificado no existe' });
        }

        // Crear un nuevo usuario en la tabla Botuser y establecer la relación con el userId proporcionado
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

        // Asociar el nuevo Botuser al User existente
        await newUser.setUser(user);

        // Devolver una respuesta exitosa con el nuevo usuario creado
        return res.status(201).json(newUser);
    } catch (error) {
        // Manejar errores y devolver una respuesta de error
        return res.status(400).json({ error: error.message });
    }
});

module.exports = router;