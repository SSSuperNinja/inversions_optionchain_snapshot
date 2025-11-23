import React from 'react';
import { AnalyticalTable, ObjectStatus } from '@ui5/webcomponents-react';
import '@ui5/webcomponents-icons/dist/AllIcons.js';

export function TreeTable({ data, loading }) {

  const columns = [
    // --- GRUPO 1: JERARQUÍA (Padre) ---
    {
      Header: 'ID Snapshot',
      accessor: 'snapshot_id',
      // Sin width fijo -> Flexible
    },
    {
      Header: 'Underlying',
      accessor: 'underlying_id',
      // Sin width fijo -> Flexible
    },
    {
      Header: 'Fecha',
      accessor: 'ts',
      // Sin width fijo -> Flexible
      Cell: ({ cell }) => {
        if (!cell.value) return '';
        const date = new Date(cell.value);
        return <span style={{fontSize: '0.85rem'}}>{date.toLocaleString()}</span>;
      }
    },

    // --- GRUPO 2: CONTRATO (Hijo) ---
    {
      Header: 'Strike',
      accessor: 'strike', 
      hAlign: 'Center',
      Cell: ({ cell }) => <span style={{fontWeight:'bold'}}>{cell.value}</span>
    },
    {
      Header: 'Tipo',
      accessor: 'type',
      hAlign: 'Center',
      Cell: ({ cell }) => {
          if (!cell.value) return '';
          // Usamos "Success" (Verde) para Call y "Error" (Rojo) para Put
          const state = cell.value === 'Call' ? "Success" : "Error";
          return <ObjectStatus state={state} inverted>{cell.value}</ObjectStatus>;
      }
    },
    {
      Header: 'Expira',
      accessor: 'expiration',
      Cell: ({ cell }) => {
          if (!cell.value) return '';
          return <span style={{fontSize: '0.85rem'}}>{new Date(cell.value).toLocaleDateString()}</span>;
      }
    },

    // --- GRUPO 3: PRECIOS ---
    {
      Header: 'Bid',
      accessor: 'bid',
      hAlign: 'End',
      Cell: ({ cell }) => <span style={{fontFamily:'monospace', color:'#2b7c2b'}}>{cell.value}</span>
    },
    {
      Header: 'Ask',
      accessor: 'ask',
      hAlign: 'End',
      Cell: ({ cell }) => <span style={{fontFamily:'monospace', color:'#bb0000'}}>{cell.value}</span>
    },
    {
        Header: 'IV %',
        accessor: 'iv',
        hAlign: 'End',
    },

    // --- GRUPO 4: RIESGO (Griegas) ---
    {
        Header: 'Delta',
        accessor: 'delta',
        hAlign: 'End',
        Cell: ({ cell }) => <span style={{color: '#0056b3'}}>{cell.value}</span>
    },
    {
        Header: 'Gamma',
        accessor: 'gamma',
        hAlign: 'End',
    },
    {
        Header: 'Theta',
        accessor: 'theta',
        hAlign: 'End',
    },
    {
        Header: 'Vega',
        accessor: 'vega',
        hAlign: 'End',
    }
  ];

  return (
    <AnalyticalTable
      data={data}
      columns={columns}
      loading={loading}
      isTreeTable={true}
      subRowsKey="subRows"
      
      // scaleWidthMode="Grow" es la clave: reparte el espacio sobrante equitativamente
      scaleWidthMode="Grow" 
      minRows={1}
      visibleRows={15}
      
      filterable
      sortable
      selectionMode="Single"
      
      header={<div style={{ padding: '0.5rem 1rem', fontWeight: 700 }}>OptionChain Snapshots</div>}
      style={{ height: "100%", width: "100%"}}
    />
  );
}