import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AnalyticalTable, ObjectStatus, Input, Button } from '@ui5/webcomponents-react';
import '@ui5/webcomponents-icons/dist/AllIcons.js';

// Componente Input personalizado MEJORADO
const StableInput = React.memo(({ value, type, onChange, ...props }) => {
  const inputRef = useRef(null);
  
  // Convertir valor a string para el input (UI5 espera string)
  const stringValue = value != null ? String(value) : '';
  
  useEffect(() => {
    if (inputRef.current && stringValue !== inputRef.current.value) {
      inputRef.current.value = stringValue;
    }
  }, [stringValue]);

  return (
    <Input
      ref={inputRef}
      type={type}
      value={stringValue}
      onChange={onChange}
      style={{ 
        width: "100%", // OCUPAR TODO EL ANCHO
        minWidth: "80px",
        textAlign: "center" // CENTRAR EL TEXTO DENTRO DEL INPUT
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      {...props}
    />
  );
});
// El componente principal - CON EXPORTACIÓN POR DEFECTO
const TreeTable = ({ data, loading, onRowSelect, isEditing, selectedRowId, onSave, onCancel }) => {

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

  // Manejador de cambios en Inputs - CON CONVERSIÓN CORRECTA DE TIPOS
  const handleInputChange = useCallback((e, accessor) => {
    const rawValue = e.target.value;
    
    // Definir qué campos son numéricos (IDs y campos financieros)
    const numericFields = [
      'snapshot_id', 'underlying_id', 'option_id',
      'strike', 'bid', 'ask', 'iv', 'delta', 'gamma', 'theta', 'vega'
    ];
    
    let storageValue;
    
    if (numericFields.includes(accessor)) {
        // Para campos numéricos, convertir a número
        storageValue = rawValue === '' ? null : Number(rawValue);
        
        // Validar que sea un número válido
        if (isNaN(storageValue)) {
            storageValue = rawValue; // Mantener como string si no es número válido
        }
    } else {
        storageValue = rawValue;
    }
    
    console.log(`📝 Cambio en ${accessor}:`, { 
        rawValue, 
        storageValue,
        previous: editValuesRef.current[accessor],
        type: typeof storageValue
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
// En TreeTable.jsx, modifica el handleSaveTrigger:

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
                ...editValuesRef.current,
                // Guardar los IDs originales para referencia
                _originalSnapshotId: originalRow.snapshot_id,
                _originalOptionId: originalRow.option_id,
                _originalUnderlyingId: originalRow.underlying_id
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

// Función para renderizar inputs editables - VERSIÓN CENTRADA
const renderEditableInput = (originalValue, accessor, type = "Text") => {
    const currentValue = getCurrentValue(originalValue, accessor);
    
    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            width: '100%'
        }}>
            <StableInput 
                value={currentValue || ''}
                type={type}
                onChange={(e) => handleInputChange(e, accessor)}
                style={{
                    width: '90%', // Un poco menos del 100% para mejor visual
                    textAlign: 'center'
                }}
            />
        </div>
    );
};

  // Columnas - refresh como dependencia para actualizar valores
  const columns = useMemo(() => {
    // COLUMNAS EN EL ORDEN CORRECTO:
    
    // 1. IDs (primero)
    const idColumns = [
      {
        Header: 'ID Snapshot', 
        accessor: 'snapshot_id',
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
          // Mostrar solo para padres O para hijos en modo edición
          const shouldShow = row.original.level === 0 || isCellEditable(row.original.id);
          
          if (!shouldShow) return '';
          
          if (isCellEditable(row.original.id)) {
            return renderEditableInput(cell.value, 'snapshot_id', "Number");
          }
          return cell.value;
        }
      },
      {
        Header: ({ data }) => {
          // Header dinámico
          return 'Underlying/Option ID';
        },
        accessor: 'underlying_id',
        id: 'id_column',
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
          // Determinar qué ID mostrar
          const displayId = row.original.level === 0 ? row.original.underlying_id : row.original.option_id;
          
          // Mostrar solo para padres O para hijos en modo edición
          const shouldShow = row.original.level === 0 || isCellEditable(row.original.id);
          
          if (!shouldShow) return '';
          
          if (isCellEditable(row.original.id)) {
            const accessor = row.original.level === 0 ? 'underlying_id' : 'option_id';
            return renderEditableInput(displayId, accessor, "Number");
          }
          return displayId;
        }
      }
    ];

    // 2. Fecha (segundo)
    const dateColumn = [
      {
        Header: 'Fecha', 
        accessor: 'ts',
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
          return cell.value ? 
            <span style={{fontSize:'0.85rem'}}>{new Date(cell.value).toLocaleString()}</span> : '';
        }
      }
    ];

    // 3. Columnas financieras (tercero en adelante)
    const financialColumns = [
      {
        Header: 'Strike', 
        accessor: 'strike', 
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            
            if (isCellEditable(row.original.id)) {
                return (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {renderEditableInput(cell.value, 'strike', "Number")}
                  </div>
                );
            }
            return <span style={{fontWeight:'bold'}}>{cell.value}</span>;
        }
      },
      {
        Header: 'Tipo', 
        accessor: 'type', 
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
            // Para padres, no mostrar tipo
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            
            if (!cell.value) return '';
            const state = cell.value === 'Call' ? "Success" : "Error";
            return <ObjectStatus state={state} inverted>{cell.value}</ObjectStatus>;
        }
      },
      {
        Header: 'Expira', 
        accessor: 'expiration',
        Cell: ({ cell, row }) => {
            // Para padres, no mostrar expiración
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            
            return cell.value ? 
              <span style={{fontSize:'0.85rem'}}>{new Date(cell.value).toLocaleDateString()}</span> : '';
        }
      },
      {
        Header: 'Bid', 
        accessor: 'bid', 
        hAlign: 'End',
        Cell: ({ cell, row }) => {
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            
            if (isCellEditable(row.original.id)) {
                return (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {renderEditableInput(cell.value, 'bid', "Number")}
                  </div>
                );
            }
            return <span style={{fontFamily:'monospace', color:'#2b7c2b'}}>{cell.value}</span>;
        }
      },
      {
        Header: 'Ask', 
        accessor: 'ask', 
        hAlign: 'End',
        Cell: ({ cell, row }) => {
            // Para padres, no mostrar ask
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            
            if (isCellEditable(row.original.id)) {
                return renderEditableInput(cell.value, 'ask', "Number");
            }
            return <span style={{fontFamily:'monospace', color:'#bb0000'}}>{cell.value}</span>;
        }
      },
      { 
        Header: 'IV %', 
        accessor: 'iv', 
        hAlign: 'End', 
        Cell: ({ cell, row }) => {
            // Para padres, no mostrar IV
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            
            return isCellEditable(row.original.id) 
              ? renderEditableInput(cell.value, 'iv', "Number")
              : cell.value;
        }
      },
      { 
        Header: 'Delta', 
        accessor: 'delta', 
        hAlign: 'End', 
        Cell: ({ cell, row }) => {
            // Para padres, no mostrar delta
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            
            return isCellEditable(row.original.id) 
              ? renderEditableInput(cell.value, 'delta', "Number")
              : <span style={{color:'#0056b3'}}>{cell.value}</span>;
        }
      },
      { 
        Header: 'Gamma', 
        accessor: 'gamma', 
        hAlign: 'End', 
        Cell: ({ cell, row }) => {
            // Para padres, no mostrar gamma
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            
            return isCellEditable(row.original.id) 
              ? renderEditableInput(cell.value, 'gamma', "Number")
              : cell.value;
        }
      },
      { 
        Header: 'Theta', 
        accessor: 'theta', 
        hAlign: 'End', 
        Cell: ({ cell, row }) => {
            // Para padres, no mostrar theta
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            
            return isCellEditable(row.original.id) 
              ? renderEditableInput(cell.value, 'theta', "Number")
              : cell.value;
        }
      },
      { 
        Header: 'Vega', 
        accessor: 'vega', 
        hAlign: 'End', 
        Cell: ({ cell, row }) => {
            // Para padres, no mostrar vega
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            
            return isCellEditable(row.original.id) 
              ? renderEditableInput(cell.value, 'vega', "Number")
              : cell.value;
        }
      }
    ];

    // ORDEN FINAL: IDs -> Fecha -> Campos financieros
    return [...idColumns, ...dateColumn, ...financialColumns];
  }, [isEditing, selectedRowId, refresh, handleInputChange]);

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
};

// EXPORTACIÓN POR DEFECTO - ESTA ES LA LÍNEA CLAVE
export default TreeTable;