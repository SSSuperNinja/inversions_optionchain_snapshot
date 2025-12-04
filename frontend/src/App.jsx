// src/App.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  ShellBar,
  Card,
  CardHeader,
  Icon,
  Button,
  Input,
  FlexBox,
  FlexBoxJustifyContent,
  FlexBoxAlignItems,
  Switch,
  Label
} from '@ui5/webcomponents-react';
import '@ui5/webcomponents-icons/dist/AllIcons.js';

import { TreeTableService } from './services/TreeTableService';
import TreeTable from './components/TreeTable';
import CreateChainDialog from './components/CreateChainDialog';
import DeleteSnapshotDialog from './components/DeleteSnapshotDialog';
import DeleteItemDialog from './components/DeleteItemDialog';
import { login, getInstruments } from './services/InstrumentsService';

const BASE_URL = 'http://localhost:4004/api/chain/snapshot/crud';

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);
  const [dbServer, setDbServer] = useState('MongoDB');

  // Edición inline
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Crear
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState('parent');

  // Eliminar
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [parentToDelete, setParentToDelete] = useState(null);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [childToDelete, setChildToDelete] = useState(null);

  // Instruments API
  const [sessionToken, setSessionToken] = useState(null);
  const [underlyingOptions, setUnderlyingOptions] = useState([]);

  // ============================================================
  // INIT: login → instruments → snapshots
  // ============================================================
  useEffect(() => {
    const init = async () => {
      try {
        // 1) LOGIN a la API externa
        const token = await login('prueba@gmail.com', '12345');
        setSessionToken(token);

        // 2) Obtener Instruments (ib_conid) para el ComboBox de underlyings (PADRE)
        if (token) {
          const instruments = await getInstruments(token);
          setUnderlyingOptions(instruments);
        }

        // 3) Cargar jerarquía desde tu backend
        await loadData();
      } catch (err) {
        console.error('❌ Error en init App:', err);
      }
    };

    init();
  }, []);

  useEffect(() => {
    loadData();
  }, [dbServer]);

const loadData = async () => {
    setLoading(true);
    try {
      console.log(`🔄 Cargando datos de: ${dbServer}`);
      // Pasamos el dbServer actual al servicio
      const result = await TreeTableService.getHierarchy(dbServer);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handler para el Switch
  const handleDbSwitch = (e) => {
    const isAzure = e.target.checked;
    setDbServer(isAzure ? 'AzureCosmos' : 'MongoDB');
    // Limpiamos selección al cambiar de contexto
    setSelectedRow(null);
    setIsEditing(false);
  };
  
  // ========= BÚSQUEDA =========
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;

    const lowercasedSearch = searchTerm.toLowerCase().trim();

    return data
      .map((parent) => {
        const searchableFields = [
          'snapshot_id',
          'underlying_id',
          'option_id',
          'hierarchyNode',
          'strike',
          'type',
          'right',
          'description'
        ];

        const parentMatches = searchableFields.some(
          (field) =>
            parent[field] != null &&
            String(parent[field]).toLowerCase().includes(lowercasedSearch)
        );

        const matchingChildren = parent.subRows
          ? parent.subRows.filter((child) =>
              searchableFields.some(
                (field) =>
                  child[field] != null &&
                  String(child[field]).toLowerCase().includes(lowercasedSearch)
              )
            )
          : [];

        if (parentMatches || matchingChildren.length > 0) {
          return {
            ...parent,
            subRows: parentMatches ? parent.subRows : matchingChildren
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [data, searchTerm]);

  // ========= MAPA snapshot_id → [underlying_id...] (para el combo del HIJO) =========
  const childUnderlyingMap = useMemo(() => {
    const map = {};

    data.forEach((row) => {
      if (
        row &&
        row.level === 0 &&
        row.snapshot_id != null &&
        row.underlying_id != null
      ) {
        const key = String(row.snapshot_id);
        if (!map[key]) {
          map[key] = [];
        }
        if (!map[key].includes(row.underlying_id)) {
          map[key].push(row.underlying_id);
        }
      }
    });

    return map;
  }, [data]);

  // ========= SELECCIÓN =========
  const handleRowSelect = (row) => {
    if (!isEditing) {
      console.log('Fila seleccionada:', row);
      setSelectedRow(row);

      if (row.level === 0) {
        console.log('⚠️ Los registros padres no son editables (solo IDs/fecha)');
      }
    }
  };

  // ========= EDICIÓN INLINE =========
  const handleEdit = () => {
    if (selectedRow) {
      setIsEditing(true);
    }
  };

  const handleSave = async (updatedData) => {
    console.log('💾 Iniciando guardado con datos:', updatedData);

    try {
      const success = await TreeTableService.updateRow(updatedData, dbServer);

      if (success) {
        console.log('✅ Guardado exitoso, recargando datos...');
        setIsEditing(false);
        setSelectedRow(null);
        setTimeout(() => {
          loadData();
        }, 500);
      } else {
        console.log('❌ Falló el guardado - Manteniendo modo edición');
      }
    } catch (error) {
      console.error('💥 Error en handleSave:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedRow(null);
  };

  // ========= LLAMADA GENÉRICA AL BACK (Create/Delete) =========
const callBackend = async (processType, body) => {
    const params = new URLSearchParams({
      ProcessType: processType,
      dbServer: dbServer, // <--- USAR ESTADO, NO HARDCODE
      User: 'Admin'
    });

    if (body.snapshot_id) params.append('snapshot_id', body.snapshot_id);
    if (body.underlying_id) params.append('underlying_id', body.underlying_id);
    if (body.item_id) params.append('id', body.item_id); // Para DeleteItemAzure

    const url = `${BASE_URL}?${params.toString()}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Error HTTP ${resp.status}: ${text}`);
    }

    const json = await resp.json();
    return json.value || json;
  };



  // ========= OPCIONES PARA COMBOS (CREATE) =========
  const snapshotOptions = [
    ...new Set(data.map((r) => r.snapshot_id).filter(Boolean))
  ];
  // underlyingOptions: viene de Instruments (ib_conid) para PADRES

  // ========= CREATE: ABRIR / CERRAR =========
  const handleOpenCreateDialog = () => {
    setCreateType('parent');
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  // ========= CREATE: CONFIRMAR (Padre / Hijo) =========
  const handleConfirmCreate = async (payload) => {
    try {
      if (payload.createType === 'parent') {
        const { snapshot } = payload;

        await callBackend('CreateSnapshot', {
          snapshot_id: Number(snapshot.snapshot_id),
          underlying_id: Number(snapshot.underlying_id),
          ts: snapshot.ts
        });
      }

      if (payload.createType === 'child') {
        const { item } = payload;

        await callBackend('CreateSnapshotItem', {
          snapshot_id: Number(item.snapshot_id),
          option_id: Number(item.option_id),
          strike: item.strike ? Number(item.strike) : undefined,
          right: item.right, // 'C' / 'P' desde la modal
          expiration: item.expiration || undefined,
          bid: item.bid ? Number(item.bid) : undefined,
          ask: item.ask ? Number(item.ask) : undefined,
          iv: item.iv ? Number(item.iv) : undefined,
          delta: item.delta ? Number(item.delta) : undefined,
          gamma: item.gamma ? Number(item.gamma) : undefined,
          theta: item.theta ? Number(item.theta) : undefined,
          vega: item.vega ? Number(item.vega) : undefined
        });
      }

      await loadData();
      setCreateDialogOpen(false);
    } catch (err) {
      console.error('Error creando snapshot / item:', err);
    }
  };

  // ========= DELETE: CLICK EN BOTÓN BORRAR =========
  const handleDeleteClick = () => {
    if (!selectedRow) {
      console.warn('No hay fila seleccionada para borrar');
      return;
    }

    if (!isEditing) {
      if (selectedRow.level === 0) {
        // PADRE
        setParentToDelete(selectedRow);
        setDeleteDialogOpen(true);
      } else if (selectedRow.level === 1) {
        // HIJO
        setChildToDelete(selectedRow);
        setDeleteItemDialogOpen(true);
      }
    }
  };

  // ====== DELETE PADRE ======
  const handleCancelDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setParentToDelete(null);
  };

  const handleConfirmDeleteParent = async (parentRow) => {
    try {
      await callBackend('DeleteSnapshot', {
        snapshot_id: parentRow.snapshot_id,
        underlying_id: parentRow.underlying_id
      });

      await loadData();
      setSelectedRow(null);
    } catch (err) {
      console.error('Error al borrar snapshot padre:', err);
    } finally {
      setDeleteDialogOpen(false);
      setParentToDelete(null);
    }
  };

  // ====== DELETE HIJO ======
  const handleCancelDeleteItemDialog = () => {
    setDeleteItemDialogOpen(false);
    setChildToDelete(null);
  };

  const handleConfirmDeleteChild = async (childRow) => {
    try {
      await callBackend('DeleteSnapshotItem', {
        item_id: childRow.id
      });

      await loadData();
      setSelectedRow(null);
    } catch (err) {
      console.error('Error al borrar hijo:', err);
    } finally {
      setDeleteItemDialogOpen(false);
      setChildToDelete(null);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        background: '#f5f6f7'
      }}
    >
      <ShellBar
        primaryTitle="ChainOptions"
        secondaryTitle="Análisis de Cadena (Edición en Línea)"
        logo={<Icon name="chain-link" />}
        profile={<Icon name="customer" />}
      />

      <div style={{ flexGrow: 1, padding: '1rem', overflow: 'hidden' }}>
        <Card
          header={
            <CardHeader
              titleText="Estructura Organizacional"
              subtitleText="Vista de Árbol Detallada"
              avatar={<Icon name="table-view" />}
            />
          }
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* --- BARRA DE HERRAMIENTAS --- */}
          <FlexBox
            justifyContent={FlexBoxJustifyContent.SpaceBetween}
            alignItems={FlexBoxAlignItems.Center}
            style={{
              padding: '0.5rem 1rem',
              borderBottom: '1px solid #e5e5e5'
            }}
          >
            <FlexBox style={{ gap: '0.5rem' }}>
              {isEditing ? (
                <>
                  <Button
                    icon="save"
                    design="Emphasized"
                    onClick={() =>
                      document
                        .getElementById('btn-save-internal')
                        ?.click()
                    }
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
                  <Button
                    icon="add"
                    design="Emphasized"
                    onClick={handleOpenCreateDialog}
                  >
                    Agregar
                  </Button>
                  <Button
                    icon="edit"
                    disabled={!selectedRow}
                    onClick={handleEdit}
                    tooltip={
                      selectedRow?.level === 0
                        ? 'Editar Snapshot'
                        : 'Editar Opción'
                    }
                  >
                    Editar
                  </Button>
                  <Button
                    icon="delete"
                    design="Transparent"
                    style={{ color: selectedRow ? '#bb0000' : 'inherit' }}
                    disabled={!selectedRow}
                    onClick={handleDeleteClick}
                  >
                    Borrar
                  </Button>
                </>
              )}
            </FlexBox>

            <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: '0.5rem' }}>
                <Label>MongoDB</Label>
                <Switch 
                    design="Graphical" 
                    onChange={handleDbSwitch} 
                    checked={dbServer === 'AzureCosmos'}
                    disabled={isEditing} // Bloquear cambio mientras editas para evitar caos
                    tooltip="Cambiar entre Mongo Local y Azure Cloud"
                />
                <Label>Azure</Label>
            </FlexBox>

            <div style={{ width: '300px' }}>
              <Input
                icon={<Icon name="search" />}
                placeholder="Buscar..."
                disabled={isEditing}
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </FlexBox>

          {/* --- TABLA --- */}
          <div style={{ flexGrow: 1, overflow: 'hidden' }}>
            <TreeTable
              data={filteredData}
              loading={loading}
              onRowSelect={handleRowSelect}
              isEditing={isEditing}
              selectedRowId={selectedRow?.id}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        </Card>
      </div>

      {/* ====== MODAL CREATE (PADRE / HIJO) ====== */}
      <CreateChainDialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        onConfirm={handleConfirmCreate}
        createType={createType}
        setCreateType={setCreateType}
        snapshotOptions={snapshotOptions}
        underlyingOptions={underlyingOptions}      // para PADRE
        childUnderlyingMap={childUnderlyingMap}    // para filtrar UNDERLYING en HIJO
      />

      {/* ====== MODAL DELETE PADRE ====== */}
      <DeleteSnapshotDialog
        open={deleteDialogOpen}
        parentRow={parentToDelete}
        onCancel={handleCancelDeleteDialog}
        onConfirmDelete={handleConfirmDeleteParent}
      />

      {/* ====== MODAL DELETE HIJO ====== */}
      <DeleteItemDialog
        open={deleteItemDialogOpen}
        childRow={childToDelete}
        onCancel={handleCancelDeleteItemDialog}
        onConfirmDelete={handleConfirmDeleteChild}
      />
    </div>
  );
}
