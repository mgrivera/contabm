
// este archivo es el que se carga primero en el cliente ... meteor carga el contenido de client/lib antes
// que cualquier otro archivo que exista en cualquier otro directorio (en el cliente) ...

// la idea es que AngularApp, que representa nuestra angular app, se inicialize de primero
// y esté disponible a lo largo de cualquier código en la aplicación

AngularApp = angular.module("contabM", ['angular-meteor', 'ui.router', 'ui.bootstrap', 'accounts.ui',
                                        'ui.grid', 'ui.grid.edit', 'ui.grid.cellNav',
                                        'ui.grid.resizeColumns', 'ui.grid.selection',
                                        'ui.grid.pinning']);
