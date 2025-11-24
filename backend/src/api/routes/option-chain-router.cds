// backend/src/api/routes/option-chain-router.cds

type SnapshotVisual {
    id             : String;
    hierarchyNode  : String;
    description    : String;
    level          : Integer;
    magnitude      : String;
    status         : String;
    drilldownState : String;
}

@impl: 'src/api/controllers/option-chain-controller.js'
service OptionChainRoute @(path: '/api/chain/snapshot') {

  action crud(
    ProcessType   : String,
    dbServer      : String,
    User          : String,

    snapshot_id   : Integer,
    underlying_id : Integer,
    option_id     : Integer,

    item_id       : String,      // 👈 AQUÍ EL CAMBIO IMPORTANTE
    ts            : Date,
    strike        : Decimal(15,4),
    right         : String,
    expiration    : Timestamp,
    bid           : Decimal(15,4),
    ask           : Decimal(15,4),
    iv            : Decimal(9,4),
    delta         : Decimal(9,4),
    gamma         : Decimal(9,4),
    theta         : Decimal(9,4),
    vega          : Decimal(9,4)
  ) returns array of SnapshotVisual;
}
