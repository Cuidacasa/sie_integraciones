const fetch = require('node-fetch');

class AsiturApiClient {
    constructor() {
        this.API_BASE = 'https://cuidacasa.api.guai-dev.diaple.com/api';
    }


    /**
     * Obtener token de autenticación para DIAPLE
     * @returns {Promise<string>} token JWT
     */
    async obtenerTokenDiaple() {
        const response = await fetch(`${API_BASE}/auth/Auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'GUAI.BOT', password: 'pruebas' })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(`Error autenticando con DIAPLE: ${data.message || response.status}`);
        return data.accessToken;
    }

    /**
     * Enviar expediente procesado a DIAPLE
     * @param {Object} jsonData - Datos del expediente
     * @param {string} token - Token de autenticación
     */
    async enviarA_Diaple(jsonData, token) {
        const response = await fetch(`${API_BASE}/attendance/cases/inboundmailmessages`, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(`Error enviando expediente: ${data.message || response.status}`);
        return data;
    }

    /**
     * Enviar comunicación no procesable a DIAPLE
     * @param {Object} jsonData - Datos del correo no reconocido
     * @param {string} token - Token de autenticación
     */
    async enviarAUnprocessable(jsonData, token) {
        const response = await fetch(`${API_BASE}/communications/mailmessages/Unprocessable`, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(`Error enviando Unprocessable: ${data.message || response.status}`);
        return data;
    }
}

module.exports = AsiturApiClient;