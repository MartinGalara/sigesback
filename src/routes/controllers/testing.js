const { Router } = require('express');
const { Computer, User } = require('../../db.js')
//const userExtractor = require('../middleware/userExtractor.js.js');

const axios = require('axios');


const router = Router();

router.get('/', async (req, res) => {

    const username = '528937882136667';
    const password = 'H-WT2Ys7_qZb_A5KD2dW-HjtBkU';
    const basicAuth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

try {
  const response = await axios.get('https://api.cloudinary.com/v1_1/diapwgajv/resources/image', {
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