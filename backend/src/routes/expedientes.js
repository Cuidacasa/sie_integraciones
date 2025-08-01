const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const axios = require('axios');
const { getBearerToken } = require('../utils/bearerToken');

// GET /api/expedientes/companias
router.get('/companias', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombre FROM companias ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});



// POST /api/expedientes/sincronizar
router.post('/sincronizar', async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, compania_id } = req.body; // Espera formato yyyy-mm-dd
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Las fechas de inicio y fin son requeridas' });
    }
    if (!compania_id) {
      return res.status(400).json({ error: 'El ID de la compañía es requerido' });
    }
    
    // Obtener credenciales y nombre de la compañía
    const [companiaRows] = await pool.query('SELECT id, username, password, nombre FROM companias WHERE id = ?', [compania_id]);
    if (companiaRows.length === 0) {
      return res.status(400).json({ error: 'Compañía no encontrada' });
    }
    
    const compania = companiaRows[0];
    if (!compania.username || !compania.password) {
      return res.status(400).json({ error: 'La compañía no tiene credenciales configuradas' });
    }

    // Crear proveedor para MultiAsistencia
    const providerFactory = require('../core/providerFactory');
    const provider = providerFactory.createProvider('multiasistencia', compania);
    
    // Procesar expedientes usando el proveedor con fechas específicas
    const resultado = await provider.processExpedientes({
      fechaInicio: fecha_inicio,
      fechaFin: fecha_fin
    });
    
    res.json({ 
      mensaje: 'Expedientes sincronizados correctamente', 
      cantidad: resultado.procesados,
      omitidos: resultado.omitidos,
      omitidosServicios: resultado.omitidosServicios,
      total_disponible: resultado.total_disponible,
      fecha_inicio: resultado.fecha_inicio,
      fecha_fin: resultado.fecha_fin
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Sincronización masiva de expedientes por fecha
router.post('/sincronizar-masivo', async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.body; // formato yyyy-mm-dd
  if (!fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Las fechas de inicio y fin son requeridas' });
  }
  try {
    // Seleccionar expedientes en el rango de fechas y status distinto de 'completado'
    const [rows] = await pool.query('SELECT id, data FROM expedientes WHERE fecha_asignacion >= ? AND fecha_asignacion <= ? AND status != ?', [fecha_inicio, fecha_fin, 'completado']);
    if (!rows.length) {
      return res.json({ mensaje: 'No hay expedientes para sincronizar en ese rango de fechas', cantidad: 0 });
    }
    let exitosos = 0;
    let fallidos = 0;
    let fallidosIds = [];
    const token = await getBearerToken();
    for (const row of rows) {
      let data = row.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          fallidos++;
          fallidosIds.push(row.id);
          continue;
        }
      }
      try {
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
          await pool.query('UPDATE expedientes SET status = ? WHERE id = ?', ['completado', row.id]);
          exitosos++;
        } else {
          fallidos++;
          fallidosIds.push(row.id);
        }
      } catch (err) {
        fallidos++;
        fallidosIds.push(row.id);
      }
    }
    res.json({
      mensaje: 'Sincronización masiva finalizada',
      cantidad: rows.length,
      exitosos,
      fallidos,
      fallidosIds
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Sincronización masiva de expedientes por compañía
router.post('/sincronizar-masivo-compania', async (req, res) => {
  const { compania_nombre } = req.body;
  if (!compania_nombre) {
    return res.status(400).json({ error: 'El nombre de la compañía es requerido' });
  }
  
  try {
    const { sincronizarMasivoByCompania } = require('../utils/syncMasivoByCompania');
    const resultado = await sincronizarMasivoByCompania(compania_nombre);
    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/expedientes
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, data, data_raw, status, servicio, fecha_asignacion, cliente, id_unico FROM expedientes ORDER BY created_at DESC');
    const expedientes = rows.map(row => {
      let d = row.data;
      if (typeof d === 'string') {
        try {
          d = JSON.parse(d);
        } catch (e) {
          d = {};
        }
      }
      return {
        id: row.id,
        caseNumber: d.caseNumber,
        processorName: d.processorName,
        status: row.status,
        servicio: row.servicio,
        fecha_asignacion: row.fecha_asignacion,
        cliente: row.cliente
      };
    });
    res.json(expedientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/expedientes/:id/data-raw - Obtener data raw de un expediente específico
router.get('/:id/data-raw', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT data_raw FROM expedientes WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }
    
    let dataRaw = rows[0].data_raw;
    if (dataRaw && typeof dataRaw === 'string') {
      try {
        dataRaw = JSON.parse(dataRaw);
      } catch (e) {
        // Si no se puede parsear, devolver como string
      }
    }
    
    res.json({ data_raw: dataRaw });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/expedientes/:id/sincronizar
router.post('/:id/sincronizar', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT data FROM expedientes WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Expediente no encontrado' });
    let data = rows[0].data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        return res.status(500).json({ error: 'Error al parsear el expediente' });
      }
    }
    const token = await getBearerToken();
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
      await pool.query('UPDATE expedientes SET status = ? WHERE id = ?', ['completado', id]);
    }
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 