
// DdpEvents = new EventDDP('raix:push');
EventDDP = new EventDDP('test');

// sequelize globaliza al grabar a sql server y localiza al leer desde sql server;
// para revertir este efecto, pues leemos y grabamos a sql desde otras aplicaciones,
// revertimos este efecto al grabar y leer
TimeOffset = 4.0;                   // diferencia entre venezuela y standard en relación al time ...
// switch between languages
numeral.language('es');
moment.locale('es'); // change the global locale to Spanish
