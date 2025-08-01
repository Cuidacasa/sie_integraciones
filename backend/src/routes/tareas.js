const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { ejecutarTarea } = require('../controllers/tareasController');

// GET /api/tareas - Obtener todas las tareas programadas
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.*, c.nombre as compania_nombre 
      FROM tareas_programadas t 
      LEFT JOIN companias c ON t.compania_id = c.id 
      ORDER BY t.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tareas/:id - Obtener una tarea específica
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT t.*, c.nombre as compania_nombre 
      FROM tareas_programadas t 
      LEFT JOIN companias c ON t.compania_id = c.id 
      WHERE t.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tareas - Crear una nueva tarea programada
router.post('/', auth, async (req, res) => {
  try {
    const { nombre, descripcion, compania_id, intervalo_minutos, configuracion } = req.body;
    
    if (!nombre || !compania_id || !intervalo_minutos) {
      return res.status(400).json({ error: 'Nombre, compañía e intervalo son requeridos' });
    }

    // Verificar que la compañía existe
    const [companiaRows] = await pool.query('SELECT id FROM companias WHERE id = ?', [compania_id]);
    if (companiaRows.length === 0) {
      return res.status(400).json({ error: 'Compañía no encontrada' });
    }

    // Calcular próxima ejecución
    const proximaEjecucion = new Date(Date.now() + (intervalo_minutos * 60 * 1000));

    const [result] = await pool.query(
      'INSERT INTO tareas_programadas (nombre, descripcion, compania_id, intervalo_minutos, configuracion, proxima_ejecucion) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, descripcion, compania_id, intervalo_minutos, JSON.stringify(configuracion || {}), proximaEjecucion]
    );

    res.json({ 
      mensaje: 'Tarea programada creada correctamente',
      id: result.insertId 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tareas/:id - Actualizar una tarea programada
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, compania_id, intervalo_minutos, activo, configuracion } = req.body;

    // Verificar que la tarea existe
    const [tareaRows] = await pool.query('SELECT id FROM tareas_programadas WHERE id = ?', [id]);
    if (tareaRows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    // Si se cambia el intervalo, recalcular próxima ejecución
    let proximaEjecucion = null;
    if (intervalo_minutos) {
      proximaEjecucion = new Date(Date.now() + (intervalo_minutos * 60 * 1000));
    }

    const updateFields = [];
    const updateValues = [];

    if (nombre !== undefined) {
      updateFields.push('nombre = ?');
      updateValues.push(nombre);
    }
    if (descripcion !== undefined) {
      updateFields.push('descripcion = ?');
      updateValues.push(descripcion);
    }
    if (compania_id !== undefined) {
      updateFields.push('compania_id = ?');
      updateValues.push(compania_id);
    }
    if (intervalo_minutos !== undefined) {
      updateFields.push('intervalo_minutos = ?');
      updateValues.push(intervalo_minutos);
    }
    if (activo !== undefined) {
      updateFields.push('activo = ?');
      updateValues.push(activo);
    }
    if (configuracion !== undefined) {
      updateFields.push('configuracion = ?');
      updateValues.push(JSON.stringify(configuracion));
    }
    if (proximaEjecucion) {
      updateFields.push('proxima_ejecucion = ?');
      updateValues.push(proximaEjecucion);
    }

    updateValues.push(id);

    await pool.query(
      `UPDATE tareas_programadas SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({ mensaje: 'Tarea programada actualizada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tareas/:id - Eliminar una tarea programada
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.query('DELETE FROM tareas_programadas WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    res.json({ mensaje: 'Tarea programada eliminada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tareas/:id/ejecutar - Ejecutar una tarea manualmente
router.post('/:id/ejecutar', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Ejecutar la tarea de forma asíncrona
    ejecutarTarea(id).catch(error => {
      console.error('Error ejecutando tarea:', error);
    });

    res.json({ mensaje: 'Tarea iniciada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tareas/:id/logs - Obtener logs de una tarea
router.get('/:id/logs', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    
    const [rows] = await pool.query(
      'SELECT * FROM logs_tareas WHERE tarea_id = ? ORDER BY created_at DESC LIMIT ?',
      [id, parseInt(limit)]
    );
    
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tareas/companias - Obtener compañías para el formulario
router.get('/companias/list', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombre FROM companias ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 