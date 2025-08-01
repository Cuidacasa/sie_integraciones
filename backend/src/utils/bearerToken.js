const pool = require('../config/db');
const axios = require('axios');
const { updateTokens } = require('../controllers/configuracionController');

const getBearerToken = async () => {
  // Obtener la configuración más reciente
  const [rows] = await pool.query('SELECT * FROM configuraciones ORDER BY id DESC LIMIT 1');
  if (!rows.length) throw new Error('No hay configuración GUAI');
  const config = rows[0];
  const now = new Date();
  let expiredTime = config.expired_time ? new Date(config.expired_time) : null;
  // Si el token existe y no han pasado más de 10 minutos desde expired_time, usarlo
  if (config.token_bearer && expiredTime && (now - expiredTime) < 10 * 60 * 1000) {
    return config.token_bearer;
  }
  // Si no, hacer login y actualizar tokens
  const loginRes = await axios.post('https://cuidacasa.api.guai-dev.diaple.com/api/auth/Auth/login', {
    username: config.usuario_guai,
    password: config.password_guai
  });
  const { accessToken, refreshToken, expiresAt } = loginRes.data;
  await updateTokens(accessToken, refreshToken, expiresAt);
  return accessToken;
};

module.exports = { getBearerToken }; 