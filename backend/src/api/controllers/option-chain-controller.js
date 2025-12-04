const cds = require('@sap/cds');
const { processCrud } = require('../services/option-chain-service');

class OptionChainController extends cds.ApplicationService {
    async init() {
        
        this.on('crud', async (req) => {
            try {
                const queryParams = req.http?.req?.query || {};
                const bodyData = req.data || {};

                // 1. Extraer ID principal (prioridad a params)
                const id = queryParams.id || 
                           queryParams.snapshot_id || 
                           queryParams.option_id || 
                           bodyData.id;

                console.log("🔑 ID detectado en Controller:", id);

                // 2. MEZCLAR TODO (URL + BODY)
                // Esto es vital para que Delete funcione con params
                const requestData = {
                    ...queryParams, // <-- Metemos todo lo que venga en la URL (snapshot_id, etc.)
                    ...bodyData,    // <-- Metemos el body (si hay)
                    
                    // Aseguramos campos críticos
                    ProcessType: queryParams.ProcessType,
                    User: queryParams.User,
                    dbServer: queryParams.dbServer,
                    id: id,
                    
                    // Mantenemos compatibilidad con lógica anterior
                    data: bodyData.data || bodyData
                };

                // 3. Validación de ID para Updates
                if ((requestData.ProcessType === 'UpdateSnapshot' || requestData.ProcessType === 'UpdateItem') && !requestData.id) {
                    throw new Error(`Falta el ID para ${requestData.ProcessType}.`);
                }

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