const BaseProvider = require('../../core/baseProvider');
const IMAApiClient = require('./apiClient');
const IMADataProcessor = require('./dataProcessor');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const logger = require('../../utils/logger');

/**
 * Proveedor específico para IMA
 * Maneja la integración con el sistema de IMA
 */
class IMAProvider extends BaseProvider {
  constructor(compania) {
    super(compania);
    this.providerName = 'IMAProvider';
    this.apiClient = new IMAApiClient();
    this.dataProcessor = new IMADataProcessor();
  }

  async authenticate(username, password) {
    this.apiClient.setCredentials(username, password);
    return await this.apiClient.buscarServicioIMA('test'); // Test de conexión
  }

  async fetchData(sessionId, options = {}) {
    // Para IMA, los datos vienen de emails, no de una API directa
    // Por ahora, retornamos un array vacío ya que el procesamiento real
    // se hace en fetchCodesFromEmails()
    return [];
  }

  async processRawData(rawData, options = {}) {
    try {
      console.log(`[${this.providerName}] Procesando datos para ${this.compania.nombre}`);
      
      // Para IMA, el procesamiento real se hace en fetchCodesFromEmails
      // Aquí solo simulamos el procesamiento
      const procesados = 0;
      const omitidos = 0;
      
      console.log(`[${this.providerName}] Procesamiento completado: ${procesados} procesados, ${omitidos} omitidos`);
      
      return {
        procesados,
        omitidos
      };
      
    } catch (error) {
      console.error(`[${this.providerName}] Error en procesamiento:`, error);
      throw error;
    }
  }

  async fetchCodesFromEmails() {
    // CONSTANTE DE CONFIGURACIÓN PARA TIPO DE LECTURA
    const READ_MODE = 1; // 0 = leer todos los correos, 1 = leer solo pendientes
    const markAsRead = false;
    const results = [];

    // Configurar cuentas IMAP (esto debería venir de la configuración)
    const imapAccounts = [
      {
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        user: process.env.IMA_EMAIL_USER,
        password: process.env.IMA_EMAIL_PASSWORD
      }
    ];

    // Recorrer cuenta por cuenta
    for (const account of imapAccounts) {
      logger.info(`=== PROCESANDO CUENTA: ${account.user} ===`);

      const client = new ImapFlow({
        host: account.host,
        port: account.port,
        secure: account.secure,
        auth: { user: account.user, pass: account.password },
        tls: { rejectUnauthorized: false },
        logger: false,
      });

      try {
        // Intentar conexión
        await client.connect();
        logger.info(`✅ Conexión exitosa: ${account.user}`);

        // Obtener lock del buzón
        let lock = await client.getMailboxLock('INBOX');

        try {
          // Determinar criterio de búsqueda según READ_MODE
          const searchCriteria = READ_MODE === 0 ? {} : { seen: false };
          const modeDescription = READ_MODE === 0 ? 'TODOS los correos' : 'solo correos PENDIENTES';

          logger.info(`📧 Iniciando lectura de ${modeDescription} en ${account.user}`);

          let processedCount = 0;
          let classifiedCount = 0;

          // Procesar correos uno por uno
          for await (let msg of client.fetch(searchCriteria, { envelope: true, source: true, uid: true })) {
            processedCount++;

            const subject = msg.envelope.subject || 'Sin asunto';
            const from = msg.envelope.from?.[0]?.address || 'Desconocido';
            const date = msg.envelope.date || new Date();

            logger.info(`📨 Procesando correo ${processedCount}: "${subject}" de ${from}`);

            const raw = msg.source.toString();
            const parsed = await simpleParser(raw);
            const html = parsed.html || '';
            const text = parsed.text || '';

            if (!html && !text) {
              logger.warn(`⚠️ No se pudo extraer contenido del correo: ${subject}`);
              continue;
            }

            // ANALIZAR EL CONTENIDO PARA DETERMINAR TIPO DE ACCIÓN
            const actionType = this.dataProcessor.analyzeEmailContent(subject, html, text);

            if (actionType) {
              classifiedCount++;
              results.push({
                emailAccount: account.user,
                actionType: actionType.type,
                description: actionType.description,
                subject: subject,
                from: from,
                date: date,
                extractedData: {
                  ...actionType,
                  subject,
                  from,
                  date,
                  rawContent: { html, text }
                }
              });
              logger.info(`🎯 Correo clasificado como: ${actionType.type} - ${actionType.description}`);

              // Llamada síncrona a buscarServicioIMA
              const { servicio: datos, language } = await this.apiClient.buscarServicioIMA(actionType.serviceNumber);
             
              if (!datos) {
                console.error('❌ datos está indefinido');
                return;
              }
              
              let phones = (datos?.client_phone_number || '').split(' / ').filter(p => p && p.toLowerCase() !== 'null');
              let typology = (datos?.typology?.name || '').toLowerCase();
              let category = (datos?.category?.name || '').toLowerCase();
              
              const caseType = this.dataProcessor.determinarTipoCaso(typology, category);
              const budget_lines = await this.apiClient.obtenerBudgetLines(datos?.id, language);
              
              let RegistroNuevo = {
                contractCode: datos?.account_reference?.toLowerCase().includes('a') ? 'IM' : 'PM',
                companyName: '',
                caseState: 'Pendiente tramitar',
                caseNumber: datos?.ima_process_number||'',
                caseDeclaration: JSON.stringify(datos),
                notificationNumber: datos?.ima_process_number||'',
                caseTreatment: '',
                caseType: caseType,
                caseDescription: datos?.observations || '-',
                caseDate: datos?.opening_date, // asegúrate que now esté definido
                isUrgent: datos?.service_urgency === 0 ? 'NO' : 'SI',
                isVIP: false,
                clientName: datos?.client_name || '-',
                clientPhone: phones[0] || '',
                clientPhone2: phones[1]||'',
                clientVATNumber: '',
                countryISOCode: 'ES',
                address: datos?.address || '-',
                city: '',
                zipCode: datos?.postal_code || '',
                policyNumber: '',
                processorName: '',
                capabilityDescription: datos?.category.name,
                classify: actionType.description,
                provider: 'IMA',
                message: datos?.service_messages[0]?.message || '',
                budget: budget_lines
              };
              
              console.log('✅ RegistroNuevo creado:', RegistroNuevo);
              // Marcar como leído si corresponde
              // if (markAsRead && msg.uid) {
              //   await client.messageFlagsAdd(msg.uid, ['\\Seen']);
              // }
            } else {
              logger.info(`ℹ️ Correo no clasificado para acción específica: ${subject}`);
            }
          }

          logger.info(`📊 Resumen ${account.user}: ${processedCount} correos procesados, ${classifiedCount} clasificados`);

        } finally {
          lock.release();
          await client.logout();
          logger.info(`🔒 Sesión cerrada: ${account.user}`);
        }

      } catch (err) {
        logger.error(`❌ Error procesando cuenta ${account.user}: ${err.message}`);
        continue; // Continuar con la siguiente cuenta
      }
    }

    logger.info(`🏁 Proceso completado. Total de resultados: ${results.length}`);
    return results;
  }
}

module.exports = IMAProvider;