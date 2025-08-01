const { login, obtenerServicios } = require('../utils/apiClient');
const { insertarServicio, insertarTelefonoCliente } = require('../models/servicio');

async function sincronizarServicios(req, res) {
  try {
    // 1. Login y obtener WebSessionID
    const webSessionId = await login();
    // 2. Obtener servicios
    const data = await obtenerServicios(webSessionId);
    if (!data.Servicios || !Array.isArray(data.Servicios)) {
      return res.status(400).json({ error: 'No se encontraron servicios en la respuesta' });
    }
    // 3. Guardar cada servicio y sus teléfonos
    for (const servicio of data.Servicios) {
      const servicioId = await insertarServicio(servicio);
      if (Array.isArray(servicio.TelefonoCliente)) {
        for (const tel of servicio.TelefonoCliente) {
          await insertarTelefonoCliente(servicioId, tel);
        }
      }
    }
    res.json({ mensaje: 'Servicios sincronizados correctamente', cantidad: data.Servicios.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { sincronizarServicios }; 