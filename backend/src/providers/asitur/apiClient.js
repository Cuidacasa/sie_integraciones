const axios = require('axios');


class AsiturApiClient {
    constructor() {
        this.API_BASE = 'https://cuidacasa.api.guai-dev.diaple.com/api';
    }

    /**
     * Obtener token de autenticación para DIAPLE
     * @returns {Promise<string>} token JWT
     */
    async obtenerTokenDiaple() {
        try {
            const response = await axios.post(
                `${this.API_BASE}/auth/Auth/login`,
                { username: 'GUAI.BOT', password: 'pruebas' },
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            
            // Axios coloca la respuesta en response.data
            return response.data.accessToken;
        } catch (error) {
            // Manejo de errores más detallado
            if (error.response) {
                throw new Error(`Error autenticando con DIAPLE: ${error.response.data.message || error.response.status}`);
            } else {
                throw new Error(`Error autenticando con DIAPLE: ${error.message}`);
            }
        }
    }

    /**
     * Enviar expediente procesado a DIAPLE
     * @param {Object} jsonData - Datos del expediente
     * @param {string} token - Token de autenticación
     */
    async enviarA_Diaple(jsonData, token) {
        try {
            const response = await axios.post(
                `${this.API_BASE}/attendance/cases/inboundmailmessages`,
                jsonData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            // Axios coloca la respuesta en response.data
            return response.data;
        } catch (error) {
            // Manejo de errores más detallado
            if (error.response) {
                throw new Error(`Error enviando expediente: ${error.response.data.message || error.response.status}`);
            } else {
                throw new Error(`Error enviando expediente: ${error.message}`);
            }
        }
    }

    /**
     * Enviar comunicación no procesable a DIAPLE
     * @param {Object} jsonData - Datos del correo no reconocido
     * @param {string} token - Token de autenticación
     */
    async enviarAUnprocessable(jsonData, token) {
        try {
            const response = await axios.post(
                `${this.API_BASE}/communications/mailmessages/Unprocessable`,
                jsonData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            // Axios coloca la respuesta en response.data
            return response.data;
        } catch (error) {
            // Manejo de errores más detallado
            if (error.response) {
                throw new Error(`Error enviando Unprocessable: ${error.response.data.message || error.response.status}`);
            } else {
                throw new Error(`Error enviando Unprocessable: ${error.message}`);
            }
        }
    }
}

module.exports = AsiturApiClient;