const { Router } = require('express');
const { Botuser, User } = require('../../db.js')

const router = Router();

router.get('/', async (req, res) => {
    const {phone} = req.query
    try {
        if(phone){
            const botUser = await Botuser.findAll({
                where:{
                    phone: phone
                }
            })
        return res.status(200).json(botUser)
        }
        const allBotUsers = await Botuser.findAll();
        return res.status(200).json(allBotUsers)
    } catch (error) {
        return res.status(400).send(error.message)
    }
    
})

router.post('/', async (req, res) => {
    try {
        // Obtener los datos del cuerpo de la solicitud
        const { name, phone, email, createUser, canSOS, adminPdf, manager, area, userId } = req.body;

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
            userId // Establecer la relación con el userId proporcionado
        });

        // Devolver una respuesta exitosa con el nuevo usuario creado
        return res.status(201).json(newUser);
    } catch (error) {
        // Manejar errores y devolver una respuesta de error
        return res.status(400).json({ error: error.message });
    }
});

module.exports = router;