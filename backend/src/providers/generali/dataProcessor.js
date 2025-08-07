// dataProcessor.js - Extracción de datos de correos GENERALI
const xml2js = require('xml2js');
class GeneraliDataProcessor {
    constructor() {
        this.parsearXMLAsync = this.parsearXMLAsync.bind(this);
    }

     parsearXMLAsync(xmlString) {
        return new Promise((resolve, reject) => {
            xml2js.parseString(xmlString, { explicitArray: false, trim: true }, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }
    
    // ---- 2. Helper para mapping de prefijos ----
     getPrefijoGenerali(user, correo) {
        if (user === 'pgsekj4' && !correo.includes('cajamar')) return 'Ge';
        if (user === 'pgse2k3') return 'GeMad';
        if (user === 'pgseh5v' && !correo.includes('cajamar')) return 'GeGir';
        if (user === 'pgsekj4' && correo.includes('cajamar')) return 'Cm';
        if (user === 'pgseh5v' && correo.includes('cajamar')) return 'CmGir';
        return '';
    }
    
    // ---- 3. Normaliza y asegura que los campos sean strings ----
     safeString(val) {
        if (typeof val === 'undefined' || val === null) return '';
        return String(val).trim();
    }
    
    // ---- 4. Armador de JSON para DIAPLE (Expediente) ----
     buildExpedienteDiaple({
        from,
        prefijo,
        caseNumber,
        date,
        subject,
        content,
        tos = [],
        attachments = []
    }) {
        return {
            from: safeString(from),
            caseLogTypeCode: "CASE", // O el código que pida la integración
            contractCode: prefijo,
            caseNumber: safeString(caseNumber),
            date: safeString(date),
            subject: safeString(subject),
            content: safeString(content),
            tos: Array.isArray(tos) ? tos : [tos],
            cccs: [],
            bccs: [],
            attachments: attachments // [{filename, contentType, data (base64)}]
        };
    }
    
    // ---- 5. Armador de JSON para DIAPLE (Comunicación) ----
     buildComunicacionDiaple({
        from,
        prefijo,
        caseNumber,
        date,
        subject,
        content,
        tos = [],
        attachments = []
    }) {
        return {
            from: safeString(from),
            caseLogTypeCode: "DOCUMENT",
            contractCode: prefijo,
            caseNumber: safeString(caseNumber),
            date: safeString(date),
            subject: safeString(subject),
            content: safeString(content),
            tos: Array.isArray(tos) ? tos : [tos],
            cccs: [],
            bccs: [],
            attachments: attachments
        };
    }
    
    // ---- 6. Extracción de expediente GENERALI ----
    async  extraerExpedienteGenerali(xmlBody) {
        const data = await parsearXMLAsync(xmlBody);
        // Permite campos con distintos nombres (mayúsculas/minúsculas)
        const order = data.ORDER || {};
        const get = (key) => order[key] || order[key.toUpperCase()] || order[key.toLowerCase()] || '';
    
        return {
            idOrder: safeString(get('ID_ORDER') || get('ORDERID')),
            company: safeString(get('COMPANY')),
            operationDate: safeString(get('OPERATION_DATE')),
            idClaim: safeString(get('ID_CLAIM')),
            operationType: safeString(get('OPERATION_TYPE')),
            idProfessional: safeString(get('ID_PROFESSIONAL')),
            rawOrder: order
        };
    }
    
    // ---- 7. Extracción de comunicación GENERALI ----
    async  extraerComunicacionGenerali(xmlBody) {
        const data = await parsearXMLAsync(xmlBody);
        const dialog = data.DIALOG || {};
        const get = (key) => dialog[key] || dialog[key.toUpperCase()] || dialog[key.toLowerCase()] || '';
    
        // Saca todos los campos clave
        return {
            company: safeString(get('COMPANY')),
            idDialog: safeString(get('ID_DIALOG')),
            idOrder: safeString(get('ID_ORDER')),
            idParentDialog: safeString(get('ID_PARENT_DIALOG')),
            transmitter: safeString(get('TRANSMITTER')),
            receiver: safeString(get('RECEIVER')),
            issue: safeString(get('ISSUE')),
            message: safeString(get('MESSAGE')),
            hasDocumentation: safeString(get('HAS_DOCUMENTATION')),
            answerRequired: safeString(get('ANSWER_REQUIRED')),
            idProfessional: safeString(get('ID_PROFESSIONAL')),
            rawDialog: dialog
        };
    }
    
    // ---- 8. Helper para armar adjuntos en formato DIAPLE ----
     buildAttachmentsFromMail(parsedMail) {
        // parsedMail debe ser el objeto del correo ya parseado por mailparser
        if (!parsedMail.attachments || !Array.isArray(parsedMail.attachments)) return [];
        return parsedMail.attachments.map(att => ({
            filename: att.filename,
            contentType: att.contentType,
            data: att.content.toString('base64')
        }));
    }
    
}
module.exports = GeneraliDataProcessor;