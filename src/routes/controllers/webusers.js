const { Router } = require('express');
const { Webuser } = require('../../db.js')
const bcrypt = require('bcrypt');
const { sendEmailWebUser, resetPasswordEmail } = require('./utils.js')
//const userExtractor = require('../middleware/userExtractor.js.js');

const router = Router();

router.get('/', async (req, res) => {
    try {

        const { userId, username, reset} = req.query;

        if(userId){
            const webUsers = await Webuser.findAll({
                where:{
                    userId: userId
                }
            })

            return res.status(200).json(webUsers)
        }

        if(username && reset){
            const webUser = await Webuser.findOne({
                where:{
                    username: username
                }
            })

            const userData = {username: webUser.username}

            webUser.email ? userData.email = webUser.email : userData.email = webUser.defaultEmail;

            await resetPasswordEmail(userData)

            return res.status(200).json(userData)
        }

        const allWebUsers = await Webuser.findAll()

        return res.status(200).json(allWebUsers)
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al buscar el usuario' });
    }

    
})

router.post('/', async (req, res) => {

    try {

        const { email, defaultEmail, password, userId } = req.body;
    
        // Realizar el hash de la contraseña utilizando algún algoritmo de hash, como bcrypt
        const hashPassword = await bcrypt.hash(password, 10);
    
        // Crear la nueva entrada en la base de datos
        const webUser = await Webuser.create({
          hashPassword,
          userId,
          defaultEmail,
          email
        });

        await sendEmailWebUser(defaultEmail,email)
    
        return res.status(201).json(webUser);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear el operador' });
      }

})

router.put('/', async (req, res) => {
    try {

        const { email, role , password} = req.body;

        const webUser = await Webuser.findOne({
            where:{
                email: email
            }
        })

        if(role){
            await webUser.update({
                role: role,
                active: true
            })
        }
        else if(password){

            const hashPassword = await bcrypt.hash(password, 10);

            await webUser.update({
                hashPassword
            })
        }

        return res.status(200).json(webUser)
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar el usuario' });
    }

    
})

module.exports = router;