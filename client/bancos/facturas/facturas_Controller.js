
AngularApp.controller("Bancos_Facturas_Controller",
['$scope', '$stateParams', '$state', '$meteor', '$modal', 'leerTablasImpuestosRetenciones',
function ($scope, $stateParams, $state, $meteor, $modal, leerTablasImpuestosRetenciones) {

    // solo cuando el usuario abre Factura con 'vieneDeAfuera', este (parent) state puede acceder a sus parámetros,
    // pues no hay filtro/list. Los states se ejecutan así: Facturas (parent) / Factura. Entonces si revisamos
    // $state.params vamos a obtener los parámetros de Factura desde este parent y vamos a tener acceso al
    // parámetro 'proveedor'. Cuando este parámetro viene, es porque Factura es abierto con 'vieneDeAfuera' y
    // solo hacemos el publishing del proveedor específico ...
    let proveedorID = null;
    if ($state.params && $state.params.proveedorID) {
        proveedorID = parseInt($state.params.proveedorID);
    }

      $scope.estados = [
          { estado: 1, descripcion: 'Pendiente', },
          { estado: 2, descripcion: 'Parcial', },
          { estado: 3, descripcion: 'Pagada', },
          { estado: 4, descripcion: 'Anulada', },
      ];

      $scope.cxcCxPList = [
          { tipo: 1, descripcion: 'CxP', },
          { tipo: 2, descripcion: 'CxC', },
      ];

      $scope.ncNdList = [
          { tipo: 'NC', descripcion: 'NC', },
          { tipo: 'ND', descripcion: 'ND', },
      ];

      // ui-bootstrap alerts ...
      $scope.alerts = [];
      $scope.closeAlert = function (index) {
          $scope.alerts.splice(index, 1);
      };

      $scope.showProgress = true;
      $scope.subscribe('bancosCollectionsFacturacion', () => [], {
          onReady: function () {

              $scope.subscribe('proveedores', () => [ proveedorID ], {
                  onReady: function () {

                      let ciaContabSeleccionada = CompaniaSeleccionada.findOne({ userID: Meteor.userId() });

                      $scope.helpers({
                          companiaSeleccionada: () => {
                              return Companias.findOne(ciaContabSeleccionada.companiaID, { fields: { _id: 1, numero: 1, nombre: 1, nombreCorto: 1 } });
                          },
                      });

                      let parametrosGlobalBancos = ParametrosGlobalBancos.findOne();
                      let parametrosBancos = ParametrosBancos.findOne({ cia: $scope.companiaSeleccionada.numero });

                      if (!parametrosGlobalBancos) {
                          let errorMessage = `Error: no hemos encontrado un registro en la tabla <em>Parámtros Global Bancos</em>.
                                              Esta tabla debe tener un registro antes que Ud. intente agregar una factura.
                                              También puede ocurrir que Ud. no ha corrido la opción
                                              <em>Bancos / Generales / Copiar catálogos</em>. Esta opción inicializa este valor en
                                              este PC.
                                             `;

                          $scope.alerts.length = 0;
                          $scope.alerts.push({
                              type: 'danger',
                              msg: errorMessage
                          });
                      };

                      if (!parametrosBancos) {
                          let errorMessage = `Error: no hemos encontrado un registro en la tabla <em>Parámtros Bancos</em> para
                                              la compañía Contab que está seleccionada ahora.
                                              Esta tabla debe tener un registro para esta compañía,  antes que Ud. intente agregar
                                              una factura.
                                              También puede ocurrir que Ud. no ha corrido la opción
                                              <em>Bancos / Generales / Copiar catálogos</em>. Esta opción inicializa este valor en
                                              este PC.
                                             `;

                          $scope.alerts.length = 0;
                          $scope.alerts.push({
                              type: 'danger',
                              msg: errorMessage
                          });
                      };

                      $scope.parametrosGlobalBancos = parametrosGlobalBancos;
                      $scope.parametrosBancos = parametrosBancos;

                      $scope.showProgress = false;
                      $scope.$apply(); 
                },
                onStop: function (error) {
                    if (error) {
                        $scope.showProgress = false;
                    } else {
                        $scope.showProgress = false;
                    }
                }
            });
          },
          onStop: function (error) {
              if (error) {
                  $scope.showProgress = false;
              } else {
                  $scope.showProgress = false;
              }
          }
      });
  }
]);
