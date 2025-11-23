const dotenvx = require('@dotenvx/dotenvx');
dotenvx.config(); // Carga las variables del archivo .env

module.exports = {
  HOST: process.env.HOST || 'localhost',
  PORT: process.env.PORT || 4004, // Usamos el 4004 de tu .env

  // Mapeo exacto de tus variables del .env
  CONNECTION_STRING: process.env.MONGODB_URI || 'SIN Cadena de CONEXION A LA BD MONGO',
  DATABASE: process.env.MONGODB_DB || 'Inversiones',
  
  // Flags opcionales
  DEBUG_LOGS: process.env.DEBUG_LOGS === 'true',
  STRICT_HTTP_ERRORS: process.env.STRICT_HTTP_ERRORS === 'true'
};