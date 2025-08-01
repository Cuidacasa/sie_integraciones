const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM companias');
  res.json(rows);
});

router.post('/', auth, async (req, res) => {
  const { nombre, api_url, api_token, username, password } = req.body;
  await pool.query(
    'INSERT INTO companias (nombre, api_url, api_token, username, password) VALUES (?, ?, ?, ?, ?)',
    [nombre, api_url, api_token, username, password]
  );
  res.json({ mensaje: 'Compañía creada' });
});

module.exports = router; 