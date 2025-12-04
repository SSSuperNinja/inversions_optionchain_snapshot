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
  underlyingOptions = [],
  childUnderlyingMap = {} // 👈 NUEVO: mapa snapshot_id -> [underlying_id...]
}) {
  // ===== ESTADO LOCAL PADRE =====
  const [snapshotId, setSnapshotId] = useState('');
  const [underlyingId, setUnderlyingId] = useState('');
  const [parentDate, setParentDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );

  // ===== ESTADO LOCAL HIJO =====
  const [childStrike, setChildStrike] = useState('');
  const [childType, setChildType] = useState(''); // 'C' | 'P'
  const [childExpiration, setChildExpiration] = useState('');
  const [childBid, setChildBid] = useState('');
  const [childAsk, setChildAsk] = useState('');
  const [childIv, setChildIv] = useState('');
  const [childDelta, setChildDelta] = useState('');
  const [childGamma, setChildGamma] = useState('');
  const [childTheta, setChildTheta] = useState('');
  const [childVega, setChildVega] = useState('');

  // Lista filtrada de underlyings para el hijo
  const [childUnderlyingList, setChildUnderlyingList] = useState([]);

  // Reset cuando se abre la modal
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
      setChildUnderlyingList([]);
    }
  }, [open]);

  // Cuando cambia el tipo de creación o el snapshot del hijo,
  // filtramos underlyings válidos para ese snapshot.
  useEffect(() => {
    if (createType === 'child') {
      const key = String(snapshotId || '');
      const list = childUnderlyingMap[key] || [];
      setChildUnderlyingList(list);

      // Si el underlying seleccionado ya no está en la lista, lo limpiamos
      if (
        underlyingId &&
        !list.includes(Number(underlyingId)) &&
        !list.includes(underlyingId)
      ) {
        setUnderlyingId('');
      }
    } else {
      // Si estamos en modo padre, la lista filtrada no importa
      setChildUnderlyingList([]);
    }
  }, [createType, snapshotId, childUnderlyingMap, underlyingId]);

  const handleSwitch = (e) => {
    setCreateType(e.target.checked ? 'parent' : 'child');
  };

  const extractComboValue = (e) => {
    const d = e.detail || {};
    const t = e.target || {};
    return (
      d.value ||
      (d.item && d.item.text) ||
      (d.selectedOption && d.selectedOption.textContent) ||
      t.value ||
      ''
    );
  };

  const handleParentUnderlyingChange = (e) => {
    setUnderlyingId(extractComboValue(e));
  };

  const handleChildSnapshotChange = (e) => {
    const value = extractComboValue(e);
    setSnapshotId(value);
  };

  const handleChildUnderlyingChange = (e) => {
    setUnderlyingId(extractComboValue(e));
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

    // HIJO: tipo C/P viene del ComboBox
    const right = childType === 'C' || childType === 'P' ? childType : undefined;

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
                placeholder="Seleccione underlying"
                onChange={handleParentUnderlyingChange}
                onSelectionChange={handleParentUnderlyingChange}
                onInput={handleParentUnderlyingChange}
              >
                {underlyingOptions.map((u) => (
                  <ComboBoxItem key={u} text={String(u)} />
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
                onChange={(e) => setParentDate(e.detail.value || e.target.value)}
              />
            </div>
          </>
        )}

        {/* ===== HIJO ===== */}
        {createType === 'child' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Snapshot ID del hijo */}
            <div>
              <Label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Snapshot ID
              </Label>
              <ComboBox
                value={snapshotId}
                placeholder="Seleccione snapshot"
                onChange={handleChildSnapshotChange}
                onSelectionChange={handleChildSnapshotChange}
                onInput={handleChildSnapshotChange}
              >
                {snapshotOptions.map((s) => (
                  <ComboBoxItem key={s} text={String(s)} />
                ))}
              </ComboBox>
            </div>

            {/* Underlying del hijo filtrado por snapshot */}
            <div>
              <Label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Underlying (filtrado por snapshot)
              </Label>
              <ComboBox
                value={underlyingId}
                placeholder={
                  childUnderlyingList.length
                    ? 'Seleccione underlying'
                    : 'No hay underlyings para este snapshot'
                }
                onChange={handleChildUnderlyingChange}
                onSelectionChange={handleChildUnderlyingChange}
                onInput={handleChildUnderlyingChange}
              >
                {childUnderlyingList.map((u) => (
                  <ComboBoxItem key={u} text={String(u)} />
                ))}
              </ComboBox>
            </div>

            <Input
              value={childStrike}
              onInput={(e) => setChildStrike(e.target.value)}
              placeholder="Strike"
            />

            {/* Tipo como ComboBox C/P */}
            <div>
              <Label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Tipo (C / P)
              </Label>

              <ComboBox
                value={childType}
                placeholder="Seleccione tipo"
                onChange={(e) =>
                  setChildType(e.detail.value || e.detail.item?.text || '')
                }
                onSelectionChange={(e) =>
                  setChildType(e.detail.value || e.detail.item?.text || '')
                }
              >
                <ComboBoxItem text="C" />
                <ComboBoxItem text="P" />
              </ComboBox>
            </div>

            <div>
              <Label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Expiración
              </Label>
              <DatePicker
                value={childExpiration}
                formatPattern="yyyy-MM-dd"
                onChange={(e) =>
                  setChildExpiration(e.detail.value || e.target.value)
                }
              />
            </div>

            <Input value={childBid} onInput={(e) => setChildBid(e.target.value)} placeholder="Bid" />
            <Input value={childAsk} onInput={(e) => setChildAsk(e.target.value)} placeholder="Ask" />
            <Input value={childIv} onInput={(e) => setChildIv(e.target.value)} placeholder="IV %" />
            <Input value={childDelta} onInput={(e) => setChildDelta(e.target.value)} placeholder="Delta" />
            <Input value={childGamma} onInput={(e) => setChildGamma(e.target.value)} placeholder="Gamma" />
            <Input value={childTheta} onInput={(e) => setChildTheta(e.target.value)} placeholder="Theta" />
            <Input value={childVega} onInput={(e) => setChildVega(e.target.value)} placeholder="Vega" />
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
