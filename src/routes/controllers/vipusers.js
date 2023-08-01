const { Router } = require('express');
const { Vipuser } = require('../../db.js')

const router = Router();

router.get('/', async (req, res) => {
    const {phone} = req.query
    try {
        if(phone){
            const vipUser = await Vipuser.findAll({
                where:{
                    phone: phone
                }
            })
        return res.status(200).json(vipUser)
        }
        const allVipUsers = await Vipuser.findAll();
        return res.status(200).json(allVipUsers)
    } catch (error) {
        return res.status(400).send(error.message)
    }
    
})

module.exports = router;