const mongoose = require('mongoose');

const OptionChainSnapshotItemSchema = new mongoose.Schema({
    // Relación con el Padre
    snapshot_id: { type: Number, required: true, index: true },
    
    // Relación con el Instrumento (Underlying)
    // Nota: En tu imagen se llama 'option_id', pero dijiste que es el underlying.
    option_id: { type: Number, required: true, index: true },

    // Datos Financieros (Griegas y Precios)
    strike: { type: Number },
    right: { type: String, enum: ['C', 'P'] }, // C = Call, P = Put
    expiration: { type: Date },
    
    bid: { type: Number },
    ask: { type: Number },
    iv: { type: Number },
    
    // Griegas
    delta: { type: Number },
    gamma: { type: Number },
    theta: { type: Number },
    vega: { type: Number }

}, {
    timestamps: true,
    collection: 'optionchainsnapshotitems' // Nombre exacto de tu colección en Mongo
});

module.exports = mongoose.model('OptionChainSnapshotItem', OptionChainSnapshotItemSchema);