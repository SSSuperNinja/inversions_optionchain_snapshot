namespace my.chainoptions;

// Entidad que refleja tu colección 'optionchainsnapshots' en Mongo
entity OptionChainSnapshots {
    key snapshot_id : Integer;      // Tu ID numérico (antes BIGSERIAL)
    underlying_id   : Integer;      // Tu ID de instrumento (antes BIGINT)
    ts              : Timestamp;    // Fecha y hora
}