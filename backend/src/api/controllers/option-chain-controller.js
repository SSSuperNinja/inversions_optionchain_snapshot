const cds = require('@sap/cds');
const { processCrud } = require('../services/option-chain-service');

class OptionChainController extends cds.ApplicationService {
    async init() {
        
        this.on('crud', async (req) => {
            try {
                // 1. Accedemos a los parámetros de la URL (Query Params)
                const queryParams = req.http?.req?.query || {};
                const bodyData = req.data || {};

                // === DEBUG COMPLETO - AGREGA ESTAS LÍNEAS ===
                console.log("=== 🐛 DEBUG INICIO ===");
                console.log("🔍 Query Params objeto completo:", queryParams);
                console.log("🔍 Keys de Query Params:", Object.keys(queryParams));
                console.log("🔍 Body Data:", bodyData);
                console.log("🔍 req.data completo:", req.data);
                console.log("🔍 URL completa:", req.http?.req?.url);
                console.log("=== 🐛 DEBUG FIN ===");
                // === FIN DEBUG ===

                // 2. EXTRAER ID de todas las fuentes posibles
                const id = queryParams.id || queryParams.snapshot_id || queryParams.option_id;

                console.log("🔑 ID extraído después de debug:", id);

                // 3. Mezclamos Query Params + Body Params
                const requestData = {
                    // Parámetros de Control (siempre de query params)
                    ProcessType: queryParams.ProcessType,
                    User: queryParams.User,
                    dbServer: queryParams.dbServer,
                    
                    // ID del documento
                    id: id,
                    
                    // Datos del body
                    data: bodyData.data || bodyData
                };

                console.log(`📡 Controller: Acción [${requestData.ProcessType}] para ID [${requestData.id}]`);

                // 4. Validar que tengamos el ID para operaciones de update
                if ((requestData.ProcessType === 'UpdateSnapshot' || requestData.ProcessType === 'UpdateItem') && !requestData.id) {
                    throw new Error(`Falta el ID para ${requestData.ProcessType}.`);
                }

                // 5. Delegamos al Servicio con los datos estructurados
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