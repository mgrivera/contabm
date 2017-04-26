
AngularApp.controller("Contab_AsientoContable_Controller",
['$scope', '$stateParams', '$state', '$meteor', '$modal', 'uiGridConstants', 'catalogosContab',
function ($scope, $stateParams, $state, $meteor, $modal, uiGridConstants, catalogosContab) {

      // 'catalogosContab' es un 'resolve' en el state que se ejecuta con un promise; el promise
      // se resuelve solo cuando los catálogos están cargados en el client. Esto resulta muy importante,
      // sobre todo desde que empezamos a abrir esta página desde otras, *en un Tab diferente*; en
      // estos casos, el state se abria, pero los catálogos no se habían cargado aún ...
      $scope.showProgress = false;

      // ui-bootstrap alerts ...
      $scope.alerts = [];

      $scope.closeAlert = function (index) {
          $scope.alerts.splice(index, 1);
      };

      // ------------------------------------------------------------------------------------------------
      // leemos la compañía seleccionada
      let companiaSeleccionada = CompaniaSeleccionada.findOne({ userID: Meteor.userId() });
      let companiaSeleccionadaDoc = {};

      let companiaContabSeleccionada;

      if (companiaSeleccionada)
          companiaContabSeleccionada = Companias.findOne(companiaSeleccionada.companiaID);
      // ------------------------------------------------------------------------------------------------

      $scope.origen = $stateParams.origen;
      $scope.id = $stateParams.id;
      $scope.pageNumber = parseInt($stateParams.pageNumber);
      // convertirmos desde 'true' a true
      $scope.vieneDeAfuera = String($stateParams.vieneDeAfuera).toLowerCase() === 'true';


      $scope.setIsEdited = function (field) {

          // cuando el usuario cambia la moneda, cambiamos la moneda original del asiento ...
          if (field && field === 'moneda') {
              if ($scope.asientoContable && $scope.asientoContable.moneda) {
                  $scope.asientoContable.monedaOriginal = $scope.asientoContable.moneda;
              }
          }

          if ($scope.asientoContable.docState)
              return;

          $scope.asientoContable.docState = 2;
      };

      $scope.windowClose = () => {
          window.close();
      }

      $scope.fechaChanged = function() {

          if (!$scope.asientoContable.fecha) {
              $scope.setIsEdited();
              return;
          };

          $scope.showProgress = true;

          // cuando el usuario cambia la fecha, intentamos leer e inicializar el factor de cambio ...
          Meteor.call('leerFactorCambioMasReciente', $scope.asientoContable.fecha, (err, result) => {

              if (err) {
                  let errorMessage = "<b>Error:</b> se ha producido un error al intentar ejecutar la operación.";
                  if (err.errorType)
                      errorMessage += " (" + err.errorType + ")";

                  errorMessage += "<br />";

                  if (err.message)
                      // aparentemente, Meteor compone en message alguna literal que se regrese en err.reason ...
                      errorMessage += err.message + " ";
                  else {
                      if (err.reason)
                          errorMessage += err.reason + " ";

                      if (err.details)
                          errorMessage += "<br />" + err.details;
                  };

                  if (!err.message && !err.reason && !err.details)
                      errorMessage += err.toString();

                  $scope.alerts.length = 0;
                  $scope.alerts.push({
                      type: 'danger',
                      msg: errorMessage
                  });

                  $scope.setIsEdited();
                  $scope.showProgress = false;
                  $scope.$apply();
                  return;
              };

              $scope.asientoContable.factorDeCambio = result.factorCambio;
              $scope.setIsEdited();

              $scope.showProgress = false;
              $scope.$apply();
          });
      };

      $scope.regresarALista = function () {

          if ($scope.asientoContable && $scope.asientoContable.docState && $scope.origen == 'edicion') {
              var promise = DialogModal($modal,
                                        "<em>Asientos contables</em>",
                                        "Aparentemente, Ud. ha efectuado cambios; aún así, desea <em>regresar</em> y perder los cambios?",
                                        true);

              promise.then(
                  function (resolve) {
                      $state.go('contab.asientosContables.lista', { origen: $scope.origen, pageNumber: $scope.pageNumber });
                  },
                  function (err) {
                      return true;
                  });

              return;
          }
          else
              $state.go('contab.asientosContables.lista', { origen: $scope.origen, pageNumber: $scope.pageNumber });
      };

      $scope.eliminar = function () {

          if ($scope.asientoContable && $scope.asientoContable.docState && $scope.asientoContable.docState == 1) {
              DialogModal($modal, "<em>Asientos contables</em>",
                                  "El registro es nuevo (no existe en la base de datos); para eliminar, simplemente haga un <em>Refresh</em> o <em>Regrese</em> a la lista.",
                                  false).then();

              return;
          };

          // simplemente, ponemos el docState en 3 para que se elimine al Grabar ...
          $scope.asientoContable.docState = 3;
      };



      $scope.refresh0 = function () {

          if ($scope.asientoContable.docState && $scope.origen == 'edicion') {
              var promise = DialogModal($modal,
                                        "<em>Asientos contables</em>",
                                        "Aparentemente, Ud. ha efectuado cambios; aún así, desea <em>refrescar el registro</em> y perder los cambios?",
                                        true);

              promise.then(
                  function (resolve) {
                      $scope.refresh();
                  },
                  function (err) {
                      return true;
                  });

              return;
          }
          else
              $scope.refresh();
      };

      $scope.refresh = () => {

          // hacemos un nuevo subscribe para volver a leer el asiento contable; solo desde mongo; desde la lista,
          // se leyó el asiento contable desde sql server y se grabó a mongo; al refrescar, lo volvemos a leer, tal
          // como fue grabado en mongo ...

        //   debugger;

          $scope.showProgress = true;

          Meteor.subscribe('asientosContables', JSON.stringify({ _id: $scope.id }), () => {

              $scope.asientoContable = {};
              $scope.partidas_ui_grid.data = [];

              $scope.helpers({
                  asientoContable: () => {
                    return AsientosContables.findOne({ _id: $scope.id });
                  }
                });

                // guardamos, en una propiedad separada, la fecha del asiento; esto nos permitirá validar 2 cosas, aún
                // si el usuario cambia la fecha del asiento:
                // 1.- que no se cambie a un mes diferente (esto podría permitirse, pero tomando en cuenta varios criterios)
                // 2.- que el asiento no corresponda a un mes cerrado (y su fecha sea cambiada a uno que no lo es)
                fechaOriginalAsientoContable =
                    $scope.asientoContable && $scope.asientoContable.fecha ? $scope.asientoContable.fecha : null;

                $scope.partidas_ui_grid.data = [];
                if (_.isArray($scope.asientoContable.partidas))
                   $scope.partidas_ui_grid.data = $scope.asientoContable.partidas;

                $scope.showProgress = false;
                $scope.$apply();
          });
      };


      $scope.imprimir = () => {

          var modalInstance = $modal.open({
              templateUrl: 'client/contab/asientosContables/imprimirAsientosContables_Opciones_Modal.html',
              controller: 'ImprimirAsientosContables_Opciones_Modal_Controller',
              size: 'md',
              resolve: {
                  companiaSeleccionadaDoc: () => {
                      return companiaContabSeleccionada;
                  }
              }
          }).result.then(
                function (resolve) {
                    // ejecutamos el código una vez que el usuario indica algunas opciones y regresa ...
                    let parametrosReporte = resolve;
                    AsientosContables_Methods.imprimirAsientoContable($scope, $scope.asientoContable, parametrosReporte);
                    return true;
                },
                function (cancel) {
                    return true;
                });
      };

      $scope.exportarAsientoContable = () => {
          // permitimos grabar el asiento contable, como un json, a un archivo en la máquina. Luego, este archivo podrá
          // ser importado como un asiento nuevo ...

          try {
              let asientoContable = _.cloneDeep($scope.asientoContable);

              var blob = new Blob([JSON.stringify(asientoContable)], {type: "text/plain;charset=utf-8"});
              saveAs(blob, "asiento contable");
          }
          catch(err) {
              message = err.message ? err.message : err.toString();
          }
          finally {
              if (message) {
                  DialogModal($modal, "<em>Asientos contables - Exportar asientos contables</em>",
                                      "Ha ocurrido un error al intentar ejecutar esta función:<br />" +
                                      message,
                                     false).then();
              };
          };
      };

      $scope.importarAsientoContable = () => {
          // permitimos al usuario leer, en un nuevo asiento contable, alguno que se haya exportado a un text file ...
          let inputFile = angular.element("#fileInput");
          if (inputFile)
              inputFile.click();        // simulamos un click al input (file)
      };

      $scope.uploadFile = function(files) {

          if (!$scope.asientoContable || !$scope.asientoContable.docState || $scope.asientoContable.docState != 1) {
              DialogModal($modal, "<em>Asientos contables</em>",
                                  "Aparentemente, el asiento que recibirá la copia no es nuevo (ya existía).<br />" +
                                  "Ud. debe importar un asiento siempre en un asiento nuevo; es decir, no en uno que ya exista.",
                                 false).then();

             let inputFile = angular.element("#fileInput");
             if (inputFile && inputFile[0] && inputFile[0].value)
                 // para que el input type file "limpie" el file indicado por el usuario
                 inputFile[0].value = null;

              return;
          }

          let userSelectedFile = files[0];

          if (!userSelectedFile) {
              DialogModal($modal, "<em>Asientos contables</em>",
                                  "Aparentemente, Ud. no ha seleccionado un archivo.<br />" +
                                  "Por favor seleccione un archivo que corresponda a un asiento contable <em>exportado</em> antes.",
                                 false).then();

             let inputFile = angular.element("#fileInput");
             if (inputFile && inputFile[0] && inputFile[0].value)
                 // para que el input type file "limpie" el file indicado por el usuario
                 inputFile[0].value = null;

              return;
          }

          var reader = new FileReader();
          let message = "";

          reader.onload = function(e) {
            //   debugger;
              try {
                  var content = e.target.result;
                  let asientoContable = JSON.parse(content);

                  // TODO: agregar valores de propiedades en asientoContable a $scope.asientoContable (cómo hacerlo de la forma más fácil??? )

                  $scope.asientoContable.tipo = asientoContable.tipo ? asientoContable.tipo : "";
                  $scope.asientoContable.descripcion = asientoContable.descripcion ? asientoContable.fecha : "";
                  $scope.asientoContable.moneda = asientoContable.moneda ? asientoContable.moneda : 0;
                  $scope.asientoContable.monedaOriginal = asientoContable.monedaOriginal ? asientoContable.monedaOriginal : 0;
                  $scope.asientoContable.factorDeCambio = asientoContable.factorDeCambio ? asientoContable.factorDeCambio : 0;

                  if (_.isArray(asientoContable.partidas)) {

                      if (!_.isArray($scope.asientoContable.partidas))
                          $scope.asientoContable.partidas = [];

                      asientoContable.partidas.forEach((p) => {

                          // permitimos que el usuario haya agregado partidas (al asiento nuevo ....)
                          let ultimaPartida = _.last( _.sortBy($scope.asientoContable.partidas, (x) => { return x.partida; }) );

                          let partida = {
                              _id: new Mongo.ObjectID()._str,
                              partida: 10,
                              debe: 0,
                              haber: 0,
                              docState: 1
                          };

                          if (ultimaPartida && !_.isEmpty(ultimaPartida)) {
                              partida.partida = ultimaPartida.partida + 10;
                          };

                          partida.cuentaContableID = p.cuentaContableID ? p.cuentaContableID : null;
                          partida.descripcion = p.descripcion ? p.descripcion : "";
                          partida.referencia = p.referencia ? p.referencia : "";
                          partida.debe = p.debe ? p.debe : 0;
                          partida.haber = p.haber ? p.haber : 0;
                          partida.centroCosto = p.centroCosto ? p.centroCosto : null;
                          partida.docState = 1;

                          $scope.asientoContable.partidas.push(partida);
                      });
                  };
              }
              catch(err) {
                  message = err.message ? err.message : err.toString();
              }
              finally {
                  if (message)
                      DialogModal($modal, "<em>Asientos contables - Importar asientos contables</em>",
                                          "Ha ocurrido un error al intentar ejecutar esta función:<br />" +
                                          message,
                                         false).then();
                   else {
                       $scope.partidas_ui_grid.data = [];
                       if (_.isArray($scope.asientoContable.partidas))
                          $scope.partidas_ui_grid.data = $scope.asientoContable.partidas;
                   };

                   let inputFile = angular.element("#fileInput");
                   if (inputFile && inputFile[0] && inputFile[0].value)
                       // para que el input type file "limpie" el file indicado por el usuario
                       inputFile[0].value = null;

                   $scope.$apply();
              };
          };

          reader.readAsText(userSelectedFile);
      };

      $scope.cuadrarAsientoContable = () => {
          // recorremos las partidas del asiento y 'cuadramos' en la partida que el usuario ha seleccionado ...
          if (!partidaSeleccionada || _.isEmpty(partidaSeleccionada)) {
              DialogModal($modal, "<em>Asientos contables - Cuadrar asiento contable</em>",
                                  `Ud. debe seleccionar la partida que será ajustada, para <em>cuadrar</em> el asiento contable.`,
                                 false).then();
              return;
          };

          let sumOfDebe = 0;
          let sumOfHaber = 0;

          if ($scope.asientoContable && _.isArray($scope.asientoContable.partidas)) {
              $scope.asientoContable.partidas.forEach((partida) => {
                  if (partida._id && partidaSeleccionada._id && (partida._id != partidaSeleccionada._id)) {
                      sumOfDebe += partida.debe ? partida.debe : 0;
                      sumOfHaber += partida.haber ? partida.haber : 0;
                  };
              });
          };

          partidaSeleccionada.debe = 0;
          partidaSeleccionada.haber = 0;

          if (sumOfDebe >= sumOfHaber)
             partidaSeleccionada.haber = sumOfDebe - sumOfHaber;
          else
             partidaSeleccionada.debe = sumOfHaber - sumOfDebe;

         if (!$scope.asientoContable.docState)
             $scope.asientoContable.docState = 2;

         $scope.partidas_ui_grid.data = [];
         if (_.isArray($scope.asientoContable.partidas))
            $scope.partidas_ui_grid.data = $scope.asientoContable.partidas;
      };

      $scope.renumerarPartidas = () => {

          if (!_.isArray($scope.asientoContable.partidas))
            return;

          $scope.partidas_ui_grid.data = [];
          let partida = 10;

          lodash($scope.asientoContable.partidas).orderBy([ 'partida' ], [ 'asc' ]).forEach((p) => {
              p.partida = partida;
              partida = partida + 10;
          });

          if (!$scope.asientoContable.docState)
              $scope.asientoContable.docState = 2;

          if (_.isArray($scope.asientoContable.partidas))
             $scope.partidas_ui_grid.data = $scope.asientoContable.partidas;
      };

      $scope.nuevo0 = function () {

            if ($scope.asientoContable.docState && $scope.origen == 'edicion') {
                var promise = DialogModal($modal,
                                          "<em>Asientos contables</em>",
                                          "Aparentemente, <em>se han efectuado cambios</em> en el registro. Si Ud. continúa para agregar un nuevo registro, " +
                                          "los cambios se perderán.<br /><br />Desea continuar y perder los cambios efectuados al registro actual?",
                                          true);

                promise.then(
                    function (resolve) {
                        $scope.nuevo();
                    },
                    function (err) {
                        return true;
                    });

                return;
            }
            else
                $scope.nuevo();
        };

        $scope.nuevo = function () {
            $scope.asientoContable = {};
            $scope.id = "0";                        // para que inicializar() agregue un nuevo registro
            inicializarItem();
        };

      let partidas_ui_grid_api = null;
      let partidaSeleccionada = {};

      $scope.partidas_ui_grid = {

          enableSorting: true,
          showColumnFooter: true,
          enableCellEdit: false,
          enableCellEditOnFocus: true,
          enableRowSelection: true,
          enableRowHeaderSelection: false,
          multiSelect: false,
          enableSelectAll: false,
          selectionRowHeaderWidth: 0,
          rowHeight: 25,

          onRegisterApi: function (gridApi) {

              partidas_ui_grid_api = gridApi;

              gridApi.selection.on.rowSelectionChanged($scope, function (row) {
                  //debugger;
                  partidaSeleccionada = {};

                  if (row.isSelected) {
                      partidaSeleccionada = row.entity;
                  }
                  else
                      return;
              });

              gridApi.edit.on.afterCellEdit($scope, function (rowEntity, colDef, newValue, oldValue) {
                  if (newValue != oldValue) {

                    //   debugger;

                      // solo cuando el usuario indica la cuenta contable, intentamos inicializar el row en base al anteior ...
                      if (colDef.field == 'cuentaContableID') {
                          let index = $scope.asientoContable.partidas.indexOf(rowEntity, 0);

                          if (index != -1 && index > 0) {

                              let rowAnterior = $scope.asientoContable.partidas[index - 1];
                              if (rowAnterior) {

                                  if (rowAnterior.descripcion && !rowEntity.descripcion)
                                      rowEntity.descripcion = rowAnterior.descripcion;

                                  if (rowAnterior.referencia && !rowEntity.referencia)
                                      rowEntity.referencia = rowAnterior.referencia;

                                  if (!rowEntity.debe && !rowEntity.haber) {

                                      let totalDebe = _.sum($scope.asientoContable.partidas, (x) => { return x.debe ? x.debe : 0; });
                                      let totalHaber = _.sum($scope.asientoContable.partidas, (x) => { return x.haber ? x.haber : 0; });

                                      if (totalDebe > totalHaber)
                                          rowEntity.haber = totalDebe - totalHaber;
                                      else
                                          rowEntity.debe = totalHaber - totalDebe;
                                  };
                              };
                          };
                      };

                      // cuando el usuario indica un monto, ponemos cero en el otro; si indica un monto en el
                      // debe, ponemos cero en haber y viceversa ...

                      if (colDef.field == 'debe') rowEntity.haber = 0;
                      if (colDef.field == 'haber') rowEntity.debe = 0;

                      // intentamos inicializar la partida en base a la anterior ...

                      if (!rowEntity.docState)
                          rowEntity.docState = 2;

                      if (!$scope.asientoContable.docState)
                          $scope.asientoContable.docState = 2;
                  };
              });
          },
          // para reemplazar el field '$$hashKey' con nuestro propio field, que existe para cada row ...
          rowIdentity: function (row) {
              return row._id;
          },
          getRowIdentity: function (row) {
              return row._id;
          }
      };


      // proveemos una lista particular de cuentas contables para el dropdown en el ui-grid; la idea es mostrar
      // cuenta+descripción+cia, en vez de solo la cuenta contable ...
      let cuentasContablesLista = [];

      CuentasContables2.find({ cia: companiaContabSeleccionada.numero, totDet: 'D', actSusp: 'A' },
                            { sort: { cuenta: true }} ).
                       forEach((cuenta) => {
                            // cuentaDescripcionCia() es un 'helper' definido en el collection CuentasContables ...
                            cuentasContablesLista.push({ id: cuenta.id, cuentaDescripcionCia: cuenta.cuentaDescripcionCia() });
                       });


      $scope.partidas_ui_grid.columnDefs = [
          {
              name: 'docState',
              field: 'docState',
              displayName: '',
              cellTemplate:
              '<span ng-show="row.entity[col.field] == 1" class="fa fa-asterisk" style="color: #A5999C; font: xx-small; padding-top: 8px; "></span>' +
              '<span ng-show="row.entity[col.field] == 2" class="fa fa-pencil" style="color: #A5999C; font: xx-small; padding-top: 8px; "></span>' +
              '<span ng-show="row.entity[col.field] == 3" class="fa fa-trash" style="color: #A5999C; font: xx-small; padding-top: 8px; "></span>',
              enableCellEdit: false,
              enableColumnMenu: false,
              enableSorting: false,
              width: 25
          },
          {
              name: 'partida',
              field: 'partida',
              displayName: '#',
              width: 35,
              enableFiltering: true,
              headerCellClass: 'ui-grid-centerCell',
              cellClass: 'ui-grid-centerCell',
              enableColumnMenu: false,
              enableCellEdit: true,
              enableSorting: true,
              type: 'number'
          },
          {
              name: 'cuentaContableID',
              field: 'cuentaContableID',
              displayName: 'Cuenta contable',
              width: "*",
              enableFiltering: true,
              headerCellClass: 'ui-grid-leftCell',
              cellClass: 'ui-grid-leftCell',
              cellFilter: 'cuentasContables_cuentaDescripcionCia',

              editableCellTemplate: 'ui-grid/dropdownEditor',
              editDropdownIdLabel: 'id',
              editDropdownValueLabel: 'cuentaDescripcionCia',
              editDropdownOptionsArray: cuentasContablesLista,

              enableColumnMenu: false,
              enableCellEdit: true,
              enableSorting: true,
              type: 'number'
          },
          {
              name: 'descripcion',
              field: 'descripcion',
              displayName: 'Descripción',
              width: 250,
              enableFiltering: true,
              headerCellClass: 'ui-grid-leftCell',
              cellClass: 'ui-grid-leftCell',
              enableColumnMenu: false,
              enableCellEdit: true,
              enableSorting: true,
              type: 'string'
          },
          {
              name: 'referencia',
              field: 'referencia',
              displayName: 'Referencia',
              width: 100,
              enableFiltering: true,
              headerCellClass: 'ui-grid-leftCell',
              cellClass: 'ui-grid-leftCell',
              enableColumnMenu: false,
              enableCellEdit: true,
              enableSorting: true,
              type: 'string'
          },
          {
              name: 'debe',
              field: 'debe',
              displayName: 'Debe',
              width: 100,
              enableFiltering: true,
              headerCellClass: 'ui-grid-rightCell',
              cellClass: 'ui-grid-rightCell',
              cellFilter: 'currencyFilterNorCeroNorNull',
              enableColumnMenu: false,
              enableCellEdit: true,
              enableSorting: true,

              aggregationType: uiGridConstants.aggregationTypes.sum,
              aggregationHideLabel: true,
              footerCellFilter: 'currencyFilter',
              footerCellClass: 'ui-grid-rightCell',

              type: 'number'
          },
          {
              name: 'haber',
              field: 'haber',
              displayName: 'Haber',
              width: 100,
              enableFiltering: true,
              headerCellClass: 'ui-grid-rightCell',
              cellClass: 'ui-grid-rightCell',
              cellFilter: 'currencyFilterNorCeroNorNull',
              enableColumnMenu: false,
              enableCellEdit: true,
              enableSorting: true,

              aggregationType: uiGridConstants.aggregationTypes.sum,
              aggregationHideLabel: true,
              footerCellFilter: 'currencyFilter',
              footerCellClass: 'ui-grid-rightCell',

              type: 'number'
          },
          {
              name: 'delButton',
              displayName: '',
              cellTemplate: '<span ng-click="grid.appScope.deleteItem(row.entity)" class="fa fa-close redOnHover" style="padding-top: 8px; "></span>',
              enableCellEdit: false,
              enableSorting: false,
              width: 25
          },
      ];

      $scope.deleteItem = function (item) {
          if (item.docState && item.docState === 1)
              // si el item es nuevo, simplemente lo eliminamos del array
              _.remove($scope.asientoContable.partidas, (x) => { return x._id === item._id; });
          else
              item.docState = 3;

          if (!$scope.asientoContable.docState)
              $scope.asientoContable.docState = 2;
      };

      $scope.agregarPartida = function () {

          if (!_.isArray($scope.asientoContable.partidas))
              $scope.asientoContable.partidas = [];

          // obtenemos la última partida, para definir la nueva en base a esa ...
          let ultimaPartida = _.last( _.sortBy($scope.asientoContable.partidas, (x) => { return x.partida; }) );

          let partida = {
              _id: new Mongo.ObjectID()._str,
              partida: 10,
              debe: 0,
              haber: 0,
              docState: 1
          };

          if (ultimaPartida && !_.isEmpty(ultimaPartida)) {
              partida.partida = ultimaPartida.partida + 10;
              partida.descripcion = ultimaPartida.descripcion;
              partida.referencia = ultimaPartida.referencia;
          };

          $scope.asientoContable.partidas.push(partida);

          $scope.partidas_ui_grid.data = [];
          if (_.isArray($scope.asientoContable.partidas))
             $scope.partidas_ui_grid.data = $scope.asientoContable.partidas;

          if (!$scope.asientoContable.docState)
              $scope.asientoContable.docState = 2;
      };


      // -------------------------------------------------------------------------
      // Grabar las modificaciones hechas al siniestro
      // -------------------------------------------------------------------------
      $scope.grabar = function () {

          if (!$scope.asientoContable.docState) {
              DialogModal($modal, "<em>Asientos contables</em>",
                                  "Aparentemente, <em>no se han efectuado cambios</em> en el registro. No hay nada que grabar.",
                                 false).then();
              return;
          };

          $scope.showProgress = true;

          // obtenemos un clone de los datos a guardar ...
          let editedItem = _.cloneDeep($scope.asientoContable);

          // nótese como validamos cada item antes de intentar guardar en el servidor
          let isValid = false;
          let errores = [];

          if (editedItem.docState != 3) {
              isValid = AsientosContables.simpleSchema().namedContext().validate(editedItem);

              if (!isValid) {
                  AsientosContables.simpleSchema().namedContext().invalidKeys().forEach(function (error) {
                      errores.push("El valor '" + error.value + "' no es adecuado para el campo '" + error.name + "'; error de tipo '" + error.type + ".");
                  });
              }
          };

          if (errores && errores.length) {
              $scope.alerts.length = 0;
              $scope.alerts.push({
                  type: 'danger',
                  msg: "Se han encontrado errores al intentar guardar las modificaciones efectuadas en la base de datos:<br /><br />" +
                      errores.reduce(function (previous, current) {

                          if (previous == "")
                              // first value
                              return current;
                          else
                              return previous + "<br />" + current;
                      }, "")
              });

              $scope.showProgress = false;
              return;
          };

          // por algna razón, cuando agregamos un item al scope y luego a mongo (en server), el item en $scope no se 'sincroniza' en forma
          // adecuada; por eso, lo eliminamos. Luego, con reactivity, será mostrado, nuevamente, en el view ...

          // TODO: vamos a revisar que ocurre aquí con respecto a la nota anterior. Por ahora, el usuario no va a
          // agregar un registro. Lo
          // hará cuando implementemos la función Asientos; por ahora, solo puede editar el asiento generado para el ITF
          //   _.remove($scope.AsientosContables, (x) => { return x.docState && x.docState === 1; });
          $meteor.call('asientosContablesSave', editedItem, fechaOriginalAsientoContable).then(
              function (data) {

                  $scope.alerts.length = 0;
                  $scope.alerts.push({
                      type: 'info',
                      msg: data
                  });

                  if ($scope.asientoContable && $scope.asientoContable.numeroAutomatico == 0) {
                      // cuando el asiento es nuevo, hacemos un refresh(). El resultado es que el asiento es leído desde la
                      // base de datos, con todos sus valores, tal como se determinaron en el servidor: número automático (pk),
                      // mes y año fiscal, número del asiento, etc.

                      // nota: cuando el usuario elimine un asiento, éste será eliminado de mongo y, por efecto de reactividad,
                      // $scope.asientoContable será undefined ...
                      $scope.id = $scope.asientoContable._id;  // asiento nuevo: $scope.id siempre es cero (hasta que lo grabamos)
                      $scope.refresh();
                  }
                  else {
                      if (typeof $scope.asientoContable == 'undefined')
                          $scope.partidas_ui_grid.data = [];

                      $scope.showProgress = false;
                  };
              },
              function (err) {

                  let errorMessage = "<b>Error:</b> se ha producido un error al intentar ejecutar la operación.";
                  if (err.errorType)
                      errorMessage += " (" + err.errorType + ")";

                  errorMessage += "<br />";

                  if (err.message)
                      // aparentemente, Meteor compone en message alguna literal que se regrese en err.reason ...
                      errorMessage += err.message + " ";
                  else {
                      if (err.reason)
                          errorMessage += err.reason + " ";

                      if (err.details)
                          errorMessage += "<br />" + err.details;
                  };

                  if (!err.message && !err.reason && !err.details)
                      errorMessage += err.toString();

                  $scope.alerts.length = 0;
                  $scope.alerts.push({
                      type: 'danger',
                      msg: errorMessage
                  });

                  $scope.showProgress = false;
              });
      };


      $scope.asignarNumeroContab = () => {

          if ($scope.asientoContable.docState) {
              DialogModal($modal, "<em>Asientos contables</em>",
                                  "Aparentemente, <em>se han efectuado cambios</em> en el registro. " +
                                  "Ud. debe grabar los cambios antes de intentar ejecutar esta función.",
                                 false).then();
              return;
          };

          if (!$scope.asientoContable || !$scope.asientoContable.numeroAutomatico) {
              DialogModal($modal, "<em>Asientos contables</em>",
                                  "Aparentemente, el asiento contable no está completo aún. " +
                                  "Ud. debe completar el registro del asiento contable antes de intentar ejecutar esta función.",
                                 false).then();
              return;
          };

          $scope.showProgress = true;

          $meteor.call('contab_asignarNumeroAsientoContab', $scope.asientoContable.numeroAutomatico).then(
              function (data) {

                  $scope.alerts.length = 0;
                  $scope.alerts.push({
                      type: 'info',
                      msg: data
                  });

                  $scope.showProgress = false;
              },
              function (err) {

                  let errorMessage = "<b>Error:</b> se ha producido un error al intentar ejecutar la operación.";
                  if (err.errorType)
                      errorMessage += " (" + err.errorType + ")";

                  errorMessage += "<br />";

                  if (err.message)
                      // aparentemente, Meteor compone en message alguna literal que se regrese en err.reason ...
                      errorMessage += err.message + " ";
                  else {
                      if (err.reason)
                          errorMessage += err.reason + " ";

                      if (err.details)
                          errorMessage += "<br />" + err.details;
                  };

                  if (!err.message && !err.reason && !err.details)
                      errorMessage += err.toString();


                  $scope.alerts.length = 0;
                  $scope.alerts.push({
                      type: 'danger',
                      msg: errorMessage
                  });

                  $scope.showProgress = false;
              });
      };


      $scope.convertirAOtraMoneda = () => {

          if ($scope.asientoContable.docState) {
              DialogModal($modal, "<em>Asientos contables</em>",
                                  "Aparentemente, <em>se han efectuado cambios</em> en el registro. " +
                                  "Ud. debe grabar los cambios antes de intentar ejecutar esta función.",
                                 false).then();
              return;
          };

          if (!$scope.asientoContable || !$scope.asientoContable.numeroAutomatico || !$scope.asientoContable.numero) {
              DialogModal($modal, "<em>Asientos contables</em>",
                                  "Aparentemente, el asiento contable no está completo aún. " +
                                  "Ud. debe completar el registro del asiento contable antes de intentar ejecutar esta función.",
                                 false).then();
              return;
          };

          if ($scope.asientoContable.numero < 0) {
              DialogModal($modal, "<em>Asientos contables</em>",
                                  "El asiento contable tiene un número negativo. <br />" +
                                  "Solo asientos contables con números <b><em>Contab</b></em> pueden ser convertidos.",
                                 false).then();
              return;
          };

          if ($scope.asientoContable.moneda != $scope.asientoContable.monedaOriginal) {
              DialogModal($modal, "<em>Asientos contables</em>",
                                  `El asiento contable es un asiento convertido; es decir, es el resultado de una
                                   conversión. <br />
                                   Solo asientos contables registrados en <em>moneda original</em> pueden ser convertidos.`,
                                 false).then();
              return;
          };

          $scope.showProgress = true;

          Meteor.call('contab.asientos.convertir',
                 $scope.asientoContable.numeroAutomatico,
                 (err, result) => {

                 if (err) {
                     let errorMessage = ClientGlobal_Methods.mensajeErrorDesdeMethod_preparar(err);

                     $scope.alerts.length = 0;
                     $scope.alerts.push({
                         type: 'danger',
                         msg: errorMessage
                     });

                     $scope.showProgress = false;
                     $scope.$apply();
                     return;
                 };

                 // el método puede regresar un error (y su mensaje)
                 $scope.alerts.length = 0;
                 $scope.alerts.push({
                     type: result.error ? 'danger' : 'info',
                     msg: result.message
                 });

                 $scope.showProgress = false;
                 $scope.$apply();
          });
      };


      // -------------------------------------------------------------------------
      // para inicializar el item (en el $scope) cuando el usuario abre la página
      // -------------------------------------------------------------------------

      $scope.helpers({
          monedas: () => {
            return Monedas.find();
          },
          tiposAsientoContable: () => {
              return TiposAsientoContable.find();
          },
      });

      let fechaOriginalAsientoContable = null;

      function inicializarItem() {

          $scope.showProgress = true;

          if ($scope.id == "0") {
              // TODO: aquí muchos fields vendrían por defecto, como: usuario, cia, moneda, moneda original,
              // factor de cambio, ...
              let usuario = Meteor.users.findOne(Meteor.userId());
              let monedaDefecto = Monedas.findOne({ defaultFlag: true });
              let tipoAsientoDefecto = ParametrosGlobalBancos.findOne();
              fechaOriginalAsientoContable = null;

              if (!monedaDefecto) {
                  DialogModal($modal, "<em>Asientos contables</em>",
                                      `Aparentemente, no se ha definido una moneda <em>defecto</em>
                                      en el catálogo de monedas. <br />
                                      Ud. debe revisar el catálgo <em>Monedas</em> y corregir esta situación.`,
                                     false).then();

                  $scope.showProgress = false;
                  return;
              };

              if (!tipoAsientoDefecto || !tipoAsientoDefecto.tipoAsientoDefault) {
                  DialogModal($modal, "<em>Asientos contables</em>",
                                      `Aparentemente, no se ha definido una tipo de asientos <em>defecto</em>,
                                      en el catálogo <em>Parámetros globales</em> en <em>Bancos</em>. <br />
                                      Ud. debe revisar el catálgo <em>Parámetros globales</em> (en Bancos) y
                                      corregir esta situación.`,
                                     false).then();

                  $scope.showProgress = false;
                  return;
              };

              $scope.asientoContable = {  _id: new Mongo.ObjectID()._str,
                                          numeroAutomatico: 0,
                                          mes: 0,
                                          ano: 0,
                                          mesFiscal: 0,
                                          anoFiscal: 0,
                                          numero: 0,
                                          tipo: tipoAsientoDefecto.tipoAsientoDefault,
                                          moneda: monedaDefecto.moneda,
                                          monedaOriginal: monedaDefecto.moneda,
                                          partidas: [],
                                          ingreso: new Date(),
                                          ultAct: new Date(),
                                          user: Meteor.userId(),
                                          usuario: usuario.emails[0].address,
                                          cia: companiaContabSeleccionada.numero,
                                          docState: 1
                                        };

                $scope.partidas_ui_grid.data = [];

                if (_.isArray($scope.asientoContable.partidas))
                   $scope.partidas_ui_grid.data = $scope.asientoContable.partidas;

                $scope.showProgress = false;
          }
          else {

              let filtro = {
                  _id: $scope.id,
              };

              // cuando el usuario selecciona el asiento en la lista (asientosContablesList), alli, con
              // un Meteor method se lee desde sql y se graba a mongo; ahora suscribimos para leerlo
              // desde mongo y mostrarlo en esta página
              Meteor.subscribe('asientosContables', JSON.stringify(filtro), () => {

                  $scope.helpers({
                      asientoContable: () => {
                        return AsientosContables.findOne({ _id: $scope.id });
                      }
                    });

                    // guardamos, en una propiedad separada, la fecha del asiento; esto nos permitirá validar 2 cosas, aún
                    // si el usuario cambia la fecha del asiento:
                    // 1) que no se cambie a un mes diferente (esto podría permitirse, pero tomando en cuenta varios criterios)
                    // 2) que el asiento no corresponda a un mes cerrado (y su fecha sea cambiada a uno que no lo es)
                    fechaOriginalAsientoContable = $scope.asientoContable ? $scope.asientoContable.fecha : null;

                    $scope.partidas_ui_grid.data = [];

                    if (_.isArray($scope.asientoContable.partidas))
                       $scope.partidas_ui_grid.data = $scope.asientoContable.partidas;

                    $scope.showProgress = false;
                    $scope.$apply();
              });
          };
      };

      inicializarItem();
  }
]);
