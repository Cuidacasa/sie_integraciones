const providerFactory = require('../core/providerFactory');
const pool = require('../config/db');

/**
 * Script de prueba para verificar el funcionamiento del proveedor
 */
async function testProvider() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🧪 Iniciando prueba del proveedor...');
    
    // Obtener una compañía de prueba
    const [companias] = await connection.query(
      'SELECT id, nombre, username, password, api_token FROM companias LIMIT 1'
    );
    
    if (companias.length === 0) {
      console.error('❌ No hay compañías disponibles para la prueba');
      return;
    }
    
    const compania = companias[0];
    console.log(`📋 Probando con compañía: ${compania.nombre} (ID: ${compania.id})`);
    console.log(`🔑 Username: ${compania.username}`);
    console.log(`🔐 Password: ${compania.password ? '***' : 'NO CONFIGURADO'}`);
    console.log(`🎫 API Token: ${compania.api_token ? '***' : 'NO CONFIGURADO'}`);
    
    if (!compania.username || !compania.password || !compania.api_token) {
      console.error('❌ La compañía no tiene todas las credenciales configuradas');
      return;
    }
    
    // Crear proveedor
    console.log('🏭 Creando proveedor...');
    const provider = providerFactory.createProvider('multiasistencia', compania);
    
    // Verificar configuración
    console.log('✅ Verificando configuración...');
    provider.validateConfig();
    console.log('✅ Configuración válida');
    
    // Obtener información del proveedor
    const info = provider.getProviderInfo();
    console.log('📊 Información del proveedor:', info);
    
    // Probar autenticación
    console.log('🔐 Probando autenticación...');
    try {
      const sessionId = await provider.authenticate(compania.username, compania.password);
      console.log('✅ Autenticación exitosa');
      console.log(`🎫 Session ID: ${sessionId}`);
      
      // Probar obtención de datos
      console.log('📡 Probando obtención de datos...');
      const rawData = await provider.fetchData(sessionId);
      console.log(`✅ Datos obtenidos: ${rawData.length} servicios`);
      
      // Probar procesamiento
      console.log('⚙️ Probando procesamiento...');
      const resultado = await provider.processExpedientes({
        fechaInicio: '2025-01-01',
        fechaFin: '2025-01-31'
      });
      
      console.log('✅ Procesamiento completado');
      console.log('📊 Resultados:', resultado);
      
    } catch (error) {
      console.error('❌ Error en la prueba:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    connection.release();
  }
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
  testProvider().then(() => {
    console.log('🏁 Prueba completada');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Error en la prueba:', error);
    process.exit(1);
  });
}

module.exports = { testProvider }; 