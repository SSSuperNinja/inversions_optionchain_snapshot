import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AnalyticalTable, ObjectStatus, Input, Button } from '@ui5/webcomponents-react';
import '@ui5/webcomponents-icons/dist/AllIcons.js';

// Componente Input personalizado
const StableInput = React.memo(({ value, type, onChange, ...props }) => {
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (inputRef.current && value !== inputRef.current.value) {
      inputRef.current.value = value || '';
    }
  }, [value]);

  return (
    <Input
      ref={inputRef}
      type={type}
      value={value || ''}
      onChange={onChange}
      style={{ minWidth: "80px" }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      {...props}
    />
  );
});

export function TreeTable({ data, loading, onRowSelect, isEditing, selectedRowId, onSave, onCancel }) {

  // Ref para almacenar cambios - ÚNICA FUENTE DE VERDAD
  const editValuesRef = useRef({});

  // Estado para forzar rerender cuando hay cambios
  const [refresh, setRefresh] = useState(0);

  // Limpiar valores al salir de edición
  useEffect(() => {
    if (!isEditing) {
        editValuesRef.current = {};
        setRefresh(prev => prev + 1);
    }
  }, [isEditing]);

  // Manejador de cambios en Inputs - SIMPLIFICADO Y CORRECTO
  const handleInputChange = useCallback((e, accessor) => {
      const rawValue = e.target.value;
      
      // Para campos numéricos, convertir a número, mantener string para UI
      const isNumberField = ['strike', 'bid', 'ask', 'iv', 'delta', 'gamma', 'theta', 'vega'].includes(accessor);
      const storageValue = isNumberField ? (rawValue === '' ? null : parseFloat(rawValue)) : rawValue;
      
      console.log(`📝 Cambio en ${accessor}:`, { 
          rawValue, 
          storageValue,
          previous: editValuesRef.current[accessor] 
      });
      
      // Actualizar DIRECTAMENTE la ref
      editValuesRef.current[accessor] = storageValue;
      
      // Forzar rerender para mostrar cambios
      setRefresh(prev => prev + 1);
  }, []);

  // Helper: ¿Es esta celda editable?
  const isCellEditable = (rowId) => {
      return isEditing && rowId === selectedRowId;
  };

  // Obtener valor actual para display
  const getCurrentValue = (originalValue, accessor) => {
      return editValuesRef.current[accessor] !== undefined 
          ? editValuesRef.current[accessor] 
          : originalValue;
  };

  // --- PUENTE DE GUARDADO (TOOLBAR -> TABLA) ---
  const handleSaveTrigger = () => {
      if (onSave) {
          // Buscamos la fila original en los datos
          const findRow = (nodes) => {
              for (const node of nodes) {
                  if (node.id === selectedRowId) return node;
                  if (node.subRows) {
                      const found = findRow(node.subRows);
                      if (found) return found;
                  }
              }
              return null;
          };

          const originalRow = findRow(data);

          if (originalRow) {
              // Mezclamos: Original + Cambios de la ref
              const finalData = { 
                  ...originalRow, 
                  ...editValuesRef.current 
              };
              
              console.log("💾 Datos para guardar:", {
                  original: originalRow,
                  cambios: editValuesRef.current,
                  final: finalData
              });
              
              onSave(finalData);
          } else {
              console.error("❌ No se encontró la fila original para guardar");
          }
      }
  };

  // Función para renderizar inputs editables
  const renderEditableInput = (originalValue, accessor, type = "Text") => {
      const currentValue = getCurrentValue(originalValue, accessor);
      
      return (
          <StableInput 
              value={currentValue || ''}
              type={type}
              onChange={(e) => handleInputChange(e, accessor)}
          />
      );
  };

  // Columnas - refresh como dependencia para actualizar valores
  const columns = useMemo(() => [
    {
      Header: 'ID Snapshot', 
      accessor: 'snapshot_id',
    },
    {
      Header: 'Underlying', 
      accessor: 'underlying_id',
    },
    {
      Header: 'Fecha', 
      accessor: 'ts',
      Cell: ({ cell }) => cell.value ? 
          <span style={{fontSize:'0.85rem'}}>{new Date(cell.value).toLocaleString()}</span> : ''
    },
    {
      Header: 'Strike', 
      accessor: 'strike', 
      hAlign: 'Center',
      Cell: ({ cell, row }) => {
          if (isCellEditable(row.original.id)) {
              return renderEditableInput(cell.value, 'strike', "Number");
          }
          return <span style={{fontWeight:'bold'}}>{cell.value}</span>
      }
    },
    {
      Header: 'Tipo', 
      accessor: 'type', 
      hAlign: 'Center',
      Cell: ({ cell }) => {
          if (!cell.value) return '';
          const state = cell.value === 'Call' ? "Success" : "Error";
          return <ObjectStatus state={state} inverted>{cell.value}</ObjectStatus>;
      }
    },
    {
      Header: 'Expira', 
      accessor: 'expiration',
      Cell: ({ cell }) => cell.value ? 
          <span style={{fontSize:'0.85rem'}}>{new Date(cell.value).toLocaleDateString()}</span> : ''
    },
    {
      Header: 'Bid', 
      accessor: 'bid', 
      hAlign: 'End',
      Cell: ({ cell, row }) => {
          if (isCellEditable(row.original.id)) {
              return renderEditableInput(cell.value, 'bid', "Number");
          }
          return <span style={{fontFamily:'monospace', color:'#2b7c2b'}}>{cell.value}</span>
      }
    },
    {
      Header: 'Ask', 
      accessor: 'ask', 
      hAlign: 'End',
      Cell: ({ cell, row }) => {
          if (isCellEditable(row.original.id)) {
              return renderEditableInput(cell.value, 'ask', "Number");
          }
          return <span style={{fontFamily:'monospace', color:'#bb0000'}}>{cell.value}</span>
      }
    },
    { 
      Header: 'IV %', 
      accessor: 'iv', 
      hAlign: 'End', 
      Cell: ({ cell, row }) => isCellEditable(row.original.id) 
          ? renderEditableInput(cell.value, 'iv', "Number")
          : cell.value 
    },
    { 
      Header: 'Delta', 
      accessor: 'delta', 
      hAlign: 'End', 
      Cell: ({ cell, row }) => isCellEditable(row.original.id) 
          ? renderEditableInput(cell.value, 'delta', "Number")
          : <span style={{color:'#0056b3'}}>{cell.value}</span> 
    },
    { 
      Header: 'Gamma', 
      accessor: 'gamma', 
      hAlign: 'End', 
      Cell: ({ cell, row }) => isCellEditable(row.original.id) 
          ? renderEditableInput(cell.value, 'gamma', "Number")
          : cell.value 
    },
    { 
      Header: 'Theta', 
      accessor: 'theta', 
      hAlign: 'End', 
      Cell: ({ cell, row }) => isCellEditable(row.original.id) 
          ? renderEditableInput(cell.value, 'theta', "Number")
          : cell.value 
    },
    { 
      Header: 'Vega', 
      accessor: 'vega', 
      hAlign: 'End', 
      Cell: ({ cell, row }) => isCellEditable(row.original.id) 
          ? renderEditableInput(cell.value, 'vega', "Number")
          : cell.value 
    },
  ], [isEditing, selectedRowId, refresh, handleInputChange]); // refresh como dependencia

  return (
    <>
        {/* Botón oculto para conectar Toolbar con Tabla */}
        <button id="btn-save-internal" style={{display:'none'}} onClick={handleSaveTrigger}></button>

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
            selectionMode="Single"
            onRowClick={(e) => {
                if (onRowSelect && (!isEditing || e.detail.row.original.id === selectedRowId)) {
                    onRowSelect(e.detail.row.original);
                }
            }}
            style={{ height: "100%", width: "100%" }}
        />
    </>
  );
}