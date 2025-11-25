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

const ExpirationDatePicker = React.memo(({ value, onChange }) => {
  const [internalValue, setInternalValue] = useState('');
  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;
          setInternalValue(formattedDate);
        }
      } catch (error) {
        console.error('Error parsing date:', error);
      }
    } else {
      setInternalValue('');
    }
  }, [value]);

  const handleChange = (e) => {
    const rawDate = e.target.value;
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
          if (onChange) onChange(isoDate);
        } else {
          if (onChange) onChange(null);
        }
      } catch (error) {
        if (onChange) onChange(null);
      }
    } else {
      if (onChange) onChange(null);
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

const TimestampDateTimePicker = React.memo(({ value, onChange }) => {
  const [internalValue, setInternalValue] = useState('');
  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const isoString = date.toISOString();
          setInternalValue(isoString);
        }
      } catch (error) {
        console.error('Error parsing timestamp:', error);
      }
    } else {
      setInternalValue('');
    }
  }, [value]);

  const handleChange = (e) => {
    const selectedDateTime = e.detail ? e.detail.value : e.target?.value;
    setInternalValue(selectedDateTime || '');
    if (onChange) onChange(selectedDateTime || null);
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
    if (Object.keys(editValuesRef.current).length > 50) {
      const recentChanges = Object.entries(editValuesRef.current)
        .slice(-20)
        .reduce((acc, [key, value]) => { acc[key] = value; return acc; }, {});
      editValuesRef.current = recentChanges;
    }

    const numericFields = [
      'snapshot_id', 'underlying_id', 'option_id',
      'strike', 'bid', 'ask', 'iv', 'delta', 'gamma', 'theta', 'vega'
    ];

    let storageValue;
    if (numericFields.includes(accessor)) {
      storageValue = rawValue === '' ? null : Number(rawValue);
      if (isNaN(storageValue)) storageValue = rawValue;
    } else {
      storageValue = rawValue;
    }

    editValuesRef.current[accessor] = storageValue;
    setRefresh(prev => prev + 1);
  }, []);

  const handleTypeChange = useCallback((newValue, accessor) => {
    // newValue vendrá como 'C'/'P' por el TypeComboBox
    editValuesRef.current[accessor] = newValue;
    setRefresh(prev => prev + 1);
  }, []);

  const handleDateChange = useCallback((newValue, accessor) => {
    editValuesRef.current[accessor] = newValue;
    setRefresh(prev => prev + 1);
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
        const finalData = {
          ...originalRow,
          ...editValuesRef.current,
        };
        onSave(finalData);
      } else {
        console.error("No se encontró la fila original para guardar");
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
          if (isCellEditable(row.original.id, row.original.level, 'expiration')) {
            const currentValue = getCurrentValue(cell.value, 'expiration');
            return (
              <ExpirationDatePicker
                value={currentValue}
                onChange={(newValue) => handleDateChange(newValue, 'expiration')}
              />
            );
          }
          return cell.value ? <span style={{ fontSize: '0.85rem' }}>{new Date(cell.value).toLocaleDateString()}</span> : '';
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button onClick={handleCreate} design="Transparent">Crear</Button>
          <Button onClick={handleDelete} design="Transparent">Eliminar</Button>
          {/* Si quieres, puedes mostrar botones Save/Cancel cuando isEditing */}
          {isEditing ? (
            <>
              <Button onClick={handleSaveTrigger} design="Emphasized">Guardar</Button>
              <Button onClick={onCancel}>Cancelar</Button>
            </>
          ) : null}
        </div>
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
