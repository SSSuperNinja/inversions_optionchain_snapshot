// frontend/src/services/HierarchyService.js

// CORRECCIÓN: URL en minúsculas
const BASE_URL = 'http://localhost:4004/api/chain/snapshot/crud';

export const TreeTableService = {
  getHierarchy: async () => {
    try {
      // Query Params con la notación PascalCase para el valor
      const params = new URLSearchParams({
        ProcessType: 'GetAll',  // Valor en Mayúscula
        dbServer: 'MongoDB',
        User: 'Admin'
      });

      const url = `${BASE_URL}?${params.toString()}`;

      const response = await fetch(url, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Body vacío
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const json = await response.json();
      return json.value || [];

    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  }
};