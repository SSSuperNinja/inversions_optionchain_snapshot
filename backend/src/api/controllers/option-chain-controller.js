const cds = require('@sap/cds');
// Importamos el servicio
// Nota: Usamos '..' para subir un nivel desde 'controllers' y entrar a 'services'
const { processCrud } = require('../services/option-chain-service');

class OptionChainController extends cds.ApplicationService {
    async init() {
        
        // Interceptamos la acción 'crud' definida en el archivo .cds
        this.on('crud', async (req) => {
            try {
                // 1. Accedemos a los parámetros de la URL (Query Params)
                // req.http.req.query es el objeto nativo de Express que contiene ?param=valor
                const queryParams = req.http?.req?.query || {};
                const bodyData = req.data || {};

                // 2. Mezclamos Query Params (Prioridad) + Body Params
                const requestData = {
                    ...bodyData, // Incluye el objeto 'data' del body con los campos a editar
                    
                    // Parámetros de Control (URL tiene prioridad sobre Body)
                    ProcessType: queryParams.ProcessType || bodyData.ProcessType,
                    User: queryParams.User || bodyData.User,
                    dbServer: queryParams.dbServer || bodyData.dbServer,

                    // Llaves de Identificación (Forzamos conversión a número si vienen de URL)
                    snapshot_id: queryParams.snapshot_id ? Number(queryParams.snapshot_id) : bodyData.snapshot_id,
                    underlying_id: queryParams.underlying_id ? Number(queryParams.underlying_id) : bodyData.underlying_id,
                    option_id: queryParams.option_id ? Number(queryParams.option_id) : bodyData.option_id
                };

                console.log(`📡 Controller: Acción [${requestData.ProcessType}]`);

                // 3. Delegamos al Servicio con los datos unificados
                // Creamos un objeto 'req' enriquecido para pasarlo al servicio
                const enrichedReq = { ...req, data: requestData };
                return await processCrud(enrichedReq);

            } catch (error) {
                console.error("❌ Error en Controller:", error);
                // Devolvemos un error 500 estándar de CAP
                req.error(500, error.message);
            }
        });

        return super.init();
    }
}

module.exports = OptionChainController;