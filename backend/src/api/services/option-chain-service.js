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

  console.log(`🧩 Service processCrud >> ProcessType=${ProcessType}, User=${User}`);

  switch (ProcessType) {
    case 'GetAll':
      return await getAllSnapshots();

    case 'CreateSnapshot':
      return await createSnapshot(payload);

    case 'CreateSnapshotItem':
      return await createSnapshotItem(payload);

    case 'DeleteSnapshot':
      return await deleteSnapshot(payload);

    case 'DeleteSnapshotItem':
      return await deleteSnapshotItem(payload);

    default:
      throw new Error(`ProcessType '${ProcessType}' no es válido`);
  }
};

/* =====================================================================
   🔵 TU getAllSnapshots ORIGINAL (SIN CAMBIOS)
   ===================================================================== */
async function getAllSnapshots() {
  try {
    console.time('QueryTime'); 

    // 1. Traer PADRES
    const parents = await OptionChainSnapshot.find().sort({ ts: -1 }).lean();
    if (!parents.length) return [];

    // 2. Traer HIJOS
    const parentIds = parents.map(p => p.snapshot_id);
    const children = await OptionChainSnapshotItem.find({ 
        snapshot_id: { $in: parentIds } 
    }).lean();

    console.log(` Snapshots: ${parents.length} | Items: ${children.length}`);

    // 3. Agrupar HIJOS con MATCH EXACTO
    const childrenMap = {};
    
    children.forEach(child => {
        // CORRECCIÓN CRÍTICA: Usamos una llave compuesta (Snapshot + Underlying)
        // Como dijiste: child.option_id equivale a parent.underlying_id
        const key = `${child.snapshot_id}_${child.option_id}`; 
        
        if (!childrenMap[key]) childrenMap[key] = [];
        
        childrenMap[key].push({
            id: child._id.toString(),
            
            // Datos Financieros
            strike: child.strike,
            type: child.right === 'C' ? 'Call' : (child.right === 'P' ? 'Put' : child.right),
            bid: child.bid,
            ask: child.ask,
            iv: child.iv,
            expiration: child.expiration,

            // Griegas
            delta: child.delta,
            gamma: child.gamma,
            theta: child.theta,
            vega: child.vega,

            // Metadatos
            fullData: child, 
            hierarchyNode: `OPT-${child.option_id || 'N/A'}`, 
            level: 1,
            drilldownState: 'leaf'
        });
    });

    // 4. Estructura Final
    const result = parents.map(parent => {
        // CORRECCIÓN: Buscamos usando la misma llave compuesta
        const key = `${parent.snapshot_id}_${parent.underlying_id}`;
        
        // Ahora solo obtendremos los hijos que coincidan en AMBOS campos
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
            subRows: myChildren
        };
    });

    console.timeEnd('QueryTime');
    return result;

  } catch (error) {
    console.error("❌ Error en getAllSnapshots:", error);
    throw error;
  }
}

/* =====================================================================
   🟣 CREATE: SNAPSHOT (PADRE)
   ===================================================================== */
async function createSnapshot(body) {
  const { snapshot_id, underlying_id, ts } = body;

  if (snapshot_id == null) {
    throw new Error("snapshot_id es requerido para CreateSnapshot");
  }
  if (underlying_id == null) {
    throw new Error("underlying_id es requerido para CreateSnapshot");
  }

  const exists = await OptionChainSnapshot.findOne({ snapshot_id });
  if (exists) {
    throw new Error(`Ya existe snapshot_id ${snapshot_id}`);
  }

  const doc = await OptionChainSnapshot.create({
    snapshot_id,
    underlying_id,
    ts: ts ? new Date(ts) : new Date()
  });

  // Mapear a SnapshotVisual (action crud returns array of SnapshotVisual)
  const visual = {
    id: doc._id.toString(),
    hierarchyNode: doc.snapshot_id.toString(),
    description: `Snapshot ${doc.snapshot_id}`,
    level: 0,
    magnitude: '',
    status: 'NEW',
    drilldownState: 'leaf'
  };

  return [visual];
}

/* =====================================================================
   🟢 CREATE: SNAPSHOT ITEM (HIJO)
   ===================================================================== */
async function createSnapshotItem(body) {
  let {
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

  if (snapshot_id == null) {
    throw new Error("snapshot_id es requerido para CreateSnapshotItem");
  }
  if (option_id == null) {
    throw new Error("option_id es requerido para CreateSnapshotItem");
  }

  // Aceptar CALL/PUT o C/P
  if (right) {
    let r = String(right).trim().toUpperCase();
    if (r === 'CALL') r = 'C';
    if (r === 'PUT') r = 'P';
    if (!['C', 'P'].includes(r)) {
      throw new Error("right debe ser 'C' o 'P' (o Call/Put)");
    }
    right = r;
  }

  // Validar existencia del padre
  const parent = await OptionChainSnapshot.findOne({ snapshot_id });
  if (!parent) {
    throw new Error(`No existe Snapshot padre con snapshot_id = ${snapshot_id}`);
  }

  const doc = await OptionChainSnapshotItem.create({
    snapshot_id,
    option_id,
    strike,
    right,
    expiration: expiration ? new Date(expiration) : undefined,
    bid,
    ask,
    iv,
    delta,
    gamma,
    theta,
    vega
  });

  const visual = {
    id: doc._id.toString(),
    hierarchyNode: `OPT-${doc.option_id}`,
    description: `Option ${doc.option_id} @ ${doc.strike}`,
    level: 1,
    magnitude: '',
    status: 'NEW',
    drilldownState: 'leaf'
  };

  return [visual];
}

/* =====================================================================
   🔴 DELETE: SNAPSHOT ITEM (HIJO INDIVIDUAL)
   ===================================================================== */
async function deleteSnapshotItem(body) {
  const { item_id } = body;

  if (!item_id) {
    throw new Error("item_id es requerido para DeleteSnapshotItem");
  }

  const child = await OptionChainSnapshotItem.findById(item_id).lean();
  if (!child) {
    throw new Error(`No existe Snapshot Item con _id = ${item_id}`);
  }

  await OptionChainSnapshotItem.deleteOne({ _id: item_id });

  const visual = {
    id: item_id.toString(),
    hierarchyNode: `OPT-${child.option_id}`,
    description: `Deleted Option ${child.option_id} @ ${child.strike}`,
    level: 1,
    magnitude: '',
    status: 'DELETED',
    drilldownState: 'leaf'
  };

  return [visual];
}

/* =====================================================================
   🔴 DELETE: SNAPSHOT (PADRE + TODOS SUS HIJOS)
   ===================================================================== */
async function deleteSnapshot(body) {
  const { snapshot_id, underlying_id } = body;

  if (snapshot_id == null) {
    throw new Error("snapshot_id es requerido para DeleteSnapshot");
  }

  const parentFilter = { snapshot_id };
  if (underlying_id != null) {
    parentFilter.underlying_id = underlying_id;
  }

  const parent = await OptionChainSnapshot.findOne(parentFilter).lean();
  if (!parent) {
    throw new Error(`No existe Snapshot padre con snapshot_id = ${snapshot_id}`);
  }

  const snapId = parent.snapshot_id;
  const underId = parent.underlying_id;

  // Borrar TODOS los hijos con la clave compuesta snapshot_id + option_id
  const deleteResultChildren = await OptionChainSnapshotItem.deleteMany({
    snapshot_id: snapId,
    option_id: underId
  });

  console.log(
    `🗑️ DeleteSnapshot >> snapshot_id=${snapId}, underlying_id=${underId}, hijos borrados=${deleteResultChildren.deletedCount}`
  );

  await OptionChainSnapshot.deleteOne({ snapshot_id: snapId });

  const visual = {
    id: parent._id.toString(),
    hierarchyNode: parent.snapshot_id.toString(),
    description: `Deleted Snapshot ${parent.snapshot_id}`,
    level: 0,
    magnitude: '',
    status: 'DELETED',
    drilldownState: 'leaf'
  };

  return [visual];
}

module.exports = { processCrud };
