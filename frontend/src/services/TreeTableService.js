// frontend/src/services/TreeTableService.js

const BASE_URL = 'http://localhost:4004/api/Chain/Snapshot/crud';

// En TreeTableService.js - modifica la función cleanRowData
const cleanRowData = (row) => {
    console.log("🔄 Datos originales para limpiar:", row);
    
    // Función auxiliar para normalizar fechas
    const normalizeDate = (dateValue) => {
        if (!dateValue) return undefined;
        
        console.log("📅 Normalizando fecha:", dateValue, "Tipo:", typeof dateValue);
        
        try {
            // Si ya es string ISO, verificar que sea válido
            if (typeof dateValue === 'string') {
                const testDate = new Date(dateValue);
                if (!isNaN(testDate.getTime())) {
                    console.log("✅ Fecha ya es ISO válida:", dateValue);
                    return dateValue;
                } else {
                    console.log("❌ Fecha no es ISO válida, intentando parsear:", dateValue);
                }
            }
            
            // Para otros casos, crear nuevo Date
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                const isoDate = date.toISOString();
                console.log("✅ Fecha normalizada a ISO:", isoDate);
                return isoDate;
            } else {
                console.log("❌ No se pudo normalizar la fecha:", dateValue);
            }
        } catch (error) {
            console.error('Error normalizando fecha:', error, "Valor:", dateValue);
        }
        return undefined;
    };

    const cleanData = {
        // Campos financieros principales - CORREGIDOS
        strike: row.strike != null ? (isNaN(Number(row.strike)) ? undefined : Number(row.strike)) : undefined,
        bid: row.bid != null ? (isNaN(Number(row.bid)) ? undefined : Number(row.bid)) : undefined,
        ask: row.ask != null ? (isNaN(Number(row.ask)) ? undefined : Number(row.ask)) : undefined,
        iv: row.iv != null ? (isNaN(Number(row.iv)) ? undefined : Number(row.iv)) : undefined,
        delta: row.delta != null ? (isNaN(Number(row.delta)) ? undefined : Number(row.delta)) : undefined,
        gamma: row.gamma != null ? (isNaN(Number(row.gamma)) ? undefined : Number(row.gamma)) : undefined,
        theta: row.theta != null ? (isNaN(Number(row.theta)) ? undefined : Number(row.theta)) : undefined,
        vega: row.vega != null ? (isNaN(Number(row.vega)) ? undefined : Number(row.vega)) : undefined,
        
        // Campo tipo - CORREGIDO: usar row.right en lugar de row.type
        right: row.right || (row.type === 'Call' ? 'C' : row.type === 'Put' ? 'P' : undefined),
        
        // FECHAS CORREGIDAS
        ts: normalizeDate(row.ts),
        expiration: normalizeDate(row.expiration),
        
        // IDs - CORREGIDOS
        snapshot_id: row.snapshot_id != null ? (isNaN(Number(row.snapshot_id)) ? undefined : Number(row.snapshot_id)) : undefined,
        underlying_id: row.underlying_id != null ? (isNaN(Number(row.underlying_id)) ? undefined : Number(row.underlying_id)) : undefined,
        option_id: row.option_id != null ? (isNaN(Number(row.option_id)) ? undefined : Number(row.option_id)) : undefined
    };

    // DEBUG: Verificar cada campo antes de limpiar
    console.log("🔍 Datos ANTES de limpiar undefined:", cleanData);
    
    // Limpiar campos undefined/null - PERO mantener 0 y false
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