const { Router } = require('express');
const { Botticket } = require('../../db.js')

const router = Router();

router.get('/', async (req, res) => {

    const {id,clientId} = req.query
   
    if(id){
        try {
            const ticket = await Botticket.findByPk(id)
            return res.status(200).json(ticket)
        } catch (error) {
            return res.status(404).json({message: "Ticket not found"})
        }
    }

   if(clientId){
    try {
        const userTickets = await Botticket.findAll({
            where:{
                clientId: clientId
            }
        })
        
        return res.status(200).json(userTickets)
  
    } catch (error) {
        return res.status(400).send(error.message)
    }
   }

   try {
    const allTickets = await Botticket.findAll()
    return res.status(200).json(allTickets)
   } catch (error) {
    return res.status(400).send(error.message)
   }
    
})

router.post('/', async (req, res) => {

    const {clientId} = req.body;

    try {
        const newTicket = await Botticket.create({clientId})
        return res.status(200).json(newTicket)
    } catch (error) {
        return res.status(400).send(error.message)
    }
   
})

module.exports = router;