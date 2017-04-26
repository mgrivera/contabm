

let partidas_SimpleSchema = new SimpleSchema({
    _id: { type: String, optional: false },
    partida: { type: Number, label: "Partida", optional: false },
    cuentaContableID: { type: Number, label: "Cuenta contable ID", optional: false },
    descripcion: { type: String, label: 'Descripción', optional: false },
    referencia: { type: String, label: 'Referencia', optional: true },
    debe: { type: Number, label: "Debe", optional: false, decimal: true },
    haber: { type: Number, label: "Haber", optional: false, decimal: true },
    centroCosto: { type: Number, label: "Centro de costo", optional: true },
    docState: { type: Number, optional: true },
});

AsientosContables = new Mongo.Collection("asientosContables");

let schema = new SimpleSchema({
    _id: { type: String, optional: false },
    numeroAutomatico: { type: Number, label: "Número automático", optional: false },
    numero: { type: Number, label: "Número", optional: false },
    mes: { type: Number, label: "Mes", optional: false },
    ano: { type: Number, label: "Año", optional: false },
    tipo: { type: String, label: 'Tipo', optional: false },
    fecha: { type: Date, label: "Fecha", optional: false },
    descripcion: { type: String, label: 'Descripción', optional: true },
    moneda: { type: Number, label: "Moneda", optional: false },
    monedaOriginal: { type: Number, label: "Moneda original", optional: false },
    convertirFlag: { type: Boolean, label: "Convertir?", optional: true },
    factorDeCambio: { type: Number, label: "Factor cambio", optional: false, decimal: true },
    partidas: { type: [partidas_SimpleSchema], optional: true, minCount: 0 },
    provieneDe: { type: String, label: 'Proviene de', optional: true },
    provieneDe_id: { type: Number, label: "Proviene de ID", optional: true },
    ingreso: { type: Date, label: "Ingreso", optional: false },
    ultAct: { type: Date, label: "Ult act", optional: false },
    copiablaFlag: { type: Boolean, label: "Copiable?", optional: true },
    asientoTipoCierreAnualFlag: { type: Boolean, label: "Cierre anual?", optional: true },
    mesFiscal: { type: Number, label: "Mes fiscal", optional: false },
    anoFiscal: { type: Number, label: "Año fiscal", optional: false },
    usuario: { type: String, label: 'Usuario', optional: false },
    lote: { type: String, label: 'Número de lote', optional: true },
    cia: { type: Number, label: "Cia Contab", optional: false },
    user: { type: String, label: 'Mongo user', optional: false },
    docState: { type: Number, optional: true },
});

AsientosContables.attachSchema(schema);
