// src/App.jsx
import React, { useState, useEffect } from 'react';
import {
  ShellBar,
  Card,
  CardHeader,
  Icon,
  Button,
  Input,
  FlexBox,
  FlexBoxJustifyContent,
  FlexBoxAlignItems
} from '@ui5/webcomponents-react';
import '@ui5/webcomponents-icons/dist/AllIcons.js';

import { TreeTableService } from './services/TreeTableService';
import { TreeTable } from './components/TreeTable';
import CreateChainDialog from './components/CreateChainDialog';
import DeleteSnapshotDialog from './components/DeleteSnapshotDialog';
import DeleteItemDialog from './components/DeleteItemDialog';

const BASE_URL = 'http://localhost:4004/api/chain/snapshot/crud';

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);

  // ====== CREATE (Padre / Hijo) ======
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState('parent');

  // ====== DELETE PADRE ======
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [parentToDelete, setParentToDelete] = useState(null);

  // ====== DELETE HIJO ======
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [childToDelete, setChildToDelete] = useState(null);

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

  const handleRowSelect = (row) => {
    setSelectedRow(row);
  };

  // ========= LLAMADA GENÉRICA AL BACK =========
  const callBackend = async (processType, body) => {
    const params = new URLSearchParams({
      ProcessType: processType,
      dbServer: 'MongoDB',
      User: 'Admin'
    });

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
  const snapshotOptions = [...new Set(data.map((r) => r.snapshot_id).filter(Boolean))];
  const underlyingOptions = [...new Set(data.map((r) => r.underlying_id).filter(Boolean))];

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
          right: item.right, // ya viene convertido a 'C'/'P' en la modal
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

    if (selectedRow.level === 0) {
      // PADRE
      setParentToDelete(selectedRow);
      setDeleteDialogOpen(true);
    } else if (selectedRow.level === 1) {
      // HIJO
      setChildToDelete(selectedRow);
      setDeleteItemDialogOpen(true);
    }
  };

  // ====== HANDLERS PADRE ======
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

  // ====== HANDLERS HIJO ======
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
        secondaryTitle="Análisis de Cadena (Vista Completa)"
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
              <Button icon="add" design="Emphasized" onClick={handleOpenCreateDialog}>
                Agregar
              </Button>

              <Button
                icon="delete"
                design="Transparent"
                style={{ color: '#bb0000' }}
                onClick={handleDeleteClick}
              >
                Borrar
              </Button>
            </FlexBox>

            <div style={{ width: '300px' }}>
              <Input icon={<Icon name="search" />} placeholder="Buscar..." />
            </div>
          </FlexBox>

          {/* --- TABLA --- */}
          <div style={{ flexGrow: 1, overflow: 'hidden' }}>
            <TreeTable data={data} loading={loading} onRowSelect={handleRowSelect} />
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
        underlyingOptions={underlyingOptions}
      />

      {/* ====== MODAL DELETE PADRE (2 pasos) ====== */}
      <DeleteSnapshotDialog
        open={deleteDialogOpen}
        parentRow={parentToDelete}
        onCancel={handleCancelDeleteDialog}
        onConfirmDelete={handleConfirmDeleteParent}
      />

      {/* ====== MODAL DELETE HIJO (confirmación final) ====== */}
      <DeleteItemDialog
        open={deleteItemDialogOpen}
        childRow={childToDelete}
        onCancel={handleCancelDeleteItemDialog}
        onConfirmDelete={handleConfirmDeleteChild}
      />
    </div>
  );
}
