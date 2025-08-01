const pool = require('../config/db');
const providerFactory = require('../core/providerFactory');
const { sincronizarMasivoByCompania } = require('../utils/syncMasivoByCompania');

// Función para ejecutar una tarea programada
async function ejecutarTarea(tareaId) {
  const connection = await pool.getConnection();
  try {
    // Obtener información de la tarea
    const [tareas] = await connection.query(
      'SELECT * FROM tareas_programadas WHERE id = ? AND activo = TRUE',
      [tareaId]
    );

    if (tareas.length === 0) {
      throw new Error('Tarea no encontrada o inactiva');
    }

    const tarea = tareas[0];
    
    // Crear log de inicio
    const [logResult] = await connection.query(
      'INSERT INTO logs_tareas (tarea_id, estado, mensaje) VALUES (?, ?, ?)',
      [tareaId, 'iniciado', 'Iniciando ejecución de tarea programada']
    );
    const logId = logResult.insertId;

    const inicio = Date.now();
    let expedientesProcesados = 0;
    let expedientesOmitidos = 0;
    let mensaje = '';

    try {
      // Obtener credenciales y nombre de la compañía
      const [companiaRows] = await connection.query(
        'SELECT id, username, password, nombre FROM companias WHERE id = ?',
        [tarea.compania_id]
      );

      if (companiaRows.length === 0) {
        throw new Error('Compañía no encontrada');
      }

      const compania = companiaRows[0];
      if (!compania.username || !compania.password) {
        throw new Error('La compañía no tiene credenciales configuradas');
      }

      // Calcular fechas (últimas 24 horas por defecto)
      const fechaFin = new Date();
      const fechaInicio = new Date(fechaFin.getTime() - (24 * 60 * 60 * 1000)); // 24 horas atrás
      
      const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
      const fechaFinStr = fechaFin.toISOString().split('T')[0];

      if(compania.nombre == "MlSev" || compania.nombre == "MlMalA" || compania.nombre == "MlBcn" || compania.nombre == "MlTgn" || compania.nombre == "MlMad" || compania.nombre == "MlGra" || compania.nombre == "MlGir"){
        // Crear proveedor para MultiAsistencia (por defecto)
        const provider = providerFactory.createProvider('multiasistencia', compania);
        
        // Procesar expedientes usando el proveedor
        const resultado = await provider.processExpedientes({
          fechaInicio: fechaInicioStr,
          fechaFin: fechaFinStr
        });
        
        expedientesProcesados = resultado.procesados;
        expedientesOmitidos = resultado.omitidos;
      }      

      // PASO 2: Sincronización masiva de expedientes pendientes de esta compañía
      console.log(`Iniciando sincronización masiva para compañía: ${compania.nombre}`);
      const resultadoMasivo = await sincronizarMasivoByCompania(compania.nombre);
      
      mensaje = `Tarea completada: ${expedientesProcesados} expedientes procesados, ${expedientesOmitidos} omitidos. Sincronización masiva: ${resultadoMasivo.exitosos} exitosos, ${resultadoMasivo.fallidos} fallidos`;
      
      // Actualizar log como completado con información de ambos pasos
      await connection.query(
        'UPDATE logs_tareas SET estado = ?, mensaje = ?, expedientes_procesados = ?, expedientes_omitidos = ?, tiempo_ejecucion_ms = ? WHERE id = ?',
        ['completado', mensaje, expedientesProcesados + resultadoMasivo.exitosos, expedientesOmitidos + resultadoMasivo.fallidos, Date.now() - inicio, logId]
      );

    } catch (error) {
      mensaje = `Error en ejecución: ${error.message}`;
      
      // Actualizar log como error
      await connection.query(
        'UPDATE logs_tareas SET estado = ?, mensaje = ?, tiempo_ejecucion_ms = ? WHERE id = ?',
        ['error', mensaje, Date.now() - inicio, logId]
      );
      
      throw error;
    }

    // Actualizar última ejecución y próxima ejecución
    const proximaEjecucion = new Date(Date.now() + (tarea.intervalo_minutos * 60 * 1000));
    await connection.query(
      'UPDATE tareas_programadas SET ultima_ejecucion = NOW(), proxima_ejecucion = ? WHERE id = ?',
      [proximaEjecucion, tareaId]
    );

  } finally {
    connection.release();
  }
}

module.exports = {
  ejecutarTarea
}; 