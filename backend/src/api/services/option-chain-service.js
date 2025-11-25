// backend/src/api/services/option-chain-service.js

// ✅ Tomamos directamente los modelos que exportan los archivos
const OptionChainSnapshot = require('../models/OptionChainSnapshot');
const OptionChainSnapshotItem = require('../models/OptionChainSnapshotItem');

/**
 * Dispatcher principal
 * El controller CAP arma req.data con:
 *  - ProcessType, dbServer, User
 *  - + todos los campos de payload (snapshot_id, option_id, etc.)
 */
const processCrud = async (req) => {
  const { ProcessType, dbServer, User, ...payload } = req.data || {};

  if (dbServer && dbServer.toLowerCase() !== 'mongodb') {
    throw new Error(`dbServer '${dbServer}' no soportado`);
  }

  switch (ProcessType) {
    case 'GetAll':
      return await getAllSnapshots();

    case 'CreateSnapshot':
      return await createSnapshot(payload);

    case 'CreateSnapshotItem':
      return await createSnapshotItem(payload);

    case 'UpdateSnapshot':
      return await updateSnapshot(payload);

    case 'UpdateSnapshotItem':
      return await updateSnapshotItem(payload);

    case 'DeleteSnapshot':
      return await deleteSnapshot(payload);

    case 'DeleteSnapshotItem':
      return await deleteSnapshotItem(payload);

    default:
      throw new Error(`ProcessType '${ProcessType}' no es válido`);
  }
};

/* =====================================================================
   GET ALL: Regresa padres + hijos en estructura jerárquica (VERSIÓN ORIGINAL)
===================================================================== */
async function getAllSnapshots() {
  try {
    console.time('QueryTime');

    // 1. Traer PADRES
    const parents = await OptionChainSnapshot.find().sort({ ts: -1 }).lean();
    if (!parents.length) {
      console.timeEnd('QueryTime');
      return [];
    }

    // 2. Traer HIJOS (por snapshot_id)
    const parentIds = parents.map((p) => p.snapshot_id);
    const children = await OptionChainSnapshotItem.find({
      snapshot_id: { $in: parentIds }
    }).lean();

    console.log(
      `📊 Snapshots: ${parents.length} | Items: ${children.length}`
    );

    // 3. Agrupar hijos por clave compuesta: snapshot_id + option_id (underlying)
    const childrenMap = {};

    children.forEach((child) => {
      // child.option_id ≈ parent.underlying_id
      const key = `${child.snapshot_id}_${child.option_id}`;
      if (!childrenMap[key]) childrenMap[key] = [];

      childrenMap[key].push({
        id: child._id.toString(),

        snapshot_id: child.snapshot_id,
        option_id: child.option_id,

        // Datos financieros
        strike: child.strike,
        right: child.right,
        type:
          child.right === 'C'
            ? 'Call'
            : child.right === 'P'
            ? 'Put'
            : child.right,
        expiration: child.expiration,

        bid: child.bid,
        ask: child.ask,
        iv: child.iv,

        delta: child.delta,
        gamma: child.gamma,
        theta: child.theta,
        vega: child.vega,

        fullData: child,
        hierarchyNode: `OPT-${child.option_id || 'N/A'}`,
        description: `Option ${child.option_id} @ ${child.strike}`,
        level: 1,
        drilldownState: 'leaf',
        status: 'OK',
        magnitude: ''
      });
    });

    // 4. Estructura final: padres + subRows
    const result = parents.map((parent) => {
      const key = `${parent.snapshot_id}_${parent.underlying_id}`;
      const myChildren = childrenMap[key] || [];

      return {
        id: parent._id.toString(),

        snapshot_id: parent.snapshot_id,
        underlying_id: parent.underlying_id,
        ts: parent.ts,

        fullData: parent,
        hierarchyNode: parent.snapshot_id.toString(),
        description: `Snapshot ${parent.snapshot_id}`,
        level: 0,
        drilldownState: myChildren.length > 0 ? 'collapsed' : 'leaf',
        subRows: myChildren,
        status: 'OK',
        magnitude: ''
      };
    });

    console.timeEnd('QueryTime');
    return result;
  } catch (error) {
    console.error('❌ Error en getAllSnapshots:', error);
    throw error;
  }
}

/* =====================================================================
   CREATE SNAPSHOT (PADRE)
===================================================================== */
async function createSnapshot(body) {
  const { snapshot_id, underlying_id, ts } = body;

  if (snapshot_id == null || underlying_id == null || !ts) {
    throw new Error(
      'snapshot_id, underlying_id y ts son requeridos en CreateSnapshot'
    );
  }

  const created = await OptionChainSnapshot.create({
    snapshot_id: Number(snapshot_id),
    underlying_id: Number(underlying_id),
    ts: new Date(ts)
  });

  const visual = {
    id: created._id.toString(),
    snapshot_id: created.snapshot_id,
    underlying_id: created.underlying_id,
    ts: created.ts,
    fullData: created.toObject(),
    hierarchyNode: created.snapshot_id.toString(),
    description: `Snapshot ${created.snapshot_id}`,
    level: 0,
    drilldownState: 'leaf',
    subRows: [],
    status: 'CREATED',
    magnitude: ''
  };

  return [visual];
}

/* =====================================================================
   CREATE SNAPSHOT ITEM (HIJO)
===================================================================== */
async function createSnapshotItem(body) {
  const {
    snapshot_id,
    option_id,
    strike,
    right,
    expiration,
    bid,
    ask,
    iv,
    delta,
    gamma,
    theta,
    vega
  } = body;

  if (snapshot_id == null || option_id == null) {
    throw new Error(
      'snapshot_id y option_id son requeridos en CreateSnapshotItem'
    );
  }

  let r = right;
  if (r) {
    r = String(r).trim().toUpperCase();
    if (r === 'CALL') r = 'C';
    if (r === 'PUT') r = 'P';
  }

  const created = await OptionChainSnapshotItem.create({
    snapshot_id: Number(snapshot_id),
    option_id: Number(option_id),
    strike: strike != null ? Number(strike) : undefined,
    right: r,
    expiration: expiration ? new Date(expiration) : undefined,
    bid: bid != null ? Number(bid) : undefined,
    ask: ask != null ? Number(ask) : undefined,
    iv: iv != null ? Number(iv) : undefined,
    delta: delta != null ? Number(delta) : undefined,
    gamma: gamma != null ? Number(gamma) : undefined,
    theta: theta != null ? Number(theta) : undefined,
    vega: vega != null ? Number(vega) : undefined
  });

  const visual = {
    id: created._id.toString(),
    snapshot_id: created.snapshot_id,
    option_id: created.option_id,
    strike: created.strike,
    right: created.right,
    type:
      created.right === 'C'
        ? 'Call'
        : created.right === 'P'
        ? 'Put'
        : created.right,
    expiration: created.expiration,
    bid: created.bid,
    ask: created.ask,
    iv: created.iv,
    delta: created.delta,
    gamma: created.gamma,
    theta: created.theta,
    vega: created.vega,
    fullData: created.toObject(),
    hierarchyNode: `OPT-${created.option_id}`,
    description: `Option ${created.option_id} @ ${created.strike}`,
    level: 1,
    drilldownState: 'leaf',
    status: 'CREATED',
    magnitude: ''
  };

  return [visual];
}

/* =====================================================================
   UPDATE SNAPSHOT (PADRE) + CASCADA A HIJOS
===================================================================== */
async function updateSnapshot(body) {
  const { id, snapshot_id, underlying_id, ts } = body;

  if (!id) {
    throw new Error('id requerido en UpdateSnapshot');
  }

  // 1) Leer padre actual
  const current = await OptionChainSnapshot.findById(id).lean();
  if (!current) {
    throw new Error(`No se encontró Snapshot con _id = ${id}`);
  }

  const oldSnapshotId = current.snapshot_id;
  const oldUnderlyingId = current.underlying_id;

  // 2) Construir update
  const update = {};
  if (snapshot_id != null) update.snapshot_id = Number(snapshot_id);
  if (underlying_id != null) update.underlying_id = Number(underlying_id);
  if (ts != null) update.ts = new Date(ts);

  if (Object.keys(update).length === 0) {
    throw new Error('No se enviaron campos a actualizar en UpdateSnapshot');
  }

  // 3) Actualizar padre
  const updated = await OptionChainSnapshot.findByIdAndUpdate(id, update, {
    new: true
  }).lean();

  if (!updated) {
    throw new Error(`No se pudo actualizar Snapshot con _id = ${id}`);
  }

  const newSnapshotId = updated.snapshot_id;
  const newUnderlyingId = updated.underlying_id;

  // 4) Si cambió snapshot_id o underlying_id → CASCADA a hijos
  const snapshotChanged = newSnapshotId !== oldSnapshotId;
  const underlyingChanged = newUnderlyingId !== oldUnderlyingId;

  if (snapshotChanged || underlyingChanged) {
    await OptionChainSnapshotItem.updateMany(
      {
        snapshot_id: oldSnapshotId,
        option_id: oldUnderlyingId // hijos del padre previo
      },
      {
        $set: {
          snapshot_id: newSnapshotId,
          option_id: newUnderlyingId
        }
      }
    );
  }

  // 5) Visual de respuesta
  const visual = {
    id: updated._id.toString(),
    snapshot_id: updated.snapshot_id,
    underlying_id: updated.underlying_id,
    ts: updated.ts,
    fullData: updated,
    hierarchyNode: updated.snapshot_id.toString(),
    description: `Updated Snapshot ${updated.snapshot_id}`,
    level: 0,
    drilldownState: 'collapsed',
    status: 'UPDATED',
    magnitude: ''
  };

  return [visual];
}

/* =====================================================================
   UPDATE SNAPSHOT ITEM (HIJO)
===================================================================== */
async function updateSnapshotItem(body) {
  const {
    id,
    snapshot_id,
    option_id,
    strike,
    right,
    expiration,
    bid,
    ask,
    iv,
    delta,
    gamma,
    theta,
    vega
  } = body;

  if (!id) {
    throw new Error(
      'id (Mongo _id del hijo) es requerido en UpdateSnapshotItem'
    );
  }

  const update = {};

  if (snapshot_id != null) update.snapshot_id = Number(snapshot_id);
  if (option_id != null) update.option_id = Number(option_id);
  if (strike != null) update.strike = Number(strike);

  if (right != null) {
    let r = String(right).trim().toUpperCase();
    if (r === 'CALL') r = 'C';
    if (r === 'PUT') r = 'P';
    if (r === 'C' || r === 'P') update.right = r;
  }

  if (expiration != null) update.expiration = new Date(expiration);
  if (bid != null) update.bid = Number(bid);
  if (ask != null) update.ask = Number(ask);
  if (iv != null) update.iv = Number(iv);
  if (delta != null) update.delta = Number(delta);
  if (gamma != null) update.gamma = Number(gamma);
  if (theta != null) update.theta = Number(theta);
  if (vega != null) update.vega = Number(vega);

  if (Object.keys(update).length === 0) {
    throw new Error('No se enviaron campos a actualizar en UpdateSnapshotItem');
  }

  const updated = await OptionChainSnapshotItem.findByIdAndUpdate(id, update, {
    new: true
  }).lean();

  if (!updated) {
    throw new Error(`No se encontró SnapshotItem con _id = ${id}`);
  }

  const visual = {
    id: updated._id.toString(),
    snapshot_id: updated.snapshot_id,
    option_id: updated.option_id,
    strike: updated.strike,
    right: updated.right,
    type:
      updated.right === 'C'
        ? 'Call'
        : updated.right === 'P'
        ? 'Put'
        : updated.right,
    expiration: updated.expiration,
    bid: updated.bid,
    ask: updated.ask,
    iv: updated.iv,
    delta: updated.delta,
    gamma: updated.gamma,
    theta: updated.theta,
    vega: updated.vega,
    fullData: updated,
    hierarchyNode: `OPT-${updated.option_id}`,
    description: `Updated Option ${updated.option_id} @ ${updated.strike}`,
    level: 1,
    drilldownState: 'leaf',
    status: 'UPDATED',
    magnitude: ''
  };

  return [visual];
}

/* =====================================================================
   DELETE SNAPSHOT (PADRE) + HIJOS (clave compuesta)
===================================================================== */
async function deleteSnapshot(body) {
  const { snapshot_id, underlying_id } = body;

  if (snapshot_id == null || underlying_id == null) {
    throw new Error(
      'snapshot_id y underlying_id son requeridos en DeleteSnapshot'
    );
  }

  const snapId = Number(snapshot_id);
  const undId = Number(underlying_id);

  await OptionChainSnapshot.deleteOne({
    snapshot_id: snapId,
    underlying_id: undId
  });

  await OptionChainSnapshotItem.deleteMany({
    snapshot_id: snapId,
    option_id: undId
  });

  const visual = {
    id: `${snapId}_${undId}`,
    hierarchyNode: snapId.toString(),
    description: `Deleted Snapshot ${snapId}`,
    level: 0,
    magnitude: '',
    status: 'DELETED',
    drilldownState: 'leaf'
  };

  return [visual];
}

/* =====================================================================
   DELETE SNAPSHOT ITEM (HIJO)
===================================================================== */
async function deleteSnapshotItem(body) {
  const { item_id } = body;

  if (!item_id) {
    throw new Error('item_id requerido en DeleteSnapshotItem');
  }

  await OptionChainSnapshotItem.findByIdAndDelete(item_id);

  return [
    {
      id: item_id,
      status: 'DELETED',
      level: 1,
      description: `Deleted item ${item_id}`,
      drilldownState: 'leaf',
      magnitude: ''
    }
  ];
}

module.exports = { processCrud };
