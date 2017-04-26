

TiposAsientoContable = new Mongo.Collection("tiposAsientoContable");

let schema = new SimpleSchema({
    _id: { type: String, optional: false },
    grupo: { type: Number, label: "Grupo", optional: true },
    tipo: { type: String, label: "Tipo", min: 1, max: 6, optional: false },
    descripcion: { type: String, label: "Descripción", min: 1, max: 50, optional: false },
});

TiposAsientoContable.attachSchema(schema);
