const pool = require('../config/db');

async function checkAndCreateTables() {
  try {
    console.log('Verificando tablas...');
    
    // Verificar si existe la tabla expedientes
    const [expedientesTable] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'expedientes'
    `);
    
    if (expedientesTable[0].count === 0) {
      console.log('Creando tabla expedientes...');
      await pool.query(`
        CREATE TABLE expedientes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          data JSON NOT NULL,
          data_raw TEXT,
          status VARCHAR(50) DEFAULT 'pendiente',
          servicio VARCHAR(100),
          fecha_asignacion DATE,
          cliente VARCHAR(100),
          id_unico VARCHAR(200),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_cliente_servicio (id_unico)
        )
      `);
      console.log('Tabla expedientes creada');
    } else {
      console.log('Tabla expedientes ya existe');
      
      // Verificar si existe la columna cliente
      const [clienteColumn] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'expedientes' 
        AND column_name = 'cliente'
      `);
      
      if (clienteColumn[0].count === 0) {
        console.log('Agregando columna cliente a tabla expedientes...');
        await pool.query(`
          ALTER TABLE expedientes 
          ADD COLUMN cliente VARCHAR(100) AFTER fecha_asignacion
        `);
        console.log('Columna cliente agregada a expedientes');
      } else {
        console.log('Columna cliente ya existe en expedientes');
      }
      
      // Verificar si existe la columna id_unico
      const [idUnicoColumn] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'expedientes' 
        AND column_name = 'id_unico'
      `);
      
      if (idUnicoColumn[0].count === 0) {
        console.log('Agregando columna id_unico a tabla expedientes...');
        await pool.query(`
          ALTER TABLE expedientes 
          ADD COLUMN id_unico VARCHAR(200) AFTER cliente
        `);
        
        // Agregar índice único
        try {
          await pool.query(`
            ALTER TABLE expedientes 
            ADD UNIQUE KEY unique_cliente_servicio (id_unico)
          `);
          console.log('Índice único agregado a id_unico');
        } catch (error) {
          console.log('Índice único ya existe o no se pudo crear');
        }
        
        console.log('Columna id_unico agregada a expedientes');
      } else {
        console.log('Columna id_unico ya existe en expedientes');
      }
      
      // Verificar si existe la columna data_raw
      const [dataRawColumn] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'expedientes' 
        AND column_name = 'data_raw'
      `);
      
      if (dataRawColumn[0].count === 0) {
        console.log('Agregando columna data_raw a tabla expedientes...');
        await pool.query(`
          ALTER TABLE expedientes 
          ADD COLUMN data_raw TEXT AFTER data
        `);
        console.log('Columna data_raw agregada a expedientes');
      } else {
        console.log('Columna data_raw ya existe en expedientes');
      }
    }
    
    // Verificar si existe la tabla tareas_programadas
    const [tareasTable] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'tareas_programadas'
    `);
    
    if (tareasTable[0].count === 0) {
      console.log('Creando tabla tareas_programadas...');
      await pool.query(`
        CREATE TABLE tareas_programadas (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          descripcion TEXT,
          compania_id INT NOT NULL,
          intervalo_minutos INT NOT NULL DEFAULT 60,
          activo BOOLEAN DEFAULT TRUE,
          ultima_ejecucion TIMESTAMP NULL,
          proxima_ejecucion TIMESTAMP NULL,
          configuracion JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (compania_id) REFERENCES companias(id) ON DELETE CASCADE
        )
      `);
      console.log('Tabla tareas_programadas creada');
    } else {
      console.log('Tabla tareas_programadas ya existe');
    }
    
    // Verificar si existe la tabla logs_tareas
    const [logsTable] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'logs_tareas'
    `);
    
    if (logsTable[0].count === 0) {
      console.log('Creando tabla logs_tareas...');
      await pool.query(`
        CREATE TABLE logs_tareas (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tarea_id INT NOT NULL,
          estado ENUM('iniciado', 'completado', 'error') NOT NULL,
          mensaje TEXT,
          expedientes_procesados INT DEFAULT 0,
          expedientes_omitidos INT DEFAULT 0,
          tiempo_ejecucion_ms INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tarea_id) REFERENCES tareas_programadas(id) ON DELETE CASCADE
        )
      `);
      console.log('Tabla logs_tareas creada');
    } else {
      console.log('Tabla logs_tareas ya existe');
    }
    
    console.log('Verificación de tablas completada');
    
  } catch (error) {
    console.error('Error verificando tablas:', error);
    throw error;
  }
}

module.exports = { checkAndCreateTables }; 