const { Router } = require("express");
// const { Excercise , Muscle, Product, Routine, User, Class } = require("../db.js");
const { Op } = require("sequelize");
const users = require("./controllers/users.js")
const tickets = require("./controllers/tickets.js")
const computers = require("./controllers/computers.js")
const testing = require("./controllers/testing.js")
const optickets = require("./controllers/optickets.js")
const staffs = require("./controllers/staffs.js")
const operators = require("./controllers/operators.js")
const login = require("./controllers/login.js")
const webusers = require("./controllers/webusers.js")
const recommendations = require("./controllers/recommendations.js")
const cloudinary = require("./controllers/cloudinary.js")
const vipusers = require("./controllers/vipusers.js")
const botusers = require("./controllers/botusers.js")
const clients = require("./controllers/clients.js")
const pcs = require("./controllers/pcs.js")
const bottickets = require("./controllers/bottickets.js")

// Importar todos los routers;
// Ejemplo: const authRouter = require('./auth.js');

const router = Router();

router.use('/users', users)
router.use('/tickets', tickets)
router.use('/computers', computers)
router.use('/testing', testing)
router.use('/optickets', optickets)
router.use('/staffs', staffs)
router.use('/operators', operators)
router.use('/login', login)
router.use('/webusers', webusers)
router.use('/recommendations', recommendations)
router.use('/cloudinary', cloudinary)
router.use('/vipusers', vipusers)
router.use('/botusers', botusers)
router.use('/clients', clients)
router.use('/pcs', pcs)
router.use('/bottickets', bottickets)

module.exports = router;
