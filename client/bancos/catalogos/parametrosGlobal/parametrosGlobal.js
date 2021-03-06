

// Este controller (angular) se carga con la página primera del programa
AngularApp.controller("Catalogos_ParametrosGlobalBancos_Controller",
['$scope', '$meteor', '$modal', function ($scope, $meteor, $modal) {

      $scope.showProgress = true;

      // ui-bootstrap alerts ...
      $scope.alerts = [];

      $scope.closeAlert = function (index) {
          $scope.alerts.splice(index, 1);
      };

      $scope.datosEditados = function() {
          // debugger;
          let infoEditada = (_.some($scope.parametrosGlobal, x => { return x.docState; }));
          return infoEditada;
      };


      $scope.parametrosGlobal_ui_grid = {

          enableSorting: true,
          showColumnFooter: false,
          enableCellEdit: false,
          enableCellEditOnFocus: false,
          enableRowSelection: false,
          enableRowHeaderSelection: false,
          multiSelect: false,
          enableSelectAll: false,
          selectionRowHeaderWidth: 0,
          rowHeight: 25,

          onRegisterApi: function (gridApi) {
              gridApi.edit.on.afterCellEdit($scope, function (rowEntity, colDef, newValue, oldValue) {
                  if (newValue != oldValue)
                      if (!rowEntity.docState)
                          rowEntity.docState = 2;
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

      $scope.parametrosGlobal_ui_grid.columnDefs = [
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
              name: 'agregarAsientosContables',
              field: 'agregarAsientosContables',
              displayName: 'Agregar asientos',
              width: 120,
              headerCellClass: 'ui-grid-centerCell',
              cellClass: 'ui-grid-centerCell',
              cellFilter: 'boolFilter',
              enableColumnMenu: false,
              enableCellEdit: false,
              enableSorting: true,
              type: 'boolean'
          },
          {
              name: 'tipoAsientoDefault',
              field: 'tipoAsientoDefault',
              displayName: 'Tipo asiento (defecto)',
              width: 140,
              headerCellClass: 'ui-grid-centerCell',
              cellClass: 'ui-grid-centerCell',
              enableColumnMenu: false,
              enableCellEdit: false,
              enableSorting: true,
              type: 'string'
          },
          {
              name: 'ivaPorc',
              field: 'ivaPorc',
              displayName: 'Iva (%)',
              width: 75,
              headerCellClass: 'ui-grid-centerCell',
              cellClass: 'ui-grid-centerCell',
              cellFilter: 'currencyFilterAndNull',
              enableColumnMenu: false,
              enableCellEdit: false,
              enableSorting: true,
              type: 'number'
          },
          {
              name: 'porcentajeITF',
              field: 'porcentajeITF',
              displayName: 'ITF (%)',
              width: 75,
              headerCellClass: 'ui-grid-centerCell',
              cellClass: 'ui-grid-centerCell',
              cellFilter: 'currencyFilterAndNull',
              enableColumnMenu: false,
              enableCellEdit: true,
              enableSorting: true,
              type: 'number'
          },
      ];

      $scope.grabar = function () {
        //   debugger;
          $scope.showProgress = true;

          // eliminamos los items eliminados; del $scope y del collection
          let editedItems = _.cloneDeep(_.filter($scope.parametrosGlobal, function (item) { return item.docState; }));

          // nótese como validamos cada item antes de intentar guardar en el servidor
          let isValid = false;
          let errores = [];

          editedItems.forEach(function (item) {
              if (item.docState != 3) {
                  isValid = ParametrosGlobalBancos.simpleSchema().namedContext().validate(item);

                  if (!isValid) {
                      ParametrosGlobalBancos.simpleSchema().namedContext().invalidKeys().forEach(function (error) {
                          errores.push("El valor '" + error.value + "' no es adecuado para el campo '" + error.name + "'; error de tipo '" + error.type + ".");
                      });
                  }
              }
          });

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

          // por algna razón, cuando agregamos un item al scope y luego a mongo, el item en $scope no se 'sincroniza' en forma
          // adecuada; por eso, lo eliminamos. Luego, con reactivity, será mostrado, nuevamente, en el view ...
          _.remove($scope.parametrosGlobal, (x) => { return x.docState && x.docState === 1; });

          $meteor.call('parametrosGlobalBancosSave', editedItems).then(
              function (data) {

                  $scope.alerts.length = 0;
                  $scope.alerts.push({
                      type: 'info',
                      msg: data
                  });

                  $scope.showProgress = false;
              },
              function (err) {

                  let errorMessage = "<b>Error:</b> se ha producido un error al intentar ejecutar la operación.<br />";
                  if (err.errorType)
                  errorMessage += err.errorType + " ";

                  if (err.message)
                  errorMessage += err.message + " ";

                  if (err.reason)
                  errorMessage += err.reason + " ";

                  if (err.details)
                  errorMessage += "<br />" + err.details;

                  if (!err.message && !err.reason && !err.details)
                  errorMessage += err.toString();

                  $scope.alerts.length = 0;
                  $scope.alerts.push({
                      type: 'danger',
                      msg: errorMessage
                  });

                  // hubo un error; antes de hacer el save eliminamos en $scope los items nuevos (docState == 1). Los recuperamos ...
                  _.filter(editedItems, (item) => { return item.docState && item.docState === 1; }).forEach((item) => {
                      $scope.parametrosGlobal.push(item);
                  });

                  $scope.showProgress = false;
              });
      };


      Meteor.subscribe("parametrosGlobalBancos",
      {
            onReady: function() {
                // hay 2 subs; debemos completar ambas antes de apagar el loading ...
                $scope.showProgress = false;
                $scope.$apply();
            }
      });

      $scope.helpers({
          parametrosGlobal: () => {
            return ParametrosGlobalBancos.find({});
          }
      });

      $scope.parametrosGlobal_ui_grid.data = $scope.parametrosGlobal;
}
]);
