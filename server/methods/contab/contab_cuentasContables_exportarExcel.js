

Meteor.methods(
{
    contab_cuentasContables_exportarExcel: function (ciaSeleccionada)
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

        let templatePath = path.join(templates_DirPath, 'contab', 'contabCuentasContables.xlsx');

        // ----------------------------------------------------------------------------------------------------
        // nombre del archivo que contendrá los resultados ...
        let userID2 = Meteor.user().emails[0].address.replace(/\./g, "_");
        userID2 = userID2.replace(/\@/g, "_");
        let outputFileName = 'contabCuentasContables.xlsx'.replace('.xlsx', `_${userID2}.xlsx`);
        let outputPath  = path.join(temp_DirPath, 'contab', outputFileName);

        // leemos las cuentas contables que corresponden a la cia contab seleccionada por el usuario
        let cuentasContables = CuentasContables.find({ cia: ciaSeleccionada.numero }).fetch();
        let gruposContables = GruposContables.find().fetch();

        let items = [];
        let item = {};


        lodash.orderBy(cuentasContables, ['cuentaEditada'], ['asc']).
               forEach((cuentaContable) => {
            item = {
                cuentaEditada: cuentaContable.cuentaEditada,
                descripcion: cuentaContable.descripcion,
                totDet: cuentaContable.totDet,
                grupo: _.find(gruposContables, (x) => { return x.grupo == cuentaContable.grupo; }).descripcion,
                actSusp: cuentaContable.actSusp,
                ciaContab: ciaSeleccionada.abreviatura,
                id: cuentaContable.id,
            };
            items.push(item);
        });



        // Object containing attributes that match the placeholder tokens in the template
        let values = {
            fechaHoy: moment(new Date()).format("DD-MMM-YYYY"),
            nombreCiaContabSeleccionada: ciaSeleccionada.nombre,
            cuentasContables: items,
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
