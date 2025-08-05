# Proveedor IMA

Este proveedor maneja la integración con el sistema IMA (Iberica MultiAsistencia).

## Configuración

### Variables de Entorno Necesarias

Agrega estas variables a tu archivo `.env`:

```bash
# Configuración de IMA
IMA_EMAIL_USER=tu_email_ima@gmail.com
IMA_EMAIL_PASSWORD=tu_password_email_ima

# Configuración de base de datos (si no existe)
DB_HOST=localhost
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_password_mysql
DB_NAME=api_integraciones
JWT_SECRET=tu_secret_key_muy_segura
```

## Uso

```javascript
const IMAProvider = require('./src/providers/ima');

// Crear instancia del proveedor
const provider = new IMAProvider({
  id: 1,
  nombre: 'IMA Test',
  username: 'usuario_ima',
  password: 'password_ima'
});

// Autenticar
await provider.authenticate('usuario_ima', 'password_ima');

// Procesar emails
const results = await provider.fetchCodesFromEmails();
```

## Funcionalidades

- ✅ Autenticación con sistema IMA
- ✅ Lectura de emails IMAP
- ✅ Análisis automático de contenido de emails
- ✅ Extracción de datos de servicios IMA
- ✅ Obtención de budget lines
- ✅ Clasificación automática de casos

## Tipos de Emails Soportados

1. **Nuevo Servicio**: `"Nuevo servicio en la plataforma IMA"`
2. **Presupuesto Modificado**: `"El presupuesto del servicio IMA fue modificado"`
3. **Presupuesto Aprobado**: `"El presupuesto del servicio IMA fue aprobado"`
4. **Servicio Cancelado**: `"Servicio IMA cancelado"`
5. **Nuevo Mensaje**: `"Nuevo mensaje en el servicio IMA"`

## Dependencias

- `axios`: Cliente HTTP
- `axios-cookiejar-support`: Soporte para cookies en axios
- `tough-cookie`: Manejo de cookies
- `imapflow`: Cliente IMAP
- `mailparser`: Parseo de emails 