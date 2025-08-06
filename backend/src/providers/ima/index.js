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

  /**
   * Extraer la ciudad del campo address
   * @param {string} address - Dirección completa (ej: 'CL ANGELA GONZALEZ 8 28038 MADRID Spain')
   * @returns {string} - Ciudad extraída (ej: 'MADRID')
   */
  extraerCiudad(address) {
    if (!address) return '';
    
    try {
      // Dividir por "Spain" y tomar la parte anterior
      const parts = address.split(/\s+Spain/i);
      if (parts.length === 0) return '';
      
      const beforeSpain = parts[0].trim();
      if (!beforeSpain) return '';
      
      // Buscar retrocediendo desde el final hasta encontrar un número
      // y tomar todas las palabras entre el número y el final
      const words = beforeSpain.split(/\s+/);
      let cityWords = [];
      let foundNumber = false;
      
      // Recorrer las palabras de derecha a izquierda
      for (let i = words.length - 1; i >= 0; i--) {
        const word = words[i];
        
        // Si encontramos un número, paramos
        if (/\d+/.test(word)) {
          foundNumber = true;
          break;
        }
        
        // Si no es un número, agregar a las palabras de la ciudad
        cityWords.unshift(word);
      }
      
      // Si encontramos un número y tenemos palabras de ciudad
      if (foundNumber && cityWords.length > 0) {
        return cityWords.join(' ').trim();
      }
      
      // Fallback: buscar el último grupo de letras después del código postal
      const cityMatch = beforeSpain.match(/\d+\s+([A-ZÁÉÍÓÚÑ\s]+)$/i);
      
      if (cityMatch && cityMatch[1]) {
        return cityMatch[1].trim();
      }
      
      // Si no encuentra el patrón con números, buscar la última palabra en mayúsculas
      const lastWord = words[words.length - 1];
      
      // Verificar si la última palabra es una ciudad (solo letras y mayúsculas)
      if (lastWord && /^[A-ZÁÉÍÓÚÑ]+$/.test(lastWord)) {
        return lastWord;
      }
      
      // Buscar cualquier palabra en mayúsculas que parezca una ciudad
      const cityWordsFiltered = words.filter(word => 
        /^[A-ZÁÉÍÓÚÑ]+$/.test(word) && 
        word.length > 2 && 
        !/^(CL|AV|CALLE|AVENIDA|PLAZA|PASEO|CARRER|GRAN|VIA)$/i.test(word)
      );
      
      if (cityWordsFiltered.length > 0) {
        return cityWordsFiltered[cityWordsFiltered.length - 1]; // Tomar la última ciudad encontrada
      }
      
      return '';
    } catch (error) {
      console.error('Error extrayendo ciudad:', error);
      return '';
    }
  }

  async authenticate(username, password) {
    this.apiClient.setCredentials(username, password);
    return await this.apiClient.buscarServicioIMA('test'); // Test de conexión
  }



  async processRawData(rawData, options = {}) {
    const pool = require('../../config/db');
    const connection = await pool.getConnection();
    
    try {
      console.log(`[${this.providerName}] Procesando datos para ${this.compania.nombre}`);
      
      let expedientesProcesados = 0;
      let expedientesOmitidos = 0;
      let expedientesOmitidosServicios = [];

      // Verificar si rawData tiene la estructura esperada
      if (rawData && rawData.registrosNuevos) {
        const registrosNuevos = rawData.registrosNuevos;
        const results = rawData.results || [];
        
        console.log(`[${this.providerName}] Procesando ${registrosNuevos.length} registros nuevos`);
        
        // Calcular fechas (últimas 24 horas por defecto, o usar fechas específicas)
        let fechaInicio, fechaFin;
        
        if (options.fechaInicio && options.fechaFin) {
          // Usar fechas específicas proporcionadas
          fechaInicio = new Date(options.fechaInicio + 'T00:00:00Z');
          fechaFin = new Date(options.fechaFin + 'T23:59:59Z');
        } else {
          // Usar últimas 24 horas por defecto
          fechaFin = new Date();
          fechaInicio = new Date(fechaFin.getTime() - (24 * 60 * 60 * 1000));
        }
        
        const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
        const fechaFinStr = fechaFin.toISOString().split('T')[0];

        // Procesar cada registro nuevo
        for (const registro of registrosNuevos) {
          // Crear id_unico concatenando provider y caseNumber
          const idUnico = `${this.compania.nombre}_${registro.caseNumber || ''}`;
          
          // Obtener el classify del registro
       
          // Verificar si ya existe
          const [existe] = await connection.query(
            'SELECT id FROM expedientes WHERE id_unico = ?',
            [idUnico]
          );

          // Lógica específica según el classify
          let debeProcesar = true;
          let razonOmitido = '';

          if (existe.length > 0) {
            // El registro existe, aplicar lógica según classify
            if (registro.classify === 'Nuevo') {
              // Si es Nuevo y ya existe, marcar como omitido
              debeProcesar = false;
              razonOmitido = 'Registro Nuevo ya existe';
            } else if (registro.classify === 'Mensaje' || registro.classify === 'Cancelado') {
              // Si es Mensaje o Cancelado, procesar aunque ya exista
              debeProcesar = true;
              razonOmitido = '';
            } else {
              // Para otros tipos, no procesar si ya existe
              debeProcesar = false;
              razonOmitido = 'Registro ya existe';
            }
          }

          if (debeProcesar) {
            try {
              // Preparar los datos para insertar
              const expedienteData = {
                contractCode: registro.contractCode,
                companyName: registro.companyName,
                caseState: registro.caseState,
                caseNumber: registro.caseNumber,
                caseDeclaration: registro.caseDeclaration,
                notificationNumber: registro.notificationNumber,
                caseTreatment: registro.caseTreatment,
                caseType: registro.caseType,
                caseDescription: registro.caseDescription,
                caseDate: registro.caseDate,
                isUrgent: registro.isUrgent,
                isVIP: registro.isVIP,
                clientName: registro.clientName,
                clientPhone: registro.clientPhone,
                clientPhone2: registro.clientPhone2,
                clientVATNumber: registro.clientVATNumber,
                countryISOCode: registro.countryISOCode,
                address: registro.address,
                city: registro.city,
                zipCode: registro.zipCode,
                policyNumber: registro.policyNumber,
                processorName: registro.processorName,
                capabilityDescription: registro.capabilityDescription,
                classify: registro.classify,
                provider: registro.provider,
                message: registro.message,
                budget: registro.budget
              };

              // Insertar en la base de datos
              await connection.query(
                'INSERT INTO expedientes (data, data_raw, status, servicio, fecha_asignacion, cliente, id_unico,TipoRegistro) VALUES (?, ?, ?, ?, ?, ?, ?,?)',
                [
                  JSON.stringify(expedienteData), 
                  JSON.stringify(registro), 
                  'pendiente', 
                  registro.caseNumber || null, 
                  registro.caseDate ? new Date(registro.caseDate).toISOString().split('T')[0] : null, 
                  this.compania.nombre, 
                  idUnico,
                  registro.classify
                ]
              );
              
              expedientesProcesados++;
              console.log(`✅ Expediente procesado: ${registro.caseNumber} (${registro.classify})`);
              
            } catch (error) {
              // Si hay error de duplicado por el índice único, contar como omitido
              if (error.code === 'ER_DUP_ENTRY') {
                expedientesOmitidos++;
                expedientesOmitidosServicios.push(registro.caseNumber || null);
                console.log(`⚠️ Expediente duplicado omitido: ${registro.caseNumber} (${registro.classify})`);
              } else {
                console.error(`❌ Error insertando expediente ${registro.caseNumber}:`, error.message);
                expedientesOmitidos++;
                expedientesOmitidosServicios.push(registro.caseNumber || null);
              }
            }
          } else {
            expedientesOmitidos++;
            expedientesOmitidosServicios.push(registro.caseNumber || null);
            console.log(`⚠️ Expediente omitido: ${registro.caseNumber} (${registro.classify}) - ${razonOmitido}`);
          }
        }

        console.log(`[${this.providerName}] Procesamiento completado: ${expedientesProcesados} procesados, ${expedientesOmitidos} omitidos`);
        
        return {
          procesados: expedientesProcesados,
          omitidos: expedientesOmitidos,
          omitidosServicios: expedientesOmitidosServicios,
          total_disponible: registrosNuevos.length,
          fecha_inicio: fechaInicioStr,
          fecha_fin: fechaFinStr,
          registrosNuevos: registrosNuevos
        };
        
      } else {
        // Fallback para datos que no tienen la estructura esperada
        console.log(`[${this.providerName}] No hay registros nuevos para procesar`);
        
        return {
          procesados: 0,
          omitidos: 0,
          omitidosServicios: [],
          total_disponible: 0,
          fecha_inicio: null,
          fecha_fin: null
        };
      }
      
    } catch (error) {
      console.error(`[${this.providerName}] Error en procesamiento:`, error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async fetchData(options) {
    // CONSTANTE DE CONFIGURACIÓN PARA TIPO DE LECTURA
    const READ_MODE = 1; // 0 = leer todos los correos, 1 = leer solo pendientes
    const markAsRead = false;
    const results = [];
    const registrosNuevos = []; // Array para almacenar todos los RegistroNuevo

    // Configurar cuentas IMAP (esto debería venir de la configuración)
    const imapAccounts = [
      {
        host: options.compania.hostname,
        port: options.compania.hostport,
        secure: options.compania.secure[0],
        user: options.compania.username,
        password: options.compania.password
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
                continue; // Continuar con el siguiente correo
              }
              
              let phones = (datos?.client_phone_number || '').split(' / ').filter(p => p && p.toLowerCase() !== 'null');
              let typology = (language[datos?.typology?.name] || datos?.typology?.name || 'Sin Tipologia').toLowerCase();
              let category = (language[datos?.category?.name || ''] || datos?.category?.name || '').toLowerCase();
        
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
                caseDescription: typology+' '+datos?.service_coverage+' '+datos?.observations || '-',
                caseDate: datos?.opening_date, // asegúrate que now esté definido
                isUrgent: datos?.service_urgency === 0 ? 'NO' : 'SI',
                isVIP: false,
                clientName: datos?.client_name || '-',
                clientPhone: phones[0] || '',
                clientPhone2: phones[1]||'',
                clientVATNumber: '',
                countryISOCode: 'ES',
                address: datos?.address || '-',
                city: this.extraerCiudad(datos?.address) || '',
                zipCode: datos?.postal_code || '',
                policyNumber: datos?.service_insurance?.name || '',
                processorName: '',
                capabilityDescription: category,
                classify: this.dataProcessor.clasificarTipoAccion(actionType.description),
                provider: 'IMA',
                message: datos?.service_messages[0]?.message || '',
                budget: budget_lines
              };
              
              console.log('✅ RegistroNuevo creado:', RegistroNuevo);
              
              // Agregar el RegistroNuevo al array de resultados
              registrosNuevos.push(RegistroNuevo);
              
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

    logger.info(`🏁 Proceso completado. Total de resultados: ${results.length}, Total de RegistroNuevo: ${registrosNuevos.length}`);
    
    // Retornar tanto los resultados de clasificación como los RegistroNuevo
    return {
      results: results,
      registrosNuevos: registrosNuevos
    };
  }
}

module.exports = IMAProvider;