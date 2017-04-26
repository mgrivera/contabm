
AngularApp.controller("Bancos_Facturas_Factura_Controller",
['$scope', '$stateParams', '$state', '$meteor', '$modal', 'uiGridConstants', 'leerTablasImpuestosRetenciones',
 'tablasImpuestosRetenciones',
function ($scope, $stateParams, $state, $meteor, $modal, uiGridConstants,
          leerTablasImpuestosRetenciones, tablasImpuestosRetenciones) {

      // nótese como injectamos el resolve del parent state y de éste state; la idea es que el resolve del parent
      // state se ejecute (resuelva) en forma completa y anterior, y *solo luego* se resuelva el resolve del child state

      $scope.showProgress = false;

      // ui-bootstrap alerts ...
      $scope.alerts = [];
      $scope.closeAlert = function (index) {
          $scope.alerts.splice(index, 1);
      };

      $scope.helpers({
          companiaSeleccionada: () => {
              let ciaContabSeleccionada = CompaniaSeleccionada.findOne({ userID: Meteor.userId() }, { fields: { companiaID: 1, }});
              return Companias.findOne(ciaContabSeleccionada &&
                                       ciaContabSeleccionada.companiaID ?
                                       ciaContabSeleccionada.companiaID : 0,
                                       { fields: { _id: 1, numero: 1, nombre: 1, nombreCorto: 1 } });
          },
      });

      $scope.cxcCxPList = $scope.$parent.cxcCxPList;
      $scope.ncNdList = $scope.$parent.ncNdList;
      $scope.parametrosGlobalBancos = $scope.$parent.parametrosGlobalBancos;
      $scope.parametrosBancos = $scope.$parent.parametrosBancos;
      $scope.impuestosRetencionesDefinicion = lodash.orderBy(tablasImpuestosRetenciones.impuestosRetencionesDefinicion,
                                                             [ 'Predefinido' ], [ 'asc' ]);

      $scope.tiposAlicuotaIva = tablasImpuestosRetenciones.alicuotasIva;

      // la lista de compañías viene desde el parent state; allí hacemos el subscribe ...
      $scope.helpers({
          proveedores: () => {
              return Proveedores.find({ }, { fields: { proveedor: 1, nombre: 1, }, });
          },
          monedas: () => {
              return Monedas.find({ }, { fields: { moneda: 1, descripcion: 1, }, });
          },
          tiposProveedor: () => {
              return TiposProveedor.find({ }, { fields: { tipo: 1, descripcion: 1, }, });
          },
          formasDePago: () => {
              return FormasDePago.find({ }, { fields: { formaDePago: 1, descripcion: 1, numeroDeCuotas: 1, }, });
          },
      });

      $scope.origen = $stateParams.origen;
      $scope.id = $stateParams.id;
      $scope.limit = parseInt($stateParams.limit);
      // convertirmos desde 'true' a true
      $scope.vieneDeAfuera = String($stateParams.vieneDeAfuera).toLowerCase() === 'true';

      // para validar las fechas originales cuando el usuario modifica una factura
      $scope.fechaEmisionOriginal = null;
      $scope.fechaRecepcionOriginal = null;

      $scope.setIsEdited = function (value) {

          // cuando el usuario indica la compañía (prov o cliente), leemos sus datos en sql ...
          if (value === 'compania' && $scope.factura.proveedor) {
              $meteor.call('leerDatosCompaniaParaFactura', $scope.factura.proveedor).then(
                  function (data) {

                      if (data.error) {
                          $scope.alerts.length = 0;
                          $scope.alerts.push({
                              type: 'danger',
                              msg: data.message
                          })
                          $scope.showProgress = false;
                      } else {
                          // leemos desde sql una buena cantidad de datos que permiten emitir la factura para el
                          // proveedor o cliente; ejemplo: AplicaIvaFlag, ContribuyenteEspecialFlag,
                          // BaseRetencionISLR, etc
                          $scope.proveedor = JSON.parse(data);;

                          // leemos el proveedor en mongo para inicializar algunos 'defaults'
                          let proveedorCliente = Proveedores.findOne({ proveedor: $scope.factura.proveedor });
                          if (proveedorCliente) {
                              $scope.factura.moneda = proveedorCliente.monedaDefault;
                              $scope.factura.condicionesDePago = proveedorCliente.formaDePagoDefault;
                              $scope.factura.tipo = proveedorCliente.tipo;
                              $scope.factura.cxCCxPFlag = proveedorCliente.proveedorClienteFlag;
                              $scope.factura.concepto = proveedorCliente.concepto;

                              if ($scope.proveedor.aplicaIvaFlag) {
                                  $scope.factura.montoFacturaConIva = proveedorCliente.montoCheque;
                              } else {
                                  $scope.factura.montoFacturaSinIva = proveedorCliente.montoCheque;
                              }
                          }

                          $scope.alerts.length = 0;
                          $scope.showProgress = false;
                      }
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

          if ($scope.factura.docState)
              return;

          $scope.factura.docState = 2;
      };

      $scope.windowClose = () => {
          window.close();
      }

      $scope.regresarALista = function (value) {

          if ($scope.factura && $scope.factura.docState && $scope.origen == 'edicion') {
              var promise = DialogModal($modal,
                                        "<em>Bancos - Facturas</em>",
                                        "Aparentemente, Ud. ha efectuado cambios; aún así, desea <em>regresar</em> y perder los cambios?",
                                        true);

              promise.then(
                  function (resolve) {
                      $state.go('bancos.facturas.lista', { origen: $scope.origen, limit: $scope.limit });
                  },
                  function (err) {
                      return true;
                  });

              return;
          }
          else
              $state.go('bancos.facturas.lista', { origen: $scope.origen, limit: $scope.limit });
      };

      $scope.eliminar = function () {

          if ($scope.factura && $scope.factura.docState && $scope.factura.docState == 1) {
              DialogModal($modal, "<em>Bancos - Facturas</em>",
                                  `El registro es nuevo (no existe en la base de datos); para eliminar, simplemente
                                   haga un click en <em>Refresh</em> o <em>Regrese</em> a la lista.
                                  `,
                                  false).then();

              return;
          };

          // simplemente, ponemos el docState en 3 para que se elimine al Grabar ...
          $scope.factura.docState = 3;
      };

      $scope.refresh0 = function () {

          if ($scope.factura && $scope.factura.docState && $scope.factura.docState == 1) {
              var promise = DialogModal($modal,
                                        "<em>Bancos - Facturas</em>",
                                        `Ud. está ahora agregando un <em>nuevo</em> registro; no hay nada que refrescar.<br />
                                         Ud. puede hacer un <em>click</em> en <em>Nuevo</em> para deshacer esta operación y comenzar de nuevo.
                                        `,
                                        false);
              return;
          };

          if ($scope.factura.docState && $scope.origen == 'edicion') {
              var promise = DialogModal($modal,
                                        "<em>Bancos - Facturas</em>",
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
          factura_leerByID_desdeSql($scope.factura.claveUnica);
      };

      $scope.exportarAMicrosoftWord = () => {
          var modalInstance = $modal.open({
              templateUrl: 'client/bancos/facturas/exportarAMicrosoftWordModal.html',
              controller: 'FacturasExportarAMicrosoftWordModalController',
              size: 'lg',
              resolve: {
                  tiposArchivo: () => {
                      return ['BANCOS-FACTURAS', 'BANCOS-RET-IMP-IVA', 'BANCOS-RET-IMP-ISLR'];
                  },
                  aplicacion: () => {
                      return 'bancos';
                  },
                  ciaSeleccionada: function () {
                      return $scope.companiaSeleccionada;
                  },
                  factura: () => {
                      return $scope.factura;
                  },
                  user: () => {
                      return Meteor.user().emails[0].address;              // nómina, bancos, contab, ...
                  },
                  facturasFiltro: () => {
                      return `(${$scope.factura.claveUnica.toString()})`;
                  }
              },
          }).result.then(
                function (resolve) {
                    return true;
                },
                function (cancel) {
                    return true;
                });
      };


      $scope.mostrarCuotas = () => {
          if (!$scope.factura || !_.isArray($scope.factura.cuotasFactura) || !$scope.factura.cuotasFactura.length) {
              DialogModal($modal, "<em>Bancos - Facturas - Cuotas</em>",
                                  `Factura sin cuotas. No hay cuotas que mostrar.<br />
                                   Recuerde que las cuotas para una factura que se está registrando son
                                   construidas al ser grabada.<br />
                                   Probablemente, Ud. debe completar y grabar la factura antes de
                                   intentar revisar sus cuotas.
                                  `,
                                 false).then();
              return;
          };

          var modalInstance = $modal.open({
              templateUrl: 'client/bancos/facturas/mostrarCuotasFactura.html',
              controller: 'MostrarCuotasFactura_Modal_Controller',
              size: 'lg',
              resolve: {
                  companiaContabSeleccionada: () => {
                      return $scope.companiaSeleccionada;
                  },
                  factura: () => {
                      return $scope.factura;
                  },
              }
          }).result.then(
                function (resolve) {
                    return true;
                },
                function (cancel) {
                    return true;
                });
      };


      $scope.mostrarPagosAsociados = () => {
          var modalInstance = $modal.open({
              templateUrl: 'client/bancos/facturas/mostrarPagosAsociadosModal.html',
              controller: 'MostrarPagosAsociadosModal_Controller',
              size: 'lg',
              resolve: {
                  companiaContabSeleccionada: () => {
                      return $scope.companiaSeleccionada;
                  },
                  factura: () => {
                      return $scope.factura;
                  },
                  origen: () => {
                      return $scope.origen;
                  },
              },
          }).result.then(
                function (resolve) {
                    return true;
                },
                function (cancel) {
                    return true;
                });
      }



      $scope.asientoContable = function() {

          var modalInstance = $modal.open({
              templateUrl: 'client/generales/asientosContablesAsociados/asientosContablesAsociadosModal.html',
              controller: 'AsientosContablesAsociados_Controller',
              size: 'lg',
              resolve: {
                  provieneDe: () => {
                      return "Facturas";
                  },
                  entidadID: () => {
                      return $scope.factura.claveUnica;
                  },
                  ciaSeleccionada: () => {
                      return $scope.companiaSeleccionada;
                  },
                  origen: () => {
                      return $scope.origen;
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


      $scope.nuevo0 = function () {

            if ($scope.factura.docState) {
                var promise = DialogModal($modal,
                                          "<em>Bancos - Facturas</em>",
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


        let impuestosRetenciones_ui_grid_api = null;
        let impuestoRetencionSeleccionado = [];

        $scope.impuestosRetenciones_ui_grid = {

            enableSorting: true,
            showColumnFooter: false,
            enableFiltering: false,
            enableCellEdit: false,
            enableCellEditOnFocus: false,           // or true
            enableRowSelection: true,
            enableRowHeaderSelection: false,
            multiSelect: false,
            enableSelectAll: false,
            selectionRowHeaderWidth: 0,
            rowHeight: 25,

            onRegisterApi: function (gridApi) {

                impuestosRetenciones_ui_grid_api = gridApi;

                gridApi.selection.on.rowSelectionChanged($scope, function (row) {

                    impuestoRetencionSeleccionado = null;
                    if (row.isSelected) {
                        impuestoRetencionSeleccionado = row.entity;
                    }
                    else {
                        return;
                    };
                });

                gridApi.edit.on.afterCellEdit($scope, function (rowEntity, colDef, newValue, oldValue) {
                    if (newValue != oldValue) {
                        // si el usuario agrega un nuevo item (impRet), determinamos su tipo y agregamos
                        // algunos valores 'por defecto' que pueden existir en impuestosRetencionesDefinicion

                        if (colDef.field == 'impRetID') {
                            // cuando el usuario cambia el tipo de item, casi siempre (o siempre?) será para
                            // un registro nuevo; debemos inializar los valores del item en base al contenido
                            // de la definición que existe en el catálogo impuestosRetencionesDefinicion
                            let functionResult =
                            inicializarImpRetConImpuestosRetencionesDefinicion(rowEntity,
                                                                               $scope.proveedor,
                                                                               $scope.factura,
                                                                               $scope.impuestosRetencionesDefinicion,
                                                                               $scope.parametrosBancos,
                                                                               $scope.parametrosGlobalBancos,
                                                                               $scope.tiposAlicuotaIva);

                             if (functionResult.error) {
                                 $scope.alerts.length = 0;
                                 $scope.alerts.push({
                                     type: 'danger',
                                     msg: functionResult.message
                                 });
                             };
                        };

                        // esta vez no usamos un docState para el item en el array ...
                        // if (!rowEntity.docState)
                        //     rowEntity.docState = 2;

                        if (!$scope.factura.docState)
                            $scope.factura.docState = 2;
                    };
                });
            },
            // para reemplazar el field '$$hashKey' con nuestro propio field, que existe para cada row ...
            // nótese que usamos 'id', y no '_id', pues estos registros vienen de sql con un id único
            // (y nosotros no agregamos un _id mongo) ...
            rowIdentity: function (row) {
                return row._id;
            },

            getRowIdentity: function (row) {
                return row._id;
            }
        };

        $scope.impuestosRetenciones_ui_grid.columnDefs = [
            {
                name: 'impRetID',
                field: 'impRetID',
                displayName: 'Concepto',
                width: 150,

                editableCellTemplate: 'ui-grid/dropdownEditor',
                editDropdownIdLabel: 'ID',
                editDropdownValueLabel: 'Descripcion',
                editDropdownOptionsArray: $scope.impuestosRetencionesDefinicion,
                cellFilter: 'mapDropdown:row.grid.appScope.impuestosRetencionesDefinicion:"ID":"Descripcion"',

                enableFiltering: false,
                headerCellClass: 'ui-grid-leftCell',
                cellClass: 'ui-grid-leftCell',
                enableColumnMenu: false,
                enableCellEdit: true,
                enableSorting: true,
                type: 'number'
            },
            {
                name: 'codigo',
                field: 'codigo',
                displayName: 'Código',
                width: 60,
                enableFiltering: false,
                headerCellClass: 'ui-grid-centerCell',
                cellClass: 'ui-grid-centerCell',
                enableColumnMenu: false,
                enableCellEdit: true,
                enableSorting: true,
                type: 'string'
            },
            {
                name: 'montoBase',
                field: 'montoBase',
                displayName: 'Monto base',
                width: 120,
                enableFiltering: false,
                headerCellClass: 'ui-grid-rightCell',
                cellClass: 'ui-grid-rightCell',
                cellFilter: 'currencyFilterNorCeroNorNull4decimals',
                enableColumnMenu: false,
                enableCellEdit: true,
                enableSorting: true,
                type: 'number'
            },
            {
                name: 'porcentaje',
                field: 'porcentaje',
                displayName: '%',
                width: 80,
                enableFiltering: false,
                headerCellClass: 'ui-grid-rightCell',
                cellClass: 'ui-grid-rightCell',
                cellFilter: 'currencyFilterNorCeroNorNull4decimals',
                enableColumnMenu: false,
                enableCellEdit: true,
                enableSorting: true,
                type: 'number'
            },
            {
                name: 'tipoAlicuota',
                field: 'tipoAlicuota',
                displayName: 'Tipo alícuota',
                width: 100,
                enableFiltering: false,
                headerCellClass: 'ui-grid-centerCell',
                cellClass: 'ui-grid-centerCell',
                enableColumnMenu: false,
                enableCellEdit: true,
                enableSorting: true,
                type: 'string'
            },
            {
                name: 'montoAntesSustraendo',
                field: 'montoAntesSustraendo',
                displayName: 'Monto',
                width: 120,
                enableFiltering: false,
                headerCellClass: 'ui-grid-rightCell',
                cellClass: 'ui-grid-rightCell',
                cellFilter: 'currencyFilterNorCeroNorNull4decimals',
                enableColumnMenu: false,
                enableCellEdit: true,
                enableSorting: true,
                type: 'number'
            },
            {
                name: 'sustraendo',
                field: 'sustraendo',
                displayName: 'Sustraendo',
                width: 100,
                enableFiltering: false,
                headerCellClass: 'ui-grid-rightCell',
                cellClass: 'ui-grid-rightCell',
                cellFilter: 'currencyFilterNorCeroNorNull4decimals',
                enableColumnMenu: false,
                enableCellEdit: true,
                enableSorting: true,
                type: 'number'
            },
            {
                name: 'monto',
                field: 'monto',
                displayName: 'Monto',
                width: 120,
                enableFiltering: false,
                headerCellClass: 'ui-grid-rightCell',
                cellClass: 'ui-grid-rightCell',
                cellFilter: 'currencyFilterNorCeroNorNull4decimals',
                enableColumnMenu: false,
                enableCellEdit: true,
                enableSorting: true,
                type: 'number'
            },
            {
                name: 'fechaRecepcionPlanilla',
                field: 'fechaRecepcionPlanilla',
                displayName: 'F recep planilla',
                width: 100,
                enableFiltering: false,
                headerCellClass: 'ui-grid-centerCell',
                cellClass: 'ui-grid-centerCell',
                cellFilter: 'dateFilter',
                enableColumnMenu: false,
                enableCellEdit: true,
                enableSorting: true,
                type: 'date'
            },
            {
                name: 'delButton',
                displayName: '',
                cellTemplate: '<span ng-click="grid.appScope.deleteItemImpuestoRetenciones(row.entity)" class="fa fa-close redOnHover" style="padding-top: 8px; "></span>',
                cellClass: 'ui-grid-centerCell',
                enableCellEdit: false,
                enableSorting: false,
                width: 25
            },
        ];


        $scope.deleteItemImpuestoRetenciones = (item) => {
            // nótese que eliminamos el item del array; en otras ocasiones lo marcamos ...
            if (_.isArray($scope.factura.impuestosRetenciones)) {
                $scope.factura.impuestosRetenciones =
                    lodash.filter($scope.factura.impuestosRetenciones, (x) => { return x !== item; });

                $scope.impuestosRetenciones_ui_grid.data = [];
                $scope.impuestosRetenciones_ui_grid.data = $scope.factura.impuestosRetenciones;

                if (!$scope.factura.docState) {
                    $scope.factura.docState = 2;
                }
            }
        }


        $scope.nuevoImpuestosRetenciones = () => {
            // cada item de imp/ret que el usuario agrega puede o no ser 'predefinido'. El usuario determina
            // ésto, cuando selecciona el tipo de registro en el ddl (combo). Los tipos de imp/ret se definen
            // en el catálogo ImpuestosRetencionesDefinicio y pueden o no ser predefinidos. Los items
            // predefinidos son siempre: impIva, retIva, retIslr. El usuario puede definir otros impuestos
            // y/o retenciones, aunque esto solo muy raras veces ocurrirá ...

            let item = {
                _id: new Mongo.ObjectID()._str,
                id: 0,
                facturaID: $scope.factura.claveUnica,
                // nótese que no hay docState; simplemente, cuando se graba en server, estos registros de
                // impuestosRetenciones son *siempre* eliminados y grabados nuevamente ...
                // docState: 1
            };

            if (!_.isArray($scope.factura.impuestosRetenciones)) {
                $scope.factura.impuestosRetenciones = [];
            };

            $scope.factura.impuestosRetenciones.push(item);

            $scope.impuestosRetenciones_ui_grid.data = [];
            $scope.impuestosRetenciones_ui_grid.data = $scope.factura.impuestosRetenciones;

            if (!$scope.factura.docState) {
                $scope.factura.docState = 2;
            }
        }


        $scope.determinarImpuestosRetenciones = () => {
            // Write your code here.

            // a veces, estas tablas, al iniciarse el controller, no existen todavía en el parent state;
            // de ser así, intentamos leerlas nuevamente ...
            if (!$scope.parametrosGlobalBancos) {
                $scope.parametrosGlobalBancos = $scope.$parent.parametrosGlobalBancos;
            }

            if (!$scope.parametrosBancos) {
                $scope.parametrosBancos = $scope.$parent.parametrosBancos;
            }

            // intentamos determinar montos de impuesto (Iva) y retenciones (Islr/Iva) para esta factura;
            // para hacerlo, leemos datos de parametrización que se registran para la compañía
            let contribuyenteEspecialFlag = false;

            if ($scope.proveedor.contribuyenteEspecialFlag)
                contribuyenteEspecialFlag = $scope.proveedor.contribuyenteEspecialFlag;

            // inicialmente, obtenemos todos los valores que necesitamos para determinar impuestos y retenciones
            let sujetoARetencionFlag = false;
            let ivaPorc = null;
            let retencionIvaPorc = null;
            let retencionIslrPorc = null;
            let impuestoRetenidoIslrSustraendo = null;
            let codigoConceptoRetencionIslr = "";

            if ($scope.proveedor.aplicaIvaFlag && $scope.parametrosGlobalBancos.ivaPorc)
                ivaPorc = $scope.parametrosGlobalBancos.ivaPorc;


            // determinamos el porcentaje de retención Iva para la compañía ...
            switch ($scope.factura.cxCCxPFlag) {
                case 1: {
                        // cuentas por pagar (factura de un proveedor)
                        // -------------------------------------------------------------------------------------------
                        // el usuario indica en ParametrosBancos si la compañía Contab retiene impuestos sobre iva a
                        // sus proveedores (contribuyente especial)

                        // nótese como, SOLO si la cia contab retiene, el porcentaje del proveedor PRIVA sobre el
                        // de la compañía
                        if ($scope.parametrosBancos.retencionSobreIvaFlag) {
                            if ($scope.proveedor.nuestraRetencionSobreIvaPorc) {
                                retencionIvaPorc = $scope.proveedor.nuestraRetencionSobreIvaPorc;
                            } else {
                                retencionIvaPorc = $scope.parametrosBancos.retencionSobreIvaPorc;
                            };
                        };
                        break;
                    }
                case 2: {
                        // cuentas por cobrar (factura a un cliente)
                        if ($scope.proveedor.contribuyenteEspecialFlag) {
                            if ($scope.proveedor.retencionSobreIvaPorc)
                                retencionIvaPorc = $scope.proveedor.retencionSobreIvaPorc;
                            else
                                retencionIvaPorc = $scope.parametrosBancos.retencionSobreIvaPorc;
                        };
                        break;
                    };
            };


            if ($scope.proveedor.sujetoARetencionFlag && $scope.proveedor.porcentajeDeRetencion) {
                sujetoARetencionFlag = true;
                retencionIslrPorc = $scope.proveedor.porcentajeDeRetencion;

                if ($scope.proveedor.retencionIslrSustraendo)
                    impuestoRetenidoIslrSustraendo = $scope.proveedor.retencionIslrSustraendo;

                if ($scope.proveedor.codigoConceptoRetencion)
                    codigoConceptoRetencionIslr = $scope.proveedor.codigoConceptoRetencion;
            };

            // -------------------------------------------------------------------------------
            // 1) agregamos un registro a Facturas_Impuestos para el impuesto Iva
            if ($scope.factura.montoFacturaConIva && ivaPorc) {
                // la compañía indica que se debe aplicar un impuesto Iva; Nota: debemos buscar una definición
                // en la tabla ImpuestosRetenciones_Definicion, para el valor predefinido 1 ...
                // nótese que esta tabla la leimos en el parent state y está en $scope.$parent ...

                let definicionItem = _.find($scope.impuestosRetencionesDefinicion, (x) => {
                    return x.Predefinido === 1;
                });

                if (!definicionItem) {
                    let message = `Error: aunque en el registro de la compañía se inidica que se
                        debe aplicar un <em>impuesto Iva</em>,
                        no existe una definción para este impuesto en la tabla que corresponde.
                        Ud. debe registrar una definición para este impuesto usando la opción:
                        <em>Bancos / Catálogos / Definición de impuestos y retenciones</em>.`;

                    $scope.alerts.length = 0;
                    $scope.alerts.push({
                        type: 'danger',
                        msg: message
                    });

                    return;
                };

                // con esta función, determinamos el tipo de alícuota que corresonde al porcentaje de
                // impuesto usado ...
                let tipoAlicuotaImpuestosIva = determinarTipoAlicuotaImpuestosIva($scope.tiposAlicuotaIva,
                                                                                  $scope.factura.fechaEmision,
                                                                                  ivaPorc);

                if (tipoAlicuotaImpuestosIva.error) {
                    let message = `Error: hemos obtenido un error al intentar determinar el tipo
                            (reducida, general, adicional) de alícuota para el porcentaje de
                            impuesto Iva indicado.<br />
                            Ud. debe revisar la tabla <em>Tipos de Alicuota Iva (Bancos / Maestras / Catálogos)</em>
                            e intentar corregir esta situación.`;

                    $scope.alerts.length = 0;
                    $scope.alerts.push({
                        type: 'danger',
                        msg: tipoAlicuotaImpuestosIva.message
                    });

                    return;
                };

                // grabamos un registro a la tabla Facturas_Impuestos, para la aplicación del impuesto Iva
                if (!_.isArray($scope.factura.impuestosRetenciones)) {
                    $scope.factura.impuestosRetenciones = [];
                };

                let impuestoRetencionItem = {
                     _id: new Mongo.ObjectID()._str,
                     id: 0,
                     facturaID: $scope.factura.claveUnica,
                     impRetID: definicionItem.ID,
                     montoBase: $scope.factura.montoFacturaConIva,
                     porcentaje: ivaPorc,
                     tipoAlicuota: tipoAlicuotaImpuestosIva.tipoAlicuotaImpuestosIva,
                };

                $scope.factura.impuestosRetenciones.push(impuestoRetencionItem);

                if (!$scope.factura.docState) {
                    $scope.factura.docState = 2;
                }
            };

            // -------------------------------------------------------------------------------
            // 2) agregamos un registro a Facturas_Impuestos para la retención Iva
            if ($scope.factura.montoFacturaConIva && ivaPorc && retencionIvaPorc) {
                // nótese que el montoIva lo calculamos justo antes; para que haya una retención Iva deben haber un monto Iva ...
                    // la compañía indica que se debe aplicar un impuesto Iva; Nota: debemos buscar una definición en la tabla
                    // ImpuestosRetenciones_Definicion, para el valor predefinido 2 ...
                    let definicionItem = _.find($scope.impuestosRetencionesDefinicion, (x) => {
                        return x.Predefinido === 2;
                    });

                    if (!definicionItem) {
                        let message = `Error: aunque en el registro de la compañía se inidica que se debe aplicar <em>retención para el impuesto Iva</em>,
                                no existe una definción para este rubro en la tabla que corresponde.
                                Ud. debe registrar una definición para este rubro usando la opción:
                                <em>Bancos / Catálogos / Definición de impuestos y retenciones</em>.`;

                        $scope.alerts.length = 0;
                        $scope.alerts.push({
                            type: 'danger',
                            msg: message
                        });

                        return;
                    };

                    // grabamos un registro a la tabla Facturas_Impuestos, para la aplicación de la ret/Iva
                    if (!_.isArray($scope.factura.impuestosRetenciones)) {
                        $scope.factura.impuestosRetenciones = [];
                    };

                    let impuestoRetencionItem = {
                         _id: new Mongo.ObjectID()._str,
                         id: 0,
                         facturaID: $scope.factura.claveUnica,
                         impRetID: definicionItem.ID,
                         montoBase: lodash.round($scope.factura.montoFacturaConIva * ivaPorc / 100, 4),
                         porcentaje: retencionIvaPorc,
                    };

                    $scope.factura.impuestosRetenciones.push(impuestoRetencionItem);

                    if (!$scope.factura.docState) {
                        $scope.factura.docState = 2;
                    }
            };


            // -------------------------------------------------------------------------------
            // 3) agregamos un registro a Facturas_Impuestos para la retención Islr
            if ($scope.factura.montoFacturaSinIva || $scope.factura.montoFacturaConIva) {
                if (sujetoARetencionFlag && retencionIslrPorc) {

                    // la compañía indica que se debe aplicar un impuesto Iva; Nota: debemos buscar una definición en la tabla
                    // ImpuestosRetenciones_Definicion, para el valor predefinido 3 ...
                    let definicionItem = _.find($scope.impuestosRetencionesDefinicion, (x) => {
                        return x.Predefinido === 3;
                    });

                    if (!definicionItem) {
                        let message = `Error: aunque en el registro de la compañía se inidica que se debe aplicar
                            <em>retención para el Islr</em>,
                            no existe una definción para este rubro en la tabla que corresponde.
                            Ud. debe registrar una definición para este rubro usando la opción:
                            <em>Bancos / Catálogos / Definición de impuestos y retenciones</em>.`;

                        $scope.alerts.length = 0;
                        $scope.alerts.push({
                            type: 'danger',
                            msg: message
                        });

                        return;
                    };

                    let montoBase = null;
                    if ($scope.proveedor.baseRetencionISLR) {
                        if (($scope.proveedor.baseRetencionISLR == 1 || $scope.proveedor.baseRetencionISLR == 3) &&
                            $scope.factura.montoFacturaSinIva)
                            montoBase = $scope.factura.montoFacturaSinIva;

                        if (($scope.proveedor.baseRetencionISLR == 2 || $scope.proveedor.baseRetencionISLR == 3) &&
                            $scope.factura.montoFacturaConIva)
                            montoBase = montoBase ? montoBase + $scope.factura.montoFacturaConIva : $scope.factura.montoFacturaConIva;
                    } else {
                        if (definicionImpRet.Base) {
                            if ((definicionImpRet.Base == 1 || definicionImpRet.Base == 3) && $scope.factura.montoFacturaSinIva)
                                montoBase = $scope.factura.montoFacturaSinIva;

                            if ((definicionImpRet.Base == 2 || definicionImpRet.Base == 3) && $scope.factura.montoFacturaConIva)
                                montoBase = montoBase ? montoBase + $scope.factura.montoFacturaConIva : $scope.factura.montoFacturaConIva;
                        };
                    };

                    // grabamos un registro a la tabla Facturas_Impuestos, para la aplicación de la ret/Islr
                    if (!_.isArray($scope.factura.impuestosRetenciones)) {
                        $scope.factura.impuestosRetenciones = [];
                    };

                    let impuestoRetencionItem = {
                         _id: new Mongo.ObjectID()._str,
                         id: 0,
                         facturaID: $scope.factura.claveUnica,
                         impRetID: definicionItem.ID,
                         codigo: codigoConceptoRetencionIslr,
                         montoBase: montoBase,
                         porcentaje: retencionIslrPorc,
                         sustraendo: impuestoRetenidoIslrSustraendo,
                    };

                    $scope.factura.impuestosRetenciones.push(impuestoRetencionItem);

                    if (!$scope.factura.docState) {
                        $scope.factura.docState = 2;
                    }
                };
            };
        };



        $scope.calcularFactura = () => {
            let factura = $scope.factura;

             if (!factura)
                 return;

             let proveedor = $scope.proveedor;

             // -------------------------------------------------------------------------------
             // intentamos calcular los impuestos y retenciones que existan en la lista ...
             factura.impuestosRetenciones.forEach((impuesto) => {
                 let definicionImpRet = null;

                 // lo primero que hacemos es leer la definición del imp o ret en el catálogo
                 definicionImpRet = _.find($scope.impuestosRetencionesDefinicion, (x) => {
                     return x.ID === impuesto.impRetID;
                 });

                 // TODO: para impIva: intentar calcular tipoAlicuota, si no viene una
                 // TODO: para retIslr: intentar determinar codigo y sustraendo, si no vienen estos valores

                 // solo para rubros no 'predefinidos', intentamos usar el porcentaje de la definición si no viene uno
                 // (aunque en estos casos, de imp/ret no predefinidos, el usuario indicará un % en forma manual)
                 if (!impuesto.porcentaje)
                     if (!definicionImpRet.Predefinido)
                         if (definicionImpRet.Porcentaje)
                             impuesto.porcentaje = definicionImpRet.Porcentaje;


                 if (impuesto.montoBase && impuesto.porcentaje) {
                     impuesto.montoAntesSustraendo = lodash.round(impuesto.montoBase * impuesto.porcentaje / 100, 4);
                     impuesto.monto = impuesto.montoAntesSustraendo;

                     if (impuesto.sustraendo)
                         impuesto.monto -= impuesto.sustraendo;
                 };
             });

             // arriba calculamos el monto de impuestos y retenciones (en el grid); ahora, calculamos los
             // montos generales de la factura ...
             calcularFactura2(factura);

             if (!factura.docState) {
                 factura.docState = 2;
             }
        };



        function calcularFactura2(factura) {
            // a diferencia de calcular, donde solo calculamos impuestos y retenciones que están en el grid,
            // aquí calculamos la factura como tal. Esta función debería ser ejecutada luego de
            // calcularFactura, para completar el calculo de la factura cuando ya están calculados
            // los montos en el grid

             factura.iva = null;
             factura.otrosImpuestos = null;
             factura.totalAPagar = 0;
             factura.retencionSobreIva = null;
             factura.impuestoRetenido = null;
             factura.impuestoRetenidoISLRAntesSustraendo = null;
             factura.otrasRetenciones = null;
             factura.saldo = 0;

             if (!factura.montoFacturaConIva && !factura.montoFacturaSinIva)
                 return;

             factura.montoFactura = 0;
             factura.totalFactura = 0;

             if (factura.montoFacturaSinIva)
                 factura.montoFactura = factura.montoFacturaSinIva;

             if (factura.montoFacturaConIva)
                 factura.montoFactura += factura.montoFacturaConIva;

             factura.totalFactura = factura.montoFactura;

             // calculamos y agregamos el iva
             // nótese que el iva está en la lista de impuestos y retenciones
             factura.impuestosRetenciones.forEach((impuesto) => {
                 // lo primero que hacemos es leer la definición del imp o ret en el catálogo
                 let definicionImpRet = _.find($scope.impuestosRetencionesDefinicion, (x) => {
                     return x.ID === impuesto.impRetID;
                 });

                 if (definicionImpRet.Predefinido && definicionImpRet.Predefinido == 1) {
                     if (!factura.iva)
                         factura.iva = 0;

                     factura.iva += impuesto.monto ? impuesto.monto : 0;
                 };

                 // 'otros' impuestos; vienen de registros no predefinidos, pero de tipo impuestos
                 if (!definicionImpRet.Predefinido && definicionImpRet.ImpuestoRetencion === 1) {
                     if (!factura.otrosImpuestos)
                         factura.otrosImpuestos = 0;

                     factura.otrosImpuestos += impuesto.monto;
                 };
             });


             if (factura.otrosImpuestos)
                 factura.totalFactura += factura.otrosImpuestos;

             if (factura.iva)
                 factura.totalFactura += factura.iva;


             factura.impuestosRetenciones.forEach((impuesto) => {
                 // lo primero que hacemos es leer la definición del imp o ret en el catálogo
                 let definicionImpRet = _.find($scope.impuestosRetencionesDefinicion, (x) => {
                     return x.ID === impuesto.impRetID;
                 });

                 if (definicionImpRet.Predefinido && definicionImpRet.Predefinido === 2) {
                     if (!factura.retencionSobreIva)
                         factura.retencionSobreIva = 0;

                     factura.retencionSobreIva += impuesto.monto ? impuesto.monto : 0;
                 };

                 // retención Islr
                 if (definicionImpRet.Predefinido && definicionImpRet.Predefinido === 3) {
                     if (!factura.impuestoRetenido)
                         factura.impuestoRetenido = 0;

                     factura.impuestoRetenido += impuesto.monto ? impuesto.monto : 0;
                 };

                 // 'otras' retenciones
                 if (!definicionImpRet.Predefinido && definicionImpRet.ImpuestoRetencion == 2) {
                     if (!factura.otrasRetenciones)
                         factura.otrasRetenciones = 0;

                     factura.otrasRetenciones += impuesto.monto ? impuesto.monto : 0;
                 };
             });


             // por último calculamos el total a pagar y el saldo
             factura.totalAPagar = factura.totalFactura;

             if (factura.impuestoRetenido)
                 factura.totalAPagar -= factura.impuestoRetenido;

             if (factura.retencionSobreIva)
                 factura.totalAPagar -= factura.retencionSobreIva;

             if (factura.otrasRetenciones)
                 factura.totalAPagar -= factura.otrasRetenciones;

             factura.totalAPagar = lodash.round(factura.totalAPagar, 4);

             factura.saldo = factura.totalAPagar;

             // ahora determinamos el estado de la factura; Nota importante: la unica forma que el
             // estado no sea Pendiente, es que exista un monto de anticipo. Recuérdese que facturas
             // con pagos no pueden ser alteradas en forma alguna (al menos por ahora)

             if (factura.saldo === 0) {
                 // la factura está completamente pagada; ésto nunca debe ocurrir aquí, a menos que
                 // exista un anticipo que cubra totalmente la factura
                 factura.estado = 3;        // pagada
             } else if (factura.saldo != factura.totalAPagar) {
                 // ésto puede ocurrir solo cuando hay anticipos (que no cubren la factura; caso más común)
                 // nótese que, en vez de indicar que el saldo sea *menor*, indicamos que sea diferente.
                 // para notas de crédito, los montos son negativos y el caso sería: totalAPagar: -5.000,
                 // saldo: -2.000. Este último no es menor, sino mayor al monto a pagar
                 factura.estado = 2;        // parcialmente pagada
             } else {
                 factura.estado = 1;        // pendiente
             }
         };


     $scope.redondearFactura = () => {

         // la idea de esta funcion es redondear los montos de la factura a 2 decimales
         // esto es necesario cuando algún impuesto o retención, al calcularse, produce
         // más de 2 decimales; entonces, el resultado final de la factura puede tener
         // también más de 2 decimales. Lo que hacemos es redondear montos de impuestos y
         // retenciones a 2 decimales y recalcular la factura ...

         let factura = $scope.factura;

         if (!factura.montoFacturaConIva && !factura.montoFacturaSinIva)
            return;

        // redondeamos los montos calculados (iva y retenciones de impuesto) a solo 2 decimales ...
        factura.impuestosRetenciones.forEach((impuesto) => {
            if (impuesto.montoAntesSustraendo) {
                impuesto.montoAntesSustraendo = lodash.round(impuesto.montoAntesSustraendo, 2);

                if (impuesto.sustraendo != null)
                    impuesto.sustraendo = lodash.round(impuesto.sustraendo, 2);

                impuesto.monto = impuesto.montoAntesSustraendo;

                if (impuesto.sustraendo)
                    impuesto.monto -= impuesto.sustraendo;
            }
        });

        // nótese que calcularFactura2 no calcula los montos en el grid (impuestos/retenciones);
        // solo los valores generales de la factura. La idea es recalcular la factura, una vez
        // redondeados los montos en el grid (imp/ret) ...
         calcularFactura2(factura);
     };




      // -------------------------------------------------------------------------
      // Grabar las modificaciones hechas al registro
      // -------------------------------------------------------------------------
      $scope.grabar = function () {

          if (!$scope.factura.docState) {
              DialogModal($modal, "<em>Facturas</em>",
                                  `Aparentemente, <em>no se han efectuado cambios</em> en el registro.
                                   No hay nada que grabar.`,
                                 false).then();
              return;
          };

          // calculamos la factura; si la misma no cuadra, informamos al usuario, pero permitirmos continuar ...
          let factura = $scope.factura;

          let totalFactura = 0;

          if (factura.montoFacturaSinIva)
            totalFactura = factura.montoFacturaSinIva;

          if (factura.montoFacturaConIva)
            totalFactura += factura.montoFacturaConIva;

          if (factura.iva)
            totalFactura += factura.iva;

          if (factura.otrosImpuestos)
            totalFactura += factura.otrosImpuestos;

          if (factura.impuestoRetenido)
            totalFactura -= factura.impuestoRetenido;

          if (factura.retencionSobreIva)
            totalFactura -= factura.retencionSobreIva;

          if (factura.otrasRetenciones)
            totalFactura -= factura.otrasRetenciones;

          let diferencia = factura.totalAPagar - totalFactura;

          if (diferencia) {
              DialogModal($modal, "<em>Bancos - Facturas</em>",
                                  `Hemos encontrado una diferencia que resulta al calcular la factura usando los
                                   montos que ahora existen.<br />
                                   El monto de la diferencia es de: <b>${numeral(diferencia).format('0,0.000000')}</b>.
                                   <br /><br />
                                   Desea continuar y registrar la factura bajo estas condiciones?
                                  `,
                                  true).then(
                  function (resolve) {
                      grabar2();
                  },
                  function (err) {
                      return;
                  });
              return;
          } else
              grabar2();
      };


      function grabar2() {
          $scope.showProgress = true;

          // obtenemos un clone de los datos a guardar ...
          let editedItem = _.cloneDeep($scope.factura);

          if (editedItem.docState != 3) {
              if (!editedItem.numeroFactura) {
                  editedItem.numeroFactura = '0'; 
              }
          }

          // nótese como validamos cada item antes de intentar guardar en el servidor
          let isValid = false;
          let errores = [];

          if (editedItem.docState != 3) {
              isValid = Facturas.simpleSchema().namedContext().validate(editedItem);

              if (!isValid) {
                  Facturas.simpleSchema().namedContext().invalidKeys().forEach(function (error) {
                      errores.push("El valor '" + error.value + "' no es adecuado para el campo '" + Facturas.simpleSchema().label(error.name) + "'; error de tipo '" + error.type + "'.");
                  });
              };
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

          $meteor.call('facturasSave', editedItem,
                                       $scope.fechaEmisionOriginal,
                                       $scope.fechaRecepcionOriginal,
                                       $scope.companiaSeleccionada.numero).then(
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

                      // nótese que siempre, al registrar cambios, leemos la factura desde sql server; la idea es
                      // mostrar los datos tal como fueron grabados y refrescarlos para el usuario. Cuando el
                      // usuario elimina el registro, su id debe regresar en -999 e InicializarItem no debe
                      // encontrar nada ...
                      inicializarItem($scope.id);
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

      $scope.factura = {};

      function inicializarItem() {
        //   debugger;
          $scope.showProgress = true;

          if ($scope.id == "0") {

              let usuario =  Meteor.user();

              $scope.factura = {};
              $scope.factura = {
                 claveUnica: 0,
                 fechaEmision: new Date(),
                 fechaRecepcion: new Date(),

                 cuotasFactura: [],
                 impuestosRetenciones: [],

                 ingreso: new Date(),
                 ultAct: new Date(),
                 usuario: usuario ? usuario.emails[0].address : null,
                 cia: $scope.companiaSeleccionada.numero,

                 docState: 1,
            };

            $scope.impuestosRetenciones_ui_grid.data = $scope.factura.impuestosRetenciones;

            $scope.alerts.length = 0;               // pueden haber algún 'alert' en la página ...
            $scope.showProgress = false;
          }
          else {
              $scope.showProgress = true;

               // mantenemos las fechas de la factura, pues puede ser necesario validar los valores originales
              factura_leerByID_desdeSql(parseInt($scope.id));
          };
      };

      inicializarItem();

      function factura_leerByID_desdeSql(pk) {
          // ejecutamos un método para leer el asiento contable en sql server y grabarlo a mongo (para el current user)
          Meteor.call('factura.leerByID.desdeSql', pk, (err, result) => {

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

              $scope.factura = {};
              $scope.factura = JSON.parse(result);

              if ($scope.factura == null) {
                  // el usuario eliminó el registro y, por eso, no pudo se leído desde sql
                  $scope.factura = {};
                  $scope.impuestosRetenciones_ui_grid.data = [];

                  $scope.showProgress = false;
                  $scope.$apply();

                  return;
              };

              // las fechas vienen serializadas como strings; convertimos nuevamente a dates
              $scope.factura.fechaEmision = $scope.factura.fechaEmision ? moment($scope.factura.fechaEmision).toDate() : null;
              $scope.factura.fechaRecepcion = $scope.factura.fechaRecepcion ? moment($scope.factura.fechaRecepcion).toDate() : null;
              $scope.factura.fRecepcionRetencionISLR = $scope.factura.fRecepcionRetencionISLR ? moment($scope.factura.fRecepcionRetencionISLR).toDate() : null;
              $scope.factura.fRecepcionRetencionIVA = $scope.factura.fRecepcionRetencionIVA ? moment($scope.factura.fRecepcionRetencionIVA).toDate() : null;
              $scope.factura.ingreso = $scope.factura.ingreso ? moment($scope.factura.ingreso).toDate() : null;
              $scope.factura.ultAct = $scope.factura.ultAct ? moment($scope.factura.ultAct).toDate() : null;

              // las fechas serializadas vienen siempre como strings; convertimos a Date ...
              $scope.factura.impuestosRetenciones.forEach((x) => {
                  x.fechaRecepcionPlanilla = x.fechaRecepcionPlanilla ? moment(x.fechaRecepcionPlanilla).toDate() : null;
              });

              $scope.factura.cuotasFactura.forEach((x) => {
                  x.fechaVencimiento = x.fechaVencimiento ? moment(x.fechaVencimiento).toDate() : null;
              });

              // nótese que este es un valor virtual, que no existe en sql ...
              $scope.factura.montoFactura = 0;
              $scope.factura.montoFactura += $scope.factura.montoFacturaSinIva ? $scope.factura.montoFacturaSinIva : 0;
              $scope.factura.montoFactura += $scope.factura.montoFacturaConIva ? $scope.factura.montoFacturaConIva : 0;

              $scope.impuestosRetenciones_ui_grid.data = $scope.factura.impuestosRetenciones;

              // mantenemos las fechas de la factura para poder validar luego los valores originales de las mismas
              $scope.fechaEmisionOriginal = $scope.factura.fechaEmision;
              $scope.fechaRecepcionOriginal = $scope.factura.fechaRecepcion;

              // finalmente, leemos lo datos importantes del proveedor para tenerlos para cuando sea
              // necesario (al calcular, determinar impuestos y retenciones, etc.)
              $meteor.call('leerDatosCompaniaParaFactura', $scope.factura.proveedor).then(
                  function (data) {

                      if (data.error) {
                          $scope.alerts.length = 0;
                          $scope.alerts.push({
                              type: 'danger',
                              msg: data.message
                          });
                          $scope.showProgress = false;
                      } else {
                          $scope.proveedor = JSON.parse(data);;

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
          });
      };


      // ------------------------------------------------------------------------------------
      // para determinar el tipo de alícuota que corresponde a la tasa de impuesto Iva
      // que usa el usuario; por ejemplo: para 12% el tipo de alícuota es 'G' (general)
      // ------------------------------------------------------------------------------------
      function determinarTipoAlicuotaImpuestosIva(tiposAlicuotaIvaList, fechaEmisionFactura, ivaPorc) {
          // ---------------------------------------------------------------------------------------
          // leemos un registro en TiposAlicuotaIva que sea justo anterior a la fecha de la factura
          let tipoAlicuotaIva = lodash(tiposAlicuotaIvaList).
                                 orderBy([ 'Fecha' ], [ 'desc' ]).
                                 find((x) => { return x.Fecha <= fechaEmisionFactura; });
                              //    .value();

          let tipoAlicuotaImpuestosIva = null;
          if (tipoAlicuotaIva) {
              if (tipoAlicuotaIva.Reducida && ivaPorc == tipoAlicuotaIva.Reducida)
                  tipoAlicuotaImpuestosIva = "R";
              else if (tipoAlicuotaIva.General && ivaPorc == tipoAlicuotaIva.General)
                  tipoAlicuotaImpuestosIva = "G";
              else if (tipoAlicuotaIva.Adicional && ivaPorc == tipoAlicuotaIva.Adicional)
                  tipoAlicuotaImpuestosIva = "A";
          };

          if (!tipoAlicuotaImpuestosIva) {
              let message = `Error: hemos obtenido un error al intentar determinar el tipo
                      (reducida, general, adicional) de alícuota para el porcentaje de
                      impuesto Iva indicado.<br />
                      Ud. debe revisar la tabla <em>Tipos de Alicuota Iva (Bancos / Maestras / Catálogos)</em>
                      e intentar corregir esta situación.`;

              return {
                  error: true,
                  message: message
              };
          };

          return {
              error: false,
              tipoAlicuotaImpuestosIva: tipoAlicuotaImpuestosIva,
          };
      };


      function inicializarImpRetConImpuestosRetencionesDefinicion(impRetItem,
                                                                  proveedor,
                                                                  factura,
                                                                  impuestosRetencionesDefinicion,
                                                                  parametrosBancos,
                                                                  parametrosGlobalBancos,
                                                                  tiposAlicuotaIva) {

          // esta función hace, básicamente, lo mismo que se hace en Determinar, solo que:
          // Deteminar: agrega e inicializa items para: impIva, retIva, retIslr
          // esta función: inicializa el item recibido
          // para inicializar el item, igual que en Determinar, usamos la definición que se ha
          // registrado en el catálogo: ImpuestosRetencionesDefinicion ...

          // lo primero que hacemos es leer la definición del item, en base a su tipo
          let definicionItem = _.find(impuestosRetencionesDefinicion, (x) => {
              return x.ID === impRetItem.impRetID;
          });

          if (!definicionItem)
              // esto no debe ocurrir nunca, pues si el usuario agregó este item y cambio su tipo es
              // porque existe en el catálogo!
              return {
                  error: false,
              };

          // si el item no es 'predefinido', solo intentamos inicializar su monto base y porcentaje
          // (solo si es predefinido, sabemos si es impIva, retIva o retIslr)
          if (!definicionItem.Predefinido) {
              if (!impRetItem.montoBase) {
                  if (definicionItem.Base) {
                      if ((definicionItem.Base == 1 || definicionItem.Base == 3) && factura.montoFacturaSinIva)
                          impRetItem.montoBase = factura.montoFacturaSinIva;

                      if ((definicionItem.Base == 2 || definicionItem.Base == 3) && factura.montoFacturaConIva)
                          impRetItem.montoBase = impRetItem.montoBase ? impRetItem.montoBase + factura.montoFacturaConIva : factura.montoFacturaConIva;
                  };
              };

              if (!impRetItem.porcentaje && definicionItem.Porcentaje) {
                  impRetItem.porcentaje = definicionItem.Porcentaje;
              };

              return {
                  error: false,
              };
          };

          // el registro, imp/ret, que el usuario acaba de indicar es 'predefinida', lo que quiere decir que
          // corresponde a un impIva/retIva/retIslr. Intentamos inicializar sus valores por defecto como
          // se hace en 'Determinar' ...

          let contribuyenteEspecialFlag = false;

          if (proveedor.contribuyenteEspecialFlag)
              contribuyenteEspecialFlag = proveedor.contribuyenteEspecialFlag;

          // inicialmente, obtenemos todos los valores que necesitamos para determinar impuestos y retenciones
          let sujetoARetencionFlag = false;
          let ivaPorc = null;
          let retencionIvaPorc = null;
          let retencionIslrPorc = null;
          let impuestoRetenidoIslrSustraendo = null;
          let codigoConceptoRetencionIslr = "";

          if (proveedor.aplicaIvaFlag && parametrosGlobalBancos.ivaPorc)
              ivaPorc = parametrosGlobalBancos.ivaPorc;


          // determinamos el porcentaje de retención Iva para la compañía ...
          switch (factura.cxCCxPFlag) {
              case 1: {
                      // cuentas por pagar (factura de un proveedor)
                      // -------------------------------------------------------------------------------------------
                      // el usuario indica en ParametrosBancos si la compañía Contab retiene impuestos sobre iva a
                      // sus proveedores (contribuyente especial)

                      // nótese como, SOLO si la cia contab retiene, el porcentaje del proveedor PRIVA sobre el
                      // de la compañía
                      if (parametrosBancos.retencionSobreIvaFlag) {
                          if (proveedor.nuestraRetencionSobreIvaPorc) {
                              retencionIvaPorc = proveedor.nuestraRetencionSobreIvaPorc;
                          } else {
                              retencionIvaPorc = parametrosBancos.retencionSobreIvaPorc;
                          };
                      };
                      break;
                  }
              case 2: {
                      // cuentas por cobrar (factura a un cliente)
                      if (proveedor.contribuyenteEspecialFlag) {
                          if (proveedor.retencionSobreIvaPorc)
                              retencionIvaPorc = proveedor.retencionSobreIvaPorc;
                          else
                              retencionIvaPorc = parametrosBancos.retencionSobreIvaPorc;
                      };
                      break;
                  };
          };


          if (proveedor.sujetoARetencionFlag && proveedor.porcentajeDeRetencion) {
              sujetoARetencionFlag = true;
              retencionIslrPorc = proveedor.porcentajeDeRetencion;

              if (proveedor.retencionIslrSustraendo)
                  impuestoRetenidoIslrSustraendo = proveedor.retencionIslrSustraendo;

              if (proveedor.codigoConceptoRetencion)
                  codigoConceptoRetencionIslr = proveedor.codigoConceptoRetencion;
          };

          // -------------------------------------------------------------------------------
          // 1) agregamos un registro a Facturas_Impuestos para el impuesto Iva
          if (definicionItem.Predefinido === 1 && ivaPorc) {
              // la compañía indica que se debe aplicar un impuesto Iva; Nota: debemos buscar una definición
              // en la tabla ImpuestosRetenciones_Definicion, para el valor predefinido 1 ...
              // nótese que esta tabla la leimos en el parent state y está en $scope.$parent ...


              // con esta función, determinamos el tipo de alícuota que corresonde al porcentaje de
              // impuesto usado ...
              let tipoAlicuotaImpuestosIva = determinarTipoAlicuotaImpuestosIva(tiposAlicuotaIva,
                                                                                factura.fechaEmision,
                                                                                ivaPorc);

              if (tipoAlicuotaImpuestosIva.error) {
                  let message = `Error: hemos obtenido un error al intentar determinar el tipo
                          (reducida, general, adicional) de alícuota para el porcentaje de
                          impuesto Iva indicado.<br />
                          Ud. debe revisar la tabla <em>Tipos de Alicuota Iva (Bancos / Maestras / Catálogos)</em>
                          e intentar corregir esta situación.`;

                  return {
                      error: true,
                      message: message,
                  };
              };

              impRetItem.montoBase = impRetItem.montoBase ? impRetItem.montoBase : factura.montoFacturaConIva;
              impRetItem.porcentaje = impRetItem.porcentaje ? impRetItem.porcentaje : ivaPorc;
              impRetItem.tipoAlicuota = tipoAlicuotaImpuestosIva.tipoAlicuotaImpuestosIva;

              return {
                  error: false,
              };
          };

          // -------------------------------------------------------------------------------
          // 2) agregamos un registro a Facturas_Impuestos para la retención Iva
          if (definicionItem.Predefinido === 2 && ivaPorc && retencionIvaPorc) {
              // el usuario intenta registrar un monto de retención Iva; inicializamos su monto base y %
              let montoBase = factura.montoFacturaConIva ? lodash.round(factura.montoFacturaConIva * ivaPorc / 100, 4) : 0;

              impRetItem.montoBase = impRetItem.montoBase ? impRetItem.montoBase : montoBase;
              impRetItem.porcentaje = impRetItem.porcentaje ? impRetItem.porcentaje : retencionIvaPorc;

              return {
                  error: false,
              };
          };


          // -------------------------------------------------------------------------------
          // 3) agregamos un registro a Facturas_Impuestos para la retención Islr
          if (definicionItem.Predefinido === 3 && (factura.montoFacturaSinIva || factura.montoFacturaConIva)) {
              if (sujetoARetencionFlag && retencionIslrPorc) {
                  let montoBase = null;
                  if (proveedor.baseRetencionISLR) {
                      if ((proveedor.baseRetencionISLR == 1 || proveedor.baseRetencionISLR == 3) &&
                          factura.montoFacturaSinIva)
                          montoBase = factura.montoFacturaSinIva;

                      if ((proveedor.baseRetencionISLR == 2 || proveedor.baseRetencionISLR == 3) &&
                          factura.montoFacturaConIva)
                          montoBase = montoBase ? montoBase + factura.montoFacturaConIva : factura.montoFacturaConIva;
                  } else {
                      if (definicionItem.Base) {
                          if ((definicionItem.Base == 1 || definicionItem.Base == 3) && factura.montoFacturaSinIva)
                              montoBase = factura.montoFacturaSinIva;

                          if ((definicionItem.Base == 2 || definicionItem.Base == 3) && factura.montoFacturaConIva)
                              montoBase = montoBase ? montoBase + factura.montoFacturaConIva : factura.montoFacturaConIva;
                      };
                  };

                  impRetItem.codigo = impRetItem.codigo ? impRetItem.codigo : codigoConceptoRetencionIslr;
                  impRetItem.montoBase = impRetItem.montoBase ? impRetItem.montoBase : montoBase;
                  impRetItem.porcentaje = impRetItem.porcentaje ? impRetItem.porcentaje : retencionIslrPorc;
                  impRetItem.sustraendo = impRetItem.sustraend ? impRetItem.sustraend : impuestoRetenidoIslrSustraendo;
              };

              return {
                  error: false,
              };
          };
      };

  }
]);
