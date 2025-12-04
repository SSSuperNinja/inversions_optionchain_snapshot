// backend/src/config/connectToCosmos.js
const { CosmosClient } = require("@azure/cosmos");
require('dotenv').config(); // Usamos dotenv directamente aquí para asegurar carga

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE; // Esto leerá 'inversions'

// Validación rápida para que no te rompas la cabeza si falla
if (!endpoint || !key || !databaseId) {
    console.error("❌ ERROR CRÍTICO: Faltan variables de entorno para Azure Cosmos DB.");
    console.error("Revisa: COSMOS_ENDPOINT, COSMOS_KEY y COSMOS_DATABASE en tu .env");
}

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);

console.log(`cw --- Configurando conexión a Azure: DB [${databaseId}] ---`);

module.exports = {
    // Exportamos los contenedores listos para usarse
    snapshotsContainer: database.container(process.env.COSMOS_KV_SNAPSHOTS || 'optionchainsnapshots'),
    itemsContainer: database.container(process.env.COSMOS_KV_ITEMS || 'optionchainsnapshotitems')
};