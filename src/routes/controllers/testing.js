const { Router } = require('express');
const { Computer, User } = require('../../db.js')
//const userExtractor = require('../middleware/userExtractor.js.js');

const dotenv = require("dotenv");

dotenv.config();

const axios = require('axios');

const router = Router();

router.get('/', async (req, res) => {

    const username = process.env.CLOUDINARY_API_KEY
    const password = process.env.CLOUDINARY_API_SECRET
    const basicAuth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

try {
  const response = await axios.get(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/resources/image`, {
    headers: {
      Authorization: basicAuth,
    },
  });

  console.log(response.data);

  return res.json(response.data)
  } catch (error) {
    console.error('Error al cargar las imágenes de Cloudinary:', error);
  }
})

module.exports = router;