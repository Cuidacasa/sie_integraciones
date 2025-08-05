
const axios = require('axios');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

const jar = new tough.CookieJar();
const client = wrapper(axios.create({ jar }));

class IMAApiClient {
    constructor() {
      this.baseURL = 'https://tooltoimaiberica.es';
      this.loginEndpoint = 'https://tooltoimaiberica.es/login';
      this.sessionId = null;
      this.credentials = null;
    }

    setCredentials(username, password) {
      this.credentials = { user: username, password: password };
    }

    /**
     * Función reutilizable para el proceso de login
     * @returns {Promise<string>} Token XSRF actualizado
     */
    async performLogin() {
      if (!this.credentials) {
        throw new Error('Credenciales no configuradas. Use setCredentials() primero.');
      }

      try {
        // Paso 1: obtener cookies desde el endpoint de login
        await client.get(this.loginEndpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': '*/*',
          }
        });

        // Paso 2: extraer el token XSRF desde las cookies
        const cookies = await jar.getCookies(this.loginEndpoint);
        const xsrfToken = decodeURIComponent(cookies.find(c => c.key === 'XSRF-TOKEN')?.value || '');
        if (!xsrfToken) {
          throw new Error('❌ No se pudo obtener XSRF-TOKEN de la cookie');
        }

        // Paso 3: hacer POST con el token correcto (login)
        await client.post(
          this.loginEndpoint,
          {
            email: this.credentials.user,
            password: this.credentials.password,
            remember: ''
          },
          {
            headers: {
              'Accept': '*/*',
              'Content-Type': 'application/json',
              'X-XSRF-TOKEN': xsrfToken,
              'X-Requested-With': 'XMLHttpRequest',
              'X-Inertia': 'true',
              'X-Inertia-Version': '41e99b313296a6112f292ea12eaf57a5',
              'User-Agent': 'Mozilla/5.0'
            }
          }
        );

        // Paso 4: obtener cookies actualizadas tras login
        const cookiesAfterLogin = await jar.getCookies(this.baseURL);
        const xsrfTokenAfterLogin = decodeURIComponent(cookiesAfterLogin.find(c => c.key === 'XSRF-TOKEN')?.value || xsrfToken);

        return xsrfTokenAfterLogin;

      } catch (error) {
        console.error('❌ Error en performLogin:', error.message);
        throw error;
      }
    }

    async buscarServicioIMA(codigo) {
      try {
        // Usar la función reutilizable de login
        const xsrfTokenAfterLogin = await this.performLogin();

        // Paso 5: hacer la consulta al endpoint /services
        const response = await client.get(`${this.baseURL}/services`, {
          params: {
            per_page: 10,
            search: codigo,
            start_date: '',
            end_date: '',
            order_by: 'desc',
            order_field: 'ima_process_number'
          },
          headers: {
            'Accept': 'application/json',
            'X-XSRF-TOKEN': xsrfTokenAfterLogin,
            'X-Requested-With': 'XMLHttpRequest',
            'X-Inertia': 'true',
            'X-Inertia-Version': '41e99b313296a6112f292ea12eaf57a5',
            'User-Agent': 'Mozilla/5.0'
          },
          withCredentials: true
        });

        // Paso 6: Procesar y retornar datos
        const servicio = response.data.props.services.data[0];
        const language = response.data.props.language;

        return {
          servicio,
          language
        };

      } catch (err) {
        console.error('❌ Error en buscarServicioIMA:', err.message);
        return null;
      }
    }

    async obtenerBudgetLines(serviceId, language = {}) {
      try {
        // Usar la función reutilizable de login
        const xsrfFinal = await this.performLogin();

        // Paso 5: Hacer POST a /services/{id}/get-budget-lines
        const response = await client.post(
          `${this.baseURL}/services/${serviceId}/get-budget-lines`,
          {}, // sin body
          {
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'X-XSRF-TOKEN': xsrfFinal,
              'X-Requested-With': 'XMLHttpRequest',
              'Origin': this.baseURL,
              'User-Agent': 'Mozilla/5.0',
            }
          }
        );
        
        const traducirEnt = (sender) => {
          switch (sender) {
            case "P": return "PROVEEDOR";
            case "I": return "IMA";
            default: return sender;
          }
        };
        
        const traducirEstado = (estado) => {
          switch (estado) {
            case "A": return "Aceptado";
            case "R": return "Rechazado";
            case "P": return "Pendiente";
            default: return estado;
          }
        };
        
        return response?.data?.budget_lines.map(linea => ({
          "Categoría": language[linea.tariff?.category?.name] || linea.tariff?.category?.name || "",
          "Código": linea.tariff?.code || "",
          "Descripción": linea.tariff?.description || "",
          "Valor": parseFloat(linea.tariff?.value || 0).toFixed(2),
          "Cant.": parseFloat(linea.qty || 0).toFixed(2),
          "Total": parseFloat(linea.total_value || 0).toFixed(2),
          "Estado": traducirEstado(linea.state)||"",
          "Ent": language[linea.responsible.name] || linea.responsible.name|| "",
          "Fecha": linea.date?.split(" ")[0] || "",
          "Resp": traducirEnt(linea.sender) || "",
          "Observaciones": linea.observations || ""
        }));

      } catch (error) {
        console.error('❌ Error al obtener budget lines:', error.message);
        return null;
      }
    }

    async obtenerTariffsPorServicio(serviceNumber) {
      const { servicio: datos, language } = await this.buscarServicioIMA(serviceNumber);

      try {
        // Usar la función reutilizable de login
        const xsrfFinal = await this.performLogin();

        // Paso 5: Realizar el POST a /services/get-tariffs
        const response = await client.post(
          `${this.baseURL}/services/get-tariffs`,
          {
            id: datos.id,
            tariff_ids: []
          },
          {
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json',
              'X-XSRF-TOKEN': xsrfFinal,
              'X-Requested-With': 'XMLHttpRequest',
              'Origin': this.baseURL,
              'User-Agent': 'Mozilla/5.0'
            }
          }
        );

        return response.data.tariffs;

      } catch (error) {
        console.error('❌ Error al obtener tarifas:', error.message);
        return null;
      }
    }
}

module.exports = IMAApiClient; 