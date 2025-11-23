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
// CORRECCIÓN: URL en minúsculas
service OptionChainRoute @(path: '/api/chain/snapshot') {

    @Core.Description: 'Dispatcher CRUD vía QueryParams'
    action crud(
        ProcessType : String,
        dbServer    : String,
        User        : String,
        data        : String
    ) returns array of SnapshotVisual;
}