/**
 * Procesador de datos específico para MultiAsistencia
 * Transforma los datos crudos de MultiAsistencia al formato estándar
 */
class MultiAsistenciaDataProcessor {
  constructor() {
    // Mapa de profesionales para MultiAsistencia
    this.mapaProfesionales = {
      247201: "MlSev",
      247301: "MlMalA",
      248601: "MlBcn",
      161901: "MlTgn",
      187801: "MlMad",
      255701: "MlGra",
      247401: "MlGir"
    };
  }

  /**
   * Transforma un servicio de MultiAsistencia al formato de expediente estándar
   * @param {Object} servicio - Datos crudos del servicio
   * @returns {Object} - Expediente en formato estándar
   */
  servicioToExpediente(servicio) {
    const now = new Date().toISOString();
    const codigoPostal = servicio.DistritoPostal.split("-")[0].trim(); // '29013 '
    const ciudad = servicio.DistritoPostal.split("-")[1].trim();

    // Verifica si el valor de servicio.Profesional existe en el objeto de mapeo
    const contractCode = this.mapaProfesionales[servicio.Profesional] || "-";

    const gremio = servicio.Gremio?.toLowerCase() || '';
    const procedencia = servicio.Procedencia?.toLowerCase() || '';
    const descripcion = servicio.DescripcionReparacion?.toLowerCase() || '';
    var caseType = "Sin definir";

    // Gremio (contiene)
    if (gremio.includes('fontanero') || gremio.includes('fontaneria comunidades')) {
      caseType = 'Daños por agua';
    } else if (gremio.includes('electricista')) {
      caseType = 'Daños eléctricos';
    } else if (gremio.includes('manitas')) {
      caseType = 'Bricolaje/Manitas';
    }
    // Procedencia (contiene)
    else if (procedencia.includes('especiales (serv.')) {
      caseType = 'Asistencia';
    } else if (procedencia.includes('asistencia')) {
      caseType = 'Conexión o contado';
    }
    // DescripciónReparacion (contiene)
    else if (descripcion.includes('mantenimiento') && !descripcion.includes('mantenimiento integral')) {
      caseType = 'Mantenimiento';
    } else if (descripcion.includes('rotura elemento de loza')) {
      caseType = 'Rotura de Lozas';
    } else if (descripcion.includes('marmol')) {
      caseType = 'Marmoles/Cristales';
    } else if (descripcion.includes('incendio')) {
      caseType = 'Daños por incendio';
    } else if (descripcion.includes('robo')) {
      caseType = 'Daños por robo o hurto';
    } else if (
      descripcion.includes('lluvia') ||
      descripcion.includes('viento') ||
      descripcion.includes('tormenta')
    ) {
      caseType = 'Daños por fenómenos meteorológicos';
    }

    var _fecha_ = "";
    const fechaAsignacion = servicio.FechaHoraAsignacion.split('-');
    if (fechaAsignacion != null) {
      // Convertir '16/07/2025' a '2025-07-16'
      const [dia, mes, anio] = fechaAsignacion[0].split('/');
      const fechaAsignacionSQL = `${anio}-${mes}-${dia}`;
      _fecha_ = fechaAsignacionSQL;
    } else {
      _fecha_ = now;
    }

    return {
      contractCode: contractCode,
      companyName: '',
      caseState: 'Pendiente tramitar',
      caseNumber: servicio.Servicio.toString(),
      caseDeclaration: '-',
      notificationNumber: servicio.Referencia,
      caseTreatment: '',
      caseType: caseType,
      caseDescription: (servicio.Procedencia + " " + servicio.DescripcionReparacion) || '-',
      caseDate: _fecha_,
      isUrgent: (servicio.Urgente || '').toUpperCase() === 'SI',
      isVIP: false,
      clientName: servicio.NombreCliente || '-',
      clientPhone: Array.isArray(servicio.TelefonoCliente) && servicio.TelefonoCliente[0] ? servicio.TelefonoCliente[0].Numero : '',
      clientPhone2: Array.isArray(servicio.TelefonoCliente) && servicio.TelefonoCliente[1] ? servicio.TelefonoCliente[1].Numero : '',
      clientVATNumber: '',
      countryISOCode: 'ES',
      address: servicio.Direccion || '-',
      city: ciudad,
      zipCode: codigoPostal || '',
      policyNumber: servicio.NumeroPoliza,
      processorName: '',
      capabilityDescription: servicio.Gremio
    };
  }

  /**
   * Valida que los datos del servicio sean completos
   * @param {Object} servicio - Datos del servicio
   * @returns {boolean} - True si los datos son válidos
   */
  validarServicio(servicio) {
    const camposRequeridos = ['Servicio', 'FechaHoraAsignacion', 'NombreCliente'];
    
    for (const campo of camposRequeridos) {
      if (!servicio[campo]) {
        console.warn(`Campo requerido faltante: ${campo}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Obtiene información del procesador
   * @returns {Object} - Información del procesador
   */
  getProcessorInfo() {
    return {
      name: 'MultiAsistenciaDataProcessor',
      version: '1.0.0',
      supportedFields: [
        'Servicio', 'FechaHoraAsignacion', 'NombreCliente', 'Direccion',
        'Gremio', 'Procedencia', 'DescripcionReparacion', 'Urgente',
        'TelefonoCliente', 'NumeroPoliza', 'Referencia', 'Profesional',
        'DistritoPostal'
      ],
      caseTypes: [
        'Daños por agua', 'Daños eléctricos', 'Bricolaje/Manitas',
        'Asistencia', 'Conexión o contado', 'Mantenimiento',
        'Rotura de Lozas', 'Marmoles/Cristales', 'Daños por incendio',
        'Daños por robo o hurto', 'Daños por fenómenos meteorológicos'
      ]
    };
  }
}

module.exports = MultiAsistenciaDataProcessor; 