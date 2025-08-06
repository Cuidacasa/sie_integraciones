// src/integraciones/asitur/dataProcessor.js

const { simpleParser } = require('mailparser');
class AsiturDataProcessor {
    constructor() {
        this.patrones = [
            { patron: /Reapertura siniestro/i, code: 'REOPENED' },
            { patron: /Información General Expediente/i, code: 'INFORMATION' },
            { patron: /Reclamacion de facturas/i, code: 'INVOICE_RETURN' },
            { patron: /Gestión con Perito/i, code: 'EXPERT' },
            { patron: /Envío Informe Pericial definitivo/i, code: 'EXPERT' },
            { patron: /Presupuesto de perito para expediente/i, code: 'EXPERT' },
            { patron: /Facturacion colaboradores Hogar/i, code: 'INVOICE' },
            { patron: /Comunicación a colaborador/i, code: 'PROVIDER' },
            { patron: /Devolución de factura/i, code: 'INVOICE_RETURN' },
            { patron: /Facturas autorizadas/i, code: 'INVOICE' },
            { patron: /Solicitud datos causante/i, code: 'REQUEST' },
            { patron: /Videoperito/i, code: 'EXPERT' },
            { patron: /Informe Pericial/i, code: 'EXPERT' },
            { patron: /Informe Preliminar/i, code: 'EXPERT' },
            { patron: /Carta de transferencia/i, code: 'DOCUMENT' },
            { patron: /rechazar su intervención del expediente/i, code: 'ANULATION' },
            { patron: /Informe complementario/i, code: 'DOCUMENT' },
            { patron: /Informe Pericial preliminar/i, code: 'DOCUMENT' },
            { patron: /Expediente con mucha antigüedad/i, code: 'WAITING' },
            { patron: /Paralice siniestro/i, code: 'WAITING' },
            { patron: /asigna perito por reclamación/i, code: 'REQUEST' },
            { patron: /informe cierre pericial/i, code: 'CONFIRMATION' }
        ];
    }

    obtenerTipoComunicacion(subject) {
        const match = this.patrones.find(p => p.patron.test(subject));
        return match ? match.code : 'INCORRECT';
    }

    eliminarEtiquetasHtml(input) {
        if (!input) return '';
        return input
            .replace(/<style[^>]*>.*?<\/style>/g, '')
            .replace(/<script[^>]*>.*?<\/script>/g, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }

    escapeHtmlForJson(html) {
        return html.replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }

    extraerContenidoCompleto(parsed) {
        let contenido = parsed.html || parsed.text || parsed.textAsHtml || parsed.raw?.toString() || '';
        contenido = eliminarEtiquetasHtml(contenido);
        return contenido.replace(/\r?\n/g, '\n').replace(/\n\s*\n/g, '\n').trim();
    }

    extraerInformacionCorreo(cuerpo) {
        const match = (regex) => cuerpo.match(regex)?.[1]?.trim() || '';
        return {
            provincia: match(/Provincia:\s*([^\n]+)/i),
            tipoSiniestro: match(/Tipo siniestro:\s*([^\n]+)/i),
            expediente: match(/Expediente:\s*([^\n]+)/i),
            referencia: match(/Referencia Asitur:\s*([^\n]+)/i),
            observaciones: match(/Observaciones póliza:\s*([\s\S]*?)(?=\n\s*\n|\nDatos del Asegurado:|$)/i)
        };
    }



    GetPrefijoAsitur(cuenta, prov, tipoSiniestro) {
        let prefijo = 'As';
        prov = prov?.trim();
        if (prov === 'TARRAGONA' && cuenta.includes('gesposindi')) {
            prefijo += tipoSiniestro.includes('Mantenimiento') || tipoSiniestro.includes('Asistencia') ? 'TgnB' : 'Tgn';
        } else if (prov === 'MADRID' && cuenta.includes('serviseguros24')) {
            prefijo += tipoSiniestro.includes('Mantenimiento') || tipoSiniestro.includes('Asistencia') ? 'MadB' : 'Mad';
        } else if (prov === 'GIRONA' && cuenta.includes('@apris.app')) {
            prefijo += 'Gir';
        }
        return prefijo;
    }

    async parsearCorreo(source) {
        const parsed = await simpleParser(source);
        return parsed;
    }

    correoToExpediente(parsed, cuentaUser) {
        const asunto = parsed.subject || '';
        const cuerpo = extraerContenidoCompleto(parsed);
        const info = extraerInformacionCorreo(cuerpo);
        const caseLogTypeCode = obtenerTipoComunicacion(asunto);
        const expediente = info.referencia || info.expediente || '-';

        return {
            caseLogTypeCode,
            caseNumber: expediente,
            content: escapeHtmlForJson(cuerpo),
            contractCode: GetPrefijoAsitur(cuentaUser, info.provincia, info.tipoSiniestro),
            date: parsed.date,
            from: parsed.from?.text || '-',
            subject: asunto,
            tos: ['cuidacasa@diaple.com'],
            cccs: [],
            bccs: [],
            attachments: []
        };
    }
}
module.exports = AsiturDataProcessor;
