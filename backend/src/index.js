const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const serviciosRoutes = require('./routes/servicios');
const authRoutes = require('./routes/auth');
const companiasRoutes = require('./routes/companias');
const expedientesRoutes = require('./routes/expedientes');
const configuracionRoutes = require('./routes/configuracion');
const pipelinesRouter = require('./routes/pipelines');
const tareasRoutes = require('./routes/tareas');

app.use('/servicios', serviciosRoutes);
app.use('/api', authRoutes);
app.use('/api/companias', companiasRoutes);
app.use('/api/expedientes', expedientesRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/pipelines', pipelinesRouter);
app.use('/api/tareas', tareasRoutes);

const taskScheduler = require('./utils/scheduler');
const { checkAndCreateTables } = require('./utils/checkTables');
const { updateExistingExpedientes } = require('./utils/updateExistingExpedientes');
const { addApiTokenColumn } = require('./utils/addApiTokenColumn');

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  
  try {
    // Verificar y crear tablas si es necesario
    await checkAndCreateTables();
    
    // Actualizar expedientes existentes con id_unico
    await updateExistingExpedientes();
    
    // Agregar columna api_token a la tabla companias
    await addApiTokenColumn();
    
    // Iniciar el scheduler de tareas programadas
    taskScheduler.start();
    console.log('TaskScheduler iniciado');
  } catch (error) {
    console.error('Error al inicializar:', error);
  }
}); 