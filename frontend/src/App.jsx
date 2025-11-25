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
  FlexBoxAlignItems
} from '@ui5/webcomponents-react';

import { TreeTableService } from './services/TreeTableService';
import { TreeTable } from './components/TreeTable';

import CreateChainDialog from './components/CreateChainDialog';
import DeleteSnapshotDialog from './components/DeleteSnapshotDialog';
import DeleteItemDialog from './components/DeleteItemDialog';

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRow, setSelectedRow] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState('parent');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [parentToDelete, setParentToDelete] = useState(null);

  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [childToDelete, setChildToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const result = await TreeTableService.getHierarchy();
    setData(result || []);
    setLoading(false);
  };

  const handleRowSelect = (row) => {
    if (isEditing) return;
    setSelectedRow(row);
  };

  const handleSearch = (e) =>
    setSearchTerm(e.target.value ?? e.detail?.value ?? '');

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();

    return data
      .map((parent) => {
        const matchParent =
          parent.snapshot_id?.toString().includes(q) ||
          parent.underlying_id?.toString().includes(q);

        const childMatches = parent.subRows?.filter((x) =>
          [
            x.option_id,
            x.strike,
            x.bid,
            x.ask,
            x.iv,
            x.right
          ]
            .map((v) => String(v || '').toLowerCase())
            .some((v) => v.includes(q))
        );

        if (matchParent || (childMatches && childMatches.length)) {
          return {
            ...parent,
            subRows: matchParent ? parent.subRows : childMatches
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [data, searchTerm]);

  // =================== CREAR ===================
  const handleAdd = () => setCreateDialogOpen(true);

  const handleConfirmCreate = async (payload) => {
    if (payload.createType === 'parent')
      await TreeTableService.createSnapshot(payload.snapshot);
    else await TreeTableService.createItem(payload.item);

    await loadData();
    setCreateDialogOpen(false);
  };

  // =================== ELIMINAR ===================
  const handleDelete = () => {
    if (!selectedRow) return;

    if (selectedRow.level === 0) {
      setParentToDelete(selectedRow);
      setDeleteDialogOpen(true);
    } else {
      setChildToDelete(selectedRow);
      setDeleteItemDialogOpen(true);
    }
  };

  const handleConfirmDeleteParent = async (row) => {
    await TreeTableService.deleteSnapshot(row.snapshot_id, row.underlying_id);
    await loadData();
    setDeleteDialogOpen(false);
  };

  const handleConfirmDeleteChild = async (row) => {
    await TreeTableService.deleteItem(row.id);
    await loadData();
    setDeleteItemDialogOpen(false);
  };

  // =================== EDITAR ===================
  const handleEdit = () => {
    if (!selectedRow) return;
    setIsEditing(true);
  };

  const handleSave = async (row) => {
    const ok = await TreeTableService.updateRow(row);
    if (ok) {
      setIsEditing(false);
      setSelectedRow(null);
      await loadData();
    }
  };

  const handleCancelEdit = () => setIsEditing(false);

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <ShellBar primaryTitle="ChainOptions" />

      <div style={{ padding: '1rem', height: '100%' }}>
        <Card
          header={
            <CardHeader
              titleText="Snapshots & Options"
              avatar={<Icon name="table-view" />}
            />
          }
          style={{ height: '100%' }}
        >
          <FlexBox
            justifyContent={FlexBoxJustifyContent.SpaceBetween}
            alignItems={FlexBoxAlignItems.Center}
            style={{
              padding: '0.5rem',
              borderBottom: '1px solid #ccc'
            }}
          >
            <FlexBox style={{ gap: '0.5rem' }}>
              {isEditing ? (
                <>
                  <Button
                    design="Emphasized"
                    icon="save"
                    onClick={() =>
                      document.getElementById('btn-save-internal').click()
                    }
                  >
                    Guardar
                  </Button>

                  <Button
                    icon="cancel"
                    design="Transparent"
                    onClick={handleCancelEdit}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button icon="add" design="Emphasized" onClick={handleAdd}>
                    Crear
                  </Button>

                  <Button
                    icon="edit"
                    disabled={!selectedRow}
                    onClick={handleEdit}
                  >
                    Editar
                  </Button>

                  <Button
                    icon="delete"
                    design="Transparent"
                    onClick={handleDelete}
                    disabled={!selectedRow}
                  >
                    Borrar
                  </Button>
                </>
              )}
            </FlexBox>

            <Input
              style={{ width: '250px' }}
              placeholder="Buscar..."
              value={searchTerm}
              onInput={handleSearch}
            />
          </FlexBox>

          <div style={{ height: 'calc(100% - 80px)' }}>
            <TreeTable
              data={filteredData}
              loading={loading}
              onRowSelect={handleRowSelect}
              isEditing={isEditing}
              selectedRowId={selectedRow?.id || null}
              onSave={handleSave}
            />
          </div>
        </Card>
      </div>

      <CreateChainDialog
        open={createDialogOpen}
        onConfirm={handleConfirmCreate}
        onClose={() => setCreateDialogOpen(false)}
        createType={createType}
        setCreateType={setCreateType}
        snapshotOptions={[...new Set(data.map((x) => x.snapshot_id))]}
        underlyingOptions={[...new Set(data.map((x) => x.underlying_id))]}
      />

      <DeleteSnapshotDialog
        open={deleteDialogOpen}
        parentRow={parentToDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirmDelete={handleConfirmDeleteParent}
      />

      <DeleteItemDialog
        open={deleteItemDialogOpen}
        childRow={childToDelete}
        onCancel={() => setDeleteItemDialogOpen(false)}
        onConfirmDelete={handleConfirmDeleteChild}
      />
    </div>
  );
}
