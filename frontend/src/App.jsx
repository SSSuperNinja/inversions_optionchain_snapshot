import React, { useState, useEffect } from 'react';
import { 
  ShellBar, Card, CardHeader, Icon, Button, Input, 
  FlexBox, FlexBoxJustifyContent, FlexBoxAlignItems
} from '@ui5/webcomponents-react';
import '@ui5/webcomponents-icons/dist/AllIcons.js';

import { TreeTableService } from './services/TreeTableService'; 
import TreeTable from './components/TreeTable';
export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado de selección y edición
  const [selectedRow, setSelectedRow] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await TreeTableService.getHierarchy();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

// En App.jsx, modifica handleRowSelect para evitar seleccionar padres en modo edición:
const handleRowSelect = (row) => {
    if (!isEditing) {
        console.log("Fila seleccionada:", row);
        setSelectedRow(row);
        
        // Si es un padre, deshabilitar el botón de edición o mostrar mensaje
        if (row.level === 0) {
            console.log("⚠️  Los registros padres no son editables");
        }
    }
};

// Y en el botón de edición, puedes agregar una validación:
// En App.jsx - permite editar tanto padres como hijos
const handleEdit = () => {
    if (selectedRow) {
        setIsEditing(true); 
    }
};
  // Guardar cambios (Botón Fila)

const handleSave = async (updatedData) => {
    console.log("💾 Iniciando guardado con datos:", updatedData);
    
    try {
        const success = await TreeTableService.updateRow(updatedData);
        
        if (success) {
            console.log("✅ Guardado exitoso, recargando datos...");
            setIsEditing(false);
            setSelectedRow(null);
            
            // Pequeño delay para asegurar que el backend procesó la actualización
            setTimeout(() => {
                loadData();
            }, 500);
            
        } else {
            console.log("❌ Falló el guardado - Manteniendo modo edición");
            // NO cerramos el modo edición para que el usuario pueda corregir
        }
    } catch (error) {
        console.error("💥 Error en handleSave:", error);
        // El error ya fue mostrado por TreeTableService
    }
};
    const handleCancel = () => {
    setIsEditing(false);
    setSelectedRow(null); // Limpiar selección
    // No recargar datos inmediatamente, solo salir del modo edición
    };
    const handleDelete = () => {
      if (selectedRow) {
          if(confirm(`¿Seguro que deseas borrar ${selectedRow.hierarchyNode}?`)) {
              alert("Lógica de borrado pendiente (a implementar en backend)");
          }
      }
  };

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", background: "#f5f6f7" }}>
      
      <ShellBar
        primaryTitle="ChainOptions"
        secondaryTitle="Análisis de Cadena (Edición en Línea)"
        logo={<Icon name="chain-link" />}
        profile={<Icon name="customer" />}
      />

      <div style={{ flexGrow: 1, padding: "1rem", overflow: "hidden" }}>
        <Card
            header={
                <CardHeader
                    titleText="Estructura Organizacional"
                    subtitleText="Vista de Árbol Detallada"
                    avatar={<Icon name="table-view" />}
                />
            }
            style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}
        >
            {/* Toolbar Dinámico */}
            <FlexBox 
                justifyContent={FlexBoxJustifyContent.SpaceBetween} 
                alignItems={FlexBoxAlignItems.Center}
                style={{ padding: "0.5rem 1rem", borderBottom: "1px solid #e5e5e5" }}
            >
                <FlexBox style={{ gap: "0.5rem" }}>
                    {/* Muestra botones distintos dependiendo si estás editando o no */}
                    {isEditing ? (
                        <>
                            <Button 
                                icon="save" 
                                design="Emphasized" 
                                onClick={() => document.getElementById('btn-save-internal')?.click()}
                                tooltip="Guardar cambios de la fila actual"
                            >
                                Guardar
                            </Button>
                            <Button 
                                icon="cancel" 
                                design="Transparent" 
                                onClick={handleCancel}
                            >
                                Cancelar
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button icon="add" design="Emphasized">Agregar</Button>
                            <Button 
                            icon="edit" 
                            disabled={!selectedRow} 
                            onClick={handleEdit}
                            tooltip={selectedRow?.level === 0 ? "Editar Snapshot" : "Editar Opción"}
                        >
                            Editar
                        </Button>
                            <Button 
                                icon="delete" 
                                design="Transparent" 
                                style={{ color: selectedRow ? '#bb0000' : 'inherit' }}
                                disabled={!selectedRow} 
                                onClick={handleDelete}
                            >
                                Borrar
                            </Button>
                        </>
                    )}
                </FlexBox>

                <div style={{ width: "300px" }}>
                    <Input icon={<Icon name="search" />} placeholder="Buscar..." disabled={isEditing} />
                </div>
            </FlexBox>

            {/* Tabla */}
            <div style={{ flexGrow: 1, overflow: "hidden" }}>
                <TreeTable 
                    data={data} 
                    loading={loading} 
                    onRowSelect={handleRowSelect}
                    
                    // Props para controlar la edición desde App
                    isEditing={isEditing}
                    selectedRowId={selectedRow?.id}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            </div>
        </Card>
      </div>
    </div>
  );
}