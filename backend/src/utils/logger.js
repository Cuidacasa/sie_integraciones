const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getLogFileName() {
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // Solo la fecha, no la hora
    return `pipeline-${date}.log`;
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    // Console output
    const emoji = {
      'INFO': 'ℹ️',
      'SUCCESS': '✅',
      'ERROR': '❌',
      'WARNING': '⚠️',
      'DEBUG': '🔍'
    };

    console.log(`${emoji[level] || '📝'} [${timestamp}] ${level}: ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }

    // File output
    const logFile = path.join(this.logDir, this.getLogFileName());
    const logLine = `${timestamp} [${level}] ${message}\n`;
    
    try {
      fs.appendFileSync(logFile, logLine);
      if (data) {
        fs.appendFileSync(logFile, JSON.stringify(data, null, 2) + '\n');
      }
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  info(message, data = null) {
    this.log('INFO', message, data);
  }

  success(message, data = null) {
    this.log('SUCCESS', message, data);
  }

  error(message, data = null) {
    this.log('ERROR', message, data);
  }

  warning(message, data = null) {
    this.log('WARNING', message, data);
  }

  debug(message, data = null) {
    this.log('DEBUG', message, data);
  }

  // Método específico para pipelines
  logPipelineExecution(pipelineName, nodes, results, extractedData) {
    this.info(`🚀 Pipeline "${pipelineName}" iniciado`);
    this.info(`📊 Configuración del pipeline`, { nodes: nodes.map(n => ({ id: n.id, type: n.data.type, label: n.data.label })) });
    
    results.forEach((result, index) => {
      if (result.status === 'success') {
        this.success(`✅ Nodo ${index + 1}: ${result.nodeLabel} ejecutado correctamente`);
        if (result.extracted) {
          this.debug(`📊 Datos extraídos del nodo ${index + 1}`, result.extracted);
        }
        if (result.transformed) {
          this.success(`🔄 Transformación completada en nodo ${index + 1}`, result.transformed);
        }
      } else {
        this.error(`❌ Error en nodo ${index + 1}: ${result.error}`);
      }
    });

    this.success(`🎉 Pipeline "${pipelineName}" completado`);
    this.info(`📈 Resumen final`, { 
      totalNodes: results.length,
      successNodes: results.filter(r => r.status === 'success').length,
      errorNodes: results.filter(r => r.status === 'error').length,
      extractedData
    });
  }
}

module.exports = new Logger(); 