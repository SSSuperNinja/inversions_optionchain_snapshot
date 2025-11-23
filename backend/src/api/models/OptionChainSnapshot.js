const mongoose = require('mongoose');

const OptionChainSnapshotSchema = new mongoose.Schema({
    // Tu ID lógico (1001, 1002...)
    snapshot_id: { 
        type: Number, 
        required: true, 
        unique: true 
    },
    // El ID del instrumento (BIGINT)
    underlying_id: { 
        type: Number, 
        required: true 
    },
    // Fecha y Hora
    ts: { 
        type: Date, 
        required: true 
    }
}, {
    timestamps: true,
    collection: 'optionchainsnapshots'
});

module.exports = mongoose.model('OptionChainSnapshot', OptionChainSnapshotSchema);