// frontend/src/services/TreeTableService.js

const BASE_URL = 'http://localhost:4004/api/Chain/Snapshot/crud';

// Función auxiliar para limpiar el objeto
// Función auxiliar para limpiar el objeto - VERSIÓN CORREGIDA
// Función auxiliar para limpiar el objeto - VERSIÓN CORREGIDA
// Función auxiliar para limpiar el objeto - VERSIÓN CORREGIDA
const cleanRowData = (row) => {
    console.log("🔄 Datos originales para limpiar:", row);
    
    const cleanData = {
        // Campos financieros principales
        strike: row.strike != null ? Number(row.strike) : undefined,
        bid: row.bid != null ? Number(row.bid) : undefined,
        ask: row.ask != null ? Number(row.ask) : undefined,
        iv: row.iv != null ? Number(row.iv) : undefined,
        delta: row.delta != null ? Number(row.delta) : undefined,
        gamma: row.gamma != null ? Number(row.gamma) : undefined,
        theta: row.theta != null ? Number(row.theta) : undefined,
        vega: row.vega != null ? Number(row.vega) : undefined,
        
        // CORRECCIÓN: Usar row.right directamente, no row.type
        right: row.right || undefined, // ← ESTA ES LA LÍNEA CLAVE
        
        // Campos de fecha
        ts: row.ts ? (() => {
            try {
                const date = new Date(row.ts);
                return !isNaN(date.getTime()) ? date.toISOString() : undefined;
            } catch (error) {
                console.error('Error convirtiendo ts a ISO:', error);
                return undefined;
            }
        })() : undefined,
        
        // IDs
        snapshot_id: row.snapshot_id != null ? Number(row.snapshot_id) : undefined,
        underlying_id: row.underlying_id != null ? Number(row.underlying_id) : undefined,
        option_id: row.option_id != null ? Number(row.option_id) : undefined
    };

    // Limpiar campos undefined/null
        Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined || cleanData[key] === null) {
            delete cleanData[key];
        }
    });

    console.log("🔄 Datos limpios para enviar:", cleanData);
    return cleanData;
};

// Función segura para extraer mensajes de error
const getErrorMessage = (error) => {
    try {
        if (typeof error === 'string') return error;
        if (error.message) return error.message;
        if (error.error?.message) return error.error.message;
        
        // Si es un objeto de respuesta HTTP, intentar extraer el mensaje
        const errorStr = JSON.stringify(error);
        if (errorStr.includes('"message"')) {
            const match = errorStr.match(/"message":"([^"]+)"/);
            if (match) return match[1];
        }
        
        return 'Error desconocido';
    } catch (e) {
        return 'Error al procesar el mensaje de error';
    }
};

export const TreeTableService = {
  
  getHierarchy: async () => {
    try {
      const params = new URLSearchParams({
        ProcessType: 'GetAll',
        dbServer: 'MongoDB',
        User: 'Admin'
      });
      const url = `${BASE_URL}?${params.toString()}`;
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

updateRow: async (row) => {
    let response; // Declarar response fuera del try para que esté disponible en el catch

    try {
        const isItem = row.strike !== undefined || row.level === 1;
        const processType = isItem ? 'UpdateItem' : 'UpdateSnapshot';

        console.log(`🎯 Preparando actualización: ${processType}`);
        console.log('📋 Datos recibidos del frontend:', row);

        // 1. LIMPIEZA DE DATOS
        const cleanData = cleanRowData(row);

        console.log('🔍 Verificación específica - type en cleanData:', cleanData.type);

        // 2. Construir Query Params
        const params = new URLSearchParams({
            ProcessType: processType,
            dbServer: 'MongoDB',
            User: 'Admin',
            id: row.id
        });

        const url = `${BASE_URL}?${params.toString()}`;

        console.log("📤 URL de llamada:", url);
        console.log("📦 Datos que se enviarán:", { data: cleanData });

        // 3. Enviar datos
        response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                data: cleanData 
            }) 
        });

        // 4. Manejar respuesta de manera segura
        const responseText = await response.text();
        
        if (!response.ok) {
            console.error("❌ Error del servidor (raw):", responseText);
            
            let errorMessage = `Error ${response.status}: `;
            
            try {
                const errorJson = JSON.parse(responseText);
                errorMessage += getErrorMessage(errorJson);
            } catch (e) {
                errorMessage += responseText || 'Error desconocido del servidor';
            }
            
            throw new Error(errorMessage);
        }

        // Procesar respuesta exitosa
        let jsonResponse;
        try {
            jsonResponse = JSON.parse(responseText);
        } catch (e) {
            throw new Error('Respuesta del servidor no es JSON válido');
        }

        console.log("✅ Actualización exitosa");
        return true;

    } catch (error) {
        console.error("❌ Error en updateRow:", error);
        
        // Mostrar alerta de manera segura - CORREGIDO
        const userMessage = error.message || 'Error desconocido';
        alert(`Error al actualizar: ${userMessage}`);
        
        return false;
    }
}
};