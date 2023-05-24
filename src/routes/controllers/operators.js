const { Router } = require('express');
const { Operator } = require('../../db.js')
const bcrypt = require('bcrypt');

const router = Router();

router.post('/', async (req, res) => {

    try {
        const { email, password } = req.body;
    
        // Realizar el hash de la contraseña utilizando algún algoritmo de hash, como bcrypt
        const hashPassword = await bcrypt.hash(password, 10);
    
        // Crear la nueva entrada en la base de datos
        const operator = await Operator.create({
          email,
          hashPassword
        });
    
        res.status(201).json(operator);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear el operador' });
      }

})

router.get('/', async (req, res) => {
    try {
      const { email } = req.query;
  
      if (email) {
        // Buscar operadores por correo electrónico
        const operators = await Operator.findAll({
          where: { email },
          attributes: ['id','email'], // Puedes ajustar los atributos que deseas devolver
        });
        res.status(200).json(operators);
      } else {
        // Obtener todos los operadores
        const operators = await Operator.findAll();
        res.status(200).json(operators);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener los operadores' });
    }
  });



module.exports = router;