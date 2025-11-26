import React, { useState, useEffect, useMemo } from 'react';
import {
  ShellBar,
  Card,
  CardHeader,
  Icon,
  Button,
  Input,
  FlexBox,
  FlexBoxJustifyContent,
  FlexBoxAlignItems
} from '@ui5/webcomponents-react';
import '@ui5/webcomponents-icons/dist/AllIcons.js';

import { TreeTableService } from './services/TreeTableService';
import TreeTable from './components/TreeTable';
import CreateChainDialog from './components/CreateChainDialog';
import DeleteSnapshotDialog from './components/DeleteSnapshotDialog';
import DeleteItemDialog from './components/DeleteItemDialog';

const BASE_URL = 'http://localhost:4004/api/chain/snapshot/crud';

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);

  // Estados para edición (de tu código)
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para creación (de tu compañero)
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState('parent');

  // Estados para eliminación (de tu compañero)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [parentToDelete, setParentToDelete] = useState(null);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [childToDelete, setChildToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await TreeTableService.getHierarchy();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ========= BÚSQUEDA (de tu código) =========
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

const filteredData = useMemo(() => {
  if (!searchTerm || !String(searchTerm).trim()) return data;

  const term = String(searchTerm).toLowerCase().trim();

  // Serializa recursivamente valores u objetos a string buscable
  const serialize = (val, depth = 0) => {
    if (val == null) return '';
    if (depth > 6) return ''; // evitar loops y estructuras muy profundas
    const t = typeof val;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      return String(val).toLowerCase();
    }
    if (Array.isArray(val)) {
      return val.map(v => serialize(v, depth + 1)).join(' ');
    }
    if (t === 'object') {
      return Object.keys(val)
        .sort()
        .map(k => serialize(val[k], depth + 1))
        .join(' ');
    }
    return '';
  };


  // Campos a buscar específicamente (optimización)
  const SEARCHABLE_FIELDS = [
  "snapshot_id",
  "underlying_id",
  "option_id",
  "strike",
  "right",
  "expiration",
  "bid",
  "ask",
  "iv",
  "delta",
  "gamma",
  "theta",
  "vega",
  "rho",
];

const matches = (obj) => {
  if (!obj) return false;

  return SEARCHABLE_FIELDS.some(field => {
    if (obj[field] == null) return false;
    return String(obj[field]).toLowerCase().includes(term);
  });
};


  // Recorremos los padres y decidimos qué devolver
  return (data || [])
    .map(parent => {
      // Si el padre coincide en cualquier campo -> devolver padre completo
      if (matches(parent)) {
        return parent;
      }

      // Sino: filtrar hijos que coincidan
      const matchingChildren = (parent.subRows || []).filter(child => matches(child));

      if (matchingChildren.length > 0) {
        // Devolver el padre pero con solo los hijos que coinciden
        return {
          ...parent,
          // Mantener otras propiedades del padre y sólo reemplazar subRows
          subRows: matchingChildren
        };
      }

      // No coincide ni padre ni hijos -> omitir
      return null;
    })
    .filter(Boolean);
}, [data, searchTerm]);



  // ========= SELECCIÓN (de tu código, con ajuste para evitar seleccionar en edición) =========
  const handleRowSelect = (row) => {
    if (!isEditing) {
      console.log("Fila seleccionada:", row);
      setSelectedRow(row);
    }
  };

  // ========= EDICIÓN (de tu código) =========
  const handleEdit = () => {
    if (selectedRow) {
      setIsEditing(true);
    }
  };

  const handleSave = async (updatedData) => {
    console.log("💾 Iniciando guardado con datos:", updatedData);

    try {
      const success = await TreeTableService.updateRow(updatedData);

      if (success) {
        console.log("✅ Guardado exitoso, recargando datos...");
        setIsEditing(false);
        setSelectedRow(null);

        // Pequeño delay para asegurar que el backend procesó la actualización
        setTimeout(() => {
          loadData();
        }, 500);

      } else {
        console.log("❌ Falló el guardado - Manteniendo modo edición");
        // NO cerramos el modo edición para que el usuario pueda corregir
      }
    } catch (error) {
      console.error("💥 Error en handleSave:", error);
      // El error ya fue mostrado por TreeTableService
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedRow(null); // Limpiar selección
    // No recargar datos inmediatamente, solo salir del modo edición
  };

  // ========= LLAMADA GENÉRICA AL BACK (de tu compañero) =========
  const callBackend = async (processType, body) => {
    const params = new URLSearchParams({
      ProcessType: processType,
      dbServer: 'MongoDB',
      User: 'Admin'
    });

    const url = `${BASE_URL}?${params.toString()}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Error HTTP ${resp.status}: ${text}`);
    }

    const json = await resp.json();
    return json.value || json;
  };

  // ========= OPCIONES PARA COMBOS (CREATE) (de tu compañero) =========
  const snapshotOptions = [...new Set(data.map((r) => r.snapshot_id).filter(Boolean))];
  const underlyingOptions = [...new Set(data.map((r) => r.underlying_id).filter(Boolean))];

  // ========= CREATE: ABRIR / CERRAR (de tu compañero) =========
  const handleOpenCreateDialog = () => {
    setCreateType('parent');
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  // ========= CREATE: CONFIRMAR (Padre / Hijo) (de tu compañero) =========
  const handleConfirmCreate = async (payload) => {
    try {
      if (payload.createType === 'parent') {
        const { snapshot } = payload;

        await callBackend('CreateSnapshot', {
          snapshot_id: Number(snapshot.snapshot_id),
          underlying_id: Number(snapshot.underlying_id),
          ts: snapshot.ts
        });
      }

      if (payload.createType === 'child') {
        const { item } = payload;

        await callBackend('CreateSnapshotItem', {
          snapshot_id: Number(item.snapshot_id),
          option_id: Number(item.option_id),
          strike: item.strike ? Number(item.strike) : undefined,
          right: item.right, // ya viene convertido a 'C'/'P' en la modal
          expiration: item.expiration || undefined,
          bid: item.bid ? Number(item.bid) : undefined,
          ask: item.ask ? Number(item.ask) : undefined,
          iv: item.iv ? Number(item.iv) : undefined,
          delta: item.delta ? Number(item.delta) : undefined,
          gamma: item.gamma ? Number(item.gamma) : undefined,
          theta: item.theta ? Number(item.theta) : undefined,
          vega: item.vega ? Number(item.vega) : undefined
        });
      }

      await loadData();
      setCreateDialogOpen(false);
    } catch (err) {
      console.error('Error creando snapshot / item:', err);
    }
  };

  // ========= DELETE: CLICK EN BOTÓN BORRAR (de tu compañero, con ajuste para no borrar en edición) =========
  const handleDeleteClick = () => {
    if (!selectedRow) {
      console.warn('No hay fila seleccionada para borrar');
      return;
    }

    if (!isEditing) {
      if (selectedRow.level === 0) {
        // PADRE
        setParentToDelete(selectedRow);
        setDeleteDialogOpen(true);
      } else if (selectedRow.level === 1) {
        // HIJO
        setChildToDelete(selectedRow);
        setDeleteItemDialogOpen(true);
      }
    }
  };

  // ====== HANDLERS PADRE (de tu compañero) ======
  const handleCancelDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setParentToDelete(null);
  };

  const handleConfirmDeleteParent = async (parentRow) => {
    try {
      await callBackend('DeleteSnapshot', {
        snapshot_id: parentRow.snapshot_id,
        underlying_id: parentRow.underlying_id
      });

      await loadData();
      setSelectedRow(null);
    } catch (err) {
      console.error('Error al borrar snapshot padre:', err);
    } finally {
      setDeleteDialogOpen(false);
      setParentToDelete(null);
    }
  };

  // ====== HANDLERS HIJO (de tu compañero) ======
  const handleCancelDeleteItemDialog = () => {
    setDeleteItemDialogOpen(false);
    setChildToDelete(null);
  };

  const handleConfirmDeleteChild = async (childRow) => {
    try {
      await callBackend('DeleteSnapshotItem', {
        item_id: childRow.id
      });

      await loadData();
      setSelectedRow(null);
    } catch (err) {
      console.error('Error al borrar hijo:', err);
    } finally {
      setDeleteItemDialogOpen(false);
      setChildToDelete(null);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        background: '#f5f6f7'
      }}
    >
      <ShellBar
        primaryTitle="ChainOptions"
        secondaryTitle="Análisis de Cadena (Edición en Línea)"
        logo={<Icon name="chain-link" />}
        profile={<Icon name="customer" />}
      />

      <div style={{ flexGrow: 1, padding: '1rem', overflow: 'hidden' }}>
        <Card
          header={
            <CardHeader
              titleText="Estructura Organizacional"
              subtitleText="Vista de Árbol Detallada"
              avatar={<Icon name="table-view" />}
            />
          }
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* --- BARRA DE HERRAMIENTAS DINÁMICA (de tu código, con integración de los botones de agregar/borrar) --- */}
          <FlexBox
            justifyContent={FlexBoxJustifyContent.SpaceBetween}
            alignItems={FlexBoxAlignItems.Center}
            style={{
              padding: '0.5rem 1rem',
              borderBottom: '1px solid #e5e5e5'
            }}
          >
            <FlexBox style={{ gap: '0.5rem' }}>
              {/* Muestra botones distintos dependiendo si estás editando o no */}
              {isEditing ? (
                <>
                  <Button
                    icon="save"
                    design="Emphasized"
                    onClick={() => document.getElementById('btn-save-internal')?.click()}
                    tooltip="Guardar cambios de la fila actual"
                  >
                    Guardar
                  </Button>
                  <Button
                    icon="cancel"
                    design="Transparent"
                    onClick={handleCancel}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button icon="add" design="Emphasized" onClick={handleOpenCreateDialog}>
                    Agregar
                  </Button>
                  <Button
                    icon="edit"
                    disabled={!selectedRow}
                    onClick={handleEdit}
                    tooltip={selectedRow?.level === 0 ? "Editar Snapshot" : "Editar Opción"}
                  >
                    Editar
                  </Button>
                  <Button
                    icon="delete"
                    design="Transparent"
                    style={{ color: selectedRow ? '#bb0000' : 'inherit' }}
                    disabled={!selectedRow}
                    onClick={handleDeleteClick}
                  >
                    Borrar
                  </Button>
                </>
              )}
            </FlexBox>

            <div style={{ width: '300px' }}>
              <Input
                icon={<Icon name="search" />}
                placeholder="Buscar..."
                disabled={isEditing}
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </FlexBox>

          {/* --- TABLA --- */}
          <div style={{ flexGrow: 1, overflow: 'hidden' }}>
            <TreeTable
              data={filteredData} // Usar datos filtrados
              loading={loading}
              onRowSelect={handleRowSelect}
              isEditing={isEditing}
              selectedRowId={selectedRow?.id}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        </Card>
      </div>

      {/* ====== MODAL CREATE (PADRE / HIJO) ====== */}
      <CreateChainDialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        onConfirm={handleConfirmCreate}
        createType={createType}
        setCreateType={setCreateType}
        snapshotOptions={snapshotOptions}
        underlyingOptions={underlyingOptions}
      />

      {/* ====== MODAL DELETE PADRE (2 pasos) ====== */}
      <DeleteSnapshotDialog
        open={deleteDialogOpen}
        parentRow={parentToDelete}
        onCancel={handleCancelDeleteDialog}
        onConfirmDelete={handleConfirmDeleteParent}
      />

      {/* ====== MODAL DELETE HIJO (confirmación final) ====== */}
      <DeleteItemDialog
        open={deleteItemDialogOpen}
        childRow={childToDelete}
        onCancel={handleCancelDeleteItemDialog}
        onConfirmDelete={handleConfirmDeleteChild}
      />
    </div>
  );
}