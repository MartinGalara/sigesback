const { Router } = require('express');
const { Pc, Client } = require('../../db.js');

const router = Router();

// Ruta para obtener una computadora por ID
router.get('/:id', async (req, res) => {
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
router.get('/', async (req, res) => {
    const { clientId, area } = req.query;

    try {
        if (clientId && area) {
            const computers = await Pc.findAll({
                where: {
                    clientId: clientId,
                    area: area
                }
            });

            return res.status(200).json(computers);
        }

        const allComputers = await Pc.findAll({
            include: {
                model: Client
            }
        });

        return res.status(200).json(allComputers);
    } catch (error) {
        console.log(error.message);
        return res.status(400).send(error.message);
    }
});

// Ruta para actualizar una computadora por ID
router.put('/:id', async (req, res) => {
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
        clientId
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
            clientId
        });
        return res.status(200).send("Listo");
    } catch (error) {
        console.log(error.message);
        return res.status(400).send(error.message);
    }
});

// Ruta para crear una nueva computadora
router.post('/', async (req, res) => {
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
        clientId
    } = req.body;

    try {

        const pc = await Pc.findAll({
            where: {
                teamviewer_id
            }
        })
    
        if(pc.length){

            const pcToUpdate = await Pc.findOne({
                where:{teamviewer_id}
            })

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
            clientId
            })

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
            clientId
        });

        return res.status(201).json(newComputer);
    } catch (error) {
        console.log(error.message);
        return res.status(400).send(error.message);
    }
});

module.exports = router;
