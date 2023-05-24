const { Router } = require('express');
const { Staff, User } = require('../../db.js')

const router = Router();

router.get('/', async (req, res) => {

    const {userId} = req.query;

    try {

        if(userId){
            const staff = await Staff.findAll({
                where:{
                    userId: userId
                }
            })

            return res.status(200).json(staff)
        }

        const allStaff = await Staff.findAll({
            include:{
                model: User
            }
        })

        return res.status(200).json(allStaff)
    } catch (error) {
        console.log(error.message)
         return res.status(400).send(error.message)
    }
})

module.exports = router;