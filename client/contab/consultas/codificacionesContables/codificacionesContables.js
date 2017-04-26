

// Este controller (angular) se carga con la página primera del programa
AngularApp.controller("Contab_Consultas_CodificacionesContables_Controller",
['$scope', '$meteor', '$modal', 'uiGridConstants', '$reactive', function ($scope, $meteor, $modal, uiGridConstants, $reactive) {

        // debugger;

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

        if (companiaSeleccionada)
            companiaSeleccionadaDoc = Companias.findOne(companiaSeleccionada.companiaID, { fields: { numero: true, nombre: true } });

        $scope.companiaSeleccionada = {};

        if (companiaSeleccionadaDoc)
            $scope.companiaSeleccionada = companiaSeleccionadaDoc;
        else
            $scope.companiaSeleccionada.nombre = "No hay una compañía seleccionada ...";
        // ------------------------------------------------------------------------------------------------
}
]);
