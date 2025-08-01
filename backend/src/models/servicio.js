const pool = require('../config/db');

async function insertarServicio(servicio) {
  const [result] = await pool.query(
    `INSERT INTO servicios (
      profesional, servicio, direccion, fecha_limite_contacto_cliente, fecha_limite_visita_cliente, procedencia, gremio, caducidad, duracion, estado, fecha_hora_visita, numero_poliza, nombre_cliente, distrito_postal, forma_pago, franquicia, descripcion_reparacion, urgente, fecha_realizacion, confirmado, fecha_hora_apertura, fecha_hora_asignacion, tramitador, referencia
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      servicio.Profesional,
      servicio.Servicio,
      servicio.Direccion,
      servicio.FechaLimiteContactoCliente,
      servicio.FechaLimiteVisitaCliente,
      servicio.Procedencia,
      servicio.Gremio,
      servicio.Caducidad,
      servicio.Duracion,
      servicio.Estado,
      servicio.FechaHoraVisita,
      servicio.NumeroPoliza,
      servicio.NombreCliente,
      servicio.DistritoPostal,
      servicio.FormaPago,
      servicio.Franquicia,
      servicio.DescripcionReparacion,
      servicio.Urgente,
      servicio.FechaRealizacion,
      servicio.Confirmado,
      servicio.FechaHoraApertura,
      servicio.FechaHoraAsignacion,
      servicio.Tramitador,
      servicio.Referencia
    ]
  );
  return result.insertId;
}

async function insertarTelefonoCliente(servicioId, telefono) {
  await pool.query(
    `INSERT INTO telefonos_cliente (servicio_id, numero, tipo, desde, hasta) VALUES (?, ?, ?, ?, ?)`,
    [servicioId, telefono.Numero, telefono.Tipo, telefono.Desde, telefono.Hasta]
  );
}

module.exports = { insertarServicio, insertarTelefonoCliente }; 