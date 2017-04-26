
AngularApp.controller("Bancos_Pagos_Controller",
['$scope', '$stateParams', '$state', '$meteor', '$modal',
function ($scope, $stateParams, $state, $meteor, $modal) {

    // solo cuando el usuario abre Factura con 'vieneDeAfuera', este (parent) state puede acceder a sus parámetros,
    // pues no hay filtro/list. Los states se ejecutan así: Facturas (parent) / Factura. Entonces si revisamos
    // $state.params vamos a obtener los parámetros de Factura desde este parent y vamos a tener acceso al
    // parámetro 'proveedor'. Cuando este parámetro viene, es porque Factura es abierto con 'vieneDeAfuera' y
    // solo hacemos el publishing del proveedor específico ...
    let proveedorID = null;
    if ($state.params && $state.params.proveedorID) {
        proveedorID = parseInt($state.params.proveedorID);
    }

      $scope.miSu_List = [
          { miSu: 1, descripcion: 'Mi', },
          { miSu: 2, descripcion: 'Su', },
      ];

      $scope.showProgress = true;

      // bancosCollectionsFacturacion regresa algunos catálogos necesarios para mostrar la página, como
      // la compañía seleccionada. Cuando esta página 'viene de afuera', no espera por los catálogos que
      // existen en el cliente por el publisher 'automático' que los carga al principio. Por ese motivo,
      // debemos ejecutar este publisher y, solo cuando termina, ejecutar helpers como la compañía
      // seleccionada para que se muestre en la página ...
      $scope.subscribe('bancosCollectionsFacturacion', () => [], {
          onReady: function () {
              // 'proveedores' publica solo el proveedor indicado cuando viene uno (proveedorID);
              // caso contrario, vienen todos ...
              $scope.subscribe('proveedores', () => [ proveedorID ], {
                  onReady: function () {

                      let ciaContabSeleccionada = CompaniaSeleccionada.findOne({ userID: Meteor.userId() });
                      $scope.helpers({
                          companiaSeleccionada: () => {
                              return Companias.findOne(ciaContabSeleccionada.companiaID, { fields: { numero: 1, nombre: 1, nombreCorto: 1 } });
                          },
                      });

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
