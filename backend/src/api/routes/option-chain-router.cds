// 1. Definimos la estructura para el payload de actualización (Datos reales)
type UpdatePayload {
    strike : Decimal;
    right  : String;
    bid    : Decimal;
    ask    : Decimal;
    iv     : Decimal;
    delta  : Decimal;
    gamma  : Decimal;
    theta  : Decimal;
    vega   : Decimal;
    expiration : Timestamp; 
    ts     : Timestamp;
    // Agregamos los IDs por si el usuario quiere cambiarlos (Migrar un item a otro snapshot)
    snapshot_id   : Integer;
    underlying_id : Integer;
    option_id     : Integer;
}

// 2. Estructura visual de respuesta para el Frontend
type SnapshotVisual {
    id             : String;
    hierarchyNode  : String;
    description    : String;
    level          : Integer;
    magnitude      : String;
    status         : String;
    drilldownState : String;
    // Datos extra útiles
    snapshot_id    : Integer;
    underlying_id  : Integer;
    strike         : Decimal;
    right          : String;
    bid            : Decimal;
    ask            : Decimal;
    iv             : Decimal;
    delta          : Decimal;
    gamma          : Decimal;
    theta          : Decimal;
    vega           : Decimal;
}

// 3. Definición del Servicio
// La ruta absoluta './src/api/controllers/...' es CLAVE para que funcione.
@impl: 'src/api/controllers/option-chain-controller.js'
service OptionChainRoute @(path: '/api/Chain/Snapshot') {

    @Core.Description: 'Dispatcher CRUD Flexible'
    action crud(
        // Parámetros de Control
        ProcessType   : String,
        dbServer      : String,
        User          : String,

        // ID único del documento (AGREGAR ESTE PARÁMETRO)
        id            : String,

        // Datos a actualizar (JSON estructurado)
        data          : UpdatePayload
    ) returns array of SnapshotVisual;
}