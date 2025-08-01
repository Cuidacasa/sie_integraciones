# Estructura Modular de Proveedores

## Descripción

Esta carpeta contiene la implementación modular de diferentes proveedores de datos. Cada proveedor maneja su propia lógica de autenticación, extracción de datos y transformación.

## Estructura

```
src/providers/
├── multiasistencia/          # Proveedor para MultiAsistencia
│   ├── index.js             # Punto de entrada principal
│   ├── apiClient.js         # Cliente API específico
│   ├── dataProcessor.js     # Procesamiento de datos
│   └── config.js           # Configuración específica
├── empresa2/                # Futuro proveedor
│   ├── index.js
│   ├── apiClient.js
│   └── ...
└── empresa3/                # Otro proveedor
    ├── index.js
    └── ...
```

## Arquitectura

### 1. Clase Base (`BaseProvider`)
- **Ubicación**: `src/core/baseProvider.js`
- **Propósito**: Define la interfaz común para todos los proveedores
- **Métodos principales**:
  - `authenticate(username, password)`
  - `fetchData(sessionId, options)`
  - `transformData(rawData)`
  - `processExpedientes(options)`

### 2. Factory de Proveedores
- **Ubicación**: `src/core/providerFactory.js`
- **Propósito**: Centraliza la creación de proveedores
- **Funcionalidad**:
  - Registra proveedores disponibles
  - Crea instancias según el tipo
  - Proporciona información de proveedores

### 3. Proveedor MultiAsistencia
- **Ubicación**: `src/providers/multiasistencia/`
- **Componentes**:
  - `index.js`: Implementación principal
  - `apiClient.js`: Comunicación con API
  - `dataProcessor.js`: Transformación de datos

## Cómo agregar un nuevo proveedor

### 1. Crear estructura de carpetas
```bash
mkdir src/providers/nuevo-proveedor
cd src/providers/nuevo-proveedor
```

### 2. Implementar archivos requeridos

#### `index.js` - Proveedor principal
```javascript
const BaseProvider = require('../../core/baseProvider');
const NuevoProveedorApiClient = require('./apiClient');
const NuevoProveedorDataProcessor = require('./dataProcessor');

class NuevoProveedorProvider extends BaseProvider {
  constructor(compania) {
    super(compania);
    this.providerName = 'NuevoProveedorProvider';
    this.apiClient = new NuevoProveedorApiClient();
    this.dataProcessor = new NuevoProveedorDataProcessor();
  }

  async authenticate(username, password) {
    return await this.apiClient.login(username, password);
  }

  async fetchData(sessionId, options = {}) {
    return await this.apiClient.obtenerDatos(sessionId, options);
  }

  transformData(rawData) {
    return this.dataProcessor.transformarDatos(rawData);
  }

  async processRawData(rawData, options = {}) {
    // Implementar lógica específica
  }
}

module.exports = NuevoProveedorProvider;
```

#### `apiClient.js` - Cliente API
```javascript
const axios = require('axios');

class NuevoProveedorApiClient {
  async login(username, password) {
    // Implementar autenticación específica
  }

  async obtenerDatos(sessionId, options) {
    // Implementar obtención de datos
  }
}

module.exports = NuevoProveedorApiClient;
```

#### `dataProcessor.js` - Procesador de datos
```javascript
class NuevoProveedorDataProcessor {
  transformarDatos(rawData) {
    // Implementar transformación específica
  }
}

module.exports = NuevoProveedorDataProcessor;
```

### 3. Registrar en el Factory
```javascript
// En src/core/providerFactory.js
const NuevoProveedorProvider = require('../providers/nuevo-proveedor');

// En el método registerProviders()
this.providers.set('nuevo-proveedor', NuevoProveedorProvider);
```

## Uso en el código

### En controladores
```javascript
const providerFactory = require('../core/providerFactory');

// Crear proveedor
const provider = providerFactory.createProvider('multiasistencia', compania);

// Procesar expedientes
const resultado = await provider.processExpedientes(options);
```

### En tareas programadas
```javascript
// El controlador de tareas ya usa la nueva estructura
const provider = providerFactory.createProvider('multiasistencia', compania);
const resultado = await provider.processExpedientes({
  fechaInicio: fechaInicioStr,
  fechaFin: fechaFinStr
});
```

## Beneficios de la nueva estructura

### 1. **Modularidad**
- Cada proveedor es independiente
- Fácil agregar nuevos proveedores
- Código organizado y mantenible

### 2. **Escalabilidad**
- Estructura preparada para múltiples empresas
- Interfaz común para todos los proveedores
- Factory pattern para gestión centralizada

### 3. **Mantenibilidad**
- Separación de responsabilidades
- Código específico por proveedor
- Fácil debugging y testing

### 4. **Flexibilidad**
- Diferentes tipos de autenticación
- Diferentes formatos de datos
- Configuración específica por proveedor

## Ejemplo de implementación completa

### Para una nueva empresa "EmpresaXYZ":

1. **Crear carpeta**: `src/providers/empresaxyz/`
2. **Implementar archivos**:
   - `index.js`: Lógica principal
   - `apiClient.js`: API específica de EmpresaXYZ
   - `dataProcessor.js`: Transformación de datos
3. **Registrar en factory**: Agregar a `providerFactory.js`
4. **Usar en código**: `providerFactory.createProvider('empresaxyz', compania)`

## Configuración de base de datos

### Tabla `companias` con campo `provider_type`
```sql
ALTER TABLE companias ADD COLUMN provider_type VARCHAR(50) DEFAULT 'multiasistencia';
```

### Uso en código
```javascript
const [compania] = await connection.query(
  'SELECT username, password, nombre, provider_type FROM companias WHERE id = ?',
  [companiaId]
);

const provider = providerFactory.createProvider(
  compania.provider_type || 'multiasistencia', 
  compania
);
```

## Próximos pasos

1. **Migrar código existente**: Actualizar rutas y controladores
2. **Agregar configuración**: Campo `provider_type` en BD
3. **Testing**: Crear tests para cada proveedor
4. **Documentación**: Completar documentación de APIs
5. **Monitoreo**: Agregar logs específicos por proveedor 