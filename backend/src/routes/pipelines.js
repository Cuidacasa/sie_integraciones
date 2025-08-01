const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../utils/logger');

// Guardar nuevo pipeline
router.post('/', async (req, res) => {
  const { nombre, descripcion, definicion, programacion } = req.body;
  try {
    await pool.query(
      'INSERT INTO pipelines (nombre, descripcion, definicion, programacion) VALUES (?, ?, ?, ?)',
      [nombre, descripcion, JSON.stringify(definicion), JSON.stringify(programacion)]
    );
    res.json({ mensaje: 'Pipeline guardado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar pipelines
router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM pipelines');
  res.json(rows.map(r => ({
    ...r,
    definicion: typeof r.definicion === 'string' ? JSON.parse(r.definicion) : r.definicion,
    programacion: r.programacion
      ? (typeof r.programacion === 'string' ? JSON.parse(r.programacion) : r.programacion)
      : null
  })));
});

// Probar pipeline (ejecución de prueba)
router.post('/test', async (req, res) => {
  try {
    const { definicion } = req.body;
    const { nodes, edges } = definicion;
    
    if (!nodes || nodes.length === 0) {
      return res.status(400).json({ error: 'No hay nodos para ejecutar' });
    }

    logger.info(`🚀 ===== INICIANDO EJECUCIÓN DE PIPELINE =====`);
    logger.info(`📊 Total de nodos: ${nodes.length}`);
    logger.debug(`📋 Configuración del pipeline`, { nodes: nodes.map(n => ({ id: n.id, type: n.data.type, label: n.data.label })) });
    
    const results = [];
    const extractedData = {}; // Para almacenar datos extraídos de cada nodo

    // Ejecutar nodos en orden (por ahora secuencial)
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      
      logger.info(`📋 ===== EJECUTANDO NODO ${i+1}: ${node.data.label} (${node.data.type}) =====`);
      logger.debug(`🔧 Configuración del nodo`, node.data);
      
      const nodeResult = {
        nodeId: node.id,
        nodeLabel: node.data.label,
        method: node.data.method,
        url: node.data.url,
        status: 'pending'
      };

      try {
        // Simular la ejecución del nodo
        const response = await executeNode(node, extractedData);
        
        nodeResult.status = 'success';
        nodeResult.response = response;
        
        // Extraer datos si hay configuración de extracción
        if (node.data.responseExtraction) {
          logger.info(`🔍 Extrayendo datos con reglas: ${node.data.responseExtraction}`);
          logger.debug(`📄 Respuesta completa`, response.data);
          
          const extracted = extractDataFromResponse(response, node.data.responseExtraction);
          extractedData[`node${i+1}`] = extracted;
          nodeResult.extracted = extracted;
          
          logger.success(`✅ Datos extraídos: ${Object.keys(extracted).length} valores`);
          logger.debug(`📊 Datos extraídos`, extracted);
        }
        
        // Transformar datos si es un nodo de transformación
        if (node.data.type === 'transformacion' && node.data.transformRules) {
          logger.info(`🔄 Iniciando transformación de datos...`);
          logger.debug(`📊 Datos de entrada`, response.data);
          logger.debug(`⚙️ Reglas de transformación`, node.data.transformRules);
          logger.debug(`🗺️ Mapeos configurados`, node.data.mapeos);
          
          const transformed = transformData(response.data, node.data.transformRules, node.data.mapeos);
          extractedData[`node${i+1}`] = transformed;
          nodeResult.transformed = transformed;
          
          logger.success(`✅ Transformación completada: ${transformed.servicios?.length || 0} servicios procesados`);
          logger.debug(`📋 Datos transformados`, transformed);
        }
        
        results.push(nodeResult);
        
      } catch (error) {
        nodeResult.status = 'error';
        nodeResult.error = error.message;
        results.push(nodeResult);
        logger.error(`❌ Error en nodo ${i+1}: ${error.message}`);
        break; // Detener ejecución si hay error
      }
    }

    logger.success(`🎉 ===== PIPELINE EJECUTADO EXITOSAMENTE =====`);
    logger.info(`📈 Resumen de ejecución: ${results.filter(r => r.status === 'success').length}/${results.length} nodos exitosos, ${results.filter(r => r.status === 'error').length} errores`);
    logger.debug(`📊 Datos finales extraídos`, extractedData);
    
    // Log completo del pipeline
    logger.logPipelineExecution('Pipeline Test', nodes, results, extractedData);
    
    res.json({
      mensaje: 'Pipeline ejecutado correctamente',
      results,
      extractedData
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Función para ejecutar un nodo individual
async function executeNode(node, extractedData) {
  const { method = 'POST', url, paramsBody, paramsHeader, contentType = 'application/json' } = node.data;
  
  // Para nodos de transformación, no necesitamos URL ni hacer requests HTTP
  if (node.data.type === 'transformacion') {
    // Buscar datos del nodo anterior en extractedData
    let datosAnteriores = {};
    for (let i = node.id - 1; i >= 1; i--) {
      if (extractedData[`node${i}`]) {
        datosAnteriores = extractedData[`node${i}`];
        break;
      }
    }
    
    return {
      status: 200,
      data: datosAnteriores,
      headers: {},
      request: { method: 'TRANSFORM', url: 'N/A', headers: {}, body: null, contentType: 'N/A' }
    };
  }
  
  // Validar que tengamos los datos mínimos necesarios para nodos HTTP
  if (!url) {
    throw new Error('URL no configurada para el nodo');
  }
  
  // Reemplazar variables dinámicas en URL
  const processedUrl = replaceVariables(url, extractedData);
  
  // Procesar headers
  let processedHeaders = {};
  if (paramsHeader && Object.keys(paramsHeader).length > 0) {
    processedHeaders = replaceVariables(JSON.stringify(paramsHeader), extractedData);
    try {
      processedHeaders = JSON.parse(processedHeaders);
    } catch (e) {
      processedHeaders = {};
    }
  }
  
  // Procesar body según el método y tipo de contenido
  let processedBody = null;
  
  if (method !== 'GET' && method !== 'DELETE' && paramsBody) {
    if (contentType === 'application/x-www-form-urlencoded') {
      // Para form-urlencoded, usar el string directamente
      processedBody = replaceVariables(paramsBody, extractedData);
    } else {
      // Para JSON, procesar como objeto
      try {
        const bodyObj = typeof paramsBody === 'string' ? JSON.parse(paramsBody) : paramsBody;
        processedBody = replaceVariables(JSON.stringify(bodyObj), extractedData);
        processedBody = JSON.parse(processedBody);
      } catch (e) {
        processedBody = paramsBody;
      }
    }
  }
  
  // Realizar petición HTTP real
  const axios = require('axios');
  
  // Debug: mostrar datos del nodo
  console.log(`🌐 ${method} ${url}`);
  
  // Validar que method sea un string válido
  if (!method || typeof method !== 'string') {
    throw new Error(`Método HTTP inválido: ${method}. Debe ser GET, POST, PUT, DELETE o PATCH`);
  }
  
  try {
    const requestConfig = {
      method: method.toLowerCase(),
      url: processedUrl,
      headers: {
        'Content-Type': contentType || 'application/json',
        ...processedHeaders
      },
      timeout: 30000 // 30 segundos de timeout
    };
    
    // Agregar body para métodos que lo requieren
    if (method !== 'GET' && method !== 'DELETE' && processedBody) {
      if (contentType === 'application/x-www-form-urlencoded') {
        // Para form-urlencoded, convertir string a objeto
        const formData = {};
        const pairs = processedBody.split('&');
        pairs.forEach(pair => {
          const [key, value] = pair.split('=');
          if (key && value) {
            formData[key.trim()] = value.trim();
          }
        });
        requestConfig.data = formData;
      } else {
        // Para JSON
        requestConfig.data = processedBody;
      }
    }
    
    // Agregar query parameters para GET
    if (method === 'GET' && processedBody) {
      if (contentType === 'application/x-www-form-urlencoded') {
        // Para form-urlencoded, agregar como query params
        const params = {};
        const pairs = processedBody.split('&');
        pairs.forEach(pair => {
          const [key, value] = pair.split('=');
          if (key && value) {
            params[key.trim()] = value.trim();
          }
        });
        requestConfig.params = params;
      }
    }
    
    console.log(`📡 Enviando petición HTTP...`);
    
    const response = await axios(requestConfig);
    
    return {
      status: response.status,
      data: response.data,
      headers: response.headers,
      request: {
        method,
        url: processedUrl,
        headers: processedHeaders,
        body: processedBody,
        contentType
      }
    };
    
  } catch (error) {
    // Manejar errores de red
    const errorResponse = {
      status: error.response?.status || 500,
      data: error.response?.data || error.message,
      headers: error.response?.headers || {},
      error: true,
      request: {
        method,
        url: processedUrl,
        headers: processedHeaders,
        body: processedBody,
        contentType
      }
    };
    
    throw new Error(`Error en petición HTTP: ${error.message} - Status: ${errorResponse.status}`);
  }
}

// Función para reemplazar variables dinámicas
function replaceVariables(text, extractedData) {
  if (!text) return text;
  
  return text.replace(/\{\{node(\d+)\.(\w+)\}\}/g, (match, nodeIndex, key) => {
    const nodeKey = `node${nodeIndex}`;
    const value = extractedData[nodeKey] && extractedData[nodeKey][key];
    return value || match;
  });
}

// Función para extraer datos de la respuesta usando regex
function extractDataFromResponse(response, extractionRules) {
  const extracted = {};
  const rules = extractionRules.split('\n').filter(rule => rule.trim());
  
  rules.forEach((rule, index) => {
    try {
      // Manejo especial para datos JSON
      if (rule.includes('"Servicios"') && typeof response.data === 'object') {
        // Extraer directamente del objeto JSON
        if (response.data.Servicios) {
          extracted['servicios'] = response.data.Servicios;
          return;
        }
      }
      
      const regex = new RegExp(rule.trim());
      
      // Convertir respuesta a string para buscar
      let responseText;
      if (typeof response.data === 'string') {
        responseText = response.data;
      } else if (typeof response.data === 'object') {
        responseText = JSON.stringify(response.data);
      } else {
        responseText = String(response.data);
      }
      
      const match = regex.exec(responseText);
      if (match && match[1]) {
        // Extraer nombre del parámetro del regex
        let key;
        
        // Buscar patrones comunes en el regex para extraer el nombre
        if (rule.includes('PHPSESSID=')) {
          key = 'phpsessid';
        } else if (rule.includes('token=')) {
          key = 'token';
        } else if (rule.includes('access_token')) {
          key = 'access_token';
        } else if (rule.includes('Bearer')) {
          key = 'bearer_token';
        } else if (rule.includes('"Servicios"')) {
          key = 'servicios';
        } else {
          // Intentar extraer nombre del regex o usar índice
          const nameMatch = rule.match(/[a-zA-Z_][a-zA-Z0-9_]*=/);
          if (nameMatch) {
            key = nameMatch[0].replace('=', '');
          } else {
            key = `extracted_${index + 1}`;
          }
        }
        
        // Para datos JSON, intentar parsear el valor extraído
        let value = match[1];
        try {
          // Si el valor parece ser JSON, intentar parsearlo
          if (value.startsWith('[') || value.startsWith('{')) {
            value = JSON.parse(value);
          }
        } catch (e) {
          // Si no es JSON válido, usar el valor como string
        }
        
        extracted[key] = value;
      }
    } catch (error) {
      console.log(`Error en regex: ${rule}`, error);
    }
  });
  
  return extracted;
}

// Función para transformar datos según reglas personalizadas
function transformData(data, transformRules, mapeosConfigurados = null) {
  try {
    // Si data es un string, intentar parsearlo como JSON
    const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
    
    // Usar los mapeos configurados o los por defecto
    const mapeos = mapeosConfigurados || {
      "profesionales": {
        247201: "MlSev",
        247301: "MlMalA",
        248601: "MlBcn",
        161901: "MlTgn",
        187801: "MlMad",
        229601: "MlGra",
        247401: "MlGir"
      }
    };
    
    // Función para determinar tipo de caso
    function determinarTipoCaso(gremio, procedencia, descripcion) {
      const gremioLower = gremio?.toLowerCase() || '';
      const procedenciaLower = procedencia?.toLowerCase() || '';
      const descripcionLower = descripcion?.toLowerCase() || '';
      
      if (gremioLower.includes('fontanero') || gremioLower.includes('fontaneria comunidades')) {
        return 'Daños por agua';
      } else if (gremioLower.includes('electricista')) {
        return 'Daños eléctricos';
      } else if (gremioLower.includes('manitas')) {
        return 'Bricolaje/Manitas';
      } else if (procedenciaLower.includes('especiales (serv.')) {
        return 'Asistencia';
      } else if (procedenciaLower.includes('asistencia')) {
        return 'Conexión o contado';
      } else if (descripcionLower.includes('mantenimiento') && !descripcionLower.includes('mantenimiento integral')) {
        return 'Mantenimiento';
      } else if (descripcionLower.includes('rotura elemento de loza')) {
        return 'Rotura de Lozas';
      } else if (descripcionLower.includes('marmol')) {
        return 'Marmoles/Cristales';
      } else if (descripcionLower.includes('incendio')) {
        return 'Daños por incendio';
      } else if (descripcionLower.includes('robo')) {
        return 'Daños por robo o hurto';
      } else if (descripcionLower.includes('lluvia') || descripcionLower.includes('viento') || descripcionLower.includes('tormenta')) {
        return 'Daños por fenómenos meteorológicos';
      }
      
      return 'Sin definir';
    }
    
    const transformed = {};
    
    // Buscar el array de Servicios en diferentes ubicaciones posibles
    let serviciosArray = null;
    
    // Caso 1: Si data es directamente el array de Servicios
    if (Array.isArray(data)) {
      serviciosArray = data;
    }
    // Caso 2: Si data tiene la propiedad Servicios
    else if (jsonData.Servicios && Array.isArray(jsonData.Servicios)) {
      serviciosArray = jsonData.Servicios;
    }
    // Caso 3: Si data es un objeto con servicios en diferentes propiedades
    else if (jsonData.servicios && Array.isArray(jsonData.servicios)) {
      serviciosArray = jsonData.servicios;
    }
    // Caso 4: Si data es un objeto individual (no array)
    else if (jsonData && typeof jsonData === 'object' && !Array.isArray(jsonData)) {
      serviciosArray = [jsonData];
    }
    
    if (serviciosArray && serviciosArray.length > 0) {
      console.log(`🔄 Procesando ${serviciosArray.length} servicios...`);
      
      transformed.servicios = serviciosArray.map((servicio, index) => {
        const servicioTransformado = {};
        
        // Aplicar cada regla de transformación
        logger.debug(`🔄 Procesando servicio ${index + 1}`, servicio);
        
        for (const [campo, regla] of Object.entries(transformRules)) {
          try {
            // Crear función dinámica para evaluar la regla
            const evaluarRegla = new Function('servicio', 'mapeos', 'determinarTipoCaso', regla);
            const valorResultado = evaluarRegla(servicio, mapeos, determinarTipoCaso);
            servicioTransformado[campo] = valorResultado;
            
            logger.debug(`  ✅ ${campo}: "${valorResultado}" (regla: ${regla})`);
          } catch (error) {
            logger.error(`  ❌ Error en ${campo}: ${error.message} (regla: ${regla})`);
            servicioTransformado[campo] = null;
          }
        }
        
        logger.debug(`📋 Servicio ${index + 1} transformado`, servicioTransformado);
        
        return servicioTransformado;
      });
      
      console.log(`✅ Transformación completada: ${transformed.servicios.length} servicios procesados`);
    } else {
      console.log('⚠️ No se encontró array de servicios para procesar');
      transformed.servicios = [];
    }
    
    return transformed;
    
  } catch (error) {
    console.log('Error transformando datos:', error.message);
    return { error: error.message };
  }
}

// Ejecutar pipeline (esqueleto)
router.post('/:id/ejecutar', async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT * FROM pipelines WHERE id = ?', [id]);
  if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
  const pipeline = JSON.parse(rows[0].definicion);
  // Aquí iría la lógica para ejecutar cada paso del pipeline
  res.json({ mensaje: 'Ejecución simulada', pipeline });
});

// Actualizar pipeline existente
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, definicion, programacion } = req.body;
  try {
    await pool.query(
      'UPDATE pipelines SET nombre = ?, descripcion = ?, definicion = ?, programacion = ? WHERE id = ?',
      [nombre, descripcion, JSON.stringify(definicion), programacion ? JSON.stringify(programacion) : null, id]
    );
    res.json({ mensaje: 'Pipeline actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 