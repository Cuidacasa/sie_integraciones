// src/integraciones/asitur/index.js

const BaseProvider = require('../../core/baseProvider');
const AsiturApiClient = require('./apiClient');
const AsiturDataProcessor = require('./dataProcessor');
const { ImapFlow } = require('imapflow');

class AsiturProvider extends BaseProvider {
    constructor(compania) {
        super(compania);
        this.providerName = 'AsiturProvider';
        this.token = null;
        this.apiClient = new AsiturApiClient();
        this.dataProcessor = new AsiturDataProcessor();
    }

    async authenticate() {
        this.token = await this.apiClient.obtenerTokenDiaple();
    }

    async fetchData(options) {
        // CONSTANTE DE CONFIGURACIÓN PARA TIPO DE LECTURA
        const READ_MODE = 1; // 0 = leer todos los correos, 1 = leer solo pendientes
        const markAsRead = false;
        const mensajes = [];

        try {
            const client = new ImapFlow({
                host: options.compania.hostname,
                port: options.compania.hostport,
                secure: options.compania.secure[0],
                auth: { user: options.compania.username, pass: options.compania.password },
                tls: { rejectUnauthorized: false },
                logger: false
            });

            // Intentar conexión
            await client.connect();
            console.log(`✅ Conexión exitosa: ${options.compania.username}`);

            // Obtener lock del buzón
            let lock = await client.getMailboxLock('INBOX');

            try {
                // Determinar criterio de búsqueda según READ_MODE
                const searchCriteria = READ_MODE === 0 ? '1:*' : { seen: false };
                const modeDescription = READ_MODE === 0 ? 'TODOS los correos' : 'solo correos PENDIENTES';

                console.log(`📧 Iniciando lectura de ${modeDescription} en ${options.compania.username}`);

                let processedCount = 0;
                let mensajesCount = 0;

                // Procesar correos uno por uno
                for await (let msg of client.fetch(searchCriteria, { envelope: true, source: true, uid: true })) {
                    processedCount++;

                    const subject = msg.envelope.subject || 'Sin asunto';
                    const from = msg.envelope.from?.[0]?.address || 'Desconocido';
                    const date = msg.envelope.date || new Date();

                    console.log(`📨 Procesando correo ${processedCount}: "${subject}" de ${from}`);

                    mensajes.push({
                        cuenta: options.compania.username,
                        msg,
                        subject,
                        from,
                        date,
                        source: msg.source
                    });
                    mensajesCount++;
                }

                console.log(`📊 Resumen ${options.compania.username}: ${processedCount} correos procesados, ${mensajesCount} mensajes agregados`);

            } finally {
                lock.release();
                await client.logout();
                console.log(`🔒 Sesión cerrada: ${options.compania.username}`);
            }

        } catch (error) {
            console.error(`❌ Error procesando cuenta ${options.compania.username}: ${error.message}`);
            throw error;
        }

        console.log(`🏁 Proceso completado. Total de mensajes: ${mensajes.length}`);
        return mensajes;
    }

    transformData(rawItems) {
        const resultados = [];
        for (const { cuenta, msg } of rawItems) {
            resultados.push({ cuenta: cuenta.user, source: msg.source });
        }
        return resultados;
    }

    async processRawData(items) {
        const pool = require('../../config/db');
        const connection = await pool.getConnection();
        await this.authenticate();
        try {
            console.log(`[${this.providerName}] Procesando datos para ${this.compania.nombre}`);
            
            let expedientesProcesados = 0;
            let expedientesOmitidos = 0;
            let expedientesOmitidosServicios = [];

            console.log(`[${this.providerName}] Procesando ${items.length} mensajes`);

            // Procesar cada mensaje
            for (const item of items) {
                try {
                    const parsed = await this.dataProcessor.parsearCorreoCompleto(item.source);

                    // 1. Detecta si es expediente "Nuevo" (manual 1.0)
                    if (this.dataProcessor.esExpedienteNuevo(parsed.subject)) {
                        // Utiliza el extractor avanzado del manual 1.0
                        const expediente = await this.dataProcessor.extraerExpedienteDesdeCorreo(parsed, item.cuenta);
                        const classify = 'Nuevo';
                        // Crear id_unico concatenando compañía y caseNumber
                        const idUnico = `${this.compania.nombre}_${expediente.caseNumber || ''}`;

                        // Verificar si ya existe
                        const [existe] = await connection.query(
                            'SELECT id FROM expedientes WHERE id_unico = ?',
                            [idUnico]
                        );

                        let debeProcesar = true;
                        let razonOmitido = '';

                        if (existe.length > 0) {
                            // El registro existe, aplicar lógica según classify
                            if (classify === 'Nuevo') {
                                // Si es Nuevo y ya existe, marcar como omitido
                                debeProcesar = false;
                                razonOmitido = 'Registro Nuevo ya existe';
                            } else if (classify === 'Mensaje' || classify === 'Cancelado') {
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
                                // Guardar en la base de datos
                                await connection.query(
                                    'INSERT INTO expedientes (data, data_raw, status, servicio, fecha_asignacion, cliente, id_unico, TipoRegistro) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                    [
                                        JSON.stringify(expediente),
                                        '',//JSON.stringify(expediente),
                                        'pendiente',
                                        expediente.caseNumber ,//expediente.caseNumber || null, 
                                        expediente.caseDate ? new Date(expediente.caseDate).toISOString().split('T')[0] : null,
                                        this.compania.nombre,
                                        idUnico,
                                        classify
                                    ]
                                );
                                
                                expedientesProcesados++;
                                console.log(`✅ Expediente procesado: ${expediente.caseNumber} (${expediente.classify})`);
                                
                            } catch (error) {
                                // Si hay error de duplicado por el índice único, contar como omitido
                                if (error.code === 'ER_DUP_ENTRY') {
                                    expedientesOmitidos++;
                                    expedientesOmitidosServicios.push(expediente.caseNumber || null);
                                    console.log(`⚠️ Expediente duplicado omitido: ${expediente.caseNumber} (${expediente.classify})`);
                                } else {
                                    console.error(`❌ Error insertando expediente ${expediente.caseNumber}:`, error.message);
                                    expedientesOmitidos++;
                                    expedientesOmitidosServicios.push(expediente.caseNumber || null);
                                }
                            }
                        } else {
                            expedientesOmitidos++;
                            expedientesOmitidosServicios.push(expediente.caseNumber || null);
                            console.log(`⚠️ Expediente omitido: ${expediente.caseNumber} (${expediente.classify}) - ${razonOmitido}`);
                        }

                    } else {
                        // 2. Flujo tradicional (manual 3.0)
                        const caseLogTypeCode = this.dataProcessor.obtenerTipoComunicacion(parsed.subject);
                        const expediente = this.dataProcessor.correoToExpediente(parsed, item.cuenta);
                        const classify = caseLogTypeCode === 'INCORRECT' ? 'Unprocessable' : 'Mensaje';

                        // Crear id_unico concatenando compañía y caseNumber
                        const idUnico = `${this.compania.nombre}_${this.dataProcessor.extraerNumerosIniciales(expediente.subject) || ''}`;

                        // Verificar si ya existe
                        const [existe] = await connection.query(
                            'SELECT id FROM expedientes WHERE id_unico = ?',
                            [idUnico]
                        );

                        let debeProcesar = true;
                        let razonOmitido = '';

                        if (existe.length > 0) {
                            // El registro existe, aplicar lógica según classify
                            if (classify === 'Nuevo') {
                                debeProcesar = false;
                                razonOmitido = 'Registro Nuevo ya existe';
                            } else if (classify === 'Mensaje' || classify === 'Cancelado') {
                                debeProcesar = true;
                                razonOmitido = '';
                            } else {
                                debeProcesar = false;
                                razonOmitido = 'Registro ya existe';
                            }
                        }

                        // Si es Unprocessable
                        if (!expediente.caseNumber && caseLogTypeCode === 'INCORRECT') {
                            if (debeProcesar) {
                                await this.apiClient.enviarAUnprocessable({
                                    from: expediente.from,
                                    date: expediente.date,
                                    subject: expediente.subject,
                                    contractCode: ''
                                }, this.token);
                            }
                            continue;
                        }

                        if (debeProcesar) {
                            try {
                                // Guardar en la base de datos
                                await connection.query(
                                    'INSERT INTO expedientes (data, data_raw, status, servicio, fecha_asignacion, cliente, id_unico, TipoRegistro) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                    [
                                        JSON.stringify(expediente),
                                        JSON.stringify(expediente),
                                        'pendiente',
                                        expediente.caseNumber || null,
                                        expediente.date ? new Date(expediente.date).toISOString().split('T')[0] : null,
                                        this.compania.nombre,
                                        idUnico,
                                        classify
                                    ]
                                );
                                
                                expedientesProcesados++;
                                console.log(`✅ Expediente procesado: ${expediente.caseNumber} (${classify})`);
                                
                                // Enviar a Diaple si es necesario
                                await this.apiClient.enviarA_Diaple(expediente, this.token);
                                
                            } catch (error) {
                                if (error.code === 'ER_DUP_ENTRY') {
                                    expedientesOmitidos++;
                                    expedientesOmitidosServicios.push(expediente.caseNumber || null);
                                    console.log(`⚠️ Expediente duplicado omitido: ${expediente.caseNumber} (${classify})`);
                                } else {
                                    console.error(`❌ Error insertando expediente ${expediente.caseNumber}:`, error.message);
                                    expedientesOmitidos++;
                                    expedientesOmitidosServicios.push(expediente.caseNumber || null);
                                }
                            }
                        } else {
                            expedientesOmitidos++;
                            expedientesOmitidosServicios.push(expediente.caseNumber || null);
                            console.log(`⚠️ Expediente omitido: ${expediente.caseNumber} (${classify}) - ${razonOmitido}`);
                        }
                    }

                } catch (error) {
                    console.error(`❌ Error procesando mensaje:`, error.message);
                    expedientesOmitidos++;
                }
            }

            console.log(`[${this.providerName}] Procesamiento completado: ${expedientesProcesados} procesados, ${expedientesOmitidos} omitidos`);
            
            return {
                procesados: expedientesProcesados,
                omitidos: expedientesOmitidos,
                omitidosServicios: expedientesOmitidosServicios,
                total_disponible: items.length
            };
            
        } catch (error) {
            console.error(`[${this.providerName}] Error en procesamiento:`, error);
            throw error;
        } finally {
            connection.release();
        }
    }

    getProviderInfo() {
        return {
            ...super.getProviderInfo(),
            name: 'Asitur',
            description: 'Proveedor que procesa correos entrantes vía IMAP desde Asitur',
            features: ['imap_fetch', 'email_parse', 'expediente_transform', 'diaple_forward']
        };
    }
}

module.exports = AsiturProvider;
