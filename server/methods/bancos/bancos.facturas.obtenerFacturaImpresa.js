
Meteor.methods(
{
    'bancos.facturas.obtenerFacturaImpresa': function (fileID,
                                                       tipoArchivo,
                                                       userID,
                                                       facturasID,
                                                       nombreArchivo) {
        let Future = Npm.require('fibers/future');

        new SimpleSchema({
            fileID: { type: String, optional: false, },
            tipoArchivo: { type: String, optional: false, },
            userID: { type: String, optional: false, },
            facturasID: { type: String, optional: false, },
            nombreArchivo: { type: String, optional: false, },
        }).validate({ fileID,
                      tipoArchivo,
                      userID,
                      facturasID,
                      nombreArchivo,
                  });

        let JSZip = Meteor.npmRequire('jszip');
        let Docxtemplater = Meteor.npmRequire('docxtemplater');

        let fs = Npm.require('fs');
        let path = Npm.require('path');

        let query = '';
        let response = null;

        // el template debe ser siempre un documento word ...
        if (!nombreArchivo || !nombreArchivo.endsWith('.docx'))
            throw new Meteor.Error('archivo-debe-ser-word-doc', 'El archivo debe ser un documento Word (.docx).');

        // leemos las facturas que se asociaron al numeroComprobante; nota: raramente será más de una ...
        query = `Select f.NumeroFactura as numeroFactura, f.FechaEmision as fechaEmision,
                 p.Nombre as nombreCompania, p.Rif as rifCompania, p.Direccion as domicilioCompania,
                 p.Telefono1 as telefonoCompania, p.Fax as faxCompania,
                 f.Concepto as concepto, fp.Descripcion as formaDePagoNombre,
                 f.MontoFacturaSinIva as montoNoImponible, f.MontoFacturaConIva as montoImponible,
                 f.IvaPorc as ivaPorc, f.Iva as iva,
                 f.Cia as cia
                 From Facturas f Inner Join Proveedores p On f.Proveedor = p.Proveedor
                 Inner Join FormasDePago fp On f.CondicionesDePago = fp.FormaDePago
                 Where f.ClaveUnica In ${facturasID}
                `;

        response = null;
        response = Async.runSync(function(done) {
            sequelize.query(query, { replacements: [], type: sequelize.QueryTypes.SELECT })
                .then(function(result) { done(null, result); })
                .catch(function (err) { done(err, null); })
                .done();
        });

        if (response.error) {
            throw new Meteor.Error(response.error && response.error.message ? response.error.message : response.error.toString());
        }

        if (!response.result.length) {
            throw new Meteor.Error('db-registro-no-encontrado',
                                   `Error inesperado: no pudimos leer la factura en la base de datos.`);
        }

        let facturas = response.result;


        // -----------------------------------------------------------------------------------------------------
        // leemos la tabla ParametrosBancos para obtener las lineas que se muestran como notas para la compañía
        query = `Select FooterFacturaImpresa_L1, FooterFacturaImpresa_L2, FooterFacturaImpresa_L3
                 From ParametrosBancos
                 Where Cia = ?
                `;

        response = null;
        response = Async.runSync(function(done) {
            sequelize.query(query, { replacements: [ facturas[0].cia ], type: sequelize.QueryTypes.SELECT })
                .then(function(result) { done(null, result); })
                .catch(function (err) { done(err, null); })
                .done();
        });

        if (response.error) {
            throw new Meteor.Error(response.error && response.error.message ? response.error.message : response.error.toString());
        }

        if (!response.result.length) {
            throw new Meteor.Error('db-registro-no-encontrado',
                                   `Error inesperado: no hemos podido leer un registro en la tabla
                                    <b><em>ParametrosBancos</em></b> para la compañía <em>Contab</em> seleccionada.
                                   `);
        }

        let parametrosBancos = response.result[0];

        let items = [];
        let facturaItem = {};

        facturas.forEach((factura) => {

            factura.fechaEmision = factura.fechaEmision ? moment(factura.fechaEmision).add(TimeOffset, 'hours').toDate() : null;

            let monto = 0;
            let montoNoImponible = factura.montoNoImponible ? factura.montoNoImponible : 0;
            let montoImponible = factura.montoImponible ? factura.montoImponible : 0;
            let ivaPorc = factura.ivaPorc ? factura.ivaPorc : 0;
            let montoIva = factura.iva ? factura.iva : 0;
            let total = 0;

            // en realidad el ivaPorc no viene con la factura; tendríamos que leerlo en FacturasImpuestos; lo
            // calculamos
            if (montoIva && montoImponible) {
                ivaPorc = montoIva * 100 / montoImponible;
            }

            monto = montoNoImponible + montoImponible;
            total = monto + montoIva;


            facturaItem = {};
            facturaItem = {
                numeroFactura: factura.numeroFactura,
                fechaEmision: factura.fechaEmision ? moment(factura.fechaEmision).format('DD-MMM-YYYY') : '',
                nombreCompania: factura.nombreCompania,
                rifCompania: factura.rifCompania,
                domicilioCompania: factura.domicilioCompania,
                telefonoCompania: factura.telefonoCompania ? factura.telefonoCompania : '',
                faxCompania: factura.faxCompania ? factura.faxCompania : '',
                condicionesDePago: factura.formaDePagoNombre,
                conceptoFactura: factura.concepto,
                monto: numeral(monto).format("0,0.00"),
                montoNoImponible: numeral(montoNoImponible).format("0,0.00"),
                montoImponible: numeral(montoImponible).format("0,0.00"),
                ivaPorc: numeral(ivaPorc).format("0,0.00"),
                montoIva: numeral(montoIva).format("0,0.00"),
                total: numeral(total).format("0,0.00"),
                notas1: parametrosBancos.FooterFacturaImpresa_L1 ? parametrosBancos.FooterFacturaImpresa_L1 : '',
                notas2: parametrosBancos.FooterFacturaImpresa_L2 ? parametrosBancos.FooterFacturaImpresa_L2 : '',
                notas3: parametrosBancos.FooterFacturaImpresa_L3 ? parametrosBancos.FooterFacturaImpresa_L3 : '',
            };

            items.push(facturaItem);
        });

        let companiaContab = Companias.findOne({ numero: facturas[0].cia });

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

        //set the templateVariables
        doc.setData({
            facturas: items,
        });

        try {
            // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
            console.log(items);
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
