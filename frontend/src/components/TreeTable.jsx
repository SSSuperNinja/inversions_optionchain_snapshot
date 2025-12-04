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

import InstrumentsService from '../services/InstrumentsService';

//---------------------- Traer datos para ComboBox de Underlying Instruments ----------------------

// Componente ComboBox para Underlying Instruments - VERSIÓN SIMPLIFICADA
const UnderlyingComboBox = React.memo(({ value, onChange }) => {
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    const loadInstruments = async () => {
      setLoading(true);
      try {
        const instrumentsList = await InstrumentsService.getInstrumentsForComboBox();
        setInstruments(instrumentsList);
        
        // Encontrar el texto del valor actual
        const currentInstrument = instrumentsList.find(instr => instr.id == value);
        if (currentInstrument) {
          setSelectedText(currentInstrument.text);
        } else if (value) {
          setSelectedText(`ID: ${value}`); 
        }
      } catch (error) {
        console.error('Error loading instruments:', error);
        setInstruments([]);
      } finally {
        setLoading(false);
      }
    };

    loadInstruments();
  }, [value]);

  const handleChange = (e) => {
    const selectedText = e.target.value;
    console.log('UnderlyingComboBox - texto seleccionado:', selectedText);
    
    if (!selectedText) {
      if (onChange) onChange(null);
      return;
    }

    const selectedInstrument = instruments.find(instr => instr.text === selectedText);
    if (selectedInstrument && onChange) {
      onChange(selectedInstrument.id);
    }
  };

  // ⚡ OPTIMIZACIÓN CRÍTICA:
  // Si la lista es gigante, cortamos a 100 items para no matar la memoria.
  // En un caso real de producción, el filtrado debería ser en el backend.
  const visibleInstruments = instruments.slice(0, 100); 

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <ComboBox
          value={String(selectedText || '')}
          onChange={handleChange}
          style={{ width: '90%', textAlign: 'center' }}
          placeholder={loading ? "Cargando..." : "Seleccionar instrumento..."}
          loading={loading}
          filter="Contains" // Esto ayuda a filtrar visualmente
        >
        {visibleInstruments.map(instrument => (
          <ComboBoxItem 
            key={`instrument-${instrument.id}`} 
            text={instrument.text}
          />
        ))}
        {instruments.length > 100 && (
            <ComboBoxItem text={`... y ${instruments.length - 100} más (usa el buscador)`} />
        )}
      </ComboBox>
    </div>
  );
});
// ------------------- Combo para elegir Snapshot (valores únicos sacados del data de la tabla) -------------------
const SnapshotComboBox = React.memo(({ value, onChange, snapshotOptions, clearOption }) => {
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    const found = snapshotOptions.find(s => String(s) === String(value));
    if (found) setSelectedText(String(found));
    else setSelectedText(value != null ? String(value) : '');
  }, [value, snapshotOptions]);

  const handleChange = (e) => {
    const txt = e.target.value;
    // Convertir texto a número (esperamos snapshot_id numérico)
    const parsed = txt === '' ? null : Number(txt);
    console.log('SnapshotComboBox - seleccionado:', txt, '=>', parsed);
    // Primero limpiar option_id (cascada)
    if (clearOption) clearOption();
    if (onChange) onChange(parsed);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <ComboBox
        value={String(selectedText || '')}
        onChange={handleChange}
        style={{ width: '90%', textAlign: 'center' }}
        placeholder="Seleccionar snapshot..."
      >
        {snapshotOptions.map(opt => (
          <ComboBoxItem key={`snap-${opt}`} text={String(opt)} />
        ))}
      </ComboBox>
    </div>
  );
});

// Combo para elegir Option ID filtrado por snapshot_id seleccionado
const OptionIdComboBox = React.memo(({ value, onChange, snapshotId, data }) => {
  const [options, setOptions] = useState([]);
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    // construir lista única de underlying_id de padres con snapshot_id == snapshotId
    const opts = new Set();

    try {
      if (snapshotId == null) {
        setOptions([]);
        return;
      }

      // Recorremos "data" (lista de padres)
      (data || []).forEach(parent => {
        try {
          if (parent && Number(parent.snapshot_id) === Number(snapshotId)) {
            // Si el padre tiene underlying_id, lo agregamos
            if (parent.underlying_id != null) {
              opts.add(Number(parent.underlying_id));
            }
            // También si dentro del parent hay subRows que referencian underlying_id, podríamos incluirlos (opcional)
            // (descomenta si lo necesitas)
            // (parent.subRows || []).forEach(ch => { if (ch && ch.underlying_id != null) opts.add(Number(ch.underlying_id)); });
          }
        } catch (e) {
          console.warn('OptionIdComboBox: error leyendo parent', parent, e);
        }
      });

      // Convertir Set a Array y ordenar
      const arr = Array.from(opts).sort((a, b) => a - b);
      setOptions(arr);
    } catch (e) {
      console.error('OptionIdComboBox error building options', e);
      setOptions([]);
    }
  }, [snapshotId, data]);

  useEffect(() => {
    if (value != null) setSelectedText(String(value));
    else setSelectedText('');
  }, [value]);

  const handleChange = (e) => {
    const txt = e.target.value;
    const parsed = txt === '' ? null : Number(txt);
    console.log('OptionIdComboBox - seleccionado:', txt, '=>', parsed);
    if (onChange) onChange(parsed);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <ComboBox
        value={String(selectedText || '')}
        onChange={handleChange}
        style={{ width: '90%', textAlign: 'center' }}
        placeholder={options.length ? "Seleccionar option_id (underlying)..." : "No hay underlying_id para este snapshot"}
      >
        {options.map(opt => (
          <ComboBoxItem key={`under-${opt}`} text={String(opt)} />
        ))}
      </ComboBox>
    </div>
  );
});


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

// Componente ComboBox para Tipo - VERSIÓN CORREGIDA
const TypeComboBox = React.memo(({ value, onChange }) => {
  const getDisplayValue = () => {
    if (value === 'C') return 'Call';
    if (value === 'P') return 'Put';
    return '';
  };

  const handleChange = (e) => {
    // SOLUCIÓN SIMPLIFICADA: Usar e.target.value directamente
    const selectedText = e.target.value;
    console.log('TypeComboBox - texto seleccionado:', selectedText);
    
    // Convertir a valor interno
    const internalValue = selectedText === 'Call' ? 'C' : 
                         selectedText === 'Put' ? 'P' : '';
    
    if (onChange) {
      onChange(internalValue);
    }
  };

  const displayValue = getDisplayValue();

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <ComboBox
        value={displayValue}
        onChange={handleChange}
        style={{ width: '90%', textAlign: 'center' }}
        placeholder={displayValue || "Seleccionar tipo..."}
      >
        <ComboBoxItem key="call-option" text="Call" />
        <ComboBoxItem key="put-option" text="Put" />
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

const handleInputChange = useCallback((eOrValue, accessor) => {
  let rawValue;
  
  // Manejar tanto eventos como valores directos
  if (typeof eOrValue === 'object' && eOrValue.target) {
    // Es un evento de Input
    rawValue = eOrValue.target.value;
  } else {
    // Es un valor directo (del ComboBox)
    rawValue = eOrValue;
  }
  
  console.log(`📝 Cambio en ${accessor}:`, { 
    rawValue, 
    tipoRaw: typeof rawValue,
    esDeComboBox: !(typeof eOrValue === 'object' && eOrValue.target)
  });
  
  const numericFields = [
    'snapshot_id', 'underlying_id', 'option_id',
    'strike', 'bid', 'ask', 'iv', 'delta', 'gamma', 'theta', 'vega'
  ];
  
  let storageValue;
  
  if (numericFields.includes(accessor)) {
    storageValue = rawValue === '' ? null : Number(rawValue);
    if (isNaN(storageValue)) {
      console.warn(`⚠️ Valor no numérico para ${accessor}:`, rawValue);
      storageValue = rawValue;
    }
  } else {
    storageValue = rawValue;
  }
  
  console.log(`📝 Valor final para ${accessor}:`, storageValue);
  
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
      // Mostrar para ambos niveles; en hijos será editable como combo
      const original = row.original;
      const isParent = original.level === 0;
      const currentValue = getCurrentValue(cell.value, 'snapshot_id');

      // Snapshot options sacadas del prop data (únicos)
      const snapshotOptions = Array.from(new Set((data || []).map(d => d.snapshot_id).filter(Boolean)));

      if (isCellEditable(original.id, original.level, 'snapshot_id')) {
  if (!isParent) {
    return (
      <SnapshotComboBox
        value={currentValue}
        onChange={(newVal) => {
          editValuesRef.current['snapshot_id'] = newVal;
          editValuesRef.current['option_id'] = null;
          setRefresh(prev => prev + 1);
        }}
        snapshotOptions={snapshotOptions}
        clearOption={() => {
          editValuesRef.current['option_id'] = null;
          setRefresh(prev => prev + 1);
        }}
      />
    );
  } else {
    return renderEditableInput(cell.value, 'snapshot_id', "Number");
  }
}
  if (!isParent && !isCellEditable(original.id, original.level, 'snapshot_id')) {
  return ""; // celda vacía
}
      // No editable -> mostrar valor
      return cell.value;
    }
  },
  {
    Header: 'Underlying/Option ID',
    accessor: 'underlying_id',
    id: 'id_column',
    hAlign: 'Center',
    Cell: ({ cell, row }) => {
      const original = row.original;
      const isParent = original.level === 0;
      const displayId = isParent ? original.underlying_id : original.option_id;
      const accessor = isParent ? 'underlying_id' : 'option_id';
      const currentValue = getCurrentValue(displayId, accessor);

      const shouldShow = original.level === 0 || isCellEditable(original.id, original.level);

      if (!shouldShow) return '';

      if (isCellEditable(original.id, original.level, accessor)) {
        // Para padres, usar UnderlyingComboBox (instrumentos) - ya existe
        if (isParent && accessor === 'underlying_id') {
          return (
            <UnderlyingComboBox 
              value={currentValue}
              onChange={(newValue) => handleInputChange(newValue, accessor)}
            />
          );
        }

        // Para hijos: usamos OptionIdComboBox que depende del snapshot_id actual
        if (!isParent && accessor === 'option_id') {
          // Determinar snapshotId: preferir el editValuesRef si usuario lo cambió,
          // sino usar el original row.snapshot_id
          const snapshotIdForChild = editValuesRef.current['snapshot_id'] !== undefined
            ? editValuesRef.current['snapshot_id']
            : original.snapshot_id;

          return (
            <OptionIdComboBox
              value={currentValue}
              onChange={(newVal) => {
                // guardar option_id cuando cambie
                editValuesRef.current['option_id'] = newVal;
                setRefresh(prev => prev + 1);
              }}
              snapshotId={snapshotIdForChild}
              data={data}
            />
          );
        }

        // Fallback: input numérico para option_id si algo falla
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