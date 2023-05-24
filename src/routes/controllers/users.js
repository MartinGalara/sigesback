const { Router } = require('express');
const { User } = require('../../db.js')
const { createUser } = require('./utils.js')
//const userExtractor = require('../middleware/userExtractor.js.js');

const router = Router();

router.get('/', async (req, res) => {
    const {id} = req.query
    try {
        if(id){
            const user = await User.findAll({
                where:{
                    id: id
                }
            })
        return res.status(200).json(user)
        }
        const allUsers = await User.findAll();
        return res.status(200).json(allUsers)
    } catch (error) {
        return res.status(400).send(error.message)
    }
    
})

router.post('/', async (req, res) => {

    try {

        const newUser = await createUser(req.body)

        return res.status(200).json(newUser)
    } catch (error) {
        return res.status(400).send(error.message)
    }
   
})

module.exports = router;