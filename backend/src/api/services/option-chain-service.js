const OptionChainSnapshot = require('../models/OptionChainSnapshot');
const OptionChainSnapshotItem = require('../models/OptionChainSnapshotItem');

const processCrud = async (req) => {
    const { ProcessType, User, dbServer } = req.data;

    switch (ProcessType) {
        case 'GetAll':
            return await getAllSnapshots();
        
        default:
            throw new Error(`ProcessType '${ProcessType}' no es válido`);
    }
};

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

module.exports = { processCrud };