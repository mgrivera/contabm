

AngularApp.config(['$urlRouterProvider', '$stateProvider', '$locationProvider',
  function ($urlRouterProvider, $stateProvider, $locationProvider) {

        $locationProvider.html5Mode(true);

          $stateProvider
        // ----------------------------------------------------------------
        // administración
        // ----------------------------------------------------------------
        .state('administracion', {
            url: '/administracion',
            templateUrl: 'client/administracion/main.html'
        })
        .state('administracion.roles', {
            url: '/administracion/roles',
            templateUrl: 'client/administracion/roles/roles.html',
            controller: 'RolesController',
            parent: 'administracion'
        })
        .state('administracion.usuariosRoles', {
            url: '/administracion/usuariosRoles',
            templateUrl: 'client/administracion/usuariosRoles/usuariosRoles.html',
            controller: 'UsuariosRolesController',
            parent: 'administracion'
        })
        .state('administracion.usuariosCompanias', {
            url: '/administracion/usuariosCompanias',
            templateUrl: 'client/administracion/usuariosCompanias/usuariosCompanias.html',
            controller: 'UsuariosCompaniasController',
            parent: 'administracion'
        })
  }
]);
