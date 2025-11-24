// src/components/DeleteItemDialog.jsx
import React from 'react';
import { Dialog, Button } from '@ui5/webcomponents-react';

export default function DeleteItemDialog({
  open,
  childRow,
  onCancel,
  onConfirmDelete
}) {
  if (!childRow) return null;

  // Datos del hijo
  const fd = childRow.fullData || {};
  const snapshotId = fd.snapshot_id ?? childRow.snapshot_id ?? 'N/A';
  const optionId = fd.option_id ?? 'N/A';
  const strike = fd.strike ?? childRow.strike ?? 'N/A';

  const handleDelete = async () => {
    if (onConfirmDelete) {
      await onConfirmDelete(childRow);
    }
  };

  return (
    <Dialog
      open={open}
      headerText="¿Eliminar contrato de opción?"
      onAfterClose={onCancel}
    >
      <div style={{ padding: '1rem 1.5rem', minWidth: '360px' }}>
        <p style={{ marginBottom: '0.75rem', fontWeight: 600 }}>
          Esta acción es <span style={{ color: '#bb0000' }}>permanente</span>.
        </p>

        <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
          Se eliminará el siguiente contrato hijo:
        </p>

        <ul style={{ marginTop: 0, marginBottom: '0.75rem' }}>
          <li><b>snapshot_id:</b> {snapshotId}</li>
          <li><b>option_id:</b> {optionId}</li>
          <li><b>strike:</b> {strike}</li>
        </ul>

        <p style={{ fontSize: '0.9rem' }}>
          Esto <b>no puede deshacerse</b>. El contrato será eliminado
          de forma definitiva de la base de datos.
        </p>
      </div>

      <div
        slot="footer"
        style={{
          padding: '0.8rem 1.5rem',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.5rem'
        }}
      >
        <Button design="Transparent" onClick={onCancel}>
          Cancelar
        </Button>
        <Button design="Negative" icon="delete" onClick={handleDelete}>
          Eliminar definitivamente
        </Button>
      </div>
    </Dialog>
  );
}
