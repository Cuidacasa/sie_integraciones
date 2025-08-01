const pool = require('../config/db');
const axios = require('axios');
const { getBearerToken } = require('./bearerToken');
const { cleanStringForAPI } = require('./stringCleaner');

async function sincronizarMasivoByCompania(companiaNombre) {
  try {
    console.log(`Iniciando sincronización masiva para compañía: ${companiaNombre}`);
    
    // Seleccionar expedientes pendientes de la compañía específica
    const [rows] = await pool.query(
      'SELECT id, data, data_raw FROM expedientes WHERE cliente = ? AND status != ?', 
      [companiaNombre, 'completado']
    );
    
    if (!rows.length) {
      console.log(`No hay expedientes pendientes para la compañía: ${companiaNombre}`);
      return {
        mensaje: `No hay expedientes pendientes para la compañía: ${companiaNombre}`,
        cantidad: 0,
        exitosos: 0,
        fallidos: 0,
        fallidosIds: []
      };
    }
    
    console.log(`Encontrados ${rows.length} expedientes pendientes para sincronizar`);
    
    let exitosos = 0;
    let fallidos = 0;
    let fallidosIds = [];
    
    // Obtener token de autenticación
    const token = await getBearerToken();
    
    // Procesar cada expediente
    for (const row of rows) {
      let data = row.data;
      
      // Parsear datos si es necesario
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error(`Error parseando datos del expediente ${row.id}:`, e);
          fallidos++;
          fallidosIds.push(row.id);
          continue;
        }
      }
      
      // Agregar data_raw a caseDeclaration
      if (row.data_raw) {
        // Limpiar y formatear data_raw para la API
        const cleanDataRaw = cleanStringForAPI(row.data_raw);
        data.caseDeclaration = cleanDataRaw;
      }
      
      try {
        // Enviar expediente a la API externa
        const response = await axios.post(
          'https://cuidacasa.api.guai-dev.diaple.com/api/attendance/cases/quickcreatemultiple',
          [data],
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        const result = response.data && Array.isArray(response.data) ? response.data[0] : response.data;
        
        if (result.success) {
          // Actualizar estado a completado
          await pool.query('UPDATE expedientes SET status = ? WHERE id = ?', ['completado', row.id]);
          exitosos++;
          console.log(`Expediente ${row.id} sincronizado exitosamente`);
        } else {
          console.error(`Error en respuesta de API para expediente ${row.id}:`, result);
          fallidos++;
          fallidosIds.push(row.id);
        }
        
      } catch (err) {
        console.error(`Error sincronizando expediente ${row.id}:`, err.message);
        fallidos++;
        fallidosIds.push(row.id);
      }
    }
    
    const resultado = {
      mensaje: `Sincronización masiva finalizada para ${companiaNombre}`,
      cantidad: rows.length,
      exitosos,
      fallidos,
      fallidosIds
    };
    
    console.log(`Sincronización masiva completada: ${exitosos} exitosos, ${fallidos} fallidos`);
    return resultado;
    
  } catch (error) {
    console.error('Error en sincronización masiva por compañía:', error);
    throw error;
  }
}

module.exports = { sincronizarMasivoByCompania }; 