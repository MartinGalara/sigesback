const { Router } = require('express');
const { Webuser } = require('../../db.js')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const userExtractor = require('../middleware/userExtractor.js')

const router = Router();

router.get('/', userExtractor, async (req,res) => {

    return res.status(200).json(req.body)
 
 })

router.post('/', async (req, res) => {
    try {
    const { email, password } = req.body;
  
    // Buscar el operador por el correo electrónico
    const webuser = await Webuser.findOne({ where: { email } });
  
    // Verificar si el operador existe
    if (!webuser) {
     return res.status(401).json({ message: 'Credenciales inválidas' });
    }
  
    // Comparar las contraseñas hasheadas
    const passwordMatch = await bcrypt.compare(password, webuser.hashPassword);
  
    if (passwordMatch) {
    // Contraseña coincidente, el inicio de sesión es exitoso
    
    const userForToken = {
        id: webuser.id,
        role: webuser.role,
        active: webuser.active,
        email: webuser.email,
        userId: webuser.userId
    }

    console.log(userForToken)

    const token = jwt.sign(userForToken, process.env.SECRET, { expiresIn: 60 * 60 * 24 * 7})

    return res.status(200).send({
        token,
        role: webuser.role,
        active: webuser.active,
        email: webuser.email,
        userId: webuser.userId
    })

    } else {
    // Contraseña incorrecta, el inicio de sesión falla
    res.status(401).json({ message: 'Credenciales inválidas' });
    }
    } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el inicio de sesión' });
    }
});



module.exports = router;