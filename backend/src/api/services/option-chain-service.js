const OptionChainSnapshot = require('../models/OptionChainSnapshot');
const OptionChainSnapshotItem = require('../models/OptionChainSnapshotItem');

const processCrud = async (req) => {
    // 1. Extraer datos con seguridad
    const { ProcessType } = req.data;
    
    const payload = (typeof req.data.data === 'string' && req.data.data) 
        ? JSON.parse(req.data.data) 
        : req.data.data || req.data;

    console.log(`🔄 Service Dispatcher: ${ProcessType}`);

    switch (ProcessType) {
        case 'GetAll':
            return await getAllSnapshots();
        
        case 'UpdateSnapshot':
            if (!req.data.snapshot_id || !req.data.underlying_id) {
                throw new Error("Faltan llaves (snapshot_id, underlying_id) para UpdateSnapshot.");
            }
            return await updateSnapshot(req.data.snapshot_id, req.data.underlying_id, payload);

        case 'UpdateItem':
            if (!req.data.snapshot_id || !req.data.option_id) {
                throw new Error("Faltan llaves (snapshot_id, option_id) para UpdateItem.");
            }
            return await updateItem(req.data.snapshot_id, req.data.option_id, payload);

        default:
            throw new Error(`ProcessType '${ProcessType}' no es válido`);
    }
};

// --- 1. LECTURA (GET ALL) ---
async function getAllSnapshots() {
    try {
        const parents = await OptionChainSnapshot.find().sort({ ts: -1 }).lean();
        if (!parents.length) return [];

        const parentIds = parents.map(p => p.snapshot_id);
        const children = await OptionChainSnapshotItem.find({ 
            snapshot_id: { $in: parentIds } 
        }).lean();

        const childrenMap = {};
        children.forEach(child => {
            const key = `${child.snapshot_id}_${child.option_id}`; 
            if (!childrenMap[key]) childrenMap[key] = [];
            
            childrenMap[key].push({
                id: child._id.toString(),
                ...child, 
                type: child.right === 'C' ? 'Call' : (child.right === 'P' ? 'Put' : child.right),
                fullData: child, 
                hierarchyNode: `OPT-${child.option_id}`, 
                level: 1, 
                drilldownState: 'leaf'
            });
        });

        return parents.map(parent => {
            const key = `${parent.snapshot_id}_${parent.underlying_id}`;
            const myChildren = childrenMap[key] || [];

            return {
                id: parent._id.toString(),
                ...parent, 
                fullData: parent, 
                hierarchyNode: parent.snapshot_id.toString(),
                description: `Snapshot ${parent.snapshot_id}`, 
                level: 0,
                drilldownState: myChildren.length > 0 ? 'collapsed' : 'leaf',
                subRows: myChildren
            };
        });
    } catch (error) {
        console.error("❌ Error en getAllSnapshots:", error);
        throw error;
    }
}

// --- 2. ACTUALIZACIÓN PADRE (SNAPSHOT) CON VALIDACIÓN ---
async function updateSnapshot(sid, uid, data) {
    try {
        console.log(`📝 Update Snapshot [${sid}-${uid}]`, data);
        
        const currentSid = Number(sid);
        const currentUid = Number(uid);

        // Determinar nuevos IDs (si vienen en data, si no, se mantienen los actuales)
        const newSid = data.snapshot_id !== undefined ? Number(data.snapshot_id) : currentSid;
        const newUid = data.underlying_id !== undefined ? Number(data.underlying_id) : currentUid;

        // VALIDACIÓN: Si los IDs cambiaron, verificar que la nueva combinación no exista
        if (newSid !== currentSid || newUid !== currentUid) {
            const exists = await OptionChainSnapshot.exists({ 
                snapshot_id: newSid, 
                underlying_id: newUid 
            });
            
            if (exists) {
                throw new Error(`Error: Ya existe un Snapshot con ID ${newSid} y Underlying ${newUid}.`);
            }
        }

        const updated = await OptionChainSnapshot.findOneAndUpdate(
            { snapshot_id: currentSid, underlying_id: currentUid }, 
            { $set: data }, 
            { new: true, lean: true } 
        );

        if (!updated) throw new Error("Snapshot original no encontrado.");
        
        // Mapeo seguro
        const result = {
            ...updated,
            id: updated._id.toString(),
            hierarchyNode: updated.snapshot_id.toString(),
            level: 0,
            drilldownState: 'collapsed'
        };

        return [result];
    } catch (error) {
        console.error("Error UpdateSnapshot:", error.message);
        throw error; // Re-lanzamos para que CAP devuelva el error al cliente
    }
}

// --- 3. ACTUALIZACIÓN HIJO (ITEM) CON VALIDACIÓN ---
async function updateItem(sid, oid, data) {
    try {
        console.log(`📝 Update Item [${sid}-${oid}]`, data);

        const currentSid = Number(sid);
        const currentOid = Number(oid);

        // Determinar nuevos IDs
        const newSid = data.snapshot_id !== undefined ? Number(data.snapshot_id) : currentSid;
        const newOid = data.option_id !== undefined ? Number(data.option_id) : currentOid;

        // VALIDACIÓN: Si los IDs cambiaron, verificar colisión
        if (newSid !== currentSid || newOid !== currentOid) {
            const exists = await OptionChainSnapshotItem.exists({ 
                snapshot_id: newSid, 
                option_id: newOid 
            });
            
            if (exists) {
                throw new Error(`Error: Ya existe un Item con Snapshot ${newSid} y Option ${newOid}.`);
            }
        }

        const updated = await OptionChainSnapshotItem.findOneAndUpdate(
            { snapshot_id: currentSid, option_id: currentOid }, 
            { $set: data }, 
            { new: true, lean: true } 
        );

        if (!updated) throw new Error("Item original no encontrado.");

        // Mapeo seguro
        const result = {
            ...updated,
            id: updated._id.toString(),
            type: updated.right === 'C' ? 'Call' : 'Put',
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

module.exports = { processCrud };