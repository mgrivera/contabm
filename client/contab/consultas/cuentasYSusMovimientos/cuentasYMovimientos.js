
AngularApp.controller("Contab_Consultas_CuentasYMovimientos_Controller",
['$scope', '$stateParams', '$state', '$meteor', '$modal',
function ($scope, $stateParams, $state, $meteor, $modal) {
    //   debugger; 
      // ------------------------------------------------------------------------------------------------
      // leemos la compañía seleccionada
      let companiaSeleccionada = CompaniaSeleccionada.findOne({ userID: Meteor.userId() });
      let companiaSeleccionadaDoc = {};

      if (companiaSeleccionada)
          companiaSeleccionadaDoc = Companias.findOne(companiaSeleccionada.companiaID, { fields: { numero: true, nombre: true, nombreCorto: true } });

      $scope.companiaSeleccionada = {};

      if (companiaSeleccionadaDoc)
          $scope.companiaSeleccionada = companiaSeleccionadaDoc;
      else
          $scope.companiaSeleccionada.nombre = "No hay una compañía seleccionada ...";
      // ------------------------------------------------------------------------------------------------
  }
]);
