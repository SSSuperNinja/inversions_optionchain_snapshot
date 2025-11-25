// src/components/TreeTable.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  AnalyticalTable,
  ObjectStatus,
  Input
} from '@ui5/webcomponents-react';
import '@ui5/webcomponents-icons/dist/AllIcons.js';

export function TreeTable({
  data,
  loading,
  onRowSelect,
  isEditing,
  selectedRowId,
  onSave
}) {
  const [editingRow, setEditingRow] = useState(null);

  // Selecciona fila a editar
  useEffect(() => {
    if (isEditing && selectedRowId) {
      let found = null;
      for (const parent of data) {
        if (parent.id === selectedRowId) found = { ...parent };
        if (parent.subRows) {
          const sub = parent.subRows.find((x) => x.id === selectedRowId);
          if (sub) found = { ...sub };
        }
      }
      setEditingRow(found);
    } else {
      setEditingRow(null);
    }
  }, [isEditing, selectedRowId, data]);

  const handleChangeField = (field, value) => {
    setEditingRow((prev) => ({ ...prev, [field]: value }));
  };

  const handleInternalSave = () => {
    if (editingRow) onSave(editingRow);
  };

  const isEditingParent = (row) =>
    isEditing && row.id === selectedRowId && row.level === 0;

  const isEditingChild = (row) =>
    isEditing && row.id === selectedRowId && row.level === 1;

  const columns = useMemo(
    () => [
      {
        Header: 'ID Snapshot',
        accessor: 'snapshot_id',
        Cell: ({ cell }) => {
          const row = cell.row.original;
          if (isEditingParent(row)) {
            return (
              <Input
                value={editingRow?.snapshot_id ?? ''}
                onInput={(e) =>
                  handleChangeField('snapshot_id', e.target.value)
                }
              />
            );
          }
          return cell.value;
        }
      },
      {
        Header: 'Underlying',
        accessor: 'underlying_id',
        Cell: ({ cell }) => {
          const row = cell.row.original;
          if (isEditingParent(row)) {
            return (
              <Input
                value={editingRow?.underlying_id ?? ''}
                onInput={(e) =>
                  handleChangeField('underlying_id', e.target.value)
                }
              />
            );
          }
          return cell.value;
        }
      },
      {
        Header: 'Fecha',
        accessor: 'ts',
        Cell: ({ cell }) => {
          const row = cell.row.original;
          if (isEditingParent(row)) {
            return (
              <Input
                value={editingRow?.ts ?? ''}
                onInput={(e) =>
                  handleChangeField('ts', e.target.value)
                }
              />
            );
          }
          return new Date(cell.value).toLocaleString();
        }
      },

      // === CAMPOS DE HIJO ===
      {
        Header: 'Strike',
        accessor: 'strike',
        Cell: ({ cell }) => {
          const row = cell.row.original;
          if (isEditingChild(row)) {
            return (
              <Input
                value={editingRow?.strike ?? ''}
                onInput={(e) => handleChangeField('strike', e.target.value)}
              />
            );
          }
          return cell.value;
        }
      },

      {
        Header: 'Tipo',
        accessor: 'type',
        Cell: ({ cell }) => {
          const row = cell.row.original;
          if (isEditingChild(row)) {
            return (
              <Input
                value={editingRow?.right ?? editingRow?.type ?? ''}
                onInput={(e) => handleChangeField('right', e.target.value)}
              />
            );
          }
          return cell.value;
        }
      },

      {
        Header: 'Bid',
        accessor: 'bid',
        Cell: ({ cell }) => {
          const row = cell.row.original;
          if (isEditingChild(row)) {
            return (
              <Input
                value={editingRow?.bid ?? ''}
                onInput={(e) => handleChangeField('bid', e.target.value)}
              />
            );
          }
          return cell.value;
        }
      },

      {
        Header: 'Ask',
        accessor: 'ask',
        Cell: ({ cell }) => {
          const row = cell.row.original;
          if (isEditingChild(row)) {
            return (
              <Input
                value={editingRow?.ask ?? ''}
                onInput={(e) => handleChangeField('ask', e.target.value)}
              />
            );
          }
          return cell.value;
        }
      },

      {
        Header: 'Estado',
        accessor: 'status',
        Cell: ({ cell }) => (
          <ObjectStatus>{cell.value || 'OK'}</ObjectStatus>
        )
      }
    ],
    [editingRow, isEditing, selectedRowId]
  );

  return (
    <>
      <button
        id="btn-save-internal"
        style={{ display: 'none' }}
        onClick={handleInternalSave}
      />

      <AnalyticalTable
        data={data}
        columns={columns}
        loading={loading}
        selectionMode="SingleSelect"
        isTreeTable
        subRowsKey="subRows"
        onRowClick={(e) => onRowSelect?.(e.detail.row.original)}
      />
    </>
  );
}
