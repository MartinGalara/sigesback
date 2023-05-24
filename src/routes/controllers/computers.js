const { Router } = require('express');
const { Computer,User } = require('../../db.js')

const router = Router();

router.get('/:id', async (req, res) => {

    const {id} = req.params;

    try {
        if(id){
            const computer = await Computer.findByPk(id)
            return res.status(200).json(computer)
        }
        else{
            return res.status(400).send("Missing id")
        }
    } catch (error) {
        console.log(error.message)
        return res.status(400).send(error.message)
    }

})


router.get('/', async (req, res) => {

    const {userId,zone} = req.query;

    try {

        if(userId && zone){
            const computers = await Computer.findAll({
                where:{
                    userId: userId,
                    zone: zone
                }
            })

            return res.status(200).json(computers)
        }

        const allComputers = await Computer.findAll({
            include:{
                model: User
            }
        })

        return res.status(200).json(allComputers)
    } catch (error) {
        console.log(error.message)
         return res.status(400).send(error.message)
    }
})

router.put('/:id', async (req, res) => {

    const {id} = req.params;
    const {alias, teamviewer_id, userId, zone, order} = req.body

    try {
        const computerToUpdate = await Computer.findByPk(id)
        await computerToUpdate.update({
            alias,
            teamviewer_id,
            userId,
            zone,
            order
        })
        return res.status(200).send("Listo")
    } catch (error) {
        console.log(error.message)
        return res.status(400).send(error.message)
    }

})

module.exports = router;