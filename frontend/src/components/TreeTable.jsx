// TreeTable.jsx  (Merged version)
// Mantiene las props existentes y añade onCreate/onDelete opcionales
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

// -----------------------------
// Reuso de tus componentes locales (StableInput, TypeComboBox, ExpirationDatePicker, TimestampDateTimePicker)
// -----------------------------
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
      style={{ width: "100%", minWidth: "80px", textAlign: "center" }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      {...props}
    />
  );
});

const TypeComboBox = React.memo(({ value, onChange }) => {
  const comboRef = useRef(null);

  useEffect(() => {
    if (comboRef.current) {
      const displayValue = value === 'C' ? 'Call' : value === 'P' ? 'Put' : (value === 'Call' || value === 'Put' ? value : '');
      comboRef.current.value = displayValue;
    }
  }, [value]);

  const handleChange = (e) => {
    const selectedText = e.target.value;
    // Soporta mapas: 'Call'/'Put' -> 'C'/'P' y también deja 'Call'/'Put' si quien consume espera ese formato
    const internalValueChar = selectedText === 'Call' ? 'C' : selectedText === 'Put' ? 'P' : '';
    // Llamar onChange con el formato preferido: preferimos 'C'/'P' porque tu componente lo usa,
    // pero si el row original usaba 'type' en palabras, tu handler puede detectar eso.
    if (onChange && internalValueChar) onChange(internalValueChar);
  };

  const getDisplayValue = () => {
    if (value === 'C') return 'Call';
    if (value === 'P') return 'Put';
    if (value === 'Call' || value === 'Put') return value;
    return '';
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

// En TreeTable.jsx - mejora el ExpirationDatePicker
const ExpirationDatePicker = React.memo(({ value, onChange }) => {
  const [internalValue, setInternalValue] = useState('');

  // Sincronizar cuando el valor externo cambia
  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          // Formatear para UI5 DatePicker (formato que UI5 espera)
          const formattedDate = formatDateForUI5(date);
          setInternalValue(formattedDate);
        }
      } catch (error) {
        console.error('Error parsing date:', error);
        setInternalValue('');
      }
    } else {
      setInternalValue('');
    }
  }, [value]);

  // Función para formatear fecha para UI5 DatePicker
  const formatDateForUI5 = (date) => {
    // UI5 DatePicker espera formato: "Nov 11, 2025"
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Función para parsear fecha de UI5 DatePicker
  const parseDateFromUI5 = (ui5DateString) => {
    try {
      // Convertir "Nov 11, 2025" a Date object
      const date = new Date(ui5DateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (error) {
      console.error('Error parsing UI5 date:', error);
    }
    return null;
  };

  const handleChange = (e) => {
    const selectedValue = e.detail.value;
    console.log('DatePicker cambio (detail.value):', selectedValue);
    
    if (selectedValue) {
      try {
        // Convertir el formato de UI5 ("Nov 11, 2025") a ISO
        const isoDate = parseDateFromUI5(selectedValue);
        console.log('DatePicker cambio (ISO):', isoDate);
        
        if (isoDate) {
          // Actualizar estado interno con el formato de UI5
          setInternalValue(selectedValue);
          
          if (onChange) {
            onChange(isoDate);
          }
        } else {
          throw new Error('No se pudo convertir la fecha');
        }
      } catch (error) {
        console.error('Error creating ISO date:', error);
        setInternalValue('');
        if (onChange) {
          onChange(null);
        }
      }
    } else {
      // Fecha fue limpiada
      setInternalValue('');
      if (onChange) {
        onChange(null);
      }
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <DatePicker
        value={internalValue}
        onChange={handleChange}
        style={{ width: '90%' }}
        placeholder="Seleccionar fecha..."
      />
    </div>
  );
});
// En TreeTable.jsx - mejora el TimestampDateTimePicker
const TimestampDateTimePicker = React.memo(({ value, onChange }) => {
  const [internalValue, setInternalValue] = useState('');

  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          // UI5 DateTimePicker espera formato local
          const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
          const localISO = localDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
          setInternalValue(localISO);
        }
      } catch (error) {
        console.error('Error parsing timestamp:', error);
        setInternalValue('');
      }
    } else {
      setInternalValue('');
    }
  }, [value]);

  const handleChange = (e) => {
    const selectedValue = e.detail.value;
    console.log('DateTimePicker cambio (detail.value):', selectedValue);
    
    if (selectedValue) {
      try {
        // UI5 DateTimePicker devuelve en formato local, convertir a ISO
        const isoDate = new Date(selectedValue).toISOString();
        console.log('DateTimePicker cambio (ISO):', isoDate);
        
        setInternalValue(selectedValue);
        
        if (onChange) {
          onChange(isoDate);
        }
      } catch (error) {
        console.error('Error creating ISO timestamp:', error);
        setInternalValue('');
        if (onChange) {
          onChange(null);
        }
      }
    } else {
      setInternalValue('');
      if (onChange) {
        onChange(null);
      }
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
// -----------------------------
// Componente principal (merge)
// -----------------------------
const TreeTable = ({
  data,
  loading,
  onRowSelect,
  isEditing,
  selectedRowId,
  onSave,
  onCancel,
  // Nuevas props opcionales (no obligatorias; si no se pasan, no se rompe nada)
  onCreate,
  onDelete
}) => {
  const editValuesRef = useRef({});
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!isEditing) {
      editValuesRef.current = {};
      setRefresh(prev => prev + 1);
    }
    return () => {};
  }, [isEditing]);

  const handleInputChange = useCallback((e, accessor) => {
  const rawValue = e.target.value;
  
  console.log(`📝 handleInputChange - accessor: ${accessor}, rawValue:`, rawValue);

  if (Object.keys(editValuesRef.current).length > 50) {
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
  
  editValuesRef.current[accessor] = storageValue;
  setRefresh(prev => prev + 1);
}, []);

  const handleTypeChange = useCallback((newValue, accessor) => {
    // newValue vendrá como 'C'/'P' por el TypeComboBox
    editValuesRef.current[accessor] = newValue;
    setRefresh(prev => prev + 1);
  }, []);

const handleDateChange = useCallback((newValue, accessor) => {
  console.log(`📝 handleDateChange - accessor: ${accessor}, newValue:`, newValue, 'type:', typeof newValue);
  
  editValuesRef.current[accessor] = newValue;
  setRefresh(prev => prev + 1);
  
  // Debug: ver qué hay en editValuesRef después del cambio
  console.log('📝 editValuesRef después del cambio:', editValuesRef.current);
}, []);

  const isCellEditable = (rowId, rowLevel, fieldType = 'all') => {
    if (!isEditing || rowId !== selectedRowId) return false;
    if (rowLevel === 0) {
      const allowedParentFields = ['snapshot_id', 'underlying_id', 'ts'];
      return allowedParentFields.includes(fieldType);
    }
    if (rowLevel === 1) {
      const disallowedFields = ['ts'];
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
          const finalData = { 
              ...originalRow,
              ...editValuesRef.current,
          };
          
          console.log("💾 handleSaveTrigger - VERIFICACIÓN COMPLETA:", {
              original: originalRow,
              cambios: editValuesRef.current,
              final: finalData,
              // Verificación específica de campos clave
              strikeEnCambios: 'strike' in editValuesRef.current,
              strikeEnCambiosValor: editValuesRef.current.strike,
              bidEnCambios: 'bid' in editValuesRef.current,
              bidEnCambiosValor: editValuesRef.current.bid,
              rightEnCambios: 'right' in editValuesRef.current,
              rightEnCambiosValor: editValuesRef.current.right
          });
          
          onSave(finalData);
      } else {
          console.error("❌ No se encontró la fila original para guardar");
      }
  }
};

  // Crear / Eliminar: sólo redirigen al padre con la fila seleccionada (si existe)
  const handleCreate = () => {
    try {
      const selectedRow = (function find(nodes) {
        if (!selectedRowId) return null;
        for (const n of nodes) {
          if (n.id === selectedRowId) return n;
          if (n.subRows) {
            const f = find(n.subRows);
            if (f) return f;
          }
        }
        return null;
      })(data);
      if (onCreate) onCreate(selectedRow);
      else console.log('onCreate no provisto. Selected for create:', selectedRow);
    } catch (err) {
      console.error('Error handleCreate', err);
    }
  };

  const handleDelete = () => {
    try {
      const selectedRow = (function find(nodes) {
        if (!selectedRowId) return null;
        for (const n of nodes) {
          if (n.id === selectedRowId) return n;
          if (n.subRows) {
            const f = find(n.subRows);
            if (f) return f;
          }
        }
        return null;
      })(data);
      if (!selectedRow) {
        console.warn('No hay fila seleccionada para eliminar');
        return;
      }

      if (onDelete) onDelete(selectedRow);
      else console.log('onDelete no provisto. Selected for delete:', selectedRow);
    } catch (err) {
      console.error('Error handleDelete', err);
    }
  };

  const renderEditableInput = (originalValue, accessor, type = "Text") => {
    const currentValue = getCurrentValue(originalValue, accessor);
    return (
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <StableInput
          value={currentValue || ''}
          type={type}
          onChange={(e) => handleInputChange(e, accessor)}
          style={{ width: '90%', textAlign: 'center' }}
        />
      </div>
    );
  };

  const columns = useMemo(() => {
    // id columns (padre/hijo)
    const idColumns = [
      {
        Header: 'ID Snapshot',
        accessor: 'snapshot_id',
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
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
          const displayId = row.original.level === 0 ? row.original.underlying_id : (row.original.option_id ?? row.original.underlying_id);
          const accessor = row.original.level === 0 ? 'underlying_id' : 'option_id';
          const shouldShow = row.original.level === 0 || isCellEditable(row.original.id, row.original.level);
          if (!shouldShow) return '';
          if (isCellEditable(row.original.id, row.original.level, accessor)) {
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
          if (row.original.level === 1) {
            return cell.value ? <span style={{ fontSize: '0.85rem' }}>{new Date(cell.value).toLocaleString()}</span> : '';
          }
          if (isCellEditable(row.original.id, row.original.level, 'ts')) {
            const currentValue = getCurrentValue(cell.value, 'ts');
            return (
              <TimestampDateTimePicker
                value={currentValue}
                onChange={(newValue) => handleDateChange(newValue, 'ts')}
              />
            );
          }
          return cell.value ? <span style={{ fontSize: '0.85rem' }}>{new Date(cell.value).toLocaleString()}</span> : '';
        }
      }
    ];

    const financialColumns = [
      {
        Header: 'Strike',
        accessor: 'strike',
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
          if (row.original.level === 0) return '';
          if (isCellEditable(row.original.id, row.original.level, 'strike')) {
            return renderEditableInput(cell.value, 'strike', "Number");
          }
          return <span style={{ fontWeight: 'bold' }}>{cell.value}</span>;
        }
      },
      {
        Header: 'Tipo',
        accessor: 'right', // preferimos 'right' pero trataremos 'type' si es necesario
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
          if (row.original.level === 0) return '';
          // obtener valor preferente: editValuesRef, original.right, original.type
          const originalCellValue = cell.value ?? row.original.type;
          if (isCellEditable(row.original.id, row.original.level, 'right')) {
            const currentValue = getCurrentValue(originalCellValue, 'right');
            return (
              <TypeComboBox
                value={currentValue}
                onChange={(newValue) => handleTypeChange(newValue, 'right')}
              />
            );
          }
          if (!originalCellValue) return '';
          // soporta 'C'/'P' y 'Call'/'Put'
          const displayValue = originalCellValue === 'C' ? 'Call' : originalCellValue === 'P' ? 'Put' : originalCellValue;
          const state = displayValue === 'Call' ? "Success" : displayValue === 'Put' ? "Error" : "None";
          return <ObjectStatus state={state} inverted>{displayValue}</ObjectStatus>;
        }
      },
      {
  Header: 'Expira',
  accessor: 'expiration',
  hAlign: 'Center',
  Cell: ({ cell, row }) => {
    if (row.original.level === 0) return '';
    
    console.log('🔍 Columna Expira - cell.value:', cell.value, 'row.original.id:', row.original.id);
    
    if (isCellEditable(row.original.id, row.original.level, 'expiration')) {
      const currentValue = getCurrentValue(cell.value, 'expiration');
      
      
      return (
        <ExpirationDatePicker
          value={currentValue}
          onChange={(newValue) => {
            
            handleDateChange(newValue, 'expiration');
          }}
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
          if (!isCellEditable(row.original.id, row.original.level)) {
            if (row.original.level === 0) return '';
            return <span style={{ fontFamily: 'monospace', color: '#2b7c2b' }}>{cell.value}</span>;
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
            if (row.original.level === 0) return '';
            return <span style={{ fontFamily: 'monospace', color: '#2b7c2b' }}>{cell.value}</span>;
          }
          return renderEditableInput(cell.value, 'ask', "Number");
        }
      },
      {
        Header: 'IV %',
        accessor: 'iv',
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
          if (!isCellEditable(row.original.id, row.original.level)) {
            if (row.original.level === 0) return '';
            return <span style={{ fontFamily: 'monospace', color: '#2b7c2b' }}>{cell.value}</span>;
          }
          return renderEditableInput(cell.value, 'iv', "Number");
        }
      },
      {
        Header: 'Delta',
        accessor: 'delta',
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
          if (!isCellEditable(row.original.id, row.original.level)) {
            if (row.original.level === 0) return '';
            return <span style={{ fontFamily: 'monospace', color: '#2b7c2b' }}>{cell.value}</span>;
          }
          return renderEditableInput(cell.value, 'delta', "Number");
        }
      },
      {
        Header: 'Gamma',
        accessor: 'gamma',
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
          if (!isCellEditable(row.original.id, row.original.level)) {
            if (row.original.level === 0) return '';
            return <span style={{ fontFamily: 'monospace', color: '#2b7c2b' }}>{cell.value}</span>;
          }
          return renderEditableInput(cell.value, 'gamma', "Number");
        }
      },
      {
        Header: 'Theta',
        accessor: 'theta',
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
          if (!isCellEditable(row.original.id, row.original.level)) {
            if (row.original.level === 0) return '';
            return <span style={{ fontFamily: 'monospace', color: '#2b7c2b' }}>{cell.value}</span>;
          }
          return renderEditableInput(cell.value, 'theta', "Number");
        }
      },
      {
        Header: 'Vega',
        accessor: 'vega',
        hAlign: 'Center',
        Cell: ({ cell, row }) => {
          if (!isCellEditable(row.original.id, row.original.level)) {
            if (row.original.level === 0) return '';
            return <span style={{ fontFamily: 'monospace', color: '#2b7c2b' }}>{cell.value}</span>;
          }
          return renderEditableInput(cell.value, 'vega', "Number");
        }
      },
      {
        Header: 'Estado',
        accessor: 'status',
        Cell: ({ cell }) => {
          const value = cell.value || 'OK';
          return <ObjectStatus state="Success">{value}</ObjectStatus>;
        }
      }
    ];

    return [...idColumns, ...dateColumn, ...financialColumns];
  }, [isEditing, selectedRowId, refresh]);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem', gap: '0.5rem' }}>
        <div style={{ fontWeight: 700 }}>OptionChain Snapshots</div>
      </div>

      <button id="btn-save-internal" style={{ display: 'none' }} onClick={handleSaveTrigger}></button>

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