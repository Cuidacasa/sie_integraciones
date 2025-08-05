

class IMADataProcessor {
    constructor() {
      // Mapa de profesionales para MultiAsistencia
      
    }



 analyzeEmailContent(subject, html, text) {
    // Unificar el cuerpo para buscar el número de servicio
    const body = `${html || ''} ${text || ''}`;
    // Normalizar el asunto para comparación
    const normalizedSubject = (subject || '').toLowerCase().trim();
  
    // 1. Nuevo Servicio en la plataforma IMA
    if (normalizedSubject === 'nuevo servicio en la plataforma ima') {
      // Buscar el número de servicio en el cuerpo
      const match = body.match(/servicio n[ºo]?[\s:]*([0-9]{8})/i);
      return match ? {
        type: 'NEW_SERVICE',
        description: 'Nuevo servicio IMA detectado',
        serviceNumber: match[1]
      } : null;
    }
  
    // 2. El Presupuesto del servicio IMA fue modificado
    if (normalizedSubject === 'el presupuesto del servicio ima fue modificado') {
      const match = body.match(/servicio ima n[ºo]?[\s:]*([0-9]{8})/i);
      return match ? {
        type: 'BUDGET_MODIFIED',
        description: 'Presupuesto de servicio IMA modificado',
        serviceNumber: match[1]
      } : null;
    }
  
    // 3. El Presupuesto del Servicio IMA fue aprobado
    if (normalizedSubject === 'el presupuesto del servicio ima fue aprobado') {
      const match = body.match(/servicio ima n[ºo]?[\s:]*([0-9]{8})/i);
      return match ? {
        type: 'BUDGET_APPROVED',
        description: 'Presupuesto de servicio IMA aprobado',
        serviceNumber: match[1]
      } : null;
    }
  
    // 4. Servicio IMA Cancelado
    if (normalizedSubject === 'servicio ima cancelado') {
      const match = body.match(/servicio ima n[ºo]?[\s:]*([0-9]{8})/i);
      return match ? {
        type: 'SERVICE_CANCELLED',
        description: 'Servicio IMA cancelado',
        serviceNumber: match[1]
      } : null;
    }
      // 5. Servicio IMA Cancelado
      if (normalizedSubject === 'nuevo mensaje en el servicio ima') {
        const match = body.match(/servicio ima n[ºo]?[\s:]*([0-9]{8})/i);
        return match ? {
          type: 'SERVICE_MESSAGE',
          description: 'Nuevo mensaje en el servicio IMA',
          serviceNumber: match[1]
        } : null;
      }
    return null; // No se encontró patrón específico
  }
   determinarTipoCaso(typology = '', category = '') {
    const rules = [
      { match: txt => txt.includes('danos por água') || txt.includes('fontanería'), type: 'Daños por Agua' },
      { match: txt => txt.includes('danos eléctricos'), type: 'Daños Eléctricos' },
      { match: txt => txt.includes('asistencia no cubierta'), type: 'Conexión o contado' },
      { match: txt => txt.includes('manitas'), type: 'Bricolaje/Manitas' },
    ];
    const texto = `${typology} ${category}`.toLowerCase();
    const rule = rules.find(r => r.match(texto));
    return rule ? rule.type : 'Sin definir';
  }
}

module.exports = IMADataProcessor; 