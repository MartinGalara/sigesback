const { User } = require('../../db.js')
const nodemailer = require('nodemailer');
const dotenv = require("dotenv");

dotenv.config();

const createUser = async (data) => {

    const userId = generarCodigo()

    const findUser = await User.findAll({
        where:{
            id: userId
        }
    })

    if(findUser.length === 0){
        const newUser = await User.create({
            id: userId,
            email: data.email,
            info: data.info
        })
        return newUser;
    }
    else{
        return await createUser(data)
    }

}

function generarCodigo() {
    let codigo = "";
    const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < 2; i++) {
      codigo += letras.charAt(Math.floor(Math.random() * letras.length));
    }
    const numeros = "0123456789";
    for (let i = 0; i < 4; i++) {
      codigo += numeros.charAt(Math.floor(Math.random() * numeros.length));
    }
    return codigo;
  }

const createWebUser = async (data) => {

    const userId = generarCodigo()

    const findUser = await User.findAll({
        where:{
            id: userId
        }
    })

    if(findUser.length === 0){
        const newUser = await User.create({
            id: userId,
            email: data.email,
            info: data.info
        })
        return newUser;
    }
    else{
        return await createUser(data)
    }

}

const sendEmailWebUser = async (email,username) => {

    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
          user: process.env.SENDER, // generated ethereal user
          pass: process.env.GMAIL_PASS, // generated ethereal password
        },
      });

      let data = {
        from: process.env.SENDER, // sender address
        to: email, // list of receivers
        subject: `Alta de nuevo usuario: ${username}`, // Subject line
        text: `Alta de nuevo usuario: ${username}`, // plain text body
      }

      data.html = `
    <div>
    <p>Alta de nuevo usuario - Web Sistema SIGES</p>
    <p>Nuevo usuario: ${username}</p>
    <br></br>
    <p>Para activarlo ingrese a: https://sigesfront.vercel.app/newuser?username=${username}</p>
    </div>
    ` // html body

    const mail = await transporter.sendMail(data);

}

const resetPasswordEmail = async (info) => {

    let transporter2 = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
          user: process.env.SENDER, // generated ethereal user
          pass: process.env.GMAIL_PASS, // generated ethereal password
        },
      });

      let data2 = {
        from: process.env.SENDER, // sender address
        to: info.email, // list of receivers
        subject: `Recuperar contraseña de: ${info.username}`, // Subject line
        text: `Recuperar contraseña de: ${info.username}`, // plain text body
      }

      data2.html = `
    <div>
    <p>Recuperacion de contraseña - Web Sistema SIGES</p>
    <p>Usuario: ${info.username}</p>
    <br></br>
    <p>Para recuperar su clave ingrese a: https://sigesfront.vercel.app/newpassword?username=${info.username}</p>
    </div>
    ` // html body

    const mail = await transporter2.sendMail(data2);

}


module.exports = {createUser, createWebUser, sendEmailWebUser, resetPasswordEmail}