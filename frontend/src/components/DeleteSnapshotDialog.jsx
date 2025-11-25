// src/components/DeleteSnapshotDialog.jsx
import React, { useEffect, useState } from 'react';
import { Dialog, Button, Label, Input } from '@ui5/webcomponents-react';

export default function DeleteSnapshotDialog({
  open,
  parentRow,
  onCancel,
  onConfirmDelete
}) {
  const [confirmSnapId, setConfirmSnapId] = useState('');
  const [confirmUnderlyingId, setConfirmUnderlyingId] = useState('');
  const [showFinalWarning, setShowFinalWarning] = useState(false);

  useEffect(() => {
    if (!open) {
      // resetear todo cuando se cierra desde fuera
      setConfirmSnapId('');
      setConfirmUnderlyingId('');
      setShowFinalWarning(false);
    }
  }, [open]);

  if (!parentRow) return null;

  const childrenCount = Array.isArray(parentRow.subRows)
    ? parentRow.subRows.length
    : 0;

  const snapMatches =
    confirmSnapId.trim() !== '' &&
    String(confirmSnapId).trim() === String(parentRow.snapshot_id);

  const underlyingMatches =
    confirmUnderlyingId.trim() !== '' &&
    String(confirmUnderlyingId).trim() === String(parentRow.underlying_id);

  const canContinue = snapMatches && underlyingMatches;

  const handleFirstConfirm = () => {
    if (!canContinue) return;
    setShowFinalWarning(true);
  };

  const handleFinalDelete = async () => {
    if (onConfirmDelete) {
      await onConfirmDelete(parentRow);
    }
  };

  // ============ DIALOGO 1: CONFIRMAR DATOS ============
  const firstDialog = (
    <Dialog
      open={open && !showFinalWarning}
      headerText="Eliminar snapshot y sus hijos"
      onAfterClose={onCancel}
    >
      <div style={{ padding: '1rem 1.5rem', minWidth: '380px' }}>
        <p style={{ marginBottom: '0.75rem' }}>
          Vas a eliminar el snapshot:
        </p>

        <ul style={{ marginTop: 0, marginBottom: '0.75rem' }}>
          <li><b>snapshot_id:</b> {parentRow.snapshot_id}</li>
          <li><b>underlying_id:</b> {parentRow.underlying_id}</li>
          <li><b>Contratos hijos asociados:</b> {childrenCount}</li>
        </ul>

        <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
          Esta acción eliminará el snapshot padre y <b>todos los hijos</b> que
          compartan la misma clave compuesta (<code>snapshot_id + underlying_id</code>).
        </p>

        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <Label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
              Escribe el Snapshot ID para confirmar
            </Label>
            <Input
              value={confirmSnapId}
              onInput={(e) => setConfirmSnapId(e.target.value)}
              placeholder={`Debe coincidir con ${parentRow.snapshot_id}`}
            />
          </div>

          <div>
            <Label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
              Escribe el Underlying ID para confirmar
            </Label>
            <Input
              value={confirmUnderlyingId}
              onInput={(e) => setConfirmUnderlyingId(e.target.value)}
              placeholder={`Debe coincidir con ${parentRow.underlying_id}`}
            />
          </div>

          {!canContinue && (confirmSnapId || confirmUnderlyingId) && (
            <p style={{ color: '#bb0000', fontSize: '0.8rem' }}>
              Los valores escritos no coinciden con el snapshot seleccionado.
            </p>
          )}
        </div>
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
        <Button
          design="Emphasized"
          onClick={handleFirstConfirm}
          disabled={!canContinue}
        >
          Continuar
        </Button>
      </div>
    </Dialog>
  );

  // ============ DIALOGO 2: ADVERTENCIA FINAL ============
  const secondDialog = (
    <Dialog
      open={open && showFinalWarning}
      headerText="¿Seguro que deseas eliminar?"
      onAfterClose={onCancel}
    >
      <div style={{ padding: '1rem 1.5rem', minWidth: '380px' }}>
        <p style={{ marginBottom: '0.75rem', fontWeight: 600 }}>
          Esta acción es <span style={{ color: '#bb0000' }}>permanente</span>.
        </p>

        <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
          Se eliminará el snapshot:
        </p>

        <ul style={{ marginTop: 0, marginBottom: '0.75rem' }}>
          <li><b>snapshot_id:</b> {parentRow.snapshot_id}</li>
          <li><b>underlying_id:</b> {parentRow.underlying_id}</li>
          <li><b>Contratos hijos a borrar:</b> {childrenCount}</li>
        </ul>

        <p style={{ fontSize: '0.9rem' }}>
          Una vez confirmes, no podrás recuperar esta información.
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
        <Button
          design="Transparent"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          design="Negative"
          icon="delete"
          onClick={handleFinalDelete}
        >
          Eliminar definitivamente
        </Button>
      </div>
    </Dialog>
  );

  return (
    <>
      {firstDialog}
      {secondDialog}
    </>
  );
}
