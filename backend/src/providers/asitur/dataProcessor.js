// src/integraciones/asitur/dataProcessor.js

const { simpleParser } = require('mailparser');
const cheerio = require('cheerio');
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
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')  // Elimina <style> y todo su contenido
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')// Elimina <script> y todo su contenido
            .replace(/<img[^>]*>/gi, '')                    // Elimina imágenes
            .replace(/<[^>]+>/g, '')                        // Elimina cualquier otra etiqueta HTML
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }

    removeImgTags(html) {
        return html.replace(/<img[^>]*>/gi, '');
    }
    escapeHtmlForJson(html) {
        return html.replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }

    extraerContenidoCompleto(parsed) {
        let contenido = '';

        // Prioridad 1: HTML (más rico en contenido)
        if (parsed.html) {
            contenido = parsed.html;
        }
        // Prioridad 2: Texto plano
        else if (parsed.text) {
            contenido = parsed.text;
        }
        // Prioridad 3: Texto alternativo
        else if (parsed.textAsHtml) {
            contenido = parsed.textAsHtml;
        }
        // Prioridad 4: Contenido raw
        else if (parsed.raw) {
            contenido = parsed.raw.toString();
        }

        // Si no hay contenido en ninguna de las opciones anteriores, intentar con el source
        if (!contenido && parsed.source) {
            contenido = parsed.source.toString();
        }

        // Limpiar el contenido pero preservar saltos de línea importantes
        // contenido = this.eliminarEtiquetasHtml(contenido);

        // // Normalizar espacios y saltos de línea
        // contenido = contenido
        //   .replace(/\r\n/g, '\n')
        //   .replace(/\r/g, '\n')
        //   .replace(/\n\s*\n/g, '\n') // Eliminar líneas vacías múltiples
        //   .trim();

        // Log para debugging
        console.log(`📧 Contenido extraído - Longitud: ${contenido.length} caracteres`);
        console.log(`📧 Primeros 500 caracteres: ${contenido.substring(0, 500)}...`);

        return contenido;
    }
     extraerReferenciaAsitur(html) {
        const $ = cheerio.load(html);
        // Busca el span con el texto exacto
        const spans = $('span');
        let found = false;
        let count = 0;
        let valor = '';
        spans.each(function(i, el) {
            const text = $(el).text().trim();
            if (found) {
                count++;
                if (count === 3) {
                    valor = $(el).text().trim();
                    return false; // break
                }
            }
            if (text === 'Referencia Asitur:') {
                found = true;
                count = 0;
            }
        });
        return valor;
    }
    
    extraerInformacionCorreo(cuerpo) {
        const info = {
            provincia: '',
            tipoSiniestro: '',
            expediente: '',
            referencia: '',
            observaciones: ''
        };

        // Extraer provincia - busca desde "Provincia:" hasta antes de "Tipo siniestro:"
        const provinciaMatch = cuerpo.match(/Provincia:\s*([^]*?)(?=\s*Tipo siniestro:)/i);
        if (provinciaMatch) {
            info.provincia = provinciaMatch[1].trim();
        } else {
            // Fallback: buscar solo en la línea siguiente
            const provinciaMatchLine = cuerpo.match(/Provincia:\s*\n\s*([^\n]+)/i);
            if (provinciaMatchLine) {
                info.provincia = provinciaMatchLine[1].trim();
            } else {
                // Fallback: buscar en la misma línea
                const provinciaMatchInline = cuerpo.match(/Provincia:\s*([^\n]+)/i);
                if (provinciaMatchInline) {
                    info.provincia = provinciaMatchInline[1].trim();
                }
            }
        }

        // Extraer tipo de siniestro - busca desde "Tipo siniestro:" hasta antes de "Causa:"
        const tipoSiniestroMatch = cuerpo.match(/Tipo siniestro:\s*([^]*?)(?=\s*Causa:)/i);
        if (tipoSiniestroMatch) {
            info.tipoSiniestro = tipoSiniestroMatch[1].trim();
        } else {
            // Fallback: buscar en la línea siguiente
            const tipoSiniestroMatchLine = cuerpo.match(/Tipo siniestro:\s*\n\s*([^\n]+)/i);
            if (tipoSiniestroMatchLine) {
                info.tipoSiniestro = tipoSiniestroMatchLine[1].trim();
            } else {
                // Fallback: buscar en la misma línea
                const tipoSiniestroMatchInline = cuerpo.match(/Tipo siniestro:\s*([^\n]+)/i);
                if (tipoSiniestroMatchInline) {
                    info.tipoSiniestro = tipoSiniestroMatchInline[1].trim();
                }
            }
        }

        // Extraer expediente - busca en la línea siguiente
        const expedienteMatch = cuerpo.match(/Expediente:\s*\n\s*([^\n]+)/i);
        if (expedienteMatch) {
            info.expediente = expedienteMatch[1].trim();
        } else {
            // Fallback: buscar en la misma línea
            const expedienteMatchInline = cuerpo.match(/Expediente:\s*([^\n]+)/i);
            if (expedienteMatchInline) {
                info.expediente = expedienteMatchInline[1].trim();
            }
        }

        // Extraer referencia Asitur - busca en la línea siguiente

        info.referencia = this.extraerReferenciaAsitur(cuerpo);



        // Extraer observaciones - busca en la línea siguiente
        info.observaciones = this.extraerObservaciones(cuerpo) 
        || this.extraerValorDespuesDeLabel(cuerpo, "Observaciones:", 1)
        || this.extraerValorDespuesDeLabel(cuerpo, "Observaciones póliza:", 1);


        console.log(`📋 Información extraída:`, info);

        return info;
    }

     extraerObservaciones(html) {
        const $ = cheerio.load(html);
        const spans = $('span');
        let found = false;
        let observaciones = [];
        spans.each(function(i, el) {
            const text = $(el).text().trim();
            if (found) {
                // Si encuentras el siguiente campo conocido, termina
                if (/^Datos del Asegurado:?$/.test(text)) return false;
                if (text) observaciones.push(text);
            }
            if (text === "Observaciones:" || text === "Observaciones póliza:") {
                found = true;
            }
        });
        return observaciones.join(' ').trim();
    }
    
    // Uso:
 

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
    async parsearCorreoCompleto(msgSource) {
        try {
            // Configuración optimizada para simpleParser
            const parsed = await simpleParser(msgSource, {
                // Incluir todas las partes del correo
                includeHtml: true,
                includeText: true,
                includeAttachments: true,
                includeHeaders: true,

                // Configuración para mejor extracción de texto
                textEncoding: 'utf-8',
                htmlEncoding: 'utf-8',

                // Incluir contenido raw para casos especiales
                includeRaw: true,

                // Configuración para manejar diferentes tipos de contenido
                normalizeHtml: true,
                normalizeText: true,

                // Incluir metadatos adicionales
                includeMeta: true,
                includeEmbedded: true
            });

            console.log(`📧 Parser configurado - HTML: ${!!parsed.html}, Text: ${!!parsed.text}, Raw: ${!!parsed.raw}`);

            return parsed;
        } catch (error) {
            console.error(`❌ Error parseando correo: ${error.message}`);
            // Fallback: intentar con configuración básica
            return await simpleParser(msgSource);
        }
    }
    esExpedienteNuevo(subject) {
        if (!subject) return false;
        
        // Extraer el número de referencia del asunto
        const numeroReferencia = this.extraerNumerosIniciales(subject);
        console.log(`📋 Número de referencia extraído: "${numeroReferencia}" del asunto: "${subject}"`);
        
        const patrones = [
            /Declaración de siniestro a colaborador NORMAL/i,
            /Solicitud de asistencia a colaborador/i,
            /Declaración de siniestro a colaborador URGENTE/i
        ];
        
        const esNuevo = patrones.some(p => p.test(subject));
        
        if (esNuevo && numeroReferencia) {
            console.log(`✅ Expediente nuevo detectado: ${numeroReferencia}`);
        }
        
        return esNuevo;
    }
    correoToExpediente(parsed, cuentaUser) {
        const asunto = parsed.subject || '';
        let cuerpo = this.extraerContenidoCompleto(parsed);
        let info = this.extraerInformacionCorreo(cuerpo);
        cuerpo = this.eliminarEtiquetasHtml(cuerpo);
        info.provincia = this.eliminarEtiquetasHtml(info.provincia);
        info.tipoSiniestro = this.eliminarEtiquetasHtml(info.tipoSiniestro);
        const caseLogTypeCode = this.obtenerTipoComunicacion(asunto);
        const expediente = this.obtenerValorCampo(info.expediente,info.observaciones,cuerpo);

        return {
            from: parsed.from?.text || '-',
            caseLogTypeCode,
            contractCode: this.GetPrefijoAsitur(cuentaUser, info.provincia, info.tipoSiniestro),
            caseNumber: info.referencia,
            date: parsed.date,
            subject: asunto,
            htmlText: this.escapeHtmlForJson(cuerpo),
            tos: ['cuidacasa@diaple.com'],
            att: []
        };
    }
    obtenerValorCampo(cadenaInicio, cadenaFin, texto) {
        const indiceInicioTest = texto.indexOf(cadenaInicio);
        if (indiceInicioTest === -1) return '';

        const indiceInicio = indiceInicioTest + cadenaInicio.length;

        // Condición especial para Observaciones póliza
        if ((indiceInicio + 1 === cadenaInicio.length) && cadenaInicio === 'Observaciones póliza:') {
            return '';
        }

        let indiceFin = 0;

        if (!cadenaFin) {
            indiceFin = texto.length;
        } else {
            indiceFin = texto.indexOf(cadenaFin, indiceInicio);

            if (indiceFin === -1) {
                if (cadenaFin === 'Observaciones póliza:' || cadenaFin === 'Descripción:') {
                    indiceFin = texto.indexOf('Datos del Asegurado:', indiceInicio);
                    if (indiceFin === -1) {
                        indiceFin = texto.length;
                    }
                } else {
                    indiceFin = texto.length;
                }
            }
        }

        return texto.substring(indiceInicio, indiceFin).trim();
    }

    async extraerExpedienteDesdeCorreo(parsed, cuentaUser) {
        // 1. Cuerpo limpio y HTML completo
        const bodyHtml = parsed.html || '';
        const bodyLimpio = this.eliminarEtiquetasHtml(bodyHtml);

        // 2. Extrae todos los campos (manual 1.0)
        const expediente = {
            contractCode: this.GetPrefijoAsitur(
                cuentaUser,
                this.obtenerValorCampo("Provincia:", "Tipo siniestro:", bodyLimpio),
                this.obtenerValorCampo("Tipo siniestro:", "Causa:", bodyLimpio)
            ),
            companyName: this.obtenerValorCampo("Compañía:", "N° Póliza:", bodyLimpio),
            caseNumber: this.obtenerValorCampo("Referencia Asitur:", "Observaciones póliza:", bodyLimpio),
            notificationNumber: "", // No aplica según manual
            caseType: this.obtenerValorCampo("Tipo siniestro:", "Causa:", bodyLimpio).trim(),
            caseDescription: this.composeCaseDescription(bodyLimpio),
            caseDate: parsed.date ? new Date(parsed.date).toISOString() : null,
            isUrgent: parsed.subject?.toUpperCase().includes('URGENTE') || false,
            isVIP: (this.obtenerValorCampo("TIPO DE CLIENTE:", "Datos del Siniestro:", bodyLimpio) || '').toUpperCase() === 'VIP',
            clientName: this.obtenerValorCampo("Tomador:", "Nif:", bodyLimpio),
            clientPhone: this.obtenerTelefonos(bodyLimpio)[0] || '',
            clientPhone2: this.obtenerTelefonos(bodyLimpio)[1] || '',
            clientVATNumber: this.obtenerValorCampo("Nif:", "Producto:", bodyLimpio),
            countryISOCode: "ES",
            address: this.obtenerValorCampo("Dirección:", "Localidad:", bodyLimpio),
            city: this.obtenerValorCampo("Localidad:", "Código Postal:", bodyLimpio),
            zipCode: this.obtenerValorCampo("Código Postal:", "Provincia:", bodyLimpio),
            policyNumber: this.obtenerValorCampo("N° Póliza:", "Referª. Cía:", bodyLimpio),
            processorName: '', // Si lo usas, agrégalo
            capabilityDescription: '', // Si lo usas, agrégalo
            caseState: '', // Si lo usas, agrégalo
            caseDeclaration: this.removeImgTags(bodyHtml),
            caseTreatment: "Normal",
            provider: cuentaUser,
            classify: 'Nuevo', // Lo ajustaremos en el provider según el caso
            message: parsed.subject || '',
            budget: null // Si aplica
        };

        // Adjuntos:
        expediente.attachments = (parsed.attachments || []).map(att => ({
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
            content: att.content // Buffer, listo para enviar o codificar si DIAPLE lo requiere en base64
        }));

        return expediente;
    }

    // Helper para armar caseDescription
    composeCaseDescription(bodyLimpio) {
        // Trunca cada campo a 200 caracteres
        function trunc(str) {
            if (!str) return '';
            return str.length > 200 ? str.substring(0, 200) : str;
        }
        const tipo_siniestro = this.obtenerValorCampo("Tipo siniestro:", "Causa:", bodyLimpio);
        const causa = trunc(this.obtenerValorCampo("Causa:", "Descripción:", bodyLimpio));
        const descripcion = trunc(this.obtenerValorCampo("Descripción:", "Tipo:", bodyLimpio));
        const tipo = trunc(this.obtenerValorCampo("Tipo:", "Fecha Ocurrencia:", bodyLimpio));
        const garantia = trunc(this.obtenerValorCampo("Garantía:", "Observaciones:", bodyLimpio));
        const cobertura = trunc(this.obtenerValorCampo("Cobertura:", "Franquicia:", bodyLimpio));
        const franquicia = trunc(this.obtenerValorCampo("Franquicia:", "Clausulas:", bodyLimpio));
        return `${tipo_siniestro}//// Causa:${causa}//// Descripción:${descripcion} //// Tipo:${tipo} //// Garantia:${garantia} //// Cobertura:${cobertura} //// Franquicia:${franquicia}`;
    }

    // Helper para teléfonos (puedes mejorar según formato real del body)
    obtenerTelefonos(body) {
        const re = /(\d{9,})/g; // Busca secuencias largas, puedes mejorar este regex
        const telefonos = [];
        let m;
        while ((m = re.exec(body)) !== null) {
            telefonos.push(m[1]);
        }
        return telefonos;
    }

    // Función para extraer números iniciales antes del primer espacio (incluyendo /)
    extraerNumerosIniciales(texto) {
        if (!texto) return '';
        
        // Buscar el patrón: números seguidos de / seguidos de números, hasta el primer espacio
        const match = texto.match(/^(\d+\/\d+)/);
        if (match) {
            return match[1];
        }
        
        // Fallback: buscar solo números al inicio hasta el primer espacio
        const matchNumeros = texto.match(/^(\d+)/);
        if (matchNumeros) {
            return matchNumeros[1];
        }
        
        return '';
    }

}
module.exports = AsiturDataProcessor;
