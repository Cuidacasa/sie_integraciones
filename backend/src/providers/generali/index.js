// index.js - Provider Generali

const BaseProvider = require('../../core/baseProvider');
const GeneraliApiClient = require('./apiClient');
const GeneraliDataProcessor = require('./dataProcessor');

const pool = require('../../db/mysqlPool'); // O tu pool de BD
const { simpleParser } = require('mailparser');


class GeneraliProvider extends BaseProvider {
    constructor(compania) {
        super(compania);
        this.providerName = 'GeneraliProvider';
        this.token = null;
        this.apiClient = new GeneraliApiClient();
        this.dataProcessor = new GeneraliDataProcessor();
    }
    // 1. Login DIAPLE para obtener token (igual que authenticate de Asitur)
    async authenticate() {
        // Puedes parametrizar usuario y clave vía ENV o config
        const usuarioDiaple = process.env.DIAPLE_USER || 'zasylogic';
        const claveDiaple = process.env.DIAPLE_PASS || 's6AikLPci6WJbp';
        this.token = await loginDiaple(usuarioDiaple, claveDiaple);
    }

    // 2. Obtención y filtrado de correos
    async fetchData(options) {
        const mensajes = [];
        try {
            const client = new ImapFlow({
                host: options.compania.hostname,
                port: options.compania.hostport,
                secure: !!options.compania.secure,
                auth: { user: options.compania.username, pass: options.compania.password },
                tls: { rejectUnauthorized: false },
                logger: false
            });
            await client.connect();
            let lock = await client.getMailboxLock('INBOX');
            try {
                // Solo correos no leídos
                const searchCriteria = { seen: false };
                for await (let msg of client.fetch(searchCriteria, { envelope: true, source: true, uid: true })) {
                    const subject = msg.envelope.subject || '';
                    mensajes.push({
                        cuenta: options.compania.username,
                        msg,
                        subject,
                        from: msg.envelope.from?.[0]?.address || '',
                        date: msg.envelope.date || new Date(),
                        source: msg.source
                    });
                }
            } finally {
                lock.release();
                await client.logout();
            }
        } catch (error) {
            console.error(`❌ Error procesando cuenta ${options.compania.username}: ${error.message}`);
            throw error;
        }
        return mensajes;
    }

    // 3. Inserción y procesamiento de datos extraídos (solo BD, y si corresponde, luego trigger a DIAPLE)
    async processRawData(items, options = {}) {
        const connection = await pool.getConnection();
        let procesados = 0, omitidos = 0, omitidosServicios = [];
        await this.authenticate(); // Login DIAPLE

        for (const item of items) {
            try {
                const parsed = await simpleParser(item.source);
                const asunto = (parsed.subject || '').toLowerCase().trim();
                const bodyXml = parsed.text;

                let classify = '';
                let idUnico = '';
                let dataFinal = {};
                let tipoRegistro = '';

                if (asunto.includes('nuevo encargo')) {
                    // ------ FLUJO CREACIÓN DE EXPEDIENTE ------
                    const datos = await extraerExpedienteGenerali(bodyXml);
                    classify = 'Nuevo';
                    const prefijo = getPrefijoGenerali('user_segun_email', item.cuenta); // Corrige si tienes user real
                    idUnico = `${prefijo}_${datos.idOrder}`;

                    // Verifica duplicados
                    const [existe] = await connection.query('SELECT id FROM expedientes WHERE id_unico = ?', [idUnico]);
                    if (existe.length > 0) {
                        omitidos++;
                        omitidosServicios.push(datos.idOrder || null);
                        continue;
                    }

                    // Login Generali
                    let tokenGenerali;
                    try {
                        tokenGenerali = await loginGenerali(item.cuenta);
                    } catch (err) {
                        tipoRegistro = 'ErrorObtenerDatos';
                        await this._guardarExpedienteError(datos, item, idUnico, tipoRegistro, connection, err.message);
                        omitidos++; continue;
                    }

                    // Detalle de expediente
                    let detalle;
                    try {
                        detalle = await getOrderDetail(tokenGenerali, {
                            orderID: datos.idOrder,
                            company: datos.company,
                            claimNumber: datos.idClaim,
                            professionalID: datos.idProfessional
                        });
                    } catch (err) {
                        tipoRegistro = 'ErrorObtenerDatos';
                        await this._guardarExpedienteError(datos, item, idUnico, tipoRegistro, connection, err.message);
                        omitidos++; continue;
                    }

                    // Armar el JSON para DIAPLE
                    dataFinal = buildExpedienteDiaple({
                        from: parsed.from?.text || '',
                        prefijo,
                        caseNumber: datos.idOrder,
                        date: parsed.date ? new Date(parsed.date).toISOString() : '',
                        subject: parsed.subject,
                        content: detalle.observations?.join('\n') || '', // Ajusta según lo que requieras
                        tos: parsed.to?.value?.map(x => x.address) || [],
                        attachments: buildAttachmentsFromMail(parsed)
                    });
                    tipoRegistro = classify;

                } else if (asunto.includes('nuevo diálogo') || asunto.includes('nuevo dialogo')) {
                    // ------ FLUJO ENVÍO DE COMUNICACIONES ------
                    const datos = await extraerComunicacionGenerali(bodyXml);
                    classify = 'Mensaje';
                    const prefijo = getPrefijoGenerali('user_segun_email', item.cuenta);
                    idUnico = `${prefijo}_${datos.idOrder}`;

                    const [existe] = await connection.query('SELECT id FROM expedientes WHERE id_unico = ?', [idUnico]);
                    if (existe.length > 0) {
                        omitidos++;
                        omitidosServicios.push(datos.idOrder || null);
                        continue;
                    }

                    // Login Generali
                    let tokenGenerali;
                    try {
                        tokenGenerali = await loginGenerali(item.cuenta);
                    } catch (err) {
                        tipoRegistro = 'ErrorObtenerDatos';
                        await this._guardarExpedienteError(datos, item, idUnico, tipoRegistro, connection, err.message);
                        omitidos++; continue;
                    }

                    // Detalle de comunicaciones
                    let dialogList;
                    try {
                        dialogList = await getDialogList(tokenGenerali, {
                            orderID: datos.idOrder,
                            company: datos.company,
                            claimNumber: datos.idClaim,
                            professionalID: datos.idProfessional
                        });
                    } catch (err) {
                        tipoRegistro = 'ErrorObtenerDatos';
                        await this._guardarExpedienteError(datos, item, idUnico, tipoRegistro, connection, err.message);
                        omitidos++; continue;
                    }

                    dataFinal = buildComunicacionDiaple({
                        from: parsed.from?.text || '',
                        prefijo,
                        caseNumber: datos.idOrder,
                        date: parsed.date ? new Date(parsed.date).toISOString() : '',
                        subject: parsed.subject,
                        content: dialogList.messages?.map(msg => msg.message).join('\n') || '',
                        tos: parsed.to?.value?.map(x => x.address) || [],
                        attachments: buildAttachmentsFromMail(parsed)
                    });
                    tipoRegistro = classify;
                } else {
                    // Otros asuntos: omite o maneja según política
                    omitidos++;
                    continue;
                }

                // Inserta en la tabla de expedientes
                await connection.query(
                    'INSERT INTO expedientes (data, data_raw, status, servicio, fecha_asignacion, cliente, id_unico, TipoRegistro) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        JSON.stringify(dataFinal),
                        JSON.stringify(item),
                        'pendiente',
                        dataFinal.caseNumber || null,
                        dataFinal.date ? dataFinal.date.split('T')[0] : null,
                        'GENERALI',
                        idUnico,
                        tipoRegistro
                    ]
                );
                procesados++;
                // Aquí NO se dispara el envío a DIAPLE, solo inserta (como en tu arquitectura).
            } catch (err) {
                console.error(`❌ Error procesando mensaje:`, err.message);
                omitidos++;
            }
        }
        connection.release();
        return {
            procesados,
            omitidos,
            omitidosServicios,
            total_disponible: items.length
        };
    }

    // Helper para guardar errores
    async _guardarExpedienteError(datos, rawItem, idUnico, tipoRegistro, connection, mensaje) {
        await connection.query(
            'INSERT INTO expedientes (data, data_raw, status, servicio, fecha_asignacion, cliente, id_unico, TipoRegistro) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                JSON.stringify(datos),
                JSON.stringify(rawItem),
                tipoRegistro,
                datos.caseNumber || null,
                new Date().toISOString().split('T')[0],
                'GENERALI',
                idUnico,
                tipoRegistro
            ]
        );
        console.error(`Guardado error: ${mensaje}`);
    }

    getProviderInfo() {
        return {
            ...super.getProviderInfo(),
            name: 'Generali',
            description: 'Proveedor que procesa correos entrantes vía IMAP desde Generali',
            features: ['imap_fetch', 'email_parse', 'expediente_transform', 'diaple_forward']
        };
    }
}

module.exports = GeneraliProvider;
