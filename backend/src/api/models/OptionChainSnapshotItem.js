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
    collection: 'optionchainsnapshotitems',
    // Asegurar que _id esté disponible
    id: true,
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            ret.id = ret._id.toString(); // Convertir _id a id para el frontend
            delete ret._id;
            return ret;
        }
    },
    toObject: { virtuals: true }
});
module.exports = mongoose.model('OptionChainSnapshotItem', OptionChainSnapshotItemSchema);