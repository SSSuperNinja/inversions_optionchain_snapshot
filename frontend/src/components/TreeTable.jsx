// src/components/TreeTable.jsx
import React from 'react';
import { AnalyticalTable, ObjectStatus } from '@ui5/webcomponents-react';
import '@ui5/webcomponents-icons/dist/AllIcons.js';

export function TreeTable({ data, loading, onRowSelect }) {
  const columns = [
    // --- GRUPO 1: JERARQUÍA (Padre) ---
    {
      Header: 'ID Snapshot',
      accessor: 'snapshot_id'
    },
    {
      Header: 'Underlying',
      accessor: 'underlying_id'
    },
    {
      Header: 'Fecha',
      accessor: 'ts',
      Cell: ({ cell }) => {
        if (!cell.value) return '';
        const date = new Date(cell.value);
        return <span style={{ fontSize: '0.85rem' }}>{date.toLocaleString()}</span>;
      }
    },

    // --- GRUPO 2: DETALLE HIJO ---
    {
      Header: 'Strike',
      accessor: 'strike',
      hAlign: 'End',
      Cell: ({ cell }) =>
        cell.value != null ? Number(cell.value).toFixed(2) : ''
    },
    {
      Header: 'Tipo',
      accessor: 'type',
      Cell: ({ cell }) => cell.value || ''
    },
    {
      Header: 'Expira',
      accessor: 'expiration',
      Cell: ({ cell }) => {
        if (!cell.value) return '';
        return (
          <span style={{ fontSize: '0.85rem' }}>
            {new Date(cell.value).toLocaleDateString()}
          </span>
        );
      }
    },

    // --- GRUPO 3: PRECIOS ---
    {
      Header: 'Bid',
      accessor: 'bid',
      hAlign: 'End',
      Cell: ({ cell }) =>
        cell.value != null ? String(cell.value) : ''
    },
    {
      Header: 'Ask',
      accessor: 'ask',
      hAlign: 'End',
      Cell: ({ cell }) =>
        cell.value != null ? String(cell.value) : ''
    },
    {
      Header: 'IV',
      accessor: 'iv',
      hAlign: 'End',
      Cell: ({ cell }) =>
        cell.value != null ? `${Number(cell.value).toFixed(2)} %` : ''
    },

    // --- GRUPO 4: GREEKS ---
    {
      Header: 'Δ Delta',
      accessor: 'delta',
      hAlign: 'End',
      Cell: ({ cell }) =>
        cell.value != null ? Number(cell.value).toFixed(4) : ''
    },
    {
      Header: 'Γ Gamma',
      accessor: 'gamma',
      hAlign: 'End',
      Cell: ({ cell }) =>
        cell.value != null ? Number(cell.value).toFixed(4) : ''
    },
    {
      Header: 'Θ Theta',
      accessor: 'theta',
      hAlign: 'End',
      Cell: ({ cell }) =>
        cell.value != null ? Number(cell.value).toFixed(4) : ''
    },
    {
      Header: 'V Vega',
      accessor: 'vega',
      hAlign: 'End',
      Cell: ({ cell }) =>
        cell.value != null ? Number(cell.value).toFixed(4) : ''
    },

    // --- ESTADO ---
    {
      Header: 'Estado',
      accessor: 'status',
      Cell: ({ cell }) => {
        const value = cell.value || 'OK';
        return (
          <ObjectStatus state="Success">
            {value}
          </ObjectStatus>
        );
      }
    }
  ];

  return (
    <AnalyticalTable
      data={data}
      columns={columns}
      loading={loading}
      isTreeTable={true}
      subRowsKey="subRows"
      scaleWidthMode="Grow"
      minRows={1}
      visibleRows={15}
      filterable
      sortable

      // 👈 modo de selección correcto
      selectionMode="SingleSelect"

      // 👈 disparar selección hacia App (soporta row o rows[0])
      onRowSelect={(e) => {
        const { row, rows } = e.detail || {};
        const pickedRow = row || (Array.isArray(rows) && rows[0]) || null;
        if (!pickedRow) return;

        const original = pickedRow.original || pickedRow;

        if (onRowSelect) {
          onRowSelect(original);
        }
      }}

      header={
        <div style={{ padding: '0.5rem 1rem', fontWeight: 700 }}>
          OptionChain Snapshots
        </div>
      }
      style={{ height: '100%', width: '100%' }}
    />
  );
}
