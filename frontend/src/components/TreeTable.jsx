import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  AnalyticalTable, 
  ObjectStatus, 
  Input, 
  Button, 
  ComboBox, 
  ComboBoxItem, 
  DatePicker,
  DateTimePicker 
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

// Componente DatePicker para Expiración - CORREGIDO
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
    const rawDate = e.target.value;
    console.log('DatePicker cambio (raw):', rawDate);
    
    if (rawDate) {
      try {
        const date = new Date(rawDate);
        if (!isNaN(date.getTime())) {
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

// Componente DateTimePicker para el campo ts (padres) - CORREGIDO
const TimestampDateTimePicker = React.memo(({ value, onChange }) => {
  const [internalValue, setInternalValue] = useState('');

  // Sincronizar cuando el valor externo cambia
  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          // Formatear para UI5 DateTimePicker (YYYY-MM-DDTHH:mm:ss.sssZ)
          const isoString = date.toISOString();
          setInternalValue(isoString);
        }
      } catch (error) {
        console.error('Error parsing timestamp:', error);
      }
    }
  }, [value]);

  const handleChange = (e) => {
    // CORRECCIÓN: Usar e.detail.value que contiene el valor en formato ISO
    const selectedDateTime = e.detail.value;
    console.log('TimestampDateTimePicker cambio (detail):', selectedDateTime);
    
    setInternalValue(selectedDateTime);
    
    if (selectedDateTime && onChange) {
      // UI5 DateTimePicker ya devuelve el formato ISO en e.detail.value
      onChange(selectedDateTime);
    } else if (onChange) {
      onChange(null);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <DateTimePicker
        value={internalValue}
        onChange={handleChange}
        style={{ width: '90%' }}
        placeholder="Seleccionar fecha y hora..."
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
    
    // Cleanup function
    return () => {
        // Limpiar si es necesario
    };
}, [isEditing]);

  // Manejador de cambios en Inputs
  const handleInputChange = useCallback((e, accessor) => {
    const rawValue = e.target.value;

        if (Object.keys(editValuesRef.current).length > 50) {
        // Mantener solo los últimos 20 cambios
        const recentChanges = Object.entries(editValuesRef.current)
            .slice(-20)
            .reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {});
        editValuesRef.current = recentChanges;
    }
    
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

// Helper: ¿Es esta celda editable?
const isCellEditable = (rowId, rowLevel, fieldType = 'all') => {
    if (!isEditing || rowId !== selectedRowId) return false;
    
    // Para padres (nivel 0), solo permitir editar campos de ID y ts
    if (rowLevel === 0) {
        const allowedParentFields = ['snapshot_id', 'underlying_id', 'ts'];
        return allowedParentFields.includes(fieldType);
    }
    
    // Para hijos (nivel 1), permitir todos los campos EXCEPTO ts
    if (rowLevel === 1) {
        const disallowedFields = ['ts']; // Campos que NO son editables para hijos
        return !disallowedFields.includes(fieldType);
    }
    
    return true;
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
    // Columnas de ID - editables para ambos niveles
const idColumns = [
  {
    Header: 'ID Snapshot', 
    accessor: 'snapshot_id',
    hAlign: 'Center',
    Cell: ({ cell, row }) => {
      // Mostrar siempre para padres, y para hijos en modo edición
      const shouldShow = row.original.level === 0 || isCellEditable(row.original.id, row.original.level);
      
      if (!shouldShow) return '';
      
      if (isCellEditable(row.original.id, row.original.level, 'snapshot_id')) {
        return renderEditableInput(cell.value, 'snapshot_id', "Number");
      }
      return cell.value;
    }
  },
  {
    Header: 'Underlying/Option ID',
    accessor: 'underlying_id',
    id: 'id_column',
    hAlign: 'Center',
    Cell: ({ cell, row }) => {
      // Determinar qué ID mostrar
      const displayId = row.original.level === 0 ? row.original.underlying_id : row.original.option_id;
      const accessor = row.original.level === 0 ? 'underlying_id' : 'option_id';
      
      // Mostrar siempre para padres, y para hijos en modo edición
      const shouldShow = row.original.level === 0 || isCellEditable(row.original.id, row.original.level);
      
      if (!shouldShow) return '';
      
      if (isCellEditable(row.original.id, row.original.level, accessor)) {
        return renderEditableInput(displayId, accessor, "Number");
      }
      return displayId;
        }
      }
    ];

// Columna de Fecha - usar DateTimePicker para padres
// Columna de Fecha - SOLO editable para padres
const dateColumn = [
  {
    Header: 'Fecha', 
    accessor: 'ts',
    hAlign: 'Center',
    Cell: ({ cell, row }) => {
      // Para hijos, siempre mostrar la fecha normalmente (no editable)
      if (row.original.level === 1) {
        return cell.value ? 
          <span style={{fontSize:'0.85rem'}}>{new Date(cell.value).toLocaleString()}</span> : '';
      }
      
      // Para padres: verificar si es editable
      if (isCellEditable(row.original.id, row.original.level, 'ts')) {
        const currentValue = getCurrentValue(cell.value, 'ts');
        return (
          <TimestampDateTimePicker
            value={currentValue}
            onChange={(newValue) => handleDateChange(newValue, 'ts')}
          />
        );
      }
      
      // Para padres no editables, mostrar normal
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
        // Para padres, no mostrar strike
        if (row.original.level === 0) return '';
        
        if (isCellEditable(row.original.id, row.original.level, 'strike')) {
            return renderEditableInput(cell.value, 'strike', "Number");
        }
        return <span style={{fontWeight:'bold'}}>{cell.value}</span>;
    }
  },
  {
    Header: 'Tipo', 
    accessor: 'right', 
    hAlign: 'Center',
    Cell: ({ cell, row }) => {
        // Para padres, no mostrar tipo
        if (row.original.level === 0) return '';
        
        if (isCellEditable(row.original.id, row.original.level, 'right')) {
            const currentValue = getCurrentValue(cell.value, 'right');
            return (
              <TypeComboBox 
                value={currentValue}
                onChange={(newValue) => handleTypeChange(newValue, 'right')}
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
        if (row.original.level === 0) return '';
        
        if (isCellEditable(row.original.id, row.original.level, 'expiration')) {
            const currentValue = getCurrentValue(cell.value, 'expiration');
            return (
              <ExpirationDatePicker
                value={currentValue}
                onChange={(newValue) => handleDateChange(newValue, 'expiration')}
              />
            );
        }
        
        return cell.value ? 
          <span style={{fontSize:'0.85rem'}}>{new Date(cell.value).toLocaleDateString()}</span> : '';
    }
  },
      {
    Header: 'Bid', 
    accessor: 'bid', 
    hAlign: 'Center',
    Cell: ({ cell, row }) => {
        // SOLO para hijos en modo edición
        if (!isCellEditable(row.original.id, row.original.level)) {
            // Para padres, no mostrar bid
            if (row.original.level === 0) return '';
            return <span style={{fontFamily:'monospace', color:'#2b7c2b'}}>{cell.value}</span>;
        }
        
        return renderEditableInput(cell.value, 'bid', "Number");
    }
},
{
    Header: 'Ask', 
    accessor: 'ask', 
    hAlign: 'Center',
    Cell: ({ cell, row }) => {
       if (!isCellEditable(row.original.id, row.original.level)) {
            // Para padres, no mostrar bid
            if (row.original.level === 0) return '';
            return <span style={{fontFamily:'monospace', color:'#2b7c2b'}}>{cell.value}</span>;
        }
        
        return renderEditableInput(cell.value, 'ask', "Number");
    }
},
      { 
        Header: 'IV %', 
        accessor: 'iv', 
        hAlign: 'Center', 
        Cell: ({ cell, row }) => {
        // SOLO para hijos en modo edición
       if (!isCellEditable(row.original.id, row.original.level)) {
            // Para padres, no mostrar bid
            if (row.original.level === 0) return '';
            return <span style={{fontFamily:'monospace', color:'#2b7c2b'}}>{cell.value}</span>;
        }
        
        return renderEditableInput(cell.value, 'iv', "Number");
    }
      },
      { 
        Header: 'Delta', 
        accessor: 'delta', 
        hAlign: 'Center', 
        Cell: ({ cell, row }) => {
        // SOLO para hijos en modo edición
       if (!isCellEditable(row.original.id, row.original.level)) {
            // Para padres, no mostrar bid
            if (row.original.level === 0) return '';
            return <span style={{fontFamily:'monospace', color:'#2b7c2b'}}>{cell.value}</span>;
        }
        
        return renderEditableInput(cell.value, 'delta', "Number");
    }
      },
      { 
        Header: 'Gamma', 
        accessor: 'gamma', 
        hAlign: 'Center', 
        Cell: ({ cell, row }) => {
        // SOLO para hijos en modo edición
       if (!isCellEditable(row.original.id, row.original.level)) {
            // Para padres, no mostrar bid
            if (row.original.level === 0) return '';
            return <span style={{fontFamily:'monospace', color:'#2b7c2b'}}>{cell.value}</span>;
        }
        
        return renderEditableInput(cell.value, 'gamma', "Number");
    }
      },
      { 
        Header: 'Theta', 
        accessor: 'theta', 
        hAlign: 'Center', 
        Cell: ({ cell, row }) => {
        // SOLO para hijos en modo edición
       if (!isCellEditable(row.original.id, row.original.level)) {
            // Para padres, no mostrar bid
            if (row.original.level === 0) return '';
            return <span style={{fontFamily:'monospace', color:'#2b7c2b'}}>{cell.value}</span>;
        }
        
        return renderEditableInput(cell.value, 'theta', "Number");
    }
      },
      { 
        Header: 'Vega', 
        accessor: 'vega', 
        hAlign: 'Center', 
        Cell: ({ cell, row }) => {
        // SOLO para hijos en modo edición
       if (!isCellEditable(row.original.id, row.original.level)) {
            // Para padres, no mostrar bid
            if (row.original.level === 0) return '';
            return <span style={{fontFamily:'monospace', color:'#2b7c2b'}}>{cell.value}</span>;
        }
        
        return renderEditableInput(cell.value, 'vega', "Number");
    }
      }
    ];

    return [...idColumns, ...dateColumn, ...financialColumns];
  }, [isEditing, selectedRowId, refresh]);

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