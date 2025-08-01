const BaseProvider = require('../../core/baseProvider');
const MultiAsistenciaApiClient = require('./apiClient');
const MultiAsistenciaDataProcessor = require('./dataProcessor');

/**
 * Proveedor específico para MultiAsistencia
 * Maneja la integración con el sistema de MultiAsistencia
 */
class MultiAsistenciaProvider extends BaseProvider {
  constructor(compania) {
    super(compania);
    this.providerName = 'MultiAsistenciaProvider';
    this.apiClient = new MultiAsistenciaApiClient();
    this.dataProcessor = new MultiAsistenciaDataProcessor();
  }

  /**
   * Autenticación con MultiAsistencia
   */
  async authenticate(username, password) {
    return await this.apiClient.login(username, password, this.compania.id);
  }

  /**
   * Obtener servicios de MultiAsistencia
   */
  async fetchData(sessionId, options = {}) {
    const data = await this.apiClient.obtenerServicios(sessionId, this.compania.id);
    return data.Servicios || [];
  }

  /**
   * Transformar datos de MultiAsistencia al formato estándar
   */
  transformData(rawData) {
    return this.dataProcessor.servicioToExpediente(rawData);
  }

  /**
   * Procesar datos crudos y guardarlos en BD
   */
  async processRawData(rawData, options = {}) {
    const pool = require('../../config/db');
    const connection = await pool.getConnection();
    
    try {
      let expedientesProcesados = 0;
      let expedientesOmitidos = 0;
      let expedientesOmitidosServicios = [];

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

      // Procesar cada servicio
      for (const servicio of rawData) {
        const expediente = this.transformData(servicio);
        const fechaAsignacion = servicio.FechaHoraAsignacion.split('-');
        const [dia, mes, anio] = fechaAsignacion[0].split('/');
        const fechaAsignacionSQL = `${anio}-${mes}-${dia}`;
        const fechaAsignacionDate = new Date(`${anio}-${mes}-${dia}T00:00:00Z`);

        // Verificar si está en el rango de fechas
        if (fechaAsignacionDate >= fechaInicio && fechaAsignacionDate <= fechaFin) {
          // Crear id_unico concatenando cliente y servicio
          const idUnico = `${this.compania.nombre}_${servicio.Servicio || ''}`;
          
          // Verificar si ya existe
          const [existe] = await connection.query(
            'SELECT id FROM expedientes WHERE id_unico = ?',
            [idUnico]
          );

          if (existe.length === 0) {
            try {
              await connection.query(
                'INSERT INTO expedientes (data, data_raw, status, servicio, fecha_asignacion, cliente, id_unico) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [JSON.stringify(expediente), JSON.stringify(servicio), 'pendiente', servicio.Servicio || null, fechaAsignacionSQL, this.compania.nombre, idUnico]
              );
              expedientesProcesados++;
            } catch (error) {
              // Si hay error de duplicado por el índice único, contar como omitido
              if (error.code === 'ER_DUP_ENTRY') {
                expedientesOmitidos++;
                expedientesOmitidosServicios.push(servicio.Servicio || null);
              } else {
                throw error;
              }
            }
          } else {
            expedientesOmitidos++;
            expedientesOmitidosServicios.push(servicio.Servicio || null);
          }
        }
      }

      return {
        procesados: expedientesProcesados,
        omitidos: expedientesOmitidos,
        omitidosServicios: expedientesOmitidosServicios,
        total_disponible: rawData.length,
        fecha_inicio: fechaInicioStr,
        fecha_fin: fechaFinStr
      };

    } finally {
      connection.release();
    }
  }

  /**
   * Validar configuración específica de MultiAsistencia
   */
  validateConfig() {
    super.validateConfig();
    
    // Validaciones específicas para MultiAsistencia
    if (!this.compania.username || !this.compania.password) {
      throw new Error(`Credenciales incompletas para ${this.compania.nombre}`);
    }
    
    return true;
  }

  /**
   * Obtener información específica del proveedor
   */
  getProviderInfo() {
    return {
      ...super.getProviderInfo(),
      name: 'MultiAsistencia',
      description: 'Proveedor para sistema MultiAsistencia',
      features: ['authentication', 'service_fetch', 'data_transformation']
    };
  }
}

module.exports = MultiAsistenciaProvider; 