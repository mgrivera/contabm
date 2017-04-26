

Meteor.methods(
{
    contab_saldosConsulta_exportarExcel: function (ciaSeleccionada)
    {
        // debugger;
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

        let templatePath = path.join(templates_DirPath, 'contab', 'contabConsultaSaldosContables.xlsx');

        // ----------------------------------------------------------------------------------------------------
        // nombre del archivo que contendrá los resultados ...
        let userID2 = Meteor.user().emails[0].address.replace(/\./g, "_");
        userID2 = userID2.replace(/\@/g, "_");
        let outputFileName = 'contabConsultaSaldosContables.xlsx'.replace('.xlsx', `_${userID2}.xlsx`);
        let outputPath  = path.join(temp_DirPath, 'contab', outputFileName);

        // leemos los saldos que el usuario acaba de filtrar ...
        let saldosContables = Temp_Consulta_SaldosContables.find({ user: this.userId }).fetch();

        // leemos la tabla MesesDelAnoFiscal para obtener los nombres de los meses (del año fiscal)
        let nombresMesesAnoFiscal = MesesDelAnoFiscal.find({ cia: ciaSeleccionada.numero },
                                                           { fields: { mesFiscal: 1, nombreMes: true }}).
                                                      fetch();

        let mesFiscal01 = lodash.find(nombresMesesAnoFiscal, (x) => { return x.mesFiscal == 1; });
        let mesFiscal02 = lodash.find(nombresMesesAnoFiscal, (x) => { return x.mesFiscal == 2; });
        let mesFiscal03 = lodash.find(nombresMesesAnoFiscal, (x) => { return x.mesFiscal == 3; });
        let mesFiscal04 = lodash.find(nombresMesesAnoFiscal, (x) => { return x.mesFiscal == 4; });
        let mesFiscal05 = lodash.find(nombresMesesAnoFiscal, (x) => { return x.mesFiscal == 5; });
        let mesFiscal06 = lodash.find(nombresMesesAnoFiscal, (x) => { return x.mesFiscal == 6; });
        let mesFiscal07 = lodash.find(nombresMesesAnoFiscal, (x) => { return x.mesFiscal == 7; });
        let mesFiscal08 = lodash.find(nombresMesesAnoFiscal, (x) => { return x.mesFiscal == 8; });
        let mesFiscal09 = lodash.find(nombresMesesAnoFiscal, (x) => { return x.mesFiscal == 9; });
        let mesFiscal10 = lodash.find(nombresMesesAnoFiscal, (x) => { return x.mesFiscal == 10; });
        let mesFiscal11 = lodash.find(nombresMesesAnoFiscal, (x) => { return x.mesFiscal == 11; });
        let mesFiscal12 = lodash.find(nombresMesesAnoFiscal, (x) => { return x.mesFiscal == 12; });

        let saldos = [];
        let saldo = {};

        // agrupamos por moneda ...
        // debugger;
        let saldosGroupByMoneda = lodash.groupBy(saldosContables, 'simboloMoneda');

        // nótese como ordenamos el objeto por su (unica) key ...
        for (let moneda in lodash(saldosGroupByMoneda).map((v, k) => [k, v]).sortBy(0).fromPairs().value()) {

            let saldosByMoneda = saldosGroupByMoneda[moneda];

            // TODO: totalizamos la moneda y escribimos un row a excel
            saldo = {
                cuenta: "",
                cuentaNombre: saldosByMoneda[0].descripcionMoneda,
                moneda: moneda,
                monOrig: "",
                ano: "",
                inicial: lodash.sumBy(saldosByMoneda, 'inicial'),
                mes01: lodash.sumBy(saldosByMoneda, 'mes01'),
                mes02: lodash.sumBy(saldosByMoneda, 'mes02'),
                mes03: lodash.sumBy(saldosByMoneda, 'mes03'),
                mes04: lodash.sumBy(saldosByMoneda, 'mes04'),
                mes05: lodash.sumBy(saldosByMoneda, 'mes05'),
                mes06: lodash.sumBy(saldosByMoneda, 'mes06'),
                mes07: lodash.sumBy(saldosByMoneda, 'mes07'),
                mes08: lodash.sumBy(saldosByMoneda, 'mes08'),
                mes09: lodash.sumBy(saldosByMoneda, 'mes09'),
                mes10: lodash.sumBy(saldosByMoneda, 'mes10'),
                mes11: lodash.sumBy(saldosByMoneda, 'mes11'),
                mes12: lodash.sumBy(saldosByMoneda, 'mes12'),
                anual: lodash.sumBy(saldosByMoneda, 'anual'),
                grupo: '*',
                tipoReg: 3,
            };
            saldos.push(saldo);

            // agrupamos por año ...
            let saldosGroupByMonedaAno = lodash.groupBy(saldosByMoneda, 'ano');

            // nótese como ordenamos el objeto por su (unica) key ...
            for (let ano in lodash(saldosGroupByMonedaAno).map((v, k) => [k, v]).sortBy(0).fromPairs().value()) {

                let saldosByMonedaAno = saldosGroupByMonedaAno[ano];

                // TODO: totalizamos la año y escrimos un row a excel
                saldo = {
                    cuenta: "",
                    cuentaNombre: saldosByMonedaAno[0].descripcionMoneda,
                    moneda: moneda,
                    monOrig: "",
                    ano: ano,
                    inicial: lodash.sumBy(saldosByMonedaAno, 'inicial'),
                    mes01: lodash.sumBy(saldosByMonedaAno, 'mes01'),
                    mes02: lodash.sumBy(saldosByMonedaAno, 'mes02'),
                    mes03: lodash.sumBy(saldosByMonedaAno, 'mes03'),
                    mes04: lodash.sumBy(saldosByMonedaAno, 'mes04'),
                    mes05: lodash.sumBy(saldosByMonedaAno, 'mes05'),
                    mes06: lodash.sumBy(saldosByMonedaAno, 'mes06'),
                    mes07: lodash.sumBy(saldosByMonedaAno, 'mes07'),
                    mes08: lodash.sumBy(saldosByMonedaAno, 'mes08'),
                    mes09: lodash.sumBy(saldosByMonedaAno, 'mes09'),
                    mes10: lodash.sumBy(saldosByMonedaAno, 'mes10'),
                    mes11: lodash.sumBy(saldosByMonedaAno, 'mes11'),
                    mes12: lodash.sumBy(saldosByMonedaAno, 'mes12'),
                    anual: lodash.sumBy(saldosByMonedaAno, 'anual'),
                    grupo: '**',
                    tipoReg: 2,
                };
                saldos.push(saldo);

                // agrupamos por cuenta (pueden haber items diferentes por mon y monOrig para la misma cuenta)
                let saldosGroupByMonedaAnoCuenta = lodash.groupBy(saldosByMonedaAno, 'cuentaContable');

                // nótese como ordenamos el objeto por su (unica) key ...
                for (let cuenta in lodash(saldosGroupByMonedaAnoCuenta).map((v, k) => [k, v]).sortBy(0).fromPairs().value()) {

                    let saldosByMonedaAnoCuenta = saldosGroupByMonedaAnoCuenta[cuenta];

                    // este row de tipo total tiene sentido *solo* si hay más de una: mon-año-monOrig-cuenta;
                    // de otra forma, simplemente repetimos el row de tipo detalle ...
                    if (saldosByMonedaAnoCuenta.length > 1) {
                        saldo = {
                            cuenta: cuenta,
                            cuentaNombre: saldosByMonedaAnoCuenta[0].nombreCuentaContable,
                            moneda: moneda,
                            monOrig: "",
                            ano: ano,
                            inicial: lodash.sumBy(saldosByMonedaAnoCuenta, 'inicial'),
                            mes01: lodash.sumBy(saldosByMonedaAnoCuenta, 'mes01'),
                            mes02: lodash.sumBy(saldosByMonedaAnoCuenta, 'mes02'),
                            mes03: lodash.sumBy(saldosByMonedaAnoCuenta, 'mes03'),
                            mes04: lodash.sumBy(saldosByMonedaAnoCuenta, 'mes04'),
                            mes05: lodash.sumBy(saldosByMonedaAnoCuenta, 'mes05'),
                            mes06: lodash.sumBy(saldosByMonedaAnoCuenta, 'mes06'),
                            mes07: lodash.sumBy(saldosByMonedaAnoCuenta, 'mes07'),
                            mes08: lodash.sumBy(saldosByMonedaAnoCuenta, 'mes08'),
                            mes09: lodash.sumBy(saldosByMonedaAnoCuenta, 'mes09'),
                            mes10: lodash.sumBy(saldosByMonedaAnoCuenta, 'mes10'),
                            mes11: lodash.sumBy(saldosByMonedaAnoCuenta, 'mes11'),
                            mes12: lodash.sumBy(saldosByMonedaAnoCuenta, 'mes12'),
                            anual: lodash.sumBy(saldosByMonedaAnoCuenta, 'anual'),
                            grupo: '***',
                            tipoReg: 1,
                        };
                        saldos.push(saldo);
                    };



                    lodash.orderBy(saldosByMonedaAnoCuenta, ['simboloMonedaOriginal'], ['asc']).
                           forEach((cuentaContable) => {
                        // finalmente, escribimos un row para cada mon/ano/cuenta/monOrig a Excel;
                        // estos son los rows de tipo 'detalle'
                        saldo = {
                            cuenta: cuentaContable.cuentaContable,
                            cuentaNombre: cuentaContable.nombreCuentaContable,
                            moneda: cuentaContable.simboloMoneda,
                            monOrig: cuentaContable.simboloMonedaOriginal,
                            ano: cuentaContable.ano,
                            inicial: cuentaContable.inicial,
                            mes01: cuentaContable.mes01,
                            mes02: cuentaContable.mes02,
                            mes03: cuentaContable.mes03,
                            mes04: cuentaContable.mes04,
                            mes05: cuentaContable.mes05,
                            mes06: cuentaContable.mes06,
                            mes07: cuentaContable.mes07,
                            mes08: cuentaContable.mes08,
                            mes09: cuentaContable.mes09,
                            mes10: cuentaContable.mes10,
                            mes11: cuentaContable.mes11,
                            mes12: cuentaContable.mes12,
                            anual: cuentaContable.anual,
                            grupo: '',
                            tipoReg: 0,
                        };
                        saldos.push(saldo);
                    });
                };
            };
        };






        // Object containing attributes that match the placeholder tokens in the template
        let values = {
            fechaHoy: moment(new Date()).format("DD-MMM-YYYY"),
            nombreCiaContabSeleccionada: ciaSeleccionada.nombre,
            mes01Header: mesFiscal01 && mesFiscal01.nombreMes ? mesFiscal01.nombreMes : "Indefinido",
            mes02Header: mesFiscal01 && mesFiscal02.nombreMes ? mesFiscal02.nombreMes : "Indefinido",
            mes03Header: mesFiscal01 && mesFiscal03.nombreMes ? mesFiscal03.nombreMes : "Indefinido",
            mes04Header: mesFiscal01 && mesFiscal04.nombreMes ? mesFiscal04.nombreMes : "Indefinido",
            mes05Header: mesFiscal01 && mesFiscal05.nombreMes ? mesFiscal05.nombreMes : "Indefinido",
            mes06Header: mesFiscal01 && mesFiscal06.nombreMes ? mesFiscal06.nombreMes : "Indefinido",
            mes07Header: mesFiscal01 && mesFiscal07.nombreMes ? mesFiscal07.nombreMes : "Indefinido",
            mes08Header: mesFiscal01 && mesFiscal08.nombreMes ? mesFiscal08.nombreMes : "Indefinido",
            mes09Header: mesFiscal01 && mesFiscal09.nombreMes ? mesFiscal09.nombreMes : "Indefinido",
            mes10Header: mesFiscal01 && mesFiscal10.nombreMes ? mesFiscal10.nombreMes : "Indefinido",
            mes11Header: mesFiscal01 && mesFiscal11.nombreMes ? mesFiscal11.nombreMes : "Indefinido",
            mes12Header: mesFiscal01 && mesFiscal12.nombreMes ? mesFiscal12.nombreMes : "Indefinido",
            saldos: saldos,
        };

        // Open a workbook
        let workbook = new XlsxInjector(templatePath);
        let sheetNumber = 1;
        workbook.substitute(sheetNumber, values);
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
