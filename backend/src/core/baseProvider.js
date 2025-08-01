/**
 * Clase base para todos los proveedores de datos
 * Define la interfaz común que deben implementar todos los proveedores
 */
class BaseProvider {
  constructor(compania) {
    this.compania = compania;
    this.providerName = this.constructor.name;
  }

  /**
   * Autenticación con el proveedor
   * @param {string} username - Usuario
   * @param {string} password - Contraseña
   * @returns {Promise<string>} - Token o session ID
   */
  async authenticate(username, password) {
    throw new Error('Método authenticate debe ser implementado por el proveedor');
  }

  /**
   * Obtener datos del proveedor
   * @param {string} sessionId - ID de sesión
   * @param {Object} options - Opciones de búsqueda (fechas, filtros, etc.)
   * @returns {Promise<Array>} - Array de datos crudos
   */
  async fetchData(sessionId, options = {}) {
    throw new Error('Método fetchData debe ser implementado por el proveedor');
  }

  /**
   * Transformar datos crudos al formato estándar
   * @param {Object} rawData - Datos crudos del proveedor
   * @returns {Object} - Datos en formato estándar
   */
  transformData(rawData) {
    throw new Error('Método transformData debe ser implementado por el proveedor');
  }

  /**
   * Procesar expedientes para una compañía
   * @param {Object} options - Opciones de procesamiento
   * @returns {Promise<Object>} - Resultado del procesamiento
   */
  async processExpedientes(options = {}) {
    try {
      console.log(`[${this.providerName}] Iniciando procesamiento para ${this.compania.nombre}`);
      
      // Autenticación
      const sessionId = await this.authenticate(this.compania.username, this.compania.password);
      
      // Obtener datos
      const rawData = await this.fetchData(sessionId, options);
      
      // Procesar y transformar
      const results = await this.processRawData(rawData, options);
      
      console.log(`[${this.providerName}] Procesamiento completado: ${results.procesados} procesados, ${results.omitidos} omitidos`);
      
      return results;
      
    } catch (error) {
      console.error(`[${this.providerName}] Error en procesamiento:`, error);
      throw error;
    }
  }

  /**
   * Procesar datos crudos y guardarlos en BD
   * @param {Array} rawData - Datos crudos del proveedor
   * @param {Object} options - Opciones de procesamiento
   * @returns {Promise<Object>} - Resultado del procesamiento
   */
  async processRawData(rawData, options = {}) {
    throw new Error('Método processRawData debe ser implementado por el proveedor');
  }

  /**
   * Validar configuración del proveedor
   * @returns {boolean} - True si la configuración es válida
   */
  validateConfig() {
    if (!this.compania.username || !this.compania.password) {
      throw new Error(`Configuración incompleta para ${this.compania.nombre}`);
    }
    return true;
  }

  /**
   * Obtener información del proveedor
   * @returns {Object} - Información del proveedor
   */
  getProviderInfo() {
    return {
      name: this.providerName,
      compania: this.compania.nombre,
      version: '1.0.0'
    };
  }
}

module.exports = BaseProvider; 