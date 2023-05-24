const { Router } = require('express');
const { Operator } = require('../../db.js')
const bcrypt = require('bcrypt');

const router = Router();

router.post('/', async (req, res) => {
    try {
    const { email, password } = req.body;
  
    // Buscar el operador por el correo electrónico
    const operator = await Operator.findOne({ where: { email } });
  
    // Verificar si el operador existe
    if (!operator) {
     return res.status(401).json({ message: 'Credenciales inválidas' });
    }
  
    // Comparar las contraseñas hasheadas
    const passwordMatch = await bcrypt.compare(password, operator.hashPassword);
  
    if (passwordMatch) {
    // Contraseña coincidente, el inicio de sesión es exitoso
    res.status(200).json({ message: 'Inicio de sesión exitoso' });
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