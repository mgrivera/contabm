
Meteor.methods(
{
    bancos_conciliacion_GrabarMovtosBanco: function (conciliacion_ID, lineasLeidasDesdeExcel) {

        // debugger;
        new SimpleSchema({
            conciliacion_ID: { type: String, optional: false },
            lineasLeidasDesdeExcel: { type: String, optional: false }
        }).validate({ conciliacion_ID, lineasLeidasDesdeExcel });

        lineasLeidasDesdeExcel = JSON.parse(lineasLeidasDesdeExcel);

        if (!lineasLeidasDesdeExcel || !_.isArray(lineasLeidasDesdeExcel) || lineasLeidasDesdeExcel.length == 0) {
            let message = `Error: no hemos podido leer la lista de movimientos del banco.<br />
                           Aparentemte, la lista de movimientos del banco está vacía o no está
                           construída en forma correcta. Por favor revise.
                          `;
            return {
                error: true,
                message: message
            };
        };

        // TODO: leemos la conciliación; no existe: error
        let conciliacionBancaria = ConciliacionesBancarias.findOne(conciliacion_ID);

        if (!conciliacionBancaria) {
            let message = `Error inesperado: no hemos podido leer la conciliación bancaria indicada.`;
            return {
                error: true,
                message: message
            };
        };

        // eliminamos los items en la tabla en mongo que puedan existir pues se registraron antes ...
        ConciliacionesBancarias_movimientosBanco.remove({ conciliacionID: conciliacion_ID });

        // para identificar cada movimiento con un simple número local al proceso...
        let consecutivo = 1;
        lineasLeidasDesdeExcel.forEach((item) => {

            let movimientoBancario = {};

            movimientoBancario._id = new Mongo.ObjectID()._str;
            movimientoBancario.conciliacionID = conciliacionBancaria._id;
            movimientoBancario.consecutivo = consecutivo;
            movimientoBancario.numero = item.numero ? item.numero : null;
            movimientoBancario.tipo = item.tipo ? item.tipo : null;
            movimientoBancario.fecha = item.fecha ? item.fecha : null;
            movimientoBancario.beneficiario = item.beneficiario ? item.beneficiario : null;
            movimientoBancario.concepto = item.concepto ? item.concepto : null;
            movimientoBancario.monto = item.monto ? item.monto : null;
            movimientoBancario.conciliado = 'no';

            ConciliacionesBancarias_movimientosBanco.insert(movimientoBancario);
            consecutivo++;
        });

        let message = `Ok, <b>${lineasLeidasDesdeExcel.length.toString()}</b> movimientos bancarios
                       han sido registrados en la base de datos, para la cuenta bancaria y el
                       período indicados.<br />
                       Ud. podrá ver estos movimientos en la lista que corresponde cuando cierre este diálogo.`;

        return {
            error: false,
            message: message
        };
    }
});
