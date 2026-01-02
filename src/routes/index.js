const { Router } = require("express");
const path = require('path');
const express = require('express');

const botusers = require("./controllers/botusers.js");
const clients = require("./controllers/clients.js");
const pcs = require("./controllers/pcs.js");
const bottickets = require("./controllers/bottickets.js");
const testing = require("./controllers/testing.js");
const { router: authRouter } = require("./controllers/auth.js");
const user = require("./controllers/user.js");
const upload = require("./controllers/upload.js");
const freshdesk = require("./controllers/freshdesk.js");
const router = Router();

router.use("/bottickets", bottickets);
router.use("/botusers", botusers);
router.use("/clients", clients);
router.use("/pcs", pcs);
router.use("/testing", testing);
router.use("/auth", authRouter);
router.use("/users", user);
router.use('/uploads', express.static(path.join(__dirname, 'uploads')));
router.use('/upload', upload);
router.use('/freshdesk', freshdesk);

module.exports = router;