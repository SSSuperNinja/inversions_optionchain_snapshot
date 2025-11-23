// frontend/src/services/TreeTableService.js

const BASE_URL = 'http://localhost:4004/api/Chain/Snapshot/crud';

// Función auxiliar para limpiar el objeto
const cleanRowData = (row) => {
    console.log("🔄 Datos originales para limpiar:", row);
    
    // Crear un objeto completamente nuevo, sin prototipo
    const cleanData = Object.create(null);
    
    // Solo incluir campos específicos que sabemos que el backend acepta
    const fieldsToInclude = [
        'strike', 'bid', 'ask', 'iv', 'delta', 'gamma', 'theta', 'vega',
        'expiration', 'ts', 'snapshot_id', 'underlying_id', 'option_id'
    ];
    
    fieldsToInclude.forEach(field => {
        if (row[field] !== undefined && row[field] !== null) {
            cleanData[field] = row[field];
        }
    });
    
    // Manejar el campo 'right' especialmente
    if (row.type) {
        cleanData.right = row.type === 'Call' ? 'C' : (row.type === 'Put' ? 'P' : row.right);
    } else if (row.right) {
        cleanData.right = row.right;
    }
    
    console.log("🧹 Datos completamente limpios:", cleanData);
    return cleanData;
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
    try {
        // Lógica para determinar tipo (Padre o Hijo)
        const isItem = row.strike !== undefined || row.level === 1;
        const processType = isItem ? 'UpdateItem' : 'UpdateSnapshot';

        console.log(`🎯 Preparando actualización: ${processType}`, row);

        // 1. LIMPIEZA DE DATOS
        const cleanData = cleanRowData(row);

        // 2. Construir Query Params con los IDs ACTUALES
        const params = new URLSearchParams({
            ProcessType: processType,
            dbServer: 'MongoDB',
            User: 'Admin',
            
            // IDs ACTUALES para encontrar el registro
            snapshot_id: row.snapshot_id,
            [isItem ? 'option_id' : 'underlying_id']: isItem ? row.option_id : row.underlying_id
        });

        const url = `${BASE_URL}?${params.toString()}`;

        console.log("📤 URL de llamada:", url);
        console.log("📦 Payload a enviar:", { data: cleanData });

        // 3. Enviar datos
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                data: cleanData 
            }) 
        });

        console.log("📨 Respuesta del servidor - Status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Error del servidor:", errorText);
            throw new Error(`Error al actualizar: ${response.status} - ${errorText}`);
        }

        const json = await response.json();
        console.log("✅ Actualización exitosa - Respuesta completa:", json);
        
        // Verificar que la respuesta tenga datos
        if (json && json.length > 0) {
            console.log("📊 Datos actualizados retornados:", json[0]);
        }
        
        return true;

    } catch (error) {
        console.error("💥 Error en updateRow:", error);
        alert("Error al actualizar: " + error.message);
        return false;
    }
  }
};