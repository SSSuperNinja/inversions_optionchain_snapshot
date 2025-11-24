import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  AnalyticalTable, 
  ObjectStatus, 
  Input, 
  Button, 
  ComboBox, 
  ComboBoxItem, 
  DatePicker 
} from '@ui5/webcomponents-react';
import '@ui5/webcomponents-icons/dist/AllIcons.js';

// Componente Input personalizado MEJORADO
const StableInput = React.memo(({ value, type, onChange, ...props }) => {
  const inputRef = useRef(null);
  
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
        width: "100%",
        minWidth: "80px",
        textAlign: "center"
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      {...props}
    />
  );
});

// VERSIÓN ALTERNATIVA - ComboBox con estado interno
// Componente ComboBox para Tipo - VERSIÓN MEJORADA CON PLACEHOLDER
const TypeComboBox = React.memo(({ value, onChange }) => {
  const comboRef = useRef(null);

  // Efecto para sincronizar el valor cuando cambia
  useEffect(() => {
    if (comboRef.current) {
      const displayValue = value === 'C' ? 'Call' : value === 'P' ? 'Put' : '';
      comboRef.current.value = displayValue;
    }
  }, [value]);

  const handleChange = (e) => {
    const selectedText = e.target.value;
    console.log('ComboBox seleccionado:', selectedText);
    
    // Convertir a valor interno
    const internalValue = selectedText === 'Call' ? 'C' : 
                         selectedText === 'Put' ? 'P' : '';
    
    if (onChange && internalValue) {
      onChange(internalValue);
    }
  };

  // Determinar el texto a mostrar basado en el valor actual
  const getDisplayValue = () => {
    if (value === 'C') return 'Call';
    if (value === 'P') return 'Put';
    return ''; // Vacío si no hay valor
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <ComboBox
        ref={comboRef}
        value={getDisplayValue()}
        onChange={handleChange}
        style={{ width: '90%', textAlign: 'center' }}
        placeholder={getDisplayValue() || "Seleccionar tipo..."}
      >
        <ComboBoxItem text="Call" />
        <ComboBoxItem text="Put" />
      </ComboBox>
    </div>
  );
});

// NUEVO: Componente DatePicker para Expiración - CORREGIDO
const ExpirationDatePicker = React.memo(({ value, onChange }) => {
  const [internalValue, setInternalValue] = useState('');

  // Sincronizar cuando el valor externo cambia
  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          // Formatear para UI5 DatePicker (YYYY-MM-DD)
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;
          setInternalValue(formattedDate);
        }
      } catch (error) {
        console.error('Error parsing date:', error);
      }
    }
  }, [value]);

  const handleChange = (e) => {
    // UI5 DatePicker devuelve la fecha en formato "Dec 25, 2026"
    // Necesitamos convertirla a un formato que podamos usar
    const rawDate = e.target.value;
    console.log('DatePicker cambio (raw):', rawDate);
    
    if (rawDate) {
      try {
        // CORRECCIÓN: Usar el formato de UI5 directamente
        // UI5 usa el formato del navegador, pero podemos usar new Date()
        const date = new Date(rawDate);
        if (!isNaN(date.getTime())) {
          // Convertir a formato ISO con hora fija
          const isoDate = new Date(Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            10, 0, 0, 0
          )).toISOString();
          
          console.log('DatePicker cambio (ISO):', isoDate);
          
          if (onChange) {
            onChange(isoDate);
          }
        } else {
          throw new Error('Fecha inválida');
        }
      } catch (error) {
        console.error('Error creating ISO date:', error);
        if (onChange) {
          onChange(null);
        }
      }
    } else {
      if (onChange) {
        onChange(null);
      }
    }
  };

  // Obtener placeholder
  const getPlaceholder = () => {
    if (value) {
      try {
        const date = new Date(value);
        return !isNaN(date.getTime()) ? date.toLocaleDateString() : "Seleccionar fecha...";
      } catch {
        return "Seleccionar fecha...";
      }
    }
    return "Seleccionar fecha...";
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <DatePicker
        value={internalValue}
        onChange={handleChange}
        style={{ width: '90%' }}
        placeholder={getPlaceholder()}
      />
    </div>
  );
});
const TreeTable = ({ data, loading, onRowSelect, isEditing, selectedRowId, onSave, onCancel }) => {
  const editValuesRef = useRef({});
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!isEditing) {
        editValuesRef.current = {};
        setRefresh(prev => prev + 1);
    }
  }, [isEditing]);

  // Manejador de cambios en Inputs
  const handleInputChange = useCallback((e, accessor) => {
    const rawValue = e.target.value;
    
    const numericFields = [
      'snapshot_id', 'underlying_id', 'option_id',
      'strike', 'bid', 'ask', 'iv', 'delta', 'gamma', 'theta', 'vega'
    ];
    
    let storageValue;
    
    if (numericFields.includes(accessor)) {
        storageValue = rawValue === '' ? null : Number(rawValue);
        if (isNaN(storageValue)) {
            storageValue = rawValue;
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
    
    editValuesRef.current[accessor] = storageValue;
    setRefresh(prev => prev + 1);
  }, []);

// EN EL TreeTable PRINCIPAL - Asegurar que los handlers se creen correctamente
const handleTypeChange = useCallback((newValue, accessor) => {
  console.log(`📝 Cambio en ${accessor}:`, newValue);
  
  editValuesRef.current[accessor] = newValue;
  setRefresh(prev => prev + 1);
}, []);

// NUEVO: Manejador para DatePicker (Expiration) - SIMPLIFICADO  
const handleDateChange = useCallback((newValue, accessor) => {
  console.log(`📝 Cambio en ${accessor}:`, newValue);
  
  editValuesRef.current[accessor] = newValue;
  setRefresh(prev => prev + 1);
}, []);

  const isCellEditable = (rowId) => {
      return isEditing && rowId === selectedRowId;
  };

  const getCurrentValue = (originalValue, accessor) => {
      return editValuesRef.current[accessor] !== undefined 
          ? editValuesRef.current[accessor] 
          : originalValue;
  };

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
          // CORRECCIÓN: Mezclar correctamente los datos
          // Asegurarnos de que TODOS los campos de editValuesRef.current se incluyan
          const finalData = { 
              ...originalRow,
              ...editValuesRef.current, // ESTA LÍNEA ES CLAVE - debe ir después de originalRow
          };
          
          console.log("💾 Datos para guardar - VERIFICACIÓN COMPLETA:", {
              original: originalRow,
              cambios: editValuesRef.current,
              final: finalData,
              // Verificación específica del campo type
              tieneTypeEnCambios: 'type' in editValuesRef.current,
              typeEnCambios: editValuesRef.current.type,
              typeEnFinal: finalData.type
          });
          
          onSave(finalData);
      } else {
          console.error("❌ No se encontró la fila original para guardar");
      }
  }
};

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
                      width: '90%',
                      textAlign: 'center'
                  }}
              />
          </div>
      );
  };

  const columns = useMemo(() => {
    const idColumns = [
      {
        Header: 'ID Snapshot', 
        accessor: 'snapshot_id',
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
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
          return 'Underlying/Option ID';
        },
        accessor: 'underlying_id',
        id: 'id_column',
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
          const displayId = row.original.level === 0 ? row.original.underlying_id : row.original.option_id;
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

    const financialColumns = [
      {
        Header: 'Strike', 
        accessor: 'strike', 
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            if (isCellEditable(row.original.id)) {
                return renderEditableInput(cell.value, 'strike', "Number");
            }
            return <span style={{fontWeight:'bold'}}>{cell.value}</span>;
        }
      },
      {
    Header: 'Tipo', 
    accessor: 'right', // Cambiar de 'type' a 'right'
    hAlign: 'Center',
    Cell: ({ cell, row }) => {
        // Para padres, no mostrar tipo
        if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
        
        if (isCellEditable(row.original.id)) {
            const currentValue = getCurrentValue(cell.value, 'right'); // Cambiar a 'right'
            return (
              <TypeComboBox 
                value={currentValue}
                onChange={(newValue) => handleTypeChange(newValue, 'right')} // Cambiar a 'right'
              />
            );
        }
        
        if (!cell.value) return '';
        const displayValue = cell.value === 'C' ? 'Call' : cell.value === 'P' ? 'Put' : cell.value;
        const state = displayValue === 'Call' ? "Success" : "Error";
        return <ObjectStatus state={state} inverted>{displayValue}</ObjectStatus>;
    }
    },
      {
    Header: 'Expira', 
    accessor: 'expiration',
    hAlign: 'Center',
    Cell: ({ cell, row }) => {
        // Para padres, no mostrar expiración
        if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
        
        if (isCellEditable(row.original.id)) {
            const currentValue = getCurrentValue(cell.value, 'expiration');
            return (
              <ExpirationDatePicker
                value={currentValue}
                onChange={(newValue) => handleDateChange(newValue, 'expiration')}
              />
            );
        }
        
        // CORRECCIÓN: Mostrar fecha de forma segura
        if (!cell.value) return '';
        
        try {
          const date = new Date(cell.value);
          if (isNaN(date.getTime())) return 'Fecha inválida';
          return <span style={{fontSize:'0.85rem'}}>{date.toLocaleDateString()}</span>;
        } catch (error) {
          console.error('Error formateando fecha:', error);
          return 'Fecha inválida';
        }
    }
    },
      // ... (resto de las columnas financieras igual)
      {
        Header: 'Bid', 
        accessor: 'bid', 
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            if (isCellEditable(row.original.id)) {
                return renderEditableInput(cell.value, 'bid', "Number");
            }
            return <span style={{fontFamily:'monospace', color:'#2b7c2b'}}>{cell.value}</span>;
        }
      },
      {
        Header: 'Ask', 
        accessor: 'ask', 
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
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
        hAlign: 'Center', 
        Cell: ({ cell, row }) => {
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            return isCellEditable(row.original.id) 
              ? renderEditableInput(cell.value, 'iv', "Number")
              : cell.value;
        }
      },
      { 
        Header: 'Delta', 
        accessor: 'delta', 
        hAlign: 'Center', 
        Cell: ({ cell, row }) => {
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            return isCellEditable(row.original.id) 
              ? renderEditableInput(cell.value, 'delta', "Number")
              : <span style={{color:'#0056b3'}}>{cell.value}</span>;
        }
      },
      { 
        Header: 'Gamma', 
        accessor: 'gamma', 
        hAlign: 'Center', 
        Cell: ({ cell, row }) => {
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            return isCellEditable(row.original.id) 
              ? renderEditableInput(cell.value, 'gamma', "Number")
              : cell.value;
        }
      },
      { 
        Header: 'Theta', 
        accessor: 'theta', 
        hAlign: 'Center', 
        Cell: ({ cell, row }) => {
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            return isCellEditable(row.original.id) 
              ? renderEditableInput(cell.value, 'theta', "Number")
              : cell.value;
        }
      },
      { 
        Header: 'Vega', 
        accessor: 'vega', 
        hAlign: 'Center', 
        Cell: ({ cell, row }) => {
            if (row.original.level === 0 && !isCellEditable(row.original.id)) return '';
            return isCellEditable(row.original.id) 
              ? renderEditableInput(cell.value, 'vega', "Number")
              : cell.value;
        }
      }
    ];

    return [...idColumns, ...dateColumn, ...financialColumns];
  }, [isEditing, selectedRowId, refresh, handleInputChange, handleTypeChange, handleDateChange]);

  return (
    <>
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

export default TreeTable;