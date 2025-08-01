# API Integraciones

## Instalación

1. Clona el repositorio y entra en la carpeta del proyecto.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea un archivo `.env` con la configuración de la base de datos y los tokens necesarios (ver ejemplo más abajo).

## Configuración del entorno (`.env`)

```
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=api_integraciones
API_LOGIN_URL=https://api-pre.registradoresma.com/multiasistencia/1.1.0/login
API_NUEVASALTAS_URL=https://api-pre.registradoresma.com/multiasistencia/1.1.0/nuevasaltas
API_BEARER=9a1cc378-ca27-3166-8563-82b3c860a578
```

## Ejecución

```bash
npm start
```

## Endpoints principales

- `POST /servicios/sincronizar` - Consume la API externa y guarda los datos en la base de datos.
- `POST /servicios/enviar` - Envía los datos procesados a un sistema externo (por implementar).

---

## Estructura del proyecto

- `src/controllers/` - Lógica de negocio y endpoints
- `src/models/` - Modelos y consultas a la base de datos
- `src/routes/` - Definición de rutas
- `src/utils/` - Utilidades (clientes API, helpers)
- `src/config/` - Configuración (DB, etc)
- `src/index.js` - Entrada principal del servidor 