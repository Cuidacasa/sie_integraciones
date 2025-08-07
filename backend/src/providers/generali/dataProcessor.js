// dataProcessor.js - Extracción de datos de correos GENERALI
const xml2js = require('xml2js');
const userMap = {
    // 'correo@dominio.com': { company: 'K', user: 'usuario', password: 'clave' }
    'generali@apris.app': { company: 'K', user: 'pgseh5v', password: 'Rondaap100' },
    'generali@cuidacasa.com': { company: 'K', user: 'pgsekj4', password: 'Rondacu100' }
    // ...agrega aquí otros mapeos según tu necesidad
};
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
         user = userMap[correo];
        if (user.user === 'pgsekj4' && !correo.includes('cajamar')) return 'Ge';
        if (user.user === 'pgse2k3') return 'GeMad';
        if (user.user === 'pgseh5v' && !correo.includes('cajamar')) return 'GeGir';
        if (user.user === 'pgsekj4' && correo.includes('cajamar')) return 'Cm';
        if (user.user === 'pgseh5v' && correo.includes('cajamar')) return 'CmGir';
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
            from: this.safeString(from),
            caseLogTypeCode: "CASE", // O el código que pida la integración
            contractCode: prefijo,
            caseNumber: this.safeString(caseNumber),
            date: this.safeString(date),
            subject: this.safeString(subject),
            content: this.safeString(content),
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
            from: this.safeString(from),
            caseLogTypeCode: "DOCUMENT",
            contractCode: prefijo,
            caseNumber: this.safeString(caseNumber),
            date: this.safeString(date),
            subject: this.safeString(subject),
            content: this.safeString(content),
            tos: Array.isArray(tos) ? tos : [tos],
            cccs: [],
            bccs: [],
            attachments: attachments
        };
    }
    
    // ---- 6. Extracción de expediente GENERALI ----
    async  extraerExpedienteGenerali(xmlBody) {
        const data = await this.parsearXMLAsync(xmlBody);
        // Permite campos con distintos nombres (mayúsculas/minúsculas)
        const order = data.ORDER || {};
        const get = (key) => order[key] || order[key.toUpperCase()] || order[key.toLowerCase()] || '';
    
        return {
            idOrder: this.safeString(get('ID_ORDER') || get('ORDERID')),
            company: this.safeString(get('COMPANY')),
            operationDate: this.safeString(get('OPERATION_DATE')),
            idClaim: this.safeString(get('ID_CLAIM')),
            operationType: this.safeString(get('OPERATION_TYPE')),
            idProfessional: this.safeString(get('ID_PROFESSIONAL')),
            rawOrder: order
        };
    }
    
    // ---- 7. Extracción de comunicación GENERALI ----
    async  extraerComunicacionGenerali(xmlBody) {
        const data = await this.parsearXMLAsync(xmlBody);
        const dialog = data.DIALOG || {};
        const get = (key) => dialog[key] || dialog[key.toUpperCase()] || dialog[key.toLowerCase()] || '';
    
        // Saca todos los campos clave
        return {
            company: this.safeString(get('COMPANY')),
            idDialog: this.safeString(get('ID_DIALOG')),
            idOrder: this.safeString(get('ID_ORDER')),
            idParentDialog: this.safeString(get('ID_PARENT_DIALOG')),
            transmitter: this.safeString(get('TRANSMITTER')),
            receiver: this.safeString(get('RECEIVER')),
            issue: this.safeString(get('ISSUE')),
            message: this.safeString(get('MESSAGE')),
            hasDocumentation: this.safeString(get('HAS_DOCUMENTATION')),
            answerRequired: this.safeString(get('ANSWER_REQUIRED')),
            idProfessional: this.safeString(get('ID_PROFESSIONAL')),
            idClaim: this.safeString(get('ID_CLAIM')),
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