
AngularApp.controller('BancosConciliacionBancariaComparar_Controller',
['$scope', '$modalInstance', '$modal', '$meteor', 'conciliacionBancariaID', 'companiaSeleccionada',
function ($scope, $modalInstance, $modal, $meteor, conciliacionBancariaID, companiaSeleccionada) {

    // ui-bootstrap alerts ...
    $scope.alerts = [];

    $scope.closeAlert = function (index) {
        $scope.alerts.splice(index, 1);
    };

    $scope.ok = function () {
        $modalInstance.close("Ok");
    };

    $scope.cancel = function () {
        $modalInstance.dismiss("Cancel");
    };

    $scope.companiaSeleccionada = companiaSeleccionada;

    criteriosSeleccionadosArray = [];

    $scope.setIsEdited = (value) => {
        // cada vez que el usuario checks/unchecks uno de los checkboxes, agregamos el valor al
        // array (checked) o lo eliminamos (unchecked)
        switch (value) {
            case 'numero':
                if ($scope.criterio.numeroSelected) {
                    if (!_.find(criteriosSeleccionadosArray, (x) => { return x === 'numero'; })) {
                        criteriosSeleccionadosArray.push('numero');
                    };
                } else {
                    _.remove(criteriosSeleccionadosArray, (x) => { return x === 'numero'; });
                };

                break;
            case 'beneficiario':
                if ($scope.criterio.beneficiarioSelected) {
                    if (!_.find(criteriosSeleccionadosArray, (x) => { return x === 'beneficiario'; })) {
                        criteriosSeleccionadosArray.push('beneficiario');
                    };
                } else {
                    _.remove(criteriosSeleccionadosArray, (x) => { return x === 'beneficiario'; });
                };

                break;
            case 'tipo':
                if ($scope.criterio.tipoSelected) {
                    if (!_.find(criteriosSeleccionadosArray, (x) => { return x === 'tipo'; })) {
                        criteriosSeleccionadosArray.push('tipo');
                    };
                } else {
                    _.remove(criteriosSeleccionadosArray, (x) => { return x === 'tipo'; });
                };

                break;
            case 'concepto':
                if ($scope.criterio.conceptoSelected) {
                    if (!_.find(criteriosSeleccionadosArray, (x) => { return x === 'concepto'; })) {
                        criteriosSeleccionadosArray.push('concepto');
                    };
                } else {
                    _.remove(criteriosSeleccionadosArray, (x) => { return x === 'concepto'; });
                };

                break;
            case 'fecha':
                if ($scope.criterio.fechaSelected) {
                    if (!_.find(criteriosSeleccionadosArray, (x) => { return x === 'fecha'; })) {
                        criteriosSeleccionadosArray.push('fecha');
                    };
                } else {
                    _.remove(criteriosSeleccionadosArray, (x) => { return x === 'fecha'; });
                };

                break;
            case 'monto':
                if ($scope.criterio.montoSelected) {
                    if (!_.find(criteriosSeleccionadosArray, (x) => { return x === 'monto'; })) {
                        criteriosSeleccionadosArray.push('monto');
                    };
                } else {
                    _.remove(criteriosSeleccionadosArray, (x) => { return x === 'monto'; });
                };

                break;
            default:
        };
    };


    $scope.submit_CompararMovimientosForm = function () {
          $scope.submitted = true;
          $scope.alerts.length = 0;

          // TODO: validar que el usuario seleccione, al menos, un criterio de comparación ...
          if (!criteriosSeleccionadosArray.length) {
              $scope.alerts.length = 0;
              $scope.alerts.push({
                  type: 'danger',
                  msg: `Aparentemente, Ud. no ha seleccionado ni un solo criterio de comparación.<br />
                        Ud. debe seleccionar al menos uno de los criterios de comparación mostrados.`
              });

              return;
          };

          if ($scope.compararMovimientosForm.$valid) {
              $scope.submitted = false;
              $scope.compararMovimientosForm.$setPristine();    // para que la clase 'ng-submitted deje de aplicarse a la forma ... button

              let mantenerComparacionesAnteriores = $scope.criterio.mantenerComparacionesAnteriores;
              if (!mantenerComparacionesAnteriores) {
                  mantenerComparacionesAnteriores = false;
              };

              $meteor.call('bancos_conciliacion_CompararMovimientos',
                           conciliacionBancariaID,
                           JSON.stringify(criteriosSeleccionadosArray),
                           mantenerComparacionesAnteriores).then(
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

    };
}
]);
