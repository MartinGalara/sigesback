const { Router } = require('express');
const { Ticket } = require('../../db.js')

const router = Router();

router.get('/', async (req, res) => {

    const {id,userId} = req.query
   
    if(id){
        try {
            const ticket = await Ticket.findByPk(id)
            return res.status(200).json(ticket)
        } catch (error) {
            return res.status(404).json({message: "Ticket not found"})
        }
    }

   if(userId){
    try {
        const userTickets = await Ticket.findAll({
            where:{
                userId: userId
            }
        })
        
        return res.status(200).json(userTickets)
  
    } catch (error) {
        return res.status(400).send(error.message)
    }
   }

   try {
    const allTickets = await Ticket.findAll()
    return res.status(200).json(allTickets)
   } catch (error) {
    return res.status(400).send(error.message)
   }
    
})

router.post('/', async (req, res) => {

    const {userId} = req.body;

    try {
        const newTicket = await Ticket.create({userId})
        return res.status(200).json(newTicket)
    } catch (error) {
        return res.status(400).send(error.message)
    }
   
})

module.exports = router;