const express = require('express');
const router = express.Router();
const { sincronizarServicios } = require('../controllers/serviciosController');

router.post('/sincronizar', sincronizarServicios);

module.exports = router; 