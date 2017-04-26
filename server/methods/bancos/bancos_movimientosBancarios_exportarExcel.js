

Meteor.methods(
{
    bancos_movimientosBancarios_exportarExcel: function (ciaSeleccionada)
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

        let templatePath = path.join(templates_DirPath, 'bancos', 'bancosMovimientosBancarios.xlsx');

        // ----------------------------------------------------------------------------------------------------
        // nombre del archivo que contendrá los resultados ...
        let userID2 = Meteor.user().emails[0].address.replace(/\./g, "_");
        userID2 = userID2.replace(/\@/g, "_");
        let outputFileName = 'bancosMovimientosBancarios.xlsx'.replace('.xlsx', `_${userID2}.xlsx`);
        let outputPath  = path.join(temp_DirPath, 'bancos', outputFileName);

        // leemos los saldos que el usuario acaba de filtrar ...
        let movimientosBancarios = Temp_Consulta_Bancos_MovimientosBancarios.find({ user: this.userId }).fetch();

        let items = [];
        let item = {};

        // agrupamos por moneda ...
        let itemsGroupByMoneda = lodash.groupBy(movimientosBancarios, 'moneda');

        // nótese como ordenamos el objeto por su (unica) key ...
        for (let moneda in lodash(itemsGroupByMoneda).map((v, k) => [k, v]).sortBy(0).fromPairs().value()) {

            let itemsByMoneda = itemsGroupByMoneda[moneda];

            // TODO: totalizamos la moneda y escribimos un row a excel
            item = {
                moneda: moneda,
                banco: "",
                cuenta: "",

                numero: "",
                tipo: "",
                fecha: "",
                beneficiario: "",
                concepto: "",

                monto: lodash.sumBy(itemsByMoneda, 'monto'),
                grupo: '*',
                tipoReg: 3,
            };
            items.push(item);

            // agrupamos por banco ...
            let itemsGroupByMonedaBanco = lodash.groupBy(itemsByMoneda, 'banco');

            // nótese como ordenamos el objeto por su (unica) key ...
            for (let banco in lodash(itemsGroupByMonedaBanco).map((v, k) => [k, v]).sortBy(0).fromPairs().value()) {

                let itemsByMonedaBanco = itemsGroupByMonedaBanco[banco];

                // TODO: totalizamos por banco y escrimos un row a excel
                item = {
                    moneda: moneda,
                    banco: banco,
                    cuenta: "",

                    numero: "",
                    tipo: "",
                    fecha: "",
                    beneficiario: "",
                    concepto: "",

                    monto: lodash.sumBy(itemsByMonedaBanco, 'monto'),
                    grupo: '**',
                    tipoReg: 2,
                };
                items.push(item);

                // agrupamos por cuenta (bancaria)
                let itemsGroupByMonedaBancoCuenta = lodash.groupBy(itemsByMonedaBanco, 'cuentaBancaria');

                // nótese como ordenamos el objeto por su (unica) key ...
                for (let cuenta in lodash(itemsGroupByMonedaBancoCuenta).map((v, k) => [k, v]).sortBy(0).fromPairs().value()) {

                    let itemsByMonedaBancoCuenta = itemsGroupByMonedaBancoCuenta[cuenta];

                    // TODO: totalizamos por cuenta y escrimos un row a excel
                    item = {
                        moneda: moneda,
                        banco: banco,
                        cuenta: cuenta,

                        numero: "",
                        tipo: "",
                        fecha: "",
                        beneficiario: "",
                        concepto: "",

                        monto: lodash.sumBy(itemsByMonedaBancoCuenta, 'monto'),
                        grupo: '***',
                        tipoReg: 1,
                    };
                    items.push(item);



                    lodash.orderBy(itemsByMonedaBancoCuenta, ['fecha', 'transaccion'], ['asc', 'asc']).
                           forEach((movBancario) => {
                        // finalmente, escribimos un row para cada mon/ano/cuenta/monOrig a Excel;
                        // estos son los rows de tipo 'detalle'
                        item = {
                            moneda: moneda,
                            banco: banco,
                            cuenta: cuenta,

                            numero: movBancario.transaccion,
                            tipo: movBancario.tipo,
                            fecha: moment(movBancario.fecha).format("DD-MMM-YYYY"),
                            beneficiario: movBancario.beneficiario,
                            concepto: movBancario.concepto,

                            monto: movBancario.monto,
                            grupo: '',
                            tipoReg: 0,
                        };
                        items.push(item);
                    });
                };
            };
        };






        // Object containing attributes that match the placeholder tokens in the template
        let values = {
            fechaHoy: moment(new Date()).format("DD-MMM-YYYY"),
            nombreCiaContabSeleccionada: ciaSeleccionada.nombre,
            items: items,
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
                    aplicacion: 'bancos',
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
