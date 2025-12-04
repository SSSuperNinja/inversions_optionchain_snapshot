const mongoose = require('mongoose');
const OptionChainSnapshot = require('../models/OptionChainSnapshot');
const OptionChainSnapshotItem = require('../models/OptionChainSnapshotItem');
const { snapshotsContainer, itemsContainer } = require('../../config/connectToCosmos');

// -------- Crud de Option Chains (backend) --------

const processCrud = async (req) => {
    try {
        const { ProcessType, id, data, dbServer, User, ...payload } = req.data || {};
        
        // Unificar payload
        const finalPayload = { 
            ...req.data,       
            ...(data || {})    
        };
        const finalId = id || finalPayload.id;

        // 2. VALIDACIÓN DE dbServer
        if (dbServer && dbServer !== 'MongoDB' && dbServer !== 'AzureCosmos') {
            throw new Error(`dbServer '${dbServer}' no soportado. Use 'MongoDB' o 'AzureCosmos'.`);
        }

        const isAzure = dbServer === 'AzureCosmos';
        console.log(`🔄 Service: ${ProcessType} [${isAzure ? 'AzureCosmos' : 'MongoDB'}]`);

        switch (ProcessType) {
            case 'GetAll':
                return isAzure ? await getAllSnapshotsAzure() : await getAllSnapshots();
            
            case 'UpdateSnapshot':
                return isAzure 
                    ? await updateSnapshotAzure(finalId, finalPayload) 
                    : await updateSnapshot(finalId, finalPayload);

            case 'UpdateItem':
                return isAzure 
                    ? await updateItemAzure(finalId, finalPayload) 
                    : await updateItem(finalId, finalPayload);

            case 'CreateSnapshot':
                return isAzure 
                    ? await createSnapshotAzure(finalPayload) 
                    : await createSnapshot(finalPayload);

            case 'CreateSnapshotItem':
                return isAzure 
                    ? await createSnapshotItemAzure(finalPayload) 
                    : await createSnapshotItem(finalPayload);

            case 'DeleteSnapshot':
                return isAzure 
                    ? await deleteSnapshotAzure(finalPayload) 
                    : await deleteSnapshot(finalPayload);

            case 'DeleteSnapshotItem':
                return isAzure 
                    ? await deleteSnapshotItemAzure(finalId)
                    : await deleteSnapshotItem(finalPayload);

            default:
                throw new Error(`ProcessType '${ProcessType}' no es válido`);
        }
    } catch (error) {
        console.error("❌ Error en processCrud:", error);
        throw error;
    }
};

// ==========================================
// Funciones para AZURE
// ==========================================
async function getAllSnapshotsAzure() {
    try {
        console.time('AzureQueryTime');
        console.log("☁️ Consultando Azure Cosmos DB...");

        // 1. Traer PADRES (Snapshots)
        // Nota: En NoSQL se usa sintaxis SQL-like: "SELECT * FROM c"
        const { resources: parents } = await snapshotsContainer.items
            .query("SELECT * FROM c ORDER BY c.ts DESC")
            .fetchAll();

        if (!parents || parents.length === 0) {
            console.log("☁️ Azure: No se encontraron snapshots padres.");
            return [];
        }

        // 2. Traer HIJOS (Items)
        // Optimizacion: Traer solo items que pertenezcan a los snapshots encontrados
        const parentIds = parents.map(p => p.snapshot_id).join(',');
        
        // Query dinámica para filtrar hijos (IN clause)
        const querySpec = {
            query: `SELECT * FROM c WHERE ARRAY_CONTAINS(@ids, c.snapshot_id)`,
            parameters: [
                { name: "@ids", value: parents.map(p => p.snapshot_id) }
            ]
        };

        const { resources: children } = await itemsContainer.items
            .query(querySpec)
            .fetchAll();

        console.log(`📊 Azure Stats: ${parents.length} Padres | ${children.length} Hijos`);

        // 3. Agrupar HIJOS (Lógica "Frankenstein" idéntica a Mongo)
        const childrenMap = {};

        children.forEach(child => {
            const key = `${child.snapshot_id}_${child.option_id}`;

            if (!childrenMap[key]) childrenMap[key] = [];

            childrenMap[key].push({
                // Azure usa 'id' (string) por defecto, Mongo usa '_id'. Normalizamos.
                id: child.id, 
                
                // Mapeo idéntico al de Mongo para que el Frontend no falle
                strike: child.strike,
                type: child.right === 'C' ? 'Call' : (child.right === 'P' ? 'Put' : child.right),
                bid: child.bid,
                ask: child.ask,
                iv: child.iv,
                expiration: child.expiration,
                delta: child.delta,
                gamma: child.gamma,
                theta: child.theta,
                vega: child.vega,
                
                // Metadatos de jerarquía
                hierarchyNode: `OPT-${child.option_id || 'N/A'}`,
                level: 1,
                drilldownState: 'leaf',
                
                // Datos crudos completos
                ...child,
                fullData: child
            });
        });

        // 4. Estructura Final (Padres + Hijos pegados)
        const result = parents.map(parent => {
            const key = `${parent.snapshot_id}_${parent.underlying_id}`;
            const myChildren = childrenMap[key] || [];

            return {
                id: parent.id,
                
                snapshot_id: parent.snapshot_id,
                underlying_id: parent.underlying_id,
                ts: parent.ts,

                // Metadatos de jerarquía
                hierarchyNode: parent.snapshot_id.toString(),
                description: `Snapshot ${parent.snapshot_id} (Azure)`, // Etiqueta para diferenciar visualmente
                level: 0,
                drilldownState: myChildren.length > 0 ? 'collapsed' : 'leaf',
                
                // Pegar hijos
                subRows: myChildren,
                
                // Datos crudos
                ...parent,
                fullData: parent
            };
        });

        console.timeEnd('AzureQueryTime');
        return result;

    } catch (error) {
        console.error("❌ Error en getAllSnapshotsAzure:", error);
        throw error;
    }
}

async function createSnapshotAzure(body) {
    console.log("☁️☁️☁️ ¡ESTOY DENTRO DE LA FUNCIÓN DE AZURE! ☁️☁️☁️"); // <--- AGREGA ESTO
    const { snapshot_id, underlying_id, ts } = body;
    if (snapshot_id == null || underlying_id == null) throw new Error("snapshot_id y underlying_id requeridos");

    // Validar duplicados
    const { resources: existing } = await snapshotsContainer.items
        .query({
            query: "SELECT * FROM c WHERE c.snapshot_id = @sid",
            parameters: [{ name: "@sid", value: snapshot_id }]
        }).fetchAll();

    if (existing.length > 0) throw new Error(`Ya existe snapshot_id ${snapshot_id} en Azure`);

    // Crear
    const newItem = {
        snapshot_id,
        underlying_id,
        ts: ts ? new Date(ts).toISOString() : new Date().toISOString()
    };
    const { resource: doc } = await snapshotsContainer.items.create(newItem);

    return [{
        ...doc,
        id: doc.id,
        hierarchyNode: doc.snapshot_id.toString(),
        description: `Snapshot ${doc.snapshot_id} (Azure)`,
        level: 0, status: 'NEW', drilldownState: 'leaf'
    }];
}

async function createSnapshotItemAzure(body) {
    let { snapshot_id, option_id, strike, right, expiration, bid, ask, iv, delta, gamma, theta, vega } = body;
    if (snapshot_id == null || option_id == null) throw new Error("Datos requeridos faltantes");

    // Normalizar Right
    if (right) {
        let r = String(right).trim().toUpperCase();
        if (r === 'CALL') r = 'C'; else if (r === 'PUT') r = 'P';
        right = r;
    }

    // Validar Padre Exista
    const { resources: parents } = await snapshotsContainer.items
        .query({
            query: "SELECT * FROM c WHERE c.snapshot_id = @sid",
            parameters: [{ name: "@sid", value: snapshot_id }]
        }).fetchAll();
    
    if (parents.length === 0) throw new Error(`No existe Snapshot padre con ID ${snapshot_id} en Azure`);

    // Crear Item
    const newItem = {
        snapshot_id, option_id, strike, right,
        expiration: expiration ? new Date(expiration).toISOString() : undefined,
        bid, ask, iv, delta, gamma, theta, vega
    };
    const { resource: doc } = await itemsContainer.items.create(newItem);

    return [{
        ...doc,
        id: doc.id,
        hierarchyNode: `OPT-${doc.option_id}`,
        description: `Option ${doc.option_id} @ ${doc.strike}`,
        level: 1, status: 'NEW', drilldownState: 'leaf', fullData: doc
    }];
}

async function updateSnapshotAzure(id, data) {
    console.log(`⚡ Update Snapshot Azure - ID: ${id}`);

    // 1. Obtener documento actual
    const { resources: docs } = await snapshotsContainer.items
        .query({ 
            query: "SELECT * FROM c WHERE c.id = @id", 
            parameters: [{ name: "@id", value: id }] 
        })
        .fetchAll();

    if (docs.length === 0) throw new Error("Snapshot no encontrado en Azure.");
    const currentDoc = docs[0];

    // 2. DETECTAR CAMBIO DE PARTICIÓN (Aquí estaba el error)
    // Tu Partition Key es 'underlying_id', así que vigilamos ESE campo.
    const oldPk = currentDoc.underlying_id;
    const newPk = data.underlying_id !== undefined ? Number(data.underlying_id) : oldPk;
    
    // Convertimos a String para comparar seguro (evita errores 100 vs "100")
    const pkChanged = String(oldPk) !== String(newPk);

    // 3. Mezclar datos
    const updatedDoc = { ...currentDoc, ...data };

    let resultDoc;

    if (pkChanged) {
        console.log(`🚚 MUDANZA: Cambiando de partición (Underlying ${oldPk} -> ${newPk})`);
        
        // BORRAR EL VIEJO usando su PK correcta (underlying_id)
        try {
            await snapshotsContainer.item(id, oldPk).delete();
        } catch (err) {
            console.warn(`⚠️ No se pudo borrar el anterior (PK=${oldPk}). Quizás ya no existe.`);
        }

        // CREAR EL NUEVO
        const { resource } = await snapshotsContainer.items.create(updatedDoc);
        resultDoc = resource;
    } else {
        console.log("✨ Misma partición. Upsert directo.");
        // Si no cambia el underlying_id, el upsert funciona perfecto
        const { resource } = await snapshotsContainer.items.upsert(updatedDoc);
        resultDoc = resource;
    }

    return [{
        ...resultDoc,
        id: resultDoc.id,
        hierarchyNode: resultDoc.snapshot_id.toString(),
        description: `Snapshot ${resultDoc.snapshot_id} (Azure Update)`,
        level: 0, 
        drilldownState: 'collapsed'
    }];
}

async function updateItemAzure(id, data) {
    console.log(`⚡ Update Item Azure - ID: ${id}`);

    // 1. Obtener la definición del contenedor para saber la Partition Key REAL
    // Esto es vital para saber qué campo es el "intocable"
    const { resource: containerDef } = await itemsContainer.read();
    const pkPath = containerDef.partitionKey.paths[0].replace('/', ''); 
    console.log(`🔑 Partition Key detectada en Items: /${pkPath}`);

    // 2. Buscar el documento actual
    const { resources: docs } = await itemsContainer.items
        .query({ 
            query: "SELECT * FROM c WHERE c.id = @id", 
            parameters: [{ name: "@id", value: id }] 
        })
        .fetchAll();

    if (docs.length === 0) throw new Error("Item no encontrado en Azure.");
    const currentDoc = docs[0];

    // 3. DETECTAR SI CAMBIA LA PARTITION KEY (Mudanza)
    const oldPkValue = currentDoc[pkPath];
    const newPkValue = data[pkPath] !== undefined ? data[pkPath] : oldPkValue;
    
    // Convertir a String para comparar seguro (evita errores de tipo)
    const pkChanged = String(oldPkValue) !== String(newPkValue);

    // 4. Mezclar datos
    const updatedDoc = { ...currentDoc, ...data };

    let resultDoc;

    if (pkChanged) {
        console.log(`🚚 MUDANZA DE ITEM: La PK '/${pkPath}' cambia de [${oldPkValue}] a [${newPkValue}]`);
        
        // A) BORRAR EL VIEJO (Usando su PK original para ubicarlo)
        try {
            await itemsContainer.item(id, oldPkValue).delete();
            console.log("🗑️ Item antiguo eliminado (parte 1 de mudanza).");
        } catch (err) {
            console.warn(`⚠️ Advertencia al borrar item viejo: ${err.message}`);
        }

        // B) CREAR EL NUEVO (Se guardará en la nueva partición)
        // Nota: Mantenemos el mismo 'id' (el largo) para que no parezca un registro distinto
        const { resource } = await itemsContainer.items.create(updatedDoc);
        resultDoc = resource;
    } else {
        console.log("✨ Misma partición. Upsert directo.");
        // Si no cambiaste la clave, el update normal funciona
        const { resource } = await itemsContainer.items.upsert(updatedDoc);
        resultDoc = resource;
    }

    return [{
        ...resultDoc,
        id: resultDoc.id,
        hierarchyNode: `OPT-${resultDoc.option_id}`,
        level: 1, 
        drilldownState: 'leaf'
    }];
}

async function deleteSnapshotAzure(params) {
    // Extraemos de los params (que ahora vienen de la URL gracias al Controller)
    const { snapshot_id, underlying_id } = params;
    
    if (!snapshot_id) throw new Error("Falta snapshot_id en los parámetros");

    console.log(`🗑️ Borrando Snapshot ${snapshot_id} en Azure...`);

    // 1. Buscar el padre para obtener su ID real y su PK
    // Usamos query porque snapshot_id podría no ser la PK o el ID
    let querySpec = {
        query: "SELECT * FROM c WHERE c.snapshot_id = @sid",
        parameters: [{ name: "@sid", value: Number(snapshot_id) }]
    };

    // Si nos mandan underlying_id, filtramos mejor
    if (underlying_id) {
        querySpec.query += " AND c.underlying_id = @uid";
        querySpec.parameters.push({ name: "@uid", value: Number(underlying_id) });
    }

    const { resources: parents } = await snapshotsContainer.items.query(querySpec).fetchAll();

    if (parents.length === 0) throw new Error("Snapshot no encontrado en Azure con esos datos.");
    const parentDoc = parents[0];

    // 2. Detectar Partition Key del Padre
    const { resource: containerDef } = await snapshotsContainer.read();
    const pkPath = containerDef.partitionKey.paths[0].replace('/', '');
    const parentPk = parentDoc[pkPath];

    console.log(`📍 Padre encontrado (ID: ${parentDoc.id}). PK: ${parentPk}`);

    // 3. Borrar HIJOS primero
    const { resources: children } = await itemsContainer.items
        .query({
            query: "SELECT * FROM c WHERE c.snapshot_id = @sid",
            parameters: [{ name: "@sid", value: Number(snapshot_id) }]
        }).fetchAll();

    // Necesitamos la PK de los items para borrarlos
    const { resource: itemsDef } = await itemsContainer.read();
    const itemPkPath = itemsDef.partitionKey.paths[0].replace('/', '');

    for (const child of children) {
        try {
            await itemsContainer.item(child.id, child[itemPkPath]).delete();
        } catch (e) {
            console.warn(`⚠️ No se pudo borrar item ${child.id}: ${e.message}`);
        }
    }

    // 4. Borrar PADRE
    await snapshotsContainer.item(parentDoc.id, parentPk).delete();

    return [{
        id: parentDoc.id,
        hierarchyNode: parentDoc.snapshot_id.toString(),
        description: `Deleted Snapshot (Azure)`,
        level: 0, status: 'DELETED', drilldownState: 'leaf'
    }];
}

async function deleteSnapshotItemAzure(id) {
    if (!id) throw new Error("Falta el ID del item en la URL (param: id)");

    console.log(`🗑️ Intentando borrar Item ID: ${id}`);

    // 1. Buscar el documento para obtener su Partition Key
    const querySpec = {
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: id }]
    };
    
    const { resources: docs } = await itemsContainer.items.query(querySpec).fetchAll();

    if (docs.length === 0) throw new Error("Item no encontrado en Azure.");
    const doc = docs[0];
    
    // 2. Detectar Partition Key dinámicamente
    const { resource: containerDef } = await itemsContainer.read();
    const pkPath = containerDef.partitionKey.paths[0].replace('/', '');
    const pkValue = doc[pkPath];

    console.log(`📍 Item encontrado. PK (${pkPath}): ${pkValue}. Borrando...`);

    // 3. Borrar
    await itemsContainer.item(id, pkValue).delete();

    return [{
        id: id,
        hierarchyNode: `OPT-${doc.option_id}`,
        description: `Deleted Option`,
        level: 1, status: 'DELETED', drilldownState: 'leaf'
    }];
}

// --- FUNCIÓN GET ALL SNAPSHOTS MEJORADA (FUSIÓN) ---
async function getAllSnapshots() {
    a
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
    console.log("🍃🍃🍃 ¡ESTOY DENTRO DE LA FUNCIÓN DE MONGO! 🍃🍃🍃"); // <--- AGREGA ESTO
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