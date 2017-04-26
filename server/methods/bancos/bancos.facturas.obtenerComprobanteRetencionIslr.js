

Meteor.methods(
{
    'bancos.facturas.obtenerComprobanteRetencionIslr': function (fileID,
                                                                tipoArchivo,
                                                                userID,
                                                                facturaID,
                                                                nombreArchivo) {

        let Future = Npm.require('fibers/future');

        new SimpleSchema({
            fileID: { type: String, optional: false, },
            tipoArchivo: { type: String, optional: false, },
            userID: { type: String, optional: false, },
            facturaID: { type: Number, decimal: false, optional: false, },
            nombreArchivo: { type: String, optional: false, },
        }).validate({ fileID,
                      tipoArchivo,
                      userID,
                      facturaID,
                      nombreArchivo,
                  });

        let JSZip = Meteor.npmRequire('jszip');
        let Docxtemplater = Meteor.npmRequire('docxtemplater');

        let fs = Npm.require('fs');
        let path = Npm.require('path');
        // Docxtemplater = require('docxtemplater');

        // el template debe ser siempre un documento word ...
        if (!nombreArchivo || !nombreArchivo.endsWith('.docx'))
            throw new Meteor.Error('archivo-debe-ser-word-doc', 'El archivo debe ser un documento Word (.docx).');

        let response = null;
        response = Async.runSync(function(done) {
            Facturas_sql.findAll({ where:
                    {
                        ClaveUnica: facturaID,
                    },
                    raw: true,
                })
                .then(function(result) { done(null, result); })
                .catch(function (err) { done(err, null); })
                .done();
        });

        if (response.error)
            throw new Meteor.Error(response.error && response.error.message ? response.error.message : response.error.toString());

        if (!response.result.length)
            throw new Meteor.Error('db-registro-no-encontrado',
            'Error inesperado: no pudimos leer la factura en la base de datos.');

        let facturas = response.result;
        let retencionesIslr = [];
        // para guardar la fecha de recepción de una factura y usar para construir la fecha del documento
        let fechaRecepcion = new Date();
        let proveedorID = 0;
        let ciaContabID = 0;

        // para mostrar totales en la tabla Word
        let impuestoRetenido2 = 0;
        let totalPagado2 = 0;

        facturas.forEach((factura) => {

            factura.fechaEmision = factura.fechaEmision ? moment(factura.fechaEmision).add(TimeOffset, 'hours').toDate() : null;
            factura.fechaRecepcion = factura.fechaRecepcion ? moment(factura.fechaRecepcion).add(TimeOffset, 'hours').toDate() : null;

            fechaRecepcion = factura.fechaRecepcion;
            proveedorID = factura.proveedor;
            ciaContabID = factura.cia;

            let numeroFactura = "";
            let numeroNC = "";
            let numeroND = "";

            switch (factura.ncNdFlag) {
                case "NC":
                    numeroNC = factura.numeroFactura;
                    break;
                case "ND":
                    numeroND = factura.numeroFactura;
                    break;
                default:
                    numeroFactura = factura.numeroFactura;
            };

            // TODO: para cada factura leída (casi siempre una!), leemos las retenciones de impuestos Islr
            query = `Select i.FacturaID as facturaID, i.MontoBase as montoBase, i.Porcentaje as porcentaje,
                     i.Sustraendo as sustraendo, i.Monto as monto,
                     d.Predefinido as predefinido
                     From Facturas_Impuestos i Inner Join ImpuestosRetencionesDefinicion d
                     On i.ImpRetID = d.ID
                     Where i.FacturaID = ? And d.Predefinido In (3)`;

            response = null;
            response = Async.runSync(function(done) {
                sequelize.query(query, { replacements: [ factura.claveUnica ], type: sequelize.QueryTypes.SELECT })
                    .then(function(result) { done(null, result); })
                    .catch(function (err) { done(err, null); })
                    .done();
            });

            if (response.error)
                throw new Meteor.Error(response.error && response.error.message ? response.error.message : response.error.toString());

            let impuestosRetenciones = response.result;

            let montoFactura = 0;
            montoFactura += factura.montoFacturaSinIva ? factura.montoFacturaSinIva : 0;
            montoFactura += factura.montoFacturaConIva ? factura.montoFacturaConIva : 0;

            impuestosRetenciones.forEach((impRet) => {

                    // agregamos la retención al array de retenciones
                    let item = {
                        fechaRecepcion: moment(factura.fechaRecepcion).format("DD-MM-YY"),
                        numeroFactura: factura.numeroFactura,
                        numeroControl: factura.numeroControl ? factura.numeroControl : ' ',
                        montoFactura: numeral(montoFactura).format("0,0.00"),
                        montoSujetoARetencion: numeral(impRet.montoBase).format("0,0.00"),
                        retencionPorc: numeral(impRet.porcentaje).format("0,0.00"),
                        retencionSustraendo: numeral(impRet.sustraendo).format("0,0.00"),
                        impuestoRetenido: numeral(impRet.monto).format("0,0.00"),
                        totalPagado: numeral(impRet.montoBase - impRet.monto).format("0,0.00"),
                    };

                    // -----------------------------------------------------------------------------------
                    // leemos el pago asociado a la factura; nótese que puede no haber uno o haber varios;
                    // por ahora, simplemente, intentamos leer uno ...
                    query = `Select Top 1 p.Fecha as fechaPago
                             From Pagos p Inner Join dPagos d On p.ClaveUnica = d.ClaveUnicaPago
                             Inner Join CuotasFactura c On d.ClaveUnicaCuotaFactura = c.ClaveUnica
                             Inner Join Facturas f On c.ClaveUnicaFactura = f.ClaveUnica
                             Where f.ClaveUnica = ?`;

                    response = null;
                    response = Async.runSync(function(done) {
                        sequelize.query(query, { replacements: [ impRet.facturaID ], type: sequelize.QueryTypes.SELECT })
                            .then(function(result) { done(null, result); })
                            .catch(function (err) { done(err, null); })
                            .done();
                    });

                    if (response.error)
                        throw new Meteor.Error(response.error && response.error.message ? response.error.message : response.error.toString());

                    // nos aseguramos de haber leído un pago
                    item.fechaPago = "";
                    if (response.result && _.isArray(response.result) && response.result.length) {
                        // ajustamos la fecha de pago para corregir el ajuste a 'local date' que hace sequelize
                        let fechaPago = moment(response.result[0].fechaPago).add(TimeOffset, 'hours').toDate();
                        item.fechaPago = moment(fechaPago).format("DD-MMM-YYYY");
                    }

                    retencionesIslr.push(item);

                    // ahora totalizamos para mostrar totales en la tabla Word; por alguna razón, aunque se pueden
                    // sumarizar columnas en la tabla en Word, hay que hacer un 'upd field'; por esta razón, debemos
                    // calcular y mostrar los totales ...
                    impuestoRetenido2 += impRet.monto;
                    totalPagado2 += item.totalPagado;
            });
        });

        // como no tenemos la dirección ni la ciudad del proveedor en mongo (al menos por ahora), lo
        // leemos con un query en Sql Server
        query = `Select p.Nombre as nombre, p.Rif as rif, p.Direccion as direccion, c.Descripcion as nombreCiudad,
                 p.Telefono1 as telefono1
                 From Proveedores p Inner Join tCiudades c On p.Ciudad = c.Ciudad
                 Where p.Proveedor = ?`;

        response = null;
        response = Async.runSync(function(done) {
            sequelize.query(query, { replacements: [ proveedorID ], type: sequelize.QueryTypes.SELECT })
                .then(function(result) { done(null, result); })
                .catch(function (err) { done(err, null); })
                .done();
        });

        if (response.error)
            throw new Meteor.Error(response.error && response.error.message ? response.error.message : response.error.toString());

        if (!response.result || !_.isArray(response.result) || !response.result.length)
            throw new Meteor.Error('proveedor-no-encontrado',
            'Error inesperado: no pudimos leer los datos del proveedor en la base de datos.');

        let proveedor = response.result[0];
        let companiaContab = Companias.findOne({ numero: ciaContabID });
        let periodoRetencion = `01 de Enero de ${moment(fechaRecepcion).format('YYYY')} hasta 31 de Diciembre de ${moment(fechaRecepcion).format('YYYY')}`;

        // ----------------------------------------------------------------------------------------------------
        // collectionFS asigna un nombre diferente a cada archivo que guarda en el server; debemos
        // leer el item en el collection, para obtener el nombre 'verdadero' del archivo en el disco
        let collectionFS_file = Files_CollectionFS_Templates.findOne(fileID);

        if (!collectionFS_file)
            throw new Meteor.Error('collectionFS-no-encontrada',
            'Error inesperado: no pudimos leer el item en collectionFS, que corresponda al archivo (plantilla) indicado.');


        // ----------------------------------------------------------------------------------------------------
        // obtenemos el directorio en el server donde están las plantillas (guardadas por el usuario mediante collectionFS)
        // nótese que usamos un 'setting' en setting.json (que apunta al path donde están las plantillas)
        let filePath = Meteor.settings.public.collectionFS_path_templates;
        // nótese que el nombre 'real' que asigna collectionFS cuando el usuario hace el download del archivo,
        // lo encontramos en el item en collectionFS
        let fileNameWithPath = filePath + "/" + collectionFS_file.copies.files_collectionFS_templates.key;

        // ----------------------------------------------------------------------------------------------------
        // ahora intentamos abrir el archivo con fs (node file system)
        // leemos el contenido del archivo (plantilla) en el server ...
        let content = fs.readFileSync(fileNameWithPath, "binary");

        let zip = new JSZip(content);
        let doc = new Docxtemplater();
        doc.loadZip(zip);

        let fechaDoc = `${moment(fechaRecepcion).format('DD')} de ${moment(fechaRecepcion).format('MMMM')} de ${numeral(parseInt(moment(fechaRecepcion).format('YYYY'))).format('0,0')}`;

        //set the templateVariables
        doc.setData({
            fechaDoc: moment(fechaRecepcion).format("DD-MMM-YYYY"),

            proveedorNombre: proveedor.nombre,
            proveedorRif: proveedor.rif,
            proveedorDireccion: proveedor.direccion,
            proveedorTelefono: proveedor.telefono1 ? proveedor.telefono1 : ' ',
            proveedorCiudad: proveedor.nombreCiudad,

            companiaContabNombre: companiaContab.nombre,
            companiaContabRif: companiaContab.rif,
            companiaContabTelefono: companiaContab.telefono1,
            companiaContabDireccion: companiaContab.direccion,

            periodoRetencion: periodoRetencion,

            items: retencionesIslr,

            impuestoRetenido2: numeral(impuestoRetenido2).format("0,0.00"),
            totalPagado2: numeral(totalPagado2).format("0,0.00"),
        });

        try {
            // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
            doc.render();
        }
        catch (error) {
            var e = {
                message: error.message,
                name: error.name,
                stack: error.stack,
                properties: error.properties,
            }
            throw new Meteor.Error('error-render-Docxtemplater',
                `Error: se ha producido un error al intentar generar un documento docx usando DocxTemplater.
                 El mensaje de error recibido es: ${JSON.stringify({error: e})}.
                `);
        }

        let buf = doc.getZip().generate({ type:"nodebuffer" });

        // agregamos un nombre del archivo al 'metadata' en collectionFS; así, identificamos este archivo
        // en particular, y lo podemos eliminar en un futuro, antes de volver a registrarlo ...
        let userID2 = userID.replace(/\./g, "_");
        userID2 = userID2.replace(/\@/g, "_");
        let nombreArchivo2 = nombreArchivo.replace('.docx', `_${userID2}.docx`);

        let removedFiles = Files_CollectionFS_tempFiles.remove({ 'metadata.nombreArchivo': nombreArchivo2 });


        // el método regresa *antes* que la ejecución de este código que es asyncrono. Usamos Future para
        // que el método espere a que todo termine para regresar ...

        let future = new Future();

        var newFile = new FS.File();
        newFile.attachData( buf, {type: 'docx'}, function( err )
        {
            if(err)
                throw new Meteor.Error('error-grabar-archivo-collectionFS',
                    `Error: se ha producido un error al intentar grabar el archivo a un directorio en el servidor.
                     El nombre del directorio en el servidor es: ${Meteor.settings.public.collectionFS_path_tempFiles}.
                     El mensaje de error recibido es: ${err.toString()}.
                    `);

            newFile.name(nombreArchivo2);
            // Collections.Builds.insert( file );

            // agregamos algunos valores al file que vamos a registrar con collectionFS
            newFile.metadata = {
                user: Meteor.user().emails[0].address,
                fecha: new Date(),
                tipo: tipoArchivo,
                nombreArchivo: nombreArchivo2,
                aplicacion: 'bancos',
                cia: companiaContab._id,
            };

            Files_CollectionFS_tempFiles.insert(newFile, function (err, fileObj) {
                // Inserted new doc with ID fileObj._id, and kicked off the data upload using HTTP

                if (err) {
                    throw new Meteor.Error('error-grabar-archivo-collectionFS',
                        `Error: se ha producido un error al intentar grabar el archivo a un directorio en el servidor.
                         El nombre del directorio en el servidor es: ${Meteor.settings.public.collectionFS_path_tempFiles}.
                         El mensaje de error recibido es: ${err.toString()}.
                        `);
                };

                // tenemos que esperar que el file efectivamente se guarde, para poder acceder su url ...
                // nótese como Meteor indica que debemos agregar un 'fiber' para correr el callback, pues
                // su naturaleza es asynchrona ...
                Files_CollectionFS_tempFiles.on("stored", Meteor.bindEnvironment(function (fileObj, storeName) {
                    const url = fileObj.url({store: storeName});
                    future['return'](url);
                }));
            });
        });

        // Wait for async to finish before returning the result
        return future.wait();
    }
});
