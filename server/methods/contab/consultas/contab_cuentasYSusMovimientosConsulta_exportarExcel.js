

Meteor.methods(
{
    contab_cuentasYSusMovimientosConsulta_exportarExcel: function (desde, hasta, ciaSeleccionada, soloInfoResumen)
    {
        let Future = Npm.require('fibers/future');
        let XlsxInjector = Meteor.npmRequire('xlsx-injector');
        let fs = Npm.require('fs');
        let path = Npm.require('path');

        check(ciaSeleccionada, Object);

        // ----------------------------------------------------------------------------------------------------
        // obtenemos el directorio en el server donde están las plantillas (guardadas por el usuario mediante collectionFS)
        // nótese que usamos un 'setting' en setting.json (que apunta al path donde están las plantillas)
        // nótese que la plantilla (doc excel) no es agregada por el usuario; debe existir siempre con el
        // mismo nombre ...
        let templates_DirPath = Meteor.settings.public.collectionFS_path_templates;
        let temp_DirPath = Meteor.settings.public.collectionFS_path_tempFiles;

        let templatePath = path.join(templates_DirPath, 'contab', 'contabConsultaCuentasYSusMovimientos.xlsx');

        // ----------------------------------------------------------------------------------------------------
        // nombre del archivo que contendrá los resultados ...
        let userID2 = Meteor.user().emails[0].address.replace(/\./g, "_");
        userID2 = userID2.replace(/\@/g, "_");
        let outputFileName = 'contabConsultaCuentasYSusMovimientos.xlsx'.replace('.xlsx', `_${userID2}.xlsx`);
        let outputPath  = path.join(temp_DirPath, 'contab', outputFileName);



        // leemos las cuentas contables que se registraron para la consulta ...
        let cuentasContables = Temp_Consulta_Contab_CuentasYSusMovimientos.find({ user: this.userId }).fetch();

        // agrupamos por moneda
        let movtosAgrupadosPorMoneda = lodash(cuentasContables).
                                       groupBy('simboloMoneda').
                                       orderBy(['moneda'], ['asc']).
                                       value();

        let movimientosExcel = [];
        let movimientoExcel = {};
        let cantidadMovimientos = 0;

        for (let moneda in movtosAgrupadosPorMoneda) {

            let firstItemInList = movtosAgrupadosPorMoneda[moneda][0];
            let monedaDoc = Monedas.findOne({ moneda: firstItemInList.monedaID });

            let cantidadMovimientos = _.sumBy(movtosAgrupadosPorMoneda[moneda], 'cantidadMovimientos');

            // calculamos los totales para todas las cuentas de la moneda, para mostrarlos con el encabezado
            // para la misma ...

            let sumSaldoInicial = lodash.sumBy(movtosAgrupadosPorMoneda[moneda], 'saldoInicial');
            let sumDebe = lodash.sumBy(movtosAgrupadosPorMoneda[moneda], 'debe');
            let sumHaber = lodash.sumBy(movtosAgrupadosPorMoneda[moneda], 'haber');
            let sumSaldoFinal = lodash.sumBy(movtosAgrupadosPorMoneda[moneda], 'saldoFinal');

            movimientoExcel = {
                moneda: monedaDoc ? monedaDoc.simbolo : `Moneda no definida (${moneda})`,
                cuentaContable: "",
                fecha: "",
                numero: "",

                monOrig: "",
                descripcion: monedaDoc ? monedaDoc.descripcion : `Moneda no definida (${moneda})`,
                tipo: "",
                referencia: "",
                cierreAnual: "",
                saldoInicial: sumSaldoInicial,
                debe: sumDebe,
                haber: sumHaber,
                saldoFinal: sumSaldoFinal,
                cantidadMovimientos: cantidadMovimientos,
                tipoReg: 2,
            };
            movimientosExcel.push(movimientoExcel);         // mostramos la moneda, cada vez que ésta rompe

            lodash.orderBy(movtosAgrupadosPorMoneda[moneda], ['cuentaContable'], ['asc']).forEach((cuentaContable) => {

                movimientoExcel = {
                    moneda: monedaDoc ? monedaDoc.simbolo : `Moneda no definida (${moneda})`,
                    cuentaContable: cuentaContable.cuentaContable,
                    fecha: "",
                    numero: "",

                    monOrig: "",
                    descripcion: cuentaContable.nombreCuentaContable,
                    tipo: "",
                    referencia: "",
                    cierreAnual: "",
                    saldoInicial: cuentaContable.saldoInicial,
                    debe: cuentaContable.debe,
                    haber: cuentaContable.haber,
                    saldoFinal: cuentaContable.saldoFinal,
                    cantidadMovimientos: cuentaContable.cantidadMovimientos,
                    tipoReg: 1,
                };
                movimientosExcel.push(movimientoExcel);         // mostramos la moneda, cada vez que ésta rompe

                // leemos los movimientos que corresponden a la cuenta contable específica ...
                let movimientos = Temp_Consulta_Contab_CuentasYSusMovimientos2.find(
                    { user: this.userId, registroCuentaContableID: cuentaContable._id, }).fetch();

                lodash(movimientos).orderBy(['fecha', 'numeroAsiento'], ['asc', 'asc']).
                    forEach((movimiento) => {
                    // mostramos cada movimiento de la cuenta contable ...
                    movimientoExcel = {
                        moneda: monedaDoc ? monedaDoc.simbolo : `Moneda no definida (${moneda})`,
                        cuentaContable: cuentaContable.cuentaContable,
                        fecha: moment(movimiento.fecha).format("DD-MM-YYYY"),
                        numero: movimiento.numeroAsiento,
                        monOrig: movimiento.simboloMonedaOriginal,
                        descripcion: movimiento.descripcion,
                        tipo: movimiento.tipoAsiento,
                        referencia: movimiento.referencia ? movimiento.referencia : '',
                        cierreAnual: movimiento.asientoTipoCierreAnualFlag ? 'si' : '',
                        saldoInicial: "",
                        debe: movimiento.debe,
                        haber: movimiento.haber,
                        saldoFinal: "",
                        cantidadMovimientos: 0,
                        tipoReg: 0,
                    };
                    movimientosExcel.push(movimientoExcel);
                });
            });
        };


        // Object containing attributes that match the placeholder tokens in the template
        // combinamos los registros para forma la primera página en el documento Excel

        let values = {};

        // el usuario puede indicar que no desea producir esta página
        if (soloInfoResumen) {
            movimientoExcel = {};
            movimientoExcel = {
                moneda: "",
                cuentaContable: "",
                fecha: "",
                numero: "",
                monOrig: "",
                descripcion: "",
                tipo: "",
                referencia: "",
                cierreAnual: "",
                saldoInicial: "",
                debe: "",
                haber: "",
                saldoFinal: "",
                tipoReg: 0,
            };

            let blankArray = [];
            blankArray.push(movimientoExcel);

            values = {
                fechaHoy: moment(new Date()).format("DD-MMM-YYYY"),
                nombreCiaContabSeleccionada: ciaSeleccionada.nombre,
                fechaInicialPeriodo: desde,
                fechaFinalPeriodo: hasta,
                movtos: blankArray,
            };
        } else {
            values = {
                fechaHoy: moment(new Date()).format("DD-MMM-YYYY"),
                nombreCiaContabSeleccionada: ciaSeleccionada.nombre,
                fechaInicialPeriodo: desde,
                fechaFinalPeriodo: hasta,
                movtos: movimientosExcel,
            };
        };

        // Open a workbook
        let workbook = new XlsxInjector(templatePath);
        let sheetNumber = 1;
        workbook.substitute(sheetNumber, values);

        // ahora combinamos para formar la 2da. página en el documento Excel; nótese que el contenido es
        // el mismo, pero sin las lineas de detalle (ie: solo las cuentas sin sus movimientos)
        lodash.remove(movimientosExcel, (x) => { return x.tipoReg === 0; });

        let values2 = {
            fechaHoy: moment(new Date()).format("DD-MMM-YYYY"),
            nombreCiaContabSeleccionada: ciaSeleccionada.nombre,
            fechaInicialPeriodo: desde,
            fechaFinalPeriodo: hasta,
            movtos: movimientosExcel,
        };

        sheetNumber = 2;
        workbook.substitute(sheetNumber, values2);


        // Save the workbook
        workbook.writeFile(outputPath);

        let future = new Future();

        // Load an XLSX file into memory
        fs.readFile(outputPath, Meteor.bindEnvironment(function(err, content) {

            if(err)
                throw new Meteor.Error('error-leer-plantilla-excel',
                    `Error: se ha producido un error al intentar leer el <em>archivo resultado</em> de este
                     proceso en el servidor.
                     El nombre del archivo que se ha intentado leer es: ${outputPath}.
                     El mensaje de error recibido es: ${err.toString()}.
                    `);

            // el método regresa *antes* que la ejecución de este código que es asyncrono. Usamos Future para
            // que el método espere a que todo termine para regresar ...
            let newFile = new FS.File();
            let data2 = new Buffer(content);

            newFile.attachData( data2, {type: 'xlsx'}, Meteor.bindEnvironment(function( err ) {
                if(err)
                    throw new Meteor.Error('error-grabar-archivo-collectionFS',
                        `Error: se ha producido un error al intentar grabar el archivo a un directorio en el servidor.
                         El nombre del directorio en el servidor es: ${Meteor.settings.public.collectionFS_path_tempFiles}.
                         El mensaje de error recibido es: ${err.toString()}.
                        `);

                newFile.name(outputFileName);
                // Collections.Builds.insert( file );

                // agregamos algunos valores al file que vamos a registrar con collectionFS
                newFile.metadata = {
                    user: Meteor.user().emails[0].address,
                    nombreArchivo: outputFileName,
                    aplicacion: 'contab',
                    cia: ciaSeleccionada._id,
                };

                // intentamos eliminar el archivo antes de agregarlo nuevamente ...
                Files_CollectionFS_tempFiles.remove({ 'metadata.nombreArchivo': outputFileName });

                Files_CollectionFS_tempFiles.insert(newFile, Meteor.bindEnvironment(function (err, fileObj) {
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
                        let result = {
                            linkToFile: url
                        };
                        future['return'](result);
                    }));
                }));
            }));
        }));

        return future.wait();
    }
});
