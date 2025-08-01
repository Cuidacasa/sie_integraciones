const axios = require('axios');
require('dotenv').config();

async function login(username, password) {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);

  const response = await axios.post(
    process.env.API_LOGIN_URL,
    params.toString(),
    {
      headers: {
        Authorization: `Bearer ${process.env.API_BEARER}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
  const data = response.data;
  const match = data.match(/PHPSESSID=([^&]+)/);
  if (!match) throw new Error('PHPSESSID no encontrado');
  return match[1];
}

async function obtenerServicios(token) {
  const response = await axios.get(
    process.env.API_NUEVASALTAS_URL,
    {
      headers: {
        Authorization: `Bearer ${process.env.API_BEARER}`,
        Token: `PHPSESSID=${token}`
      }
    }
  );
  return response.data;
}

module.exports = { login, obtenerServicios }; 