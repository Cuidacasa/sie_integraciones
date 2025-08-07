// apiClient.js - Cliente de API REST Generali

const axios = require('axios');

// ----- Mapeo manual de usuarios por correo (puedes luego migrar a base de datos) -----
const userMap = {
    // 'correo@dominio.com': { company: 'K', user: 'usuario', password: 'clave' }
    'generali1@empresa.com': { company: 'K', user: 'pgseh5v', password: 'Rondaap100' },
    'generali2@empresa.com': { company: 'K', user: 'usuario2', password: 'clave2' }
    // ...agrega aquí otros mapeos según tu necesidad
};

class GeneraliApiClient {
    constructor() {
        this.API_BASETOKEN = 'https://www.generali.es/seg_authWebServices/rest';
        this.API_BASECONSULT = 'https://www.generali.es/cla_claimsManagementWebServices/rest/';
    }

    // ----- Login: obtiene token de sesión -----
    async loginGenerali(email) {
        const creds = userMap[email];
        if (!creds) throw new Error(`No hay credenciales configuradas para el correo: ${email}`);

        const url = `${this.API_BASETOKEN}/loginUserService`;
        const headers = {
            'Content-Type': 'application/json',
            'X-VinShieldPublic': 'vinshield'
        };
        const body = {
            company: creds.company,
            user: creds.user,
            password: creds.password
        };

        try {
            const response = await axios.post(url, body, { headers });
            if (response.data.codeError !== "000") {
                throw new Error(`Login Generali falló: ${response.data.codeError} - ${response.data.error || 'Error desconocido'}`);
            }
            return response.data.session; // Token
        } catch (err) {
            throw new Error(`Error autenticando contra Generali: ${err.message}`);
        }
    }

    // ----- Obtención datos de Ficha de Encargo (expediente) -----
    async getOrderDetail(token, orderAuthPayload) {
        const url = `${this.API_BASECONSULT}/order/detail`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        try {
            const response = await axios.post(url, orderAuthPayload, { headers });
            return response.data;
        } catch (err) {
            throw new Error(`Error obteniendo detalle de encargo: ${err.message}`);
        }
    }

    // ----- Lista de diálogos por encargo (comunicación) -----
    async getDialogList(token, orderAuthPayload) {
        const url = `${this.API_BASECONSULT}/dialog/dialogList`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        try {
            const response = await axios.post(url, orderAuthPayload, { headers });
            return response.data;
        } catch (err) {
            throw new Error(`Error obteniendo lista de diálogos: ${err.message}`);
        }
    }
    // ----------- LOGIN DIAPLE -----------
    async loginDiaple(username, password) {
        const url = 'https://cuidacasa.api.guai-dev.diaple.com/api/auth/Auth/login';
        const body = {
            username: username,
            password: password
        };
        try {
            const response = await axios.post(url, body, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });
            if (response.data && response.data.token) {
                return response.data.token;
            } else {
                throw new Error('Token no recibido de DIAPLE');
            }
        } catch (err) {
            throw new Error(
                `Error autenticando contra DIAPLE: ${err.response?.data?.message || err.message
                }`
            );
        }
    }
    async enviarComunicacionDiaple(jsonData, token) {
        const url = 'https://cuidacasa.api.guai-dev.diaple.com/api/attendance/cases/inboundmailmessages';
        try {
            const response = await axios.post(url, jsonData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });
            return response.data;
        } catch (err) {
            if (err.response) {
                throw new Error(
                    `Error enviando comunicación a DIAPLE: ${err.response.data?.message || err.response.statusText || err.response.status
                    }`
                );
            }
            throw new Error(`Error enviando comunicación a DIAPLE: ${err.message}`);
        }
    }

}

module.exports = GeneraliApiClient;
