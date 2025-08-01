const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getConfiguracion, updateConfiguracion } = require('../controllers/configuracionController');

// GET /api/configuracion - Obtener configuración
router.get('/', auth, getConfiguracion);

// PUT /api/configuracion - Actualizar configuración
router.put('/', auth, updateConfiguracion);

module.exports = router; 