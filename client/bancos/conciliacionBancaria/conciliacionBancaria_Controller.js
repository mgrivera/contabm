
AngularApp.controller("Bancos_ConciliacionesBancarias_ConciliacionBancaria_Controller",
['$scope', '$stateParams', '$state', '$meteor', '$modal', 'uiGridConstants',
function ($scope, $stateParams, $state, $meteor, $modal, uiGridConstants) {

      $scope.showProgress = false;

      // ui-bootstrap alerts ...
      $scope.alerts = [];

      $scope.closeAlert = function (index) {
          $scope.alerts.splice(index, 1);
      };

      let companiaContabSeleccionada = $scope.$parent.companiaSeleccionada;
      $scope.cuentasBancarias = $scope.$parent.cuentasBancarias;

      $scope.origen = $stateParams.origen;
      $scope.id = $stateParams.id;
      $scope.limit = parseInt($stateParams.limit);

      $scope.setIsEdited = function (value) {

          // cuando el usuario seleccionada una cuenta bancaria, debemos leer su banco y moneda para asignar al
          // registro
          if (value === 'cuentaBancaria') {
              $scope.conciliacionBancaria.banco = null;
              $scope.conciliacionBancaria.moneda = null;

              if ($scope.conciliacionBancaria.cuentaBancaria) {
                  // el banco y moneda están, para cada cuenta, en la lista de cuentas que se preparó en $scope.$parent ...
                  let cuentaBancariaSeleccionada = _.find($scope.cuentasBancarias,
                                                         (x) => { return x.cuentaBancaria ===
                                                                         $scope.conciliacionBancaria.cuentaBancaria; });

                  if (cuentaBancariaSeleccionada) {
                      $scope.conciliacionBancaria.banco = cuentaBancariaSeleccionada.banco;
                      $scope.conciliacionBancaria.moneda = cuentaBancariaSeleccionada.moneda;
                  };
              };
          };

          if ($scope.conciliacionBancaria.docState)
              return;

          $scope.conciliacionBancaria.docState = 2;
      };

      $scope.regresarALista = function () {

          if ($scope.conciliacionBancaria && $scope.conciliacionBancaria.docState && $scope.origen == 'edicion') {
              var promise = DialogModal($modal,
                                        "<em>Bancos - Conciliaciones bancarias</em>",
                                        "Aparentemente, Ud. ha efectuado cambios; aún así, desea <em>regresar</em> y perder los cambios?",
                                        true);

              promise.then(
                  function (resolve) {
                      $state.go('bancos.conciliacionesBancarias.lista', { origen: $scope.origen, limit: $scope.limit });
                  },
                  function (err) {
                      return true;
                  });

              return;
          }
          else
              $state.go('bancos.conciliacionesBancarias.lista', { origen: $scope.origen, limit: $scope.limit });
      };

      $scope.eliminar = function () {

          if ($scope.conciliacionBancaria && $scope.conciliacionBancaria.docState && $scope.conciliacionBancaria.docState == 1) {
              DialogModal($modal, "<em>Bancos - Conciliaciones bancarias</em>",
                                  "El registro es nuevo (no existe en la base de datos); para eliminar, simplemente haga un <em>Refresh</em> o <em>Regrese</em> a la lista.",
                                  false).then();

              return;
          };

          // simplemente, ponemos el docState en 3 para que se elimine al Grabar ...
          $scope.conciliacionBancaria.docState = 3;
      };

      $scope.refresh0 = function () {

          if ($scope.conciliacionBancaria && $scope.conciliacionBancaria.docState && $scope.conciliacionBancaria.docState == 1) {
              var promise = DialogModal($modal,
                                        "<em>Bancos - Conciliaciones bancarias</em>",
                                        `Ud. está ahora agregando un <em>nuevo</em> registro; no hay nada que refrescar.<br />
                                         Ud. puede hacer un <em>click</em> en <em>Nuevo</em> para deshacer esta operación y comenzar de nuevo.
                                        `,
                                        false);
              return;
          };

          if ($scope.conciliacionBancaria.docState && $scope.origen == 'edicion') {
              var promise = DialogModal($modal,
                                        "<em>Bancos - Conciliaciones bancarias</em>",
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
          // en sql el pk del movimiento bancario se llama ClaveUnica; sin embargo, el model en sequelize
          // lo renombra a id ...
          movimientoBancario_leerByID_desdeSql($scope.movimientoBancario.claveUnica);
      };


      $scope.exportarExcel = function() {

          // leemos la cuenta bancaria para obtener el banco, moneda y cuenta bancaria (nombre, simbolo, l...)
          let cuentasBancariasList = FuncionesGlobalesBancos.flattenBancos(companiaContabSeleccionada);
          let cuentaBancariaItem = _.find(cuentasBancariasList, (x) => {
                                              return x.cuentaInterna === $scope.conciliacionBancaria.cuentaBancaria;
                                          });

          let modalInstance = $modal.open({
              templateUrl: 'client/bancos/conciliacionBancaria/exportarExcelModal.html',
              controller: 'BancosConciliacionBancariaExportarExcel_Controller',
              size: 'md',
              resolve: {
                  movimientosPropiosNoEncontrados: () => {
                      return lodash.filter($scope.conciliacionesBancarias_movimientosPropios,
                                    (x) => { return x.conciliado === 'no'; });

                      },
                  movimientosBancoNoEncontrados: () => {
                      return lodash.filter($scope.conciliacionesBancarias_movimientosBanco,
                                    (x) => { return x.conciliado === 'no'; });

                      },
                  banco: () => {
                      return cuentaBancariaItem && cuentaBancariaItem.nombreBanco ?
                             cuentaBancariaItem.nombreBanco : null;
                  },
                  moneda: () => {
                      return cuentaBancariaItem && cuentaBancariaItem.simboloMoneda ?
                             cuentaBancariaItem.simboloMoneda : null;
                  },
                  cuentaBancaria: () => {
                      return cuentaBancariaItem && cuentaBancariaItem.cuentaBancaria ?
                             cuentaBancariaItem.cuentaBancaria : null;
                  },
                  ciaSeleccionada: () => {
                      return companiaContabSeleccionada;
                  },

              },
          }).result.then(
                function (resolve) {
                    return true;
                },
                function (cancel) {
                    return true;
                });
      };


      let movimientosPropios_ui_grid_api = null;
      let movimientoPropioSeleccionado = {};

      $scope.movimientosPropios_ui_grid = {

          enableSorting: true,
          showGridFooter: true,
          showColumnFooter: false,
          enableRowSelection: true,
          enableFiltering: true,
          enableRowHeaderSelection: false,
          multiSelect: false,
          enableSelectAll: false,
          selectionRowHeaderWidth: 0,
          rowHeight: 25,

          onRegisterApi: function (gridApi) {

              movimientosPropios_ui_grid_api = gridApi;

              gridApi.selection.on.rowSelectionChanged($scope, function (row) {
                  //debugger;
                  movimientoPropioSeleccionado = {};

                  if (row.isSelected) {
                      movimientoPropioSeleccionado = row.entity;
                  }
                  else {
                      return;
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


      $scope.movimientosPropios_ui_grid.columnDefs = [
          {
              name: 'fecha',
              field: 'fecha',
              displayName: 'Fecha',
              width: '80',
              enableFiltering: false,
              cellFilter: 'dateFilter',
              headerCellClass: 'ui-grid-centerCell',
              cellClass: 'ui-grid-centerCell',
              enableColumnMenu: false,
              enableSorting: true,
              type: 'date'
          },
          {
              name: 'consecutivo',
              field: 'consecutivo',
              displayName: '##',
              width: '50',
              enableFiltering: true,
              headerCellClass: 'ui-grid-centerCell',
              cellClass: 'ui-grid-centerCell',
              enableColumnMenu: false,
              enableSorting: true,
              type: 'number'
          },
          {
              name: 'numero',
              field: 'numero',
              displayName: 'Número',
              width: '100',
              enableFiltering: true,
              headerCellClass: 'ui-grid-leftCell',
              cellClass: 'ui-grid-leftCell',
              enableColumnMenu: false,
              enableSorting: true,
              type: 'number'
          },
          {
              name: 'tipo',
              field: 'tipo',
              displayName: 'Tipo',
              width: '60',
              headerCellClass: 'ui-grid-centerCell',
              cellClass: 'ui-grid-centerCell',
              enableFiltering: true,
              enableColumnMenu: false,
              enableSorting: true,
              type: 'string'
          },
          {
              name: 'beneficiario',
              field: 'beneficiario',
              displayName: 'Beneficiario',
              width: '140',
              headerCellClass: 'ui-grid-leftCell',
              cellClass: 'ui-grid-leftCell',
              enableFiltering: true,
              enableColumnMenu: false,
              enableSorting: true,
              type: 'string'
          },
          {
              name: 'concepto',
              field: 'concepto',
              displayName: 'Concepto',
              width: '140',
              headerCellClass: 'ui-grid-leftCell',
              cellClass: 'ui-grid-leftCell',
              enableFiltering: true,
              enableColumnMenu: false,
              enableSorting: true,
              type: 'string'
          },
          {
              name: 'monto',
              field: 'monto',
              displayName: 'Monto',
              width: '100',
              headerCellClass: 'ui-grid-rightCell',
              cellClass: 'ui-grid-rightCell',
              cellFilter: 'currencyFilter',
              enableFiltering: true,
              enableColumnMenu: false,
              enableSorting: true,
              type: 'number'
          },
          {
              name: 'conciliado',
              field: 'conciliado',
              displayName: 'Conciliado',
              width: '100',
              headerCellClass: 'ui-grid-centerCell',
              cellClass: 'ui-grid-centerCell',
              enableFiltering: true,
              enableColumnMenu: false,
              enableSorting: true,
              type: 'string'
          },
          {
              name: 'consecutivoMovBanco',
              field: 'consecutivoMovBanco',
              displayName: '## banco',
              width: '80',
              headerCellClass: 'ui-grid-centerCell',
              cellClass: 'ui-grid-centerCell',
              enableFiltering: true,
              enableColumnMenu: false,
              enableSorting: true,
              type: 'number'
          },
          {
              name: 'fechaEntregado',
              field: 'fechaEntregado',
              displayName: 'Entregado el',
              width: '100',
              enableFiltering: false,
              cellFilter: 'dateFilter',
              headerCellClass: 'ui-grid-centerCell',
              cellClass: 'ui-grid-centerCell',
              enableColumnMenu: false,
              enableSorting: true,
              type: 'date'
          },
      ];


            let movimientosBanco_ui_grid_api = null;
            let movimientoBancoSeleccionado = {};

            $scope.movimientosBanco_ui_grid = {

                enableSorting: true,
                showGridFooter: true,
                showColumnFooter: false,
                enableRowSelection: true,
                enableFiltering: true,
                enableRowHeaderSelection: false,
                multiSelect: false,
                enableSelectAll: false,
                selectionRowHeaderWidth: 0,
                rowHeight: 25,

                onRegisterApi: function (gridApi) {

                    movimientosBanco_ui_grid_api = gridApi;

                    gridApi.selection.on.rowSelectionChanged($scope, function (row) {
                        //debugger;
                        movimientoBancoSeleccionado = {};

                        if (row.isSelected) {
                            movimientoBancoSeleccionado = row.entity;
                        }
                        else {
                            return;
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

            $scope.movimientosBanco_ui_grid.columnDefs = [
                {
                    name: 'fecha',
                    field: 'fecha',
                    displayName: 'Fecha',
                    width: '80',
                    enableFiltering: false,
                    cellFilter: 'dateFilter',
                    headerCellClass: 'ui-grid-centerCell',
                    cellClass: 'ui-grid-centerCell',
                    enableColumnMenu: false,
                    enableSorting: true,
                    type: 'date'
                },
                {
                    name: 'consecutivo',
                    field: 'consecutivo',
                    displayName: '##',
                    width: '50',
                    enableFiltering: true,
                    headerCellClass: 'ui-grid-centerCell',
                    cellClass: 'ui-grid-centerCell',
                    enableColumnMenu: false,
                    enableSorting: true,
                    type: 'number'
                },
                {
                    name: 'numero',
                    field: 'numero',
                    displayName: 'Número',
                    width: '100',
                    enableFiltering: true,
                    headerCellClass: 'ui-grid-leftCell',
                    cellClass: 'ui-grid-leftCell',
                    enableColumnMenu: false,
                    enableSorting: true,
                    type: 'number'
                },
                {
                    name: 'tipo',
                    field: 'tipo',
                    displayName: 'Tipo',
                    width: '60',
                    headerCellClass: 'ui-grid-centerCell',
                    cellClass: 'ui-grid-centerCell',
                    enableFiltering: true,
                    enableColumnMenu: false,
                    enableSorting: true,
                    type: 'string'
                },
                {
                    name: 'beneficiario',
                    field: 'beneficiario',
                    displayName: 'Beneficiario',
                    width: '140',
                    headerCellClass: 'ui-grid-leftCell',
                    cellClass: 'ui-grid-leftCell',
                    enableFiltering: true,
                    enableColumnMenu: false,
                    enableSorting: true,
                    type: 'string'
                },
                {
                    name: 'concepto',
                    field: 'concepto',
                    displayName: 'Concepto',
                    width: '140',
                    headerCellClass: 'ui-grid-leftCell',
                    cellClass: 'ui-grid-leftCell',
                    enableFiltering: true,
                    enableColumnMenu: false,
                    enableSorting: true,
                    type: 'string'
                },
                {
                    name: 'monto',
                    field: 'monto',
                    displayName: 'Monto',
                    width: '100',
                    headerCellClass: 'ui-grid-rightCell',
                    cellClass: 'ui-grid-rightCell',
                    cellFilter: 'currencyFilter',
                    enableFiltering: true,
                    enableColumnMenu: false,
                    enableSorting: true,
                    type: 'number'
                },
                {
                    name: 'conciliado',
                    field: 'conciliado',
                    displayName: 'Conciliado',
                    width: '100',
                    headerCellClass: 'ui-grid-centerCell',
                    cellClass: 'ui-grid-centerCell',
                    enableFiltering: true,
                    enableColumnMenu: false,
                    enableSorting: true,
                    type: 'string'
                },
                {
                    name: 'consecutivoMovPropio',
                    field: 'consecutivoMovPropio',
                    displayName: '## propio',
                    width: '80',
                    headerCellClass: 'ui-grid-centerCell',
                    cellClass: 'ui-grid-centerCell',
                    enableFiltering: true,
                    enableColumnMenu: false,
                    enableSorting: true,
                    type: 'number'
                },
            ];



      $scope.nuevo0 = function () {

            if ($scope.conciliacionBancaria.docState) {
                var promise = DialogModal($modal,
                                          "<em>Bancos - Conciliaciones bancarias</em>",
                                          "Aparentemente, <em>se han efectuado cambios</em> en el registro. Si Ud. continúa esta operación, " +
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
            $scope.id = "0";                        // para que inicializarItem() agregue un nuevo registro

            inicializarItem();
        };

      // -------------------------------------------------------------------------
      // Grabar las modificaciones hechas al siniestro
      // -------------------------------------------------------------------------
      $scope.grabar = function () {

          if (!$scope.conciliacionBancaria.docState) {
              DialogModal($modal, "<em>Conciliaciones bancarias</em>",
                                  "Aparentemente, <em>no se han efectuado cambios</em> en el registro. No hay nada que grabar.",
                                 false).then();
              return;
          };

          $scope.showProgress = true;

          // obtenemos un clone de los datos a guardar ...
          let editedItem = _.cloneDeep($scope.conciliacionBancaria);

          // nótese como validamos cada item antes de intentar guardar en el servidor
          let isValid = false;
          let errores = [];

          if (editedItem.docState != 3) {
              isValid = ConciliacionesBancarias.simpleSchema().namedContext().validate(editedItem);

              if (!isValid) {
                  ConciliacionesBancarias.simpleSchema().namedContext().invalidKeys().forEach(function (error) {
                      errores.push("El valor '" + error.value + "' no es adecuado para el campo '" + ConciliacionesBancarias.simpleSchema().label(error.name) + "'; error de tipo '" + error.type + "'.");
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

          $meteor.call('conciliacionesBancariasSave', editedItem).then(
              function (data) {

                  if (data.error) {
                      // el método que intenta grabar los cambis puede regresar un error cuando,
                      // por ejemplo, la fecha corresponde a un mes ya cerrado en Bancos ...
                      $scope.alerts.length = 0;
                      $scope.alerts.push({
                          type: 'danger',
                          msg: data.message
                      });
                      $scope.showProgress = false;
                  } else {
                      $scope.alerts.length = 0;
                      $scope.alerts.push({
                          type: 'info',
                          msg: data.message
                      });

                      // el meteor method regresa siempre el _id del item; cuando el usuario elimina, regresa "-999"
                      $scope.id = data.id;

                      // solo si el item es nuevo, no hemos creado un helper para el mismo (pues es nuevo y no
                      // existía en mongo); lo hacemos ahora para que el item que se ha agregado en mongo sea el
                      // que efectivamente se muestre al usuario una vez que graba el item en mongo. Además, para
                      // agregar el 'reactivity' que existe para items que existían y que se editan
                      if ($scope.conciliacionBancaria && $scope.conciliacionBancaria.docState && $scope.conciliacionBancaria.docState == 1) {
                          // 'inicializar...' lee el registro recién agregado desde mongo y agrega un 'helper' para él ...
                          inicializarItem($scope.id);
                      };

                      $scope.showProgress = false;
                  };
              },
              function (err) {

                  let errorMessage = ClientGlobal_Methods.mensajeErrorDesdeMethod_preparar(err);

                  $scope.alerts.length = 0;
                  $scope.alerts.push({
                      type: 'danger',
                      msg: errorMessage
                  });
                  $scope.showProgress = false;
              });
      };


    //   $scope.helpers({
    //       chequerasList: () => {
    //           // chequerasLocal es un 'client collection' que usamos para registrar una lista de chequeras
    //           // para usar como dataSource en el drop down list en la forma; este 'client collection' es
    //           // creado en 'filtro' ...
    //           return Chequeras.find({ cia: companiaContabSeleccionada.numero });
    //       },
    //       proveedores: () => {
    //           return Proveedores.find();
    //       },
    //   });


      $scope.conciliacionBancaria = {};

      function inicializarItem() {
        //   debugger;
          $scope.showProgress = true;

          if ($scope.id == "0") {

              let usuario =  Meteor.user();

              $scope.conciliacionBancaria = {};
              $scope.conciliacionBancaria = {
                 _id: new Mongo.ObjectID()._str,
                 desde: new Date(),
                 hasta: new Date(),
                 cia: companiaContabSeleccionada.numero,

                 ingreso: new Date(),
                 ultMod: new Date(),
                 usuario: usuario ? usuario.emails[0].address : null,
                 docState: 1,
            };

            $scope.alerts.length = 0;               // pueden haber algún 'alert' en la página ...
            $scope.showProgress = false;
          }
          else {
            $scope.showProgress = true;
            leerConciliacionBancaria($scope.id);
          };
      };

      inicializarItem();


      function leerConciliacionBancaria(id) {
          $scope.subscribe("conciliacionesBancarias", () => [JSON.stringify({ _id: id })],
          {
                onReady: function() {
                      $scope.helpers({
                          conciliacionBancaria: () => {
                              return ConciliacionesBancarias.findOne(id);
                          },
                          conciliacionesBancarias_movimientosPropios: () => {
                              return ConciliacionesBancarias_movimientosPropios.find(
                                  { conciliacionID: id },
                                  { sort: { consecutivo: 1 } }
                              );
                          },
                          conciliacionesBancarias_movimientosBanco: () => {
                              return ConciliacionesBancarias_movimientosBanco.find(
                                  { conciliacionID: id },
                                  { sort: { consecutivo: 1 } }
                              );

                          }
                      });

                      $scope.movimientosPropios_ui_grid.data = [];
                      $scope.movimientosPropios_ui_grid.data = $scope.conciliacionesBancarias_movimientosPropios;

                      $scope.movimientosBanco_ui_grid.data = [];
                      $scope.movimientosBanco_ui_grid.data = $scope.conciliacionesBancarias_movimientosBanco;

                      // en este momento tenemos la vacación y el empleado ...
                      $scope.showProgress = false;
                      $scope.$apply();
                },
                onStop: function(err) {
                    if (err) {
                    } else {
                    }
                }
          });
      };


      // para leer movimientos propios y registrarlos en mongo
      $scope.cargarMovimientosBancariosPropios = () => {

          if ($scope.conciliacionBancaria.docState) {
              DialogModal($modal, "<em>Conciliaciones bancarias</em>",
                                  "Aparentemente, <em>se han efectuado cambios</em> en el registro. " +
                                  "Ud. debe grabar los cambios antes de intentar ejecutar esta función.",
                                 false).then();
              return;
          };

          if (!$scope.conciliacionBancaria || !$scope.conciliacionBancaria._id) {
              DialogModal($modal, "<em>Conciliaciones bancarias</em>",
                                  "Aparentemente, la conciliación bancaria no está completa aún. " +
                                  "Ud. debe completar el registro de esta conciliación antes de intentar ejecutar esta función.",
                                 false).then();
              return;
          };

          $scope.showProgress = true;

          $meteor.call('bancos_conciliacion_LeerMovtosPropios', $scope.conciliacionBancaria._id).then(
              function (data) {

                  if (data.error) {
                      // el método que intenta grabar los cambis puede regresar un error cuando,
                      // por ejemplo, la fecha corresponde a un mes ya cerrado en Bancos ...
                      $scope.alerts.length = 0;
                      $scope.alerts.push({
                          type: 'danger',
                          msg: data.message
                      });
                      $scope.showProgress = false;
                  } else {
                      $scope.alerts.length = 0;
                      $scope.alerts.push({
                          type: 'info',
                          msg: data.message
                      });

                      $scope.showProgress = false;
                  };
              },
              function (err) {
                  let errorMessage = ClientGlobal_Methods.mensajeErrorDesdeMethod_preparar(err);

                  $scope.alerts.length = 0;
                  $scope.alerts.push({
                      type: 'danger',
                      msg: errorMessage
                  });
                  $scope.showProgress = false;
              });
      };



      // para leer movimientos del banco y registrarlos en mongo
      $scope.cargarMovimientosBancariosDelBanco = () => {

          if ($scope.conciliacionBancaria.docState) {
              DialogModal($modal, "<em>Conciliaciones bancarias</em>",
                                  "Aparentemente, <em>se han efectuado cambios</em> en el registro. " +
                                  "Ud. debe grabar los cambios antes de intentar ejecutar esta función.",
                                 false).then();
              return;
          };

          if (!$scope.conciliacionBancaria || !$scope.conciliacionBancaria._id) {
              DialogModal($modal, "<em>Conciliaciones bancarias</em>",
                                  "Aparentemente, la conciliación bancaria no está completa aún. " +
                                  "Ud. debe completar el registro de esta conciliación antes de intentar ejecutar esta función.",
                                 false).then();
              return;
          };

          // para abrir un modal que permita al usuario leer un doc excel desde el cliente e importar cada row
          // como una cuenta contable

          let modalInstance = $modal.open({
              templateUrl: 'client/bancos/conciliacionBancaria/importarDesdeExcelModal.html',
              controller: 'BancosConciliacionBancariaImportarDesdeExcel_Controller',
              size: 'lg',
              resolve: {
                  conciliacionBancariaID: () => {
                      return $scope.conciliacionBancaria._id;
                  },
                  companiaSeleccionada: () => {
                      return companiaContabSeleccionada;
                  },
              },
          }).result.then(
                function (resolve) {
                    return true;
                },
                function (cancel) {
                    // refrescamos el ui-grid, pues agregamos todas las cuentas desde Excel ..
                    // $scope.cuentasContables_ui_grid.data = [];
                    // if (_.isArray($scope.cuentasContables))
                    //    $scope.cuentasContables_ui_grid.data = $scope.cuentasContables;

                    return true;
                });
      };


      $scope.compararMovimientosBancarios = () => {

          if ($scope.conciliacionBancaria.docState) {
              DialogModal($modal, "<em>Conciliaciones bancarias</em>",
              "Aparentemente, <em>se han efectuado cambios</em> en el registro. " +
              "Ud. debe grabar los cambios antes de intentar ejecutar esta función.",
              false).then();
              return;
          };

          if (!$scope.conciliacionBancaria || !$scope.conciliacionBancaria._id) {
              DialogModal($modal, "<em>Conciliaciones bancarias</em>",
              "Aparentemente, la conciliación bancaria no está completa aún. " +
              "Ud. debe completar el registro de esta conciliación antes de intentar ejecutar esta función.",
              false).then();
              return;
          };


          let modalInstance = $modal.open({
              templateUrl: 'client/bancos/conciliacionBancaria/compararMovimientosModal.html',
              controller: 'BancosConciliacionBancariaComparar_Controller',
              size: 'md',
              resolve: {
                  conciliacionBancariaID: () => {
                      return $scope.conciliacionBancaria._id;
                  },
                  companiaSeleccionada: () => {
                      return companiaContabSeleccionada;
                  },
              },
          }).result.then(
              function (resolve) {
                  return true;
              },
              function (cancel) {
                  return true;
              });
          };
  }
]);
