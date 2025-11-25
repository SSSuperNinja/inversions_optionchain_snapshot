// src/components/CreateChainDialog.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  ComboBox,
  ComboBoxItem,
  Input,
  Label,
  Button,
  Switch,
  DatePicker
} from '@ui5/webcomponents-react';

export default function CreateChainDialog({
  open,
  onClose,
  onConfirm,
  createType,
  setCreateType,
  snapshotOptions = [],
  underlyingOptions = []
}) {
  // ===== ESTADO LOCAL PADRE =====
  const [snapshotId, setSnapshotId] = useState('');
  const [underlyingId, setUnderlyingId] = useState('');
  const [parentDate, setParentDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );

  // ===== ESTADO LOCAL HIJO =====
  const [childStrike, setChildStrike] = useState('');
  const [childType, setChildType] = useState('');
  const [childExpiration, setChildExpiration] = useState('');
  const [childBid, setChildBid] = useState('');
  const [childAsk, setChildAsk] = useState('');
  const [childIv, setChildIv] = useState('');
  const [childDelta, setChildDelta] = useState('');
  const [childGamma, setChildGamma] = useState('');
  const [childTheta, setChildTheta] = useState('');
  const [childVega, setChildVega] = useState('');

  // Cuando se abre la modal, reseteamos campos
  useEffect(() => {
    if (open) {
      setSnapshotId('');
      setUnderlyingId('');
      setParentDate(new Date().toISOString().slice(0, 10));
      setChildStrike('');
      setChildType('');
      setChildExpiration('');
      setChildBid('');
      setChildAsk('');
      setChildIv('');
      setChildDelta('');
      setChildGamma('');
      setChildTheta('');
      setChildVega('');
    }
  }, [open]);

  const handleSwitch = (e) => {
    setCreateType(e.target.checked ? 'parent' : 'child');
  };

  const handleConfirmClick = () => {
    if (createType === 'parent') {
      onConfirm({
        createType: 'parent',
        snapshot: {
          snapshot_id: snapshotId,
          underlying_id: underlyingId,
          ts: parentDate
        }
      });
      return;
    }

    // HIJO
    let right = childType.trim().toUpperCase();
    if (right === 'CALL') right = 'C';
    else if (right === 'PUT') right = 'P';
    else if (right !== 'C' && right !== 'P') right = undefined;

    onConfirm({
      createType: 'child',
      item: {
        snapshot_id: snapshotId,
        option_id: underlyingId,
        strike: childStrike,
        right,
        expiration: childExpiration,
        bid: childBid,
        ask: childAsk,
        iv: childIv,
        delta: childDelta,
        gamma: childGamma,
        theta: childTheta,
        vega: childVega
      }
    });
  };

  return (
    <Dialog open={open} headerText="Crear nueva cadena de opciones" onAfterClose={onClose}>
      <div style={{ padding: '1rem 1.5rem', minWidth: '380px' }}>
        {/* Switch Padre/Hijo */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ transform: 'scale(1.6)', transformOrigin: 'center' }}>
            <Switch
              textOn="Padre"
              textOff="Hijo"
              checked={createType === 'parent'}
              onChange={handleSwitch}
              style={{ width: '120px', fontSize: '14px' }}
            />
          </div>
        </div>

        {/* ===== PADRE ===== */}
        {createType === 'parent' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <Label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Snapshot ID
              </Label>
              <Input
                value={snapshotId}
                onInput={(e) => setSnapshotId(e.target.value)}
                placeholder="Ingrese snapshot_id"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <Label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Underlying
              </Label>
              <ComboBox
                value={underlyingId}
                onChange={(e) => setUnderlyingId(e.target.value)}
                placeholder="Seleccione underlying"
              >
                {underlyingOptions.map((u) => (
                  <ComboBoxItem key={u} text={u} />
                ))}
              </ComboBox>
            </div>

            <div>
              <Label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Fecha del snapshot
              </Label>
              <DatePicker
                value={parentDate}
                formatPattern="yyyy-MM-dd"
                onChange={(e) => setParentDate(e.target.value || e.detail.value)}
              />
            </div>
          </>
        )}

        {/* ===== HIJO ===== */}
        {createType === 'child' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <Label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Snapshot ID
              </Label>
              <ComboBox
                value={snapshotId}
                onChange={(e) => setSnapshotId(e.target.value)}
                placeholder="Seleccione snapshot"
              >
                {snapshotOptions.map((s) => (
                  <ComboBoxItem key={s} text={s} />
                ))}
              </ComboBox>
            </div>

            <div>
              <Label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Underlying
              </Label>
              <ComboBox
                value={underlyingId}
                onChange={(e) => setUnderlyingId(e.target.value)}
                placeholder="Seleccione underlying"
              >
                {underlyingOptions.map((u) => (
                  <ComboBoxItem key={u} text={u} />
                ))}
              </ComboBox>
            </div>

            <Input
              value={childStrike}
              onInput={(e) => setChildStrike(e.target.value)}
              placeholder="Strike"
            />

            <Input
              value={childType}
              onInput={(e) => setChildType(e.target.value)}
              placeholder="Tipo (Call / Put / C / P)"
            />

            <div>
              <Label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Expiración
              </Label>
              <DatePicker
                value={childExpiration}
                formatPattern="yyyy-MM-dd"
                onChange={(e) => setChildExpiration(e.target.value || e.detail.value)}
              />
            </div>

            <Input value={childBid} onInput={(e) => setChildBid(e.target.value)} placeholder="Bid" />
            <Input value={childAsk} onInput={(e) => setChildAsk(e.target.value)} placeholder="Ask" />
            <Input value={childIv} onInput={(e) => setChildIv(e.target.value)} placeholder="IV %" />
            <Input
              value={childDelta}
              onInput={(e) => setChildDelta(e.target.value)}
              placeholder="Delta"
            />
            <Input
              value={childGamma}
              onInput={(e) => setChildGamma(e.target.value)}
              placeholder="Gamma"
            />
            <Input
              value={childTheta}
              onInput={(e) => setChildTheta(e.target.value)}
              placeholder="Theta"
            />
            <Input
              value={childVega}
              onInput={(e) => setChildVega(e.target.value)}
              placeholder="Vega"
            />
          </div>
        )}
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
        <Button design="Transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button design="Emphasized" onClick={handleConfirmClick}>
          Crear
        </Button>
      </div>
    </Dialog>
  );
}
