

// Este controller (angular) se carga con la página primera del programa
AngularApp.controller("Catalogos_Companias_Controller",
['$scope', '$meteor', '$modal', function ($scope, $meteor, $modal) {

    //   debugger;
      $scope.showProgress = false;

      // ui-bootstrap alerts ...
      $scope.alerts = [];

      $scope.closeAlert = function (index) {
          $scope.alerts.splice(index, 1);
      };

      $scope.companias_ui_grid = {

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


      $scope.companias_ui_grid.columnDefs = [
          {
              name: 'numero',
              field: 'numero',
              displayName: '#',
              width: 40,
              headerCellClass: 'ui-grid-centerCell',
              cellClass: 'ui-grid-centerCell',
              enableColumnMenu: false,
              enableCellEdit: false,
              enableSorting: true,
              type: 'number'
          },
          {
              name: 'nombre',
              field: 'nombre',
              displayName: 'Nombre',
              width: 250,
              headerCellClass: 'ui-grid-leftCell',
              cellClass: 'ui-grid-leftCell',
              enableColumnMenu: false,
              enableCellEdit: false,
              enableSorting: true,
              type: 'string'
          },
          {
              name: 'nombreCorto',
              field: 'nombreCorto',
              displayName: 'Nombre corto',
              width: 150,
              headerCellClass: 'ui-grid-leftCell',
              cellClass: 'ui-grid-leftCell',
              enableColumnMenu: false,
              enableCellEdit: false,
              enableSorting: true,
              type: 'string'
          },
          {
              name: 'abreviatura',
              field: 'abreviatura',
              displayName: 'Abreviatura',
              width: 100,
              headerCellClass: 'ui-grid-leftCell',
              cellClass: 'ui-grid-leftCell',
              enableColumnMenu: false,
              enableCellEdit: false,
              enableSorting: true,
              type: 'string'
          },
          {
              name: 'rif',
              field: 'rif',
              displayName: 'Rif',
              width: 100,
              headerCellClass: 'ui-grid-leftCell',
              cellClass: 'ui-grid-leftCell',
              enableColumnMenu: false,
              enableCellEdit: false,
              enableSorting: true,
              type: 'string'
          },
      ];

      // -------------------------------------------------------------------------------------------------
      // compañías permitidas: para algunas usuarios, el administrador puede asignar solo algunas compañías; el
      // resto estarían restringidas para el mismo. Las agregamos en un array y regeresamos solo éstas, para que
      // el usuario solo pueda seleccionar en ese grupo ...
      let companiasPermitidas = [];
      let currentUser = Meteor.users.findOne(Meteor.userId());

      if (currentUser) {
          if (currentUser.companiasPermitidas) {
              currentUser.companiasPermitidas.forEach((companiaID) => {
                  companiasPermitidas.push(companiaID)
              });
          };
      };

      let companiasFilter = companiasPermitidas.length ?
                            { _id: { $in: companiasPermitidas }} :
                            { _id: { $ne: "xyz_xyz" }};
      // -------------------------------------------------------------------------------------------------

      $scope.helpers({
          companias: () => {
            return Companias.find(companiasFilter, { sort: { nombre: 1 } });
          }
      });

      $scope.companias_ui_grid.data = $scope.companias;
}
]);
