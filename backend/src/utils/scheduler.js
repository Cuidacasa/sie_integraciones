const pool = require('../config/db');
const { ejecutarTarea } = require('../controllers/tareasController');

class TaskScheduler {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 60000; // Revisar cada minuto
    this.timer = null;
  }

  start() {
    if (this.isRunning) {
      console.log('Scheduler ya está ejecutándose');
      return;
    }

    console.log('Iniciando TaskScheduler...');
    this.isRunning = true;
    this.checkTasks();
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('TaskScheduler detenido');
  }

  async checkTasks() {
    if (!this.isRunning) return;

    try {
      const connection = await pool.getConnection();
      
      try {
        // Obtener tareas que deben ejecutarse
        const [tareas] = await connection.query(`
          SELECT id, nombre, compania_id, intervalo_minutos 
          FROM tareas_programadas 
          WHERE activo = TRUE 
          AND (proxima_ejecucion IS NULL OR proxima_ejecucion <= NOW())
        `);

        console.log(`Encontradas ${tareas.length} tareas para ejecutar`);

        // Ejecutar cada tarea de forma asíncrona
        for (const tarea of tareas) {
          console.log(`Ejecutando tarea: ${tarea.nombre} (ID: ${tarea.id})`);
          
          ejecutarTarea(tarea.id).catch(error => {
            console.error(`Error ejecutando tarea ${tarea.id}:`, error);
          });
        }

      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('Error en checkTasks:', error);
    }

    // Programar siguiente verificación
    this.timer = setTimeout(() => {
      this.checkTasks();
    }, this.checkInterval);
  }

  // Método para ejecutar una tarea específica inmediatamente
  async executeTask(taskId) {
    try {
      console.log(`Ejecutando tarea específica: ${taskId}`);
      await ejecutarTarea(taskId);
      console.log(`Tarea ${taskId} ejecutada correctamente`);
    } catch (error) {
      console.error(`Error ejecutando tarea ${taskId}:`, error);
      throw error;
    }
  }

  // Método para obtener estadísticas del scheduler
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextCheck: this.timer ? new Date(Date.now() + this.checkInterval) : null
    };
  }
}

// Crear instancia global del scheduler
const taskScheduler = new TaskScheduler();

module.exports = taskScheduler; 