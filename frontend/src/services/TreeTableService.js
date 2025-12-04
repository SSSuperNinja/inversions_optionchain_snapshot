// frontend/src/services/TreeTableService.js

const BASE_URL = 'http://localhost:4004/api/chain/snapshot/crud';

// Función para limpiar los datos antes de enviarlos al backend
// Elimina campos de UI (id, subRows, etc.) y deja solo los datos reales.
const cleanRowData = (row) => {
    // Lista de campos permitidos en el UpdatePayload (según tu archivo .cds)
    const allowedFields = [
        'snapshot_id', 'underlying_id', 'option_id',
        'strike', 'right', 'expiration', 'ts',
        'bid', 'ask', 'iv',
        'delta', 'gamma', 'theta', 'vega'
    ];

    const cleanData = {};

    allowedFields.forEach(field => {
        if (row[field] !== undefined && row[field] !== null) {
            // Convertir numéricos si es necesario
            if (['bid', 'ask', 'iv', 'strike', 'delta', 'gamma', 'theta', 'vega', 'snapshot_id', 'underlying_id', 'option_id'].includes(field)) {
                const num = Number(row[field]);
                cleanData[field] = isNaN(num) ? undefined : num;
            } else {
                cleanData[field] = row[field];
            }
        }
    });

    // Normalizar fechas a ISO si existen
    if (cleanData.expiration) cleanData.expiration = new Date(cleanData.expiration).toISOString();
    if (cleanData.ts) cleanData.ts = new Date(cleanData.ts).toISOString();

    // Normalizar 'right' (C/P)
    if (row.type && !cleanData.right) {
        cleanData.right = row.type === 'Call' ? 'C' : (row.type === 'Put' ? 'P' : undefined);
    }

    return cleanData;
};

export const TreeTableService = {
  
  getHierarchy: async (dbServer = 'MongoDB') => {
    try {
      const params = new URLSearchParams({
        ProcessType: 'GetAll',
        dbServer: dbServer, 
        User: 'Admin'
      });
      const url = `${BASE_URL}?${params.toString()}`;
      
      console.log(`📡 Cargando datos desde [${dbServer}]...`);

      const response = await fetch(url, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) 
      });
      
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const json = await response.json();
      return json.value || [];
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  },

  updateRow: async (row, dbServer = 'MongoDB') => {
    try {
        const isItem = row.strike !== undefined || row.level === 1;
        const processType = isItem ? 'UpdateItem' : 'UpdateSnapshot';

        console.log(`🎯 Update en [${dbServer}]: ${processType} (ID: ${row.id})`);

        // 1. LIMPIEZA DE DATOS (CRÍTICO para evitar el error 400)
        const cleanData = cleanRowData(row);

        const params = new URLSearchParams({
            ProcessType: processType,
            dbServer: dbServer,
            User: 'Admin',
            // El ID va en la URL, NO dentro de 'data'
            id: row.id 
        });

        const url = `${BASE_URL}?${params.toString()}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                // Enviamos solo los datos limpios dentro de 'data'
                data: cleanData 
            }) 
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Error HTTP ${response.status}: ${text}`);
        }
        
        console.log("✅ Actualización exitosa");
        return true;

    } catch (error) {
        console.error("❌ Error en updateRow:", error);
        alert(`Error al actualizar: ${error.message}`);
        return false;
    }
  }
};