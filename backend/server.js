const cds = require('@sap/cds');
const cors = require('cors'); // Importamos cors

// Importamos la conexión a Mongo
require('./src/config/connectToMongoDB');

// ESTA ES LA SOLUCIÓN:
// Nos "colgamos" del evento de arranque de CAP para inyectar CORS
cds.on('bootstrap', (app) => {
    app.use(cors()); // Habilita todo el tráfico (Desarrollo)
});

module.exports = cds.server;