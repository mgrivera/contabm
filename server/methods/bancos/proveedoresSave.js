

Meteor.methods(
{
    proveedoresSave: function (proveedor) {

        new SimpleSchema({
            proveedor: { type: Object, blackbox: true, optional: false, },
        }).validate({ proveedor, });

        if (!proveedor || !proveedor.docState) {
            throw new Meteor.Error("Aparentemente, no se han editado los datos en la página. No hay nada que actualizar.");
        };

        let usuario = Meteor.users.findOne(Meteor.userId());
        let docState = proveedor.docState;

        if (proveedor.docState == 1) {
            delete proveedor.docState;

            let proveedor_sql = _.clone(proveedor);
            // ------------------------------------------------------------------------------------------
            // sequelize siempre convierte las fechas a utc (es decir, las globaliza); nuestro offset
            // en ccs es -4.00; sequelize va a sumar 4.0 para llevar a utc; restamos 4.0 para eliminar
            // este efecto ...
            proveedor_sql.ingreso = proveedor_sql.ingreso ? moment(proveedor_sql.ingreso).subtract(TimeOffset, 'hours').toDate() : null;
            proveedor_sql.ultAct = proveedor_sql.ultAct ? moment(proveedor_sql.ultAct).subtract(TimeOffset, 'hours').toDate() : null;

            response = Async.runSync(function(done) {
                Proveedores_sql.create(proveedor_sql)
                    .then(function(result) { done(null, result); })
                    .catch(function (err) { done(err, null); })
                    .done();
            });

            if (response.error)
                throw new Meteor.Error(response.error && response.error.message ? response.error.message : response.error.toString());

            // el registro, luego de ser grabado en sql, es regresado en response.result.dataValues ...
            let savedItem = response.result.dataValues;
            proveedor.proveedor = savedItem.proveedor;
        };


        if (proveedor.docState == 2) {
            delete proveedor.docState;

            let proveedor_sql = _.clone(proveedor);

            proveedor_sql.ingreso = proveedor_sql.ingreso ? moment(proveedor_sql.ingreso).subtract(TimeOffset, 'hours').toDate() : null;

            proveedor_sql.ultAct = moment(new Date()).subtract(TimeOffset, 'hours').toDate();
            proveedor_sql.usuario = usuario.emails[0].address;

            response = Async.runSync(function(done) {
                Proveedores_sql.update(proveedor_sql, {
                        where: { proveedor: proveedor_sql.proveedor
                    }})
                    .then(function(result) { done(null, result); })
                    .catch(function (err) { done(err, null); })
                    .done();
            });

            if (response.error) {
                throw new Meteor.Error(response.error && response.error.message ? response.error.message : response.error.toString());
            }
        };


        if (proveedor.docState == 3) {
            // sql elimina (cascade delete) las tablas relacionadas en sql server ...
            response = Async.runSync(function(done) {
                Proveedores_sql.destroy({ where: { proveedor: proveedor.proveedor } })
                    .then(function(result) { done(null, result); })
                    .catch(function (err) { done(err, null); })
                    .done();
            });

            if (response.error) {
                throw new Meteor.Error(response.error && response.error.message ? response.error.message : response.error.toString());
            }
        };

        let tempProveedor = null;

        if (docState != 3) {
            // leemos nuevamente para actualizar el collection 'temp' en mongo; la idea es que el
            // registro *también* se actualize (modifique/agregue) en la lista (ie: filter --> lista) ...
            let where = `p.Proveedor = ${proveedor.proveedor}`;

            let query = `Select p.Proveedor as proveedor, p.Nombre as nombre, c.Descripcion as ciudad,
                         Case p.ProveedorClienteFlag When 1 Then 'Proveedor' When 2 Then 'Cliente' When 3 Then 'Ambos' When 4 Then 'Relacionado' Else 'Indefinido' End as proveedorCliente,
                         t.Descripcion as tipoProveedor, p.Rif as rif,
                         Case p.NacionalExtranjeroFlag When 1 Then 'Nacional' When 2 Then 'Extranjero' Else 'Indefinido' End as nacionalExtranjero,
                         Case p.NatJurFlag When 1 Then 'Natural' When 2 Then 'Juridico' Else 'Indefinido' End as naturalJuridico,
                         f.Descripcion as formaPago, p.Ingreso as ingreso, p.UltAct as ultAct, p.Usuario as usuario, p.Lote as numeroLote
                         From Proveedores p
                         Left Outer Join tCiudades c On p.Ciudad = c.Ciudad
                         Left Outer Join FormasDePago f On p.FormaDePagoDefault = f.FormaDePago
                         Inner Join TiposProveedor t On p.Tipo = t.Tipo
                         Where ${where}
                        `;

            response = null;
            response = Async.runSync(function(done) {
                sequelize.query(query, { type: sequelize.QueryTypes.SELECT })
                    .then(function(result) { done(null, result); })
                    .catch(function (err) { done(err, null); })
                    .done();
            });

            if (response.error)
                throw new Meteor.Error(response.error && response.error.message ? response.error.message : response.error.toString());

            tempProveedor = _.isArray(response.result) && response.result.length ? response.result[0] : null;

            tempProveedor._id = new Mongo.ObjectID()._str;
            tempProveedor.user = usuario._id;
        };

        // eliminamos el registro en mongo, para que se elimine de la lista (en filter --> list ...)
        Temp_Consulta_Bancos_Proveedores.remove({ proveedor: proveedor.proveedor, user: this.userId, });

        if (docState != 3) {
            Temp_Consulta_Bancos_Proveedores.insert(tempProveedor, function (error, result) {
                if (error)
                    throw new Meteor.Error("validationErrors", error.message ? error.message : error.toString());
            })
        }
        else if (docState == 3) {
            // ponemos el pk en -999 para que la página se refresque para el usuario y no se lea nada (desde sql)
            proveedor.proveedor = -999;
        }

        return {
            message: 'Ok, los datos han sido actualizados en la base de datos.',
            id: proveedor.proveedor,
        };
    }
});
