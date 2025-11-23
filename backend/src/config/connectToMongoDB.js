const mongoose = require('mongoose');
const dotenvXConfig = require('./dotenvXConfig');

// Función asíncrona autoejecutable para conectar
(async () => { 
    try { 
        // Verificación de seguridad
        if (!dotenvXConfig.CONNECTION_STRING.startsWith('mongodb')) {
            throw new Error('La cadena de conexión no parece válida');
        }

        const db = await mongoose.connect(dotenvXConfig.CONNECTION_STRING, {
            dbName: dotenvXConfig.DATABASE 
        }); 
        
        console.log(`✅ Database is connected to: ${db.connection.name}`); 
    } catch (error) { 
        console.error('❌ Error connecting to MongoDB:', error.message); 
    } 
})();