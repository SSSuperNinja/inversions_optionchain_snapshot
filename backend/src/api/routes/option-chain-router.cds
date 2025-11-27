// backend/src/api/routes/option-chain-router.cds

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

// 2. Estructura visual de respuesta para el Frontend (FUSIÓN COMPLETA)
type SnapshotVisual {
    id             : String;
    hierarchyNode  : String;
    description    : String;
    level          : Integer;
    magnitude      : String;
    status         : String;
    drilldownState : String;
    // Datos extra útiles (de tu versión)
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

// 3. Definición del Servicio FUSIONADO
@impl: 'src/api/controllers/option-chain-controller.js'
// Ruta en minúsculas (convención estándar)
service OptionChainRoute @(path: '/api/chain/snapshot') {

    @Core.Description: 'Dispatcher CRUD Flexible - Soporta ambos formatos'
    action crud(
        // ========= PARÁMETROS DE CONTROL =========
        ProcessType   : String,
        dbServer      : String,
        User          : String,

        // ========= FORMATO 1: IDs ESPECÍFICOS (para DELETE y operaciones simples) =========
        id            : String,       // Para UPDATE (tu versión)
        item_id       : String,       // Para DELETE de items (versión de tu compañero)
        
        snapshot_id   : Integer,      // Para CREATE/DELETE de snapshots
        underlying_id : Integer,      // Para CREATE/DELETE de snapshots  
        option_id     : Integer,      // Para CREATE de items

        // ========= FORMATO 2: DATOS INDIVIDUALES (para CREATE simple) =========
        ts            : Timestamp,
        strike        : Decimal,
        right         : String,
        expiration    : Timestamp,
        bid           : Decimal,
        ask           : Decimal,
        iv            : Decimal,
        delta         : Decimal,
        gamma         : Decimal,
        theta         : Decimal,
        vega          : Decimal,

        // ========= FORMATO 3: OBJETO ESTRUCTURADO (para UPDATE complejo) =========
        data          : UpdatePayload
    ) returns array of SnapshotVisual;
}