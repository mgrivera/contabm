

let schema = new SimpleSchema({
    _id: { type: String, optional: false },
    claveUnica: { type: Number, label: "Factura ID", optional: false },
    numeroFactura: { type: String, label: "Número de factura", optional: false },
    numeroControl: { type: String, label: "Número de control", optional: true },
    fechaEmision: { type: Date, label: "F emisión", optional: false },
    fechaRecepcion: { type: Date, label: "F recepcion", optional: false },
    nombreCompania: { type: String, label: "Compañía", optional: false },
    simboloMoneda: { type: String, label: "Moneda", optional: false },
    cxPCxC: { type: String, label: "CxPCxC", optional: false },
    concepto: { type: String, label: "Concepto", optional: true },
    ncNdFlag: { type: String, label: "NC/ND", optional: true },
    nombreFormaPago: { type: String, label: "Forma pago", optional: false },
    nombreTipoServicio: { type: String, label: "Tipo servicio", optional: false },
    numeroComprobanteSeniat: { type: String, label: "Comp seniat", optional: true },
    montoNoImponible: { type: Number, label: "Monto no imp", decimal: true, optional: true },
    montoImponible: { type: Number, label: "Monto imp", decimal: true, optional: true },
    ivaPorc: { type: Number, label: "Iva%", decimal: true, optional: true },
    iva: { type: Number, label: "Iva", decimal: true, optional: true },
    totalFactura: { type: Number, label: "Total factura", decimal: true, optional: false },
    retencionIslr: { type: Number, label: "Ret Islr", decimal: true, optional: true },
    retencionIva: { type: Number, label: "Ret Iva", decimal: true, optional: true },
    anticipo: { type: Number, label: "Anticipo", decimal: true, optional: true },
    saldo: { type: Number, label: "Saldo", decimal: true, optional: false },
    estadoFactura: { type: String, label: "Estado", optional: false },
    user: { type: String, label: 'Mongo user', optional: false },
});

Temp_Consulta_Bancos_Facturas = new Mongo.Collection("temp_consulta_bancos_facturas");
Temp_Consulta_Bancos_Facturas.attachSchema(schema);
