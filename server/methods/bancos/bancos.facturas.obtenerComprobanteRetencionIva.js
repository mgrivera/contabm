

Meteor.methods(
{
    'bancos.facturas.obtenerComprobanteRetencionIva': function (fileID,
                                                                tipoArchivo,
                                                                ciaSeleccionada,
                                                                userID,
                                                                proveedorID,
                                                                numeroComprobante,
                                                                periodoRetencion,
                                                                nombreArchivo) {

        // debugger;
        let Future = Npm.require('fibers/future');

        new SimpleSchema({
            fileID: { type: String, optional: false, },
            tipoArchivo: { type: String, optional: false, },
            ciaSeleccionada: { type: Object, blackbox: true, optional: false, },
            userID: { type: String, optional: false, },
            proveedorID: { type: Number, decimal: false, optional: false, },
            numeroComprobante: { type: String, optional: false, },
            periodoRetencion: { type: String, optional: false, },
            nombreArchivo: { type: String, optional: false, },
        }).validate({ fileID,
                      tipoArchivo,
                      ciaSeleccionada,
                      userID,
                      proveedorID,
                      numeroComprobante,
                      periodoRetencion,
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

        let proveedor = Proveedores.findOne({ proveedor: proveedorID });
        let companiaContab = Companias.findOne(ciaSeleccionada._id);

        // TODO: leemos las facturas que se asociaron al numeroComprobante; nota: raramente será más de una ...
        let response = null;
        response = Async.runSync(function(done) {
            Facturas_sql.findAll({ where:
                    {
                        proveedor: proveedor.proveedor,
                        numeroComprobante: numeroComprobante,
                        cia: ciaSeleccionada.numero
                    },
                    order: [['numeroOperacion', 'ASC']],
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
        let retencionesIva = [];
        // para guardar la fecha de recepción de una factura y usar para construir la fecha del documento
        let fechaRecepcion = new Date();

        // para totalizar los montos
        let totalIncIva2 = 0;
        let comprasSinIva2 = 0;
        let baseImp2 = 0;
        let iva2 = 0;
        let retIva2 = 0;

        facturas.forEach((factura) => {

            factura.fechaEmision = factura.fechaEmision ? moment(factura.fechaEmision).add(TimeOffset, 'hours').toDate() : null;
            factura.fechaRecepcion = factura.fechaRecepcion ? moment(factura.fechaRecepcion).add(TimeOffset, 'hours').toDate() : null;

            fechaRecepcion = factura.fechaRecepcion;

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
            }

            // TODO: para cada factura leída (casi siempre una!), leemos las retenciones de impuestos Iva; en realidad,
            // también el impuesto Iva, para tener la base Imponible que corresponde a la retención
            query = `Select i.MontoBase as montoBase, i.Porcentaje as porcentaje,
                     i.Monto as monto, d.Predefinido as predefinido
                     From Facturas_Impuestos i Inner Join ImpuestosRetencionesDefinicion d
                     On i.ImpRetID = d.ID
                     Where i.FacturaID = ? And d.Predefinido In (1, 2)`;

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

            let montoFacturaIncluyeIva = 0;

            montoFacturaIncluyeIva += factura.montoFacturaConIva ? factura.montoFacturaConIva : 0;
            montoFacturaIncluyeIva += factura.montoFacturaSinIva ? factura.montoFacturaSinIva : 0;
            montoFacturaIncluyeIva += factura.iva ? factura.iva : 0;

            montoVentasExemptoIva = factura.montoFacturaSinIva ? factura.montoFacturaSinIva : 0;

            let montoImponible = 0;
            let alicuotaIva = 0;
            let montoIva = 0;
            let montoRetencionIva = 0;

            impuestosRetenciones.forEach((impRet) => {

                // nótese que la idea es que se lea primero el Iva y luego la retención; el usuario ha debido
                // registrar estos valores en este orden en la factura, para que vengan aquí así ...
                if (impRet.predefinido === 1) {
                    // predefinido = 1; el registro corresonde al impuesto Iva; leemos el montoBase que, en realidad,
                    // corresonde al monto imponible para la retención Iva
                    montoImponible = impRet.montoBase;
                    alicuotaIva = impRet.porcentaje;
                    montoIva = impRet.monto;
                } else {
                    // predefinido = 2; el registro corresponde a una retención Iva; el monto imponible le leímos en el
                    // registro anterior ...
                    montoRetencionIva = impRet.monto

                    // agregamos la retención al array de retenciones
                    let item = {
                        numOper: factura.numeroOperacion,
                        fecha: moment(factura.fechaEmision).format("DD-MM-YY"),
                        numero: numeroFactura,
                        control: factura.numeroControl,
                        nd: numeroNC,
                        nc: numeroND,
                        factAfectada: factura.numeroFacturaAfectada ? factura.numeroFacturaAfectada : "",
                        totalIncIva: numeral(montoFacturaIncluyeIva).format("0,0.00"),
                        comprasSinIva: numeral(montoVentasExemptoIva).format("0,0.00"),
                        baseImp: numeral(montoImponible).format("0,0.00"),
                        ivaPorc: numeral(alicuotaIva).format("0,0.00"),
                        iva: numeral(montoIva).format("0,0.00"),
                        retIva: numeral(montoRetencionIva).format("0,0.00"),
                    };

                    retencionesIva.push(item);

                    // ahora totalizamos para mostrar totales en la tabla Word; por alguna razón, aunque se pueden
                    // sumarizar columnas en la tabla en Word, hay que hacer un 'upd field'; por esta razón, debemos
                    // calcular y mostrar los totales ...
                    totalIncIva2 += montoFacturaIncluyeIva;
                    comprasSinIva2 += montoVentasExemptoIva;
                    baseImp2 += montoImponible;
                    iva2 += montoIva;
                    retIva2 += montoRetencionIva;
                };
            });
        });


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
            fechaDoc: fechaDoc,
            companiaContabNombre: companiaContab.nombre,
            companiaContabRif: companiaContab.rif,
            companiaContabDireccion: companiaContab.direccion,
            periodoFiscal: periodoRetencion,
            comprobanteSeniat: numeroComprobante,
            proveedorNombre: proveedor.nombre,
            proveedorRif: proveedor.rif,
            items: retencionesIva,

            totalIncIva2: numeral(totalIncIva2).format("0,0.00"),
            comprasSinIva2: numeral(comprasSinIva2).format("0,0.00"),
            baseImp2: numeral(baseImp2).format("0,0.00"),
            iva2: numeral(iva2).format("0,0.00"),
            retIva2: numeral(retIva2).format("0,0.00"),
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
                cia: ciaSeleccionada._id,
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
