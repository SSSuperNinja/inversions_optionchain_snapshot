import React, { useState, useEffect } from 'react';
import { 
  ShellBar, 
  Card,
  CardHeader,
  Icon,
  // Nuevos componentes para la barra de herramientas
  Button,
  Input,
  FlexBox,
  FlexBoxJustifyContent,
  FlexBoxAlignItems
} from '@ui5/webcomponents-react';
import '@ui5/webcomponents-icons/dist/AllIcons.js';

import { TreeTableService } from './services/TreeTableService'; 
import { TreeTable } from './components/TreeTable';

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", background: "#f5f6f7" }}>
      
      <ShellBar
        primaryTitle="ChainOptions"
        secondaryTitle="Análisis de Cadena (Vista Completa)"
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
            {/* --- BARRA DE HERRAMIENTAS --- */}
            <FlexBox 
                justifyContent={FlexBoxJustifyContent.SpaceBetween} 
                alignItems={FlexBoxAlignItems.Center}
                style={{ padding: "0.5rem 1rem", borderBottom: "1px solid #e5e5e5" }}
            >
                {/* Grupo de Acciones (Izquierda) */}
                <FlexBox style={{ gap: "0.5rem" }}>
                    <Button icon="add" design="Emphasized">Agregar</Button>
                    <Button icon="delete" design="Transparent" style={{ color: '#bb0000' }}>Borrar</Button>
                </FlexBox>

                {/* Buscador (Derecha) */}
                <div style={{ width: "300px" }}>
                    <Input icon={<Icon name="search" />} placeholder="Buscar ID o Underlying..." />
                </div>
            </FlexBox>

            {/* --- TABLA --- */}
            <div style={{ flexGrow: 1, overflow: "hidden" }}>
                <TreeTable 
                    data={data} 
                    loading={loading} 
                />
            </div>
        </Card>
      </div>
    </div>
  );
}