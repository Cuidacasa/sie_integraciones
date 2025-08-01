const pool = require('../config/db');

// Obtener configuración (solo campos editables)
const getConfiguracion = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT usuario_guai, password_guai FROM configuraciones ORDER BY id DESC LIMIT 1');
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró configuración' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar configuración (solo campos editables)
const updateConfiguracion = async (req, res) => {
  const { usuario_guai, password_guai } = req.body;
  
  if (!usuario_guai || !password_guai) {
    return res.status(400).json({ error: 'Usuario y password son requeridos' });
  }
  
  try {
    // Verificar si existe configuración
    const [existing] = await pool.query('SELECT id FROM configuraciones ORDER BY id DESC LIMIT 1');
    
    if (existing.length === 0) {
      // Crear nueva configuración
      await pool.query(
        'INSERT INTO configuraciones (usuario_guai, password_guai) VALUES (?, ?)',
        [usuario_guai, password_guai]
      );
    } else {
      // Actualizar configuración existente
      await pool.query(
        'UPDATE configuraciones SET usuario_guai = ?, password_guai = ? WHERE id = ?',
        [usuario_guai, password_guai, existing[0].id]
      );
    }
    
    res.json({ mensaje: 'Configuración actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Función interna para actualizar tokens (no expuesta al frontend)
const updateTokens = async (tokenBearer, tokenRefresh, expiredTime) => {
  try {
    const [existing] = await pool.query('SELECT id FROM configuraciones ORDER BY id DESC LIMIT 1');
    
    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO configuraciones (usuario_guai, password_guai, token_bearer, token_refresh, expired_time) VALUES (?, ?, ?, ?, ?)',
        ['', '', tokenBearer, tokenRefresh, expiredTime]
      );
    } else {
      await pool.query(
        'UPDATE configuraciones SET token_bearer = ?, token_refresh = ?, expired_time = ? WHERE id = ?',
        [tokenBearer, tokenRefresh, expiredTime, existing[0].id]
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error al actualizar tokens:', error);
    return false;
  }
};

module.exports = {
  getConfiguracion,
  updateConfiguracion,
  updateTokens
}; 