const mongoose = require('mongoose');
const OptionChainSnapshot = require('../models/OptionChainSnapshot');
const OptionChainSnapshotItem = require('../models/OptionChainSnapshotItem');

// -------- Crud de Option Chains (backend) --------

const processCrud = async (req) => {
    try {
        console.log("🔍 DEBUG Service - req.data:", req.data);

        const { ProcessType, id, data, dbServer, User, ...payload } = req.data || {};
        
        // Usar payload si viene del formato de tu compañero, o data/id del tuyo
        const finalPayload = data || payload || req.data;
        const finalId = id || finalPayload.id;

        console.log(`🔄 Service Dispatcher: ${ProcessType} para ID [${finalId}]`);
        console.log(`📋 Payload recibido:`, finalPayload);

        // Validar que tengamos el ID para operaciones que lo requieren
        if ((ProcessType === 'UpdateSnapshot' || ProcessType === 'UpdateItem') && !finalId) {
            console.error("❌ ID faltante en service");
            throw new Error(`Falta el ID para ${ProcessType}.`);
        }

        // Validar dbServer (de tu compañero)
        if (dbServer && dbServer.toLowerCase() !== 'mongodb') {
            throw new Error(`dbServer '${dbServer}' no soportado`);
        }

        console.log(`🧩 Service processCrud >> ProcessType=${ProcessType}, User=${User}`);

        switch (ProcessType) {
            case 'GetAll':
                return await getAllSnapshots();
            
            case 'UpdateSnapshot':
                console.log(`🔧 Ejecutando UpdateSnapshot para ID: ${finalId}`);
                return await updateSnapshot(finalId, finalPayload);

            case 'UpdateItem':
                console.log(`🔧 Ejecutando UpdateItem para ID: ${finalId}`);
                return await updateItem(finalId, finalPayload);

            case 'CreateSnapshot':
                return await createSnapshot(finalPayload);

            case 'CreateSnapshotItem':
                return await createSnapshotItem(finalPayload);

            case 'DeleteSnapshot':
                return await deleteSnapshot(finalPayload);

            case 'DeleteSnapshotItem':
                return await deleteSnapshotItem(finalPayload);

            default:
                throw new Error(`ProcessType '${ProcessType}' no es válido`);
        }
    } catch (error) {
        console.error("❌ Error en processCrud:", error);
        throw error;
    }
};

// --- FUNCIÓN GET ALL SNAPSHOTS MEJORADA (FUSIÓN) ---
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

        console.log(`📊 Snapshots: ${parents.length} | Items: ${children.length}`);

        // 3. Agrupar HIJOS con MATCH EXACTO
        const childrenMap = {};
        
        children.forEach(child => {
            const key = `${child.snapshot_id}_${child.option_id}`; 
            
            if (!childrenMap[key]) childrenMap[key] = [];
            
            childrenMap[key].push({
                id: child._id.toString(),
                
                // Datos Financieros (de tu compañero)
                strike: child.strike,
                type: child.right === 'C' ? 'Call' : (child.right === 'P' ? 'Put' : child.right),
                bid: child.bid,
                ask: child.ask,
                iv: child.iv,
                expiration: child.expiration,

                // Griegas (de tu compañero)
                delta: child.delta,
                gamma: child.gamma,
                theta: child.theta,
                vega: child.vega,

                // Campos originales (de tu versión)
                ...child,
                fullData: child, 
                hierarchyNode: `OPT-${child.option_id || 'N/A'}`, 
                level: 1,
                drilldownState: 'leaf'
            });
        });

        // 4. Estructura Final
        const result = parents.map(parent => {
            const key = `${parent.snapshot_id}_${parent.underlying_id}`;
            const myChildren = childrenMap[key] || [];

            return {
                id: parent._id.toString(),
                // Campos principales
                snapshot_id: parent.snapshot_id,
                underlying_id: parent.underlying_id,
                ts: parent.ts,
                // Campos adicionales del padre si existen
                ...parent,
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

// --- ACTUALIZACIÓN POR ID (DE TU VERSIÓN, MEJORADAS) ---
async function updateSnapshot(id, data) {
    try {
        console.log(`📝 Update Snapshot [${id}]`, data);
        
        // Convertir el id a ObjectId
        const objectId = new mongoose.Types.ObjectId(id);

        // Obtener el snapshot actual
        const currentSnapshot = await OptionChainSnapshot.findById(objectId);
        if (!currentSnapshot) throw new Error("Snapshot original no encontrado.");

        const currentSid = currentSnapshot.snapshot_id;
        const currentUid = currentSnapshot.underlying_id;

        // Determinar nuevos IDs (si vienen en data)
        const newSid = data.snapshot_id !== undefined ? Number(data.snapshot_id) : currentSid;
        const newUid = data.underlying_id !== undefined ? Number(data.underlying_id) : currentUid;

        // VALIDACIÓN: Si los IDs cambiaron, verificar que la nueva combinación no exista
        if (newSid !== currentSid || newUid !== currentUid) {
            const exists = await OptionChainSnapshot.findOne({ 
                snapshot_id: newSid, 
                underlying_id: newUid,
                _id: { $ne: objectId } // Excluir el documento actual
            });
            
            if (exists) {
                throw new Error(`Error: Ya existe un Snapshot con ID ${newSid} y Underlying ${newUid}.`);
            }
        }

        const updated = await OptionChainSnapshot.findByIdAndUpdate(
            objectId, 
            { $set: data }, 
            { new: true, lean: true } 
        );

        if (!updated) throw new Error("Error al actualizar el snapshot.");
        
        // Mapeo seguro manteniendo estructura compatible
        const result = {
            ...updated,
            id: updated._id.toString(),
            hierarchyNode: updated.snapshot_id.toString(),
            description: `Snapshot ${updated.snapshot_id}`,
            level: 0,
            drilldownState: 'collapsed'
        };

        return [result];
    } catch (error) {
        console.error("Error UpdateSnapshot:", error.message);
        throw error;
    }
}

async function updateItem(id, data) {
    try {
        console.log(`📝 Update Item por ID [${id}]`, data);

        // Convertir el id a ObjectId
        const objectId = new mongoose.Types.ObjectId(id);

        const updated = await OptionChainSnapshotItem.findByIdAndUpdate(
            objectId, 
            { $set: data }, 
            { new: true, lean: true } 
        );

        if (!updated) throw new Error("Item no encontrado.");

        // Mapeo seguro manteniendo estructura compatible con getAllSnapshots
        const result = {
            ...updated,
            id: updated._id.toString(),
            // Datos financieros y griegas
            strike: updated.strike,
            type: updated.right === 'C' ? 'Call' : 'Put',
            bid: updated.bid,
            ask: updated.ask,
            iv: updated.iv,
            expiration: updated.expiration,
            delta: updated.delta,
            gamma: updated.gamma,
            theta: updated.theta,
            vega: updated.vega,
            hierarchyNode: `OPT-${updated.option_id}`,
            level: 1,
            drilldownState: 'leaf'
        };

        return [result];
    } catch (error) {
        console.error("Error UpdateItem:", error.message);
        throw error;
    }
}

// --- CREACIÓN (DE TU COMPAÑERO) ---
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

    // Mapear a estructura compatible
    const visual = {
        id: doc._id.toString(),
        hierarchyNode: doc.snapshot_id.toString(),
        description: `Snapshot ${doc.snapshot_id}`,
        level: 0,
        magnitude: '',
        status: 'NEW',
        drilldownState: 'leaf',
        snapshot_id: doc.snapshot_id,
        underlying_id: doc.underlying_id,
        ts: doc.ts
    };

    return [visual];
}

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
        drilldownState: 'leaf',
        snapshot_id: doc.snapshot_id,
        option_id: doc.option_id,
        strike: doc.strike,
        right: doc.right,
        expiration: doc.expiration,
        bid: doc.bid,
        ask: doc.ask,
        iv: doc.iv,
        delta: doc.delta,
        gamma: doc.gamma,
        theta: doc.theta,
        vega: doc.vega
    };

    return [visual];
}

// --- ELIMINACIÓN (DE TU COMPAÑERO) ---
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