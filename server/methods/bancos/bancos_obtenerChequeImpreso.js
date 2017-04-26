

Meteor.methods(
{
    'bancos.obtenerChequeImpreso': function (fileID,
                                             tipoArchivo,
                                             ciaSeleccionada,
                                             userID,
                                             movimientoBancarioID,
                                             nombreArchivo) {

        let Future = Npm.require('fibers/future');

        new SimpleSchema({
            fileID: { type: String, optional: false, },
            tipoArchivo: { type: String, optional: false, },
            ciaSeleccionada: { type: Object, blackbox: true, optional: false, },
            userID: { type: String, optional: false, },
            movimientoBancarioID: { type: Number, decimal: false, optional: false, },
            nombreArchivo: { type: String, optional: false, },
        }).validate({ fileID, tipoArchivo, ciaSeleccionada, userID, movimientoBancarioID, nombreArchivo, });

        let JSZip = Meteor.npmRequire('jszip');
        let Docxtemplater = Meteor.npmRequire('docxtemplater');

        let fs = Npm.require('fs');
        let path = Npm.require('path');
        // Docxtemplater = require('docxtemplater');

        // el template debe ser siempre un documento word ...
        if (!nombreArchivo || !nombreArchivo.endsWith('.docx'))
            throw new Meteor.Error('archivo-debe-ser-word-doc', 'El archivo debe ser un documento Word (.docx).');

        // antes que nada, leemos el movimientoBancario
        let response = null;
        response = Async.runSync(function(done) {
            MovimientosBancarios_sql.findAll({ where: { claveUnica: movimientoBancarioID },
                include: [
                    { model: Chequeras_sql, as: 'chequera', include: [
                        { model: CuentasBancarias_sql, as: 'cuentaBancaria', },
                    ],},
                ],
                // raw: true,       // aparentemente, cuando hay Includes, el 'raw' no funciona del todo bien ...
                })
                .then(function(result) { done(null, result); })
                .catch(function (err) { done(err, null); })
                .done();
        });

        if (response.error)
            throw new Meteor.Error(response.error && response.error.message ? response.error.message : response.error.toString());

        if (!response.result.length)
            throw new Meteor.Error('db-registro-no-encontrado',
            'Error inesperado: no pudimos leer el movimiento bancario en la base de datos.');


        let movimientoBancario = response.result[0].dataValues;

        movimientoBancario.fecha = movimientoBancario.fecha ? moment(movimientoBancario.fecha).add(TimeOffset, 'hours').toDate() : null;
        movimientoBancario.fechaEntregado = movimientoBancario.fechaEntregado ? moment(movimientoBancario.fechaEntregado).add(TimeOffset, 'hours').toDate() : null;
        movimientoBancario.ingreso = movimientoBancario.ingreso ? moment(movimientoBancario.ingreso).add(TimeOffset, 'hours').toDate() : null;
        movimientoBancario.ultMod = movimientoBancario.ultMod ? moment(movimientoBancario.ultMod).add(TimeOffset, 'hours').toDate() : null;

        // con la cuenta bancaria, obtenemos el banco en mongo ...
        let cuentaBancaria = _.isArray(response.result) &&
                             response.result[0] &&
                             response.result[0].chequera &&
                             response.result[0].chequera.cuentaBancaria &&
                             response.result[0].chequera.cuentaBancaria.dataValues &&
                             response.result[0].chequera.cuentaBancaria.dataValues.cuentaBancaria ?
                             response.result[0].chequera.cuentaBancaria.dataValues.cuentaBancaria : 'Indefinida';

         let banco = Bancos.findOne({ 'agencias.cuentasBancarias.cuentaBancaria': cuentaBancaria });

         let nombreBanco = "Indefinido";
         if (banco) {
             nombreBanco = banco.abreviatura;
         };

        // ahora leemos el asiento contable asociado al movimiento bancario
        response = null;
        response = Async.runSync(function(done) {
            AsientosContables_sql.findAll({
                where: { provieneDe: 'Bancos', provieneDe_ID: movimientoBancario.claveUnica, cia: ciaSeleccionada.numero, },
                raw: true,       // aparentemente, cuando hay Includes, el 'raw' no funciona del todo bien ...
                })
                .then(function(result) { done(null, result); })
                .catch(function (err) { done(err, null); })
                .done();
        });

        if (response.error)
            throw new Meteor.Error(response.error && response.error.message ? response.error.message : response.error.toString());

        if (!response.result.length)
            throw new Meteor.Error('db-registro-no-encontrado',
            `Error inesperado: no pudimos leer un asiento contable para el movimiento bancario indicado.<br />
             El movimiento bancario debe tener un asiento contable asociado.`);


        let asientoContable = response.result[0];

        // ahora que tenemos el asiento, leemos sus partidas
        response = null;
        response = Async.runSync(function(done) {
            dAsientosContables_sql.findAll({
                where: { numeroAutomatico: asientoContable.numeroAutomatico, },
                raw: true })
                .then(function(result) { done(null, result); })
                .catch(function (err) { done(err, null); })
                .done();
        });

        if (response.error)
            throw new Meteor.Error(response.error && response.error.message ? response.error.message : response.error.toString());

        let partidasAsientoContable = response.result;

        // preparamos un array que debemos pasar para combinar con Word ...
        let partidas = [];

        partidasAsientoContable.forEach((x) => {

            // buscamos la cuenta contable; debe existir en mongo ...
            let cuentaContable = CuentasContables.findOne({ id: x.cuentaContableID });

            let p = {
                cuentaContable: cuentaContable ? cuentaContable.cuentaEditada : 'Indefinida',
                descripcionPartida: x.descripcion,
                montoPartida: numeral(x.haber != 0 ? x.haber * -1 : x.debe).format("0,0.00"),
            };

            partidas.push(p);
        });

        // ----------------------------------------------------------------------------------------------------
        // collectionFS asigna un nombre diferente a cada archivo que guarda en el server; debemos
        // leer el item en el collection, para obtener el nombre 'verdadero' del archivo en el disco

        let collectionFS_file = Files_CollectionFS_Templates.findOne(fileID);

        if (!collectionFS_file)
            throw new Meteor.Error('collectionFS-no-encontrada',
            'Error inesperado: no pudimos leer el item en collectionFS, que corresponda al archivo indicado.');


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

        // ----------------------------------------------------------------------------------------------------
        // leemos la tabla de configuración de este proceso para obtener los nombres de las personas
        let configuracionChequeImpreso = ConfiguracionChequeImpreso.findOne({ cia: ciaSeleccionada._id });

        let zip = new JSZip(content);
        let doc = new Docxtemplater();
        doc.loadZip(zip);

        //set the templateVariables
        doc.setData({
            monto: numeral(Math.abs(movimientoBancario.monto)).format("0,0.00"),
            beneficiario: movimientoBancario.beneficiario,
            fechaEscrita: moment(movimientoBancario.fecha).format("DD [de] MMMM"),
            año: numeral(parseInt(moment(movimientoBancario.fecha).format("YYYY"))).format("0,0"),

            concepto: movimientoBancario.concepto,
            numeroComprobante: asientoContable ? asientoContable.numero : '',

            numeroCheque: movimientoBancario.transaccion,

            cuentaBancaria: cuentaBancaria,
            banco: nombreBanco,
            p: partidas,

            elaboradoPor: configuracionChequeImpreso && configuracionChequeImpreso.elaboradoPor ? configuracionChequeImpreso.elaboradoPor : ' ',
            revisadoPor: configuracionChequeImpreso && configuracionChequeImpreso.revisadoPor ? configuracionChequeImpreso.revisadoPor : ' ',
            aprobadoPor: configuracionChequeImpreso && configuracionChequeImpreso.aprobadoPor ? configuracionChequeImpreso.aprobadoPor : ' ',
            contabilizadoPor: configuracionChequeImpreso && configuracionChequeImpreso.contabilizadoPor ? configuracionChequeImpreso.contabilizadoPor : ' ',
            nombreCompania: ciaSeleccionada.nombre,
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
                aplicacion: 'nomina',
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
