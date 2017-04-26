

// Este controller (angular) se carga con la página primera del programa
AngularApp.controller("Catalogos_Nomina_parentescos_Controller",
['$scope', '$meteor', '$modal', function ($scope, $meteor, $modal) {

    //   debugger;
      $scope.showProgress = false;

      // ui-bootstrap alerts ...
      $scope.alerts = [];

      $scope.closeAlert = function (index) {
          $scope.alerts.splice(index, 1);
      };

      $scope.parentescos_ui_grid = {

          enableSorting: true,
          showColumnFooter: false,
        //   enableCellEdit: false,
        //   enableCellEditOnFocus: false,
          enableRowSelection: false,
          enableRowHeaderSelection: false,
          multiSelect: false,
          enableSelectAll: false,
          selectionRowHeaderWidth: 35,
          rowHeight: 25,

          onRegisterApi: function (gridApi) {

            //   // marcamos el contrato como actualizado cuando el usuario edita un valor
            //   gridApi.edit.on.afterCellEdit($scope, function (rowEntity, colDef, newValue, oldValue) {
            //       if (newValue != oldValue)
            //           if (!rowEntity.docState)
            //               rowEntity.docState = 2;
            //   });
          },
          // para reemplazar el field '$$hashKey' con nuestro propio field, que existe para cada row ...
          rowIdentity: function (row) {
              return row._id;
          },

          getRowIdentity: function (row) {
              return row._id;
          }
      };


      $scope.parentescos_ui_grid.columnDefs = [
          {
              name: 'parentesco',
              field: 'parentesco',
              displayName: '#',
              width: "*",
              headerCellClass: 'ui-grid-centerCell',
              cellClass: 'ui-grid-centerCell',
              enableColumnMenu: false,
              enableCellEdit: false,
              enableSorting: true,
              type: 'number'
          },
          {
              name: 'descripcion',
              field: 'descripcion',
              displayName: 'Descripción',
              width: "*",
              headerCellClass: 'ui-grid-leftCell',
              cellClass: 'ui-grid-leftCell',
              enableColumnMenu: false,
              enableCellEdit: false,
              enableSorting: true,
              type: 'string'
          },
      ];

      $scope.helpers({
          parentescos: () => {
            return Parentescos.find({}, { sort: { descripcion: 1 } });
          }
      });

      $scope.parentescos_ui_grid.data = $scope.parentescos;
}
]);
