// backend/src/api/controllers/option-chain-controller.js

const cds = require('@sap/cds');
const { processCrud } = require('../services/option-chain-service');

class OptionChainController extends cds.ApplicationService {
    async init() {
        
        this.on('crud', async (req) => {
            try {
                // 1. Leer Query Params de la URL
                // Ejemplo: ?ProcessType=GetAll&User=TestUser
                const queryParams = req.http?.req?.query || {};
                
                // 2. Extraer valores (Prioridad URL)
                const ProcessType = queryParams.ProcessType || req.data.ProcessType;
                const dbServer = queryParams.dbServer || req.data.dbServer;
                const User = queryParams.User || req.data.User;

                // 3. Crear objeto de datos unificado
                const requestData = {
                    ...req.data,  // Payload del body (si hubiera)
                    ProcessType,
                    dbServer,
                    User
                };

                console.log(`📡 Controller: [${ProcessType}] Solicitado por [${User}]`);

                // 4. Delegar al servicio
                const enrichedReq = { ...req, data: requestData };
                return await processCrud(enrichedReq);

            } catch (error) {
                console.error("❌ Error en Controller:", error);
                req.error(500, error.message);
            }
        });

        return super.init();
    }
}

module.exports = OptionChainController;