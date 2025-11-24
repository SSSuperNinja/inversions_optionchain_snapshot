const mongoose = require('mongoose');
const OptionChainSnapshot = require('../models/OptionChainSnapshot');
const OptionChainSnapshotItem = require('../models/OptionChainSnapshotItem');

const processCrud = async (req) => {
    try {
        console.log("🔍 DEBUG Service - req.data:", req.data);

        const { ProcessType, id, data } = req.data;
        
        const payload = data || req.data;

        console.log(`🔄 Service Dispatcher: ${ProcessType} para ID [${id}]`);
        console.log(`📋 Payload recibido:`, payload);

        // Validar que tengamos el ID
        if ((ProcessType === 'UpdateSnapshot' || ProcessType === 'UpdateItem') && !id) {
            console.error("❌ ID faltante en service");
            throw new Error(`Falta el ID para ${ProcessType}.`);
        }

        switch (ProcessType) {
            case 'GetAll':
                return await getAllSnapshots();
            
            case 'UpdateSnapshot':
                console.log(`🔧 Ejecutando UpdateSnapshot para ID: ${id}`);
                return await updateSnapshot(id, payload);

            case 'UpdateItem':
                console.log(`🔧 Ejecutando UpdateItem para ID: ${id}`);
                return await updateItem(id, payload);

            default:
                throw new Error(`ProcessType '${ProcessType}' no es válido`);
        }
    } catch (error) {
        console.error("❌ Error en processCrud:", error);
        throw error;
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

// --- ACTUALIZACIÓN POR ID ---
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
        throw error;
    }
}

// --- ACTUALIZACIÓN POR ID ---
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