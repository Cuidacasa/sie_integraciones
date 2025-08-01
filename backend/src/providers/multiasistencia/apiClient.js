const axios = require('axios');
const pool = require('../../config/db');

/**
 * Cliente API específico para MultiAsistencia
 * Maneja la comunicación con la API de MultiAsistencia
 */
class MultiAsistenciaApiClient {
  constructor() {
    this.baseURL = 'https://api.registradoresma.com/multiasistencia/1.1.0';
    this.sessionId = null;
  }

  /**
   * Obtener token de la compañía desde la base de datos
   * @param {number} companiaId - ID de la compañía
   * @returns {Promise<string>} - Token de la API
   */
  async getApiToken(companiaId) {
    try {
      const [rows] = await pool.query(
        'SELECT api_token FROM companias WHERE id = ?',
        [companiaId]
      );

      if (rows.length === 0) {
        throw new Error('Compañía no encontrada');
      }

      if (!rows[0].api_token) {
        throw new Error('La compañía no tiene token de API configurado');
      }

      return rows[0].api_token;
    } catch (error) {
      console.error('Error obteniendo token de API:', error.message);
      throw error;
    }
  }

  /**
   * Autenticación con MultiAsistencia
   * @param {string} username - Usuario
   * @param {string} password - Contraseña
   * @param {number} companiaId - ID de la compañía para obtener el token
   * @returns {Promise<string>} - Session ID
   */
  async login(username, password, companiaId) {
    try {
      // Obtener token de la compañía
      const apiToken = await this.getApiToken(companiaId);

      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await axios.post(
        `${this.baseURL}/login`,
        params.toString(),
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const data = response.data;
      const match = data.match(/PHPSESSID=([^&]+)/);
      if (!match) throw new Error('PHPSESSID no encontrado');
      
      this.sessionId = match[1];
      return this.sessionId;
    } catch (error) {
      console.error('Error en login de MultiAsistencia:', error.message);
      throw new Error(`Error de autenticación: ${error.message}`);
    }
  }

  /**
   * Obtener servicios de MultiAsistencia
   * @param {string} sessionId - Session ID
   * @param {number} companiaId - ID de la compañía para obtener el token
   * @returns {Promise<Object>} - Datos de servicios
   */
  async obtenerServicios(sessionId, companiaId) {
    try {
      // Obtener token de la compañía
      const apiToken = await this.getApiToken(companiaId);

      const response = await axios.get(
        `${this.baseURL}/nuevasaltas`,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            Token: `PHPSESSID=${sessionId}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error obteniendo servicios de MultiAsistencia:', error.message);
      throw new Error(`Error obteniendo servicios: ${error.message}`);
    }
  }
}

module.exports = MultiAsistenciaApiClient; 