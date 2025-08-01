const pool = require('../config/db');

/**
 * Script para agregar la columna api_token a la tabla companias
 */
async function addApiTokenColumn() {
  const connection = await pool.getConnection();
  
  try {
    console.log('Verificando si existe la columna api_token...');
    
    // Verificar si la columna ya existe
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'companias' 
      AND COLUMN_NAME = 'api_token'
    `);
    
    if (columns.length === 0) {
      console.log('Agregando columna api_token a la tabla companias...');
      
      // Agregar la columna api_token
      await connection.query(`
        ALTER TABLE companias 
        ADD COLUMN api_token VARCHAR(500) NULL 
        COMMENT 'Token de API para cada compañía'
      `);
      
      console.log('Columna api_token agregada exitosamente');
      
      // Actualizar registros existentes con un token por defecto
      await connection.query(`
        UPDATE companias 
        SET api_token = 'tu_token_api_aqui' 
        WHERE api_token IS NULL
      `);
      
      console.log('Tokens por defecto asignados a compañías existentes');
      
    } else {
      console.log('La columna api_token ya existe');
    }
    
  } catch (error) {
    console.error('Error agregando columna api_token:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { addApiTokenColumn }; 