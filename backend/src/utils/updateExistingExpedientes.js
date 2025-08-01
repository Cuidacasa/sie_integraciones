const pool = require('../config/db');

async function updateExistingExpedientes() {
  try {
    console.log('Actualizando expedientes existentes con id_unico...');
    
    // Obtener todos los expedientes que no tienen id_unico
    const [rows] = await pool.query(`
      SELECT id, cliente, servicio 
      FROM expedientes 
      WHERE id_unico IS NULL OR id_unico = ''
    `);
    
    console.log(`Encontrados ${rows.length} expedientes para actualizar`);
    
    let updated = 0;
    let errors = 0;
    
    for (const row of rows) {
      try {
        const idUnico = `${row.cliente || 'SinCliente'}_${row.servicio || 'SinServicio'}`;
        
        await pool.query(
          'UPDATE expedientes SET id_unico = ? WHERE id = ?',
          [idUnico, row.id]
        );
        
        updated++;
      } catch (error) {
        console.error(`Error actualizando expediente ${row.id}:`, error);
        errors++;
      }
    }
    
    console.log(`Actualización completada: ${updated} actualizados, ${errors} errores`);
    
  } catch (error) {
    console.error('Error actualizando expedientes existentes:', error);
    throw error;
  }
}

module.exports = { updateExistingExpedientes }; 