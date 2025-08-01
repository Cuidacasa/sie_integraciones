const MultiAsistenciaProvider = require('../providers/multiasistencia');

/**
 * Factory para crear proveedores de datos
 * Centraliza la creación de proveedores según el tipo
 */
class ProviderFactory {
  constructor() {
    this.providers = new Map();
    this.registerProviders();
  }

  /**
   * Registra todos los proveedores disponibles
   */
  registerProviders() {
    // Registrar proveedor MultiAsistencia
    this.providers.set('multiasistencia', MultiAsistenciaProvider);
    
    // Aquí se pueden registrar más proveedores en el futuro
    // this.providers.set('empresa2', Empresa2Provider);
    // this.providers.set('empresa3', Empresa3Provider);
  }

  /**
   * Crea un proveedor específico
   * @param {string} providerType - Tipo de proveedor
   * @param {Object} compania - Datos de la compañía
   * @returns {BaseProvider} - Instancia del proveedor
   */
  createProvider(providerType, compania) {
    const ProviderClass = this.providers.get(providerType.toLowerCase());
    
    if (!ProviderClass) {
      throw new Error(`Proveedor no encontrado: ${providerType}`);
    }
    
    return new ProviderClass(compania);
  }

  /**
   * Obtiene lista de proveedores disponibles
   * @returns {Array} - Lista de proveedores
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Verifica si un proveedor está disponible
   * @param {string} providerType - Tipo de proveedor
   * @returns {boolean} - True si está disponible
   */
  isProviderAvailable(providerType) {
    return this.providers.has(providerType.toLowerCase());
  }

  /**
   * Obtiene información de todos los proveedores
   * @returns {Object} - Información de proveedores
   */
  getProvidersInfo() {
    const info = {};
    
    for (const [type, ProviderClass] of this.providers) {
      // Crear instancia temporal para obtener información
      const tempProvider = new ProviderClass({ nombre: 'temp' });
      info[type] = tempProvider.getProviderInfo();
    }
    
    return info;
  }
}

// Instancia singleton del factory
const providerFactory = new ProviderFactory();

module.exports = providerFactory; 