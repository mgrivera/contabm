

Bancos_sql = sequelize.define('bancos', {
    banco: { type: Sequelize.INTEGER, field: 'Banco', allowNull: false, primaryKey: true, autoIncrement: true, },
    nombre: { type: Sequelize.STRING, field: 'Nombre', allowNull: false, },
    nombreCorto: { type: Sequelize.STRING, field: 'NombreCorto', allowNull: false, },
    abreviatura: { type: Sequelize.STRING, field: 'Abreviatura', allowNull: true,  },
    codigo: { type: Sequelize.STRING, field: 'Codigo', allowNull: true,  },
}, {
     tableName: 'Bancos'
});

Departamentos_sql = sequelize.define('departamentos', {
    departamento: { type: Sequelize.INTEGER, field: 'Departamento', allowNull: false, primaryKey: true, autoIncrement: true, },
    descripcion: { type: Sequelize.STRING, field: 'Descripcion', allowNull: false, },
}, {
     tableName: 'tDepartamentos'
});

Cargos_sql = sequelize.define('cargos', {
    cargo: { type: Sequelize.INTEGER, field: 'Cargo', allowNull: false, primaryKey: true, autoIncrement: true, },
    descripcion: { type: Sequelize.STRING, field: 'Descripcion', allowNull: false, },
}, {
     tableName: 'tCargos'
});


Ciudades_sql = sequelize.define('ciudades', {
    ciudad: { type: Sequelize.STRING, field: 'Ciudad', allowNull: false, primaryKey: true, autoIncrement: false, },
    pais: { type: Sequelize.STRING, field: 'Pais', allowNull: false, },
    descripcion: { type: Sequelize.STRING, field: 'Descripcion', allowNull: false, },
}, {
     tableName: 'tCiudades'
});

Paises_sql = sequelize.define('paises', {
    pais: { type: Sequelize.STRING, field: 'Pais', allowNull: false, primaryKey: true, autoIncrement: false,},
    descripcion: { type: Sequelize.STRING, field: 'Descripcion', allowNull: false, },
}, {
     tableName: 'tPaises'
});


Parentescos_sql = sequelize.define('parentescos', {
    parentesco: { type: Sequelize.INTEGER, field: 'Parentesco', allowNull: false, primaryKey: true, autoIncrement: true, },
    descripcion: { type: Sequelize.STRING, field: 'Descripcion', allowNull: false, },
}, {
     tableName: 'tParentescos'
});


MaestraRubros_sql = sequelize.define('maestraRubros', {
    rubro: { type: Sequelize.INTEGER, field: 'Rubro', allowNull: false, primaryKey: true, autoIncrement: true, },
    nombreCortoRubro: { type: Sequelize.STRING, field: 'NombreCortoRubro', allowNull: false, },
    descripcion: { type: Sequelize.STRING, field: 'Descripcion', allowNull: false, },
    tipo: { type: Sequelize.STRING, field: 'Tipo', allowNull: false, },
    sueldoFlag: { type: Sequelize.BOOLEAN, field: 'SueldoFlag', allowNull: true, },
    salarioFlag: { type: Sequelize.BOOLEAN, field: 'SalarioFlag', allowNull: true, },
    tipoRubro: { type: Sequelize.INTEGER, field: 'TipoRubro', allowNull: true, },
}, {
     tableName: 'tMaestraRubros'
});



TiposDeCuentaBancaria_sql = sequelize.define('tiposDeCuentaBancaria', {
    tipoCuenta: { type: Sequelize.INTEGER, field: 'TipoCuenta', allowNull: false, primaryKey: true, autoIncrement: true, },
    descripcion: { type: Sequelize.STRING, field: 'Descripcion', allowNull: false, },
}, {
     tableName: 'TiposDeCuentaBancaria'
});



// ----------------------------------------
// Grupos de empleados
// ----------------------------------------
GruposEmpleados_sql = sequelize.define('gruposEmpleados', {
    grupoID: { type: Sequelize.INTEGER, field: 'Grupo', allowNull: false, primaryKey: true, autoIncrement: true, },
    nombre: { type: Sequelize.STRING, field: 'NombreGrupo', allowNull: false, },
    descripcion: { type: Sequelize.STRING, field: 'Descripcion', allowNull: false, },
    grupoNominaFlag: { type: Sequelize.BOOLEAN, field: 'GrupoNominaFlag', allowNull: false,  },
    cia: { type: Sequelize.INTEGER, field: 'Cia', allowNull: false, },
}, {
     tableName: 'tGruposEmpleados'
});

GruposEmpleados_Empleados_sql = sequelize.define('gruposEmpleados_Empleados', {
    id: { type: Sequelize.INTEGER, field: 'ClaveUnica', allowNull: false, primaryKey: true, autoIncrement: true, },
    empleado: { type: Sequelize.INTEGER, field: 'Empleado', allowNull: false, },
    grupoID: { type: Sequelize.INTEGER, field: 'Grupo', allowNull: false, },
    suspendidoFlag: { type: Sequelize.BOOLEAN, field: 'SuspendidoFlag', allowNull: false,  },
}, {
     tableName: 'tdGruposEmpleados'
});

GruposEmpleados_sql.hasMany(GruposEmpleados_Empleados_sql, { as: 'empleados', foreignKey: 'grupoID' } );
GruposEmpleados_Empleados_sql.belongsTo(GruposEmpleados_sql, { as: 'grupo', foreignKey: 'grupoID' } );

// ----------------------------------------
// Dias feriados y dís de fiesta nacionalñ
// ----------------------------------------
DiasFeriados_sql = sequelize.define('diasFeriados', {
    claveUnica: { type: Sequelize.INTEGER, field: 'ClaveUnica', allowNull: false, primaryKey: true, autoIncrement: true, },
    fecha: { type: Sequelize.DATE, field: 'Fecha', allowNull: false, },
    tipo: { type: Sequelize.INTEGER, field: 'Tipo', allowNull: false, },
}, {
     tableName: 'DiasFeriados'
});

DiasFiestaNacional_sql = sequelize.define('diasFiestaNacional', {
    claveUnica: { type: Sequelize.INTEGER, field: 'ClaveUnica', allowNull: false, primaryKey: true, autoIncrement: true, },
    fecha: { type: Sequelize.DATE, field: 'Fecha', allowNull: false, },
    tipo: { type: Sequelize.STRING, field: 'Tipo', allowNull: false, },
}, {
     tableName: 'DiasFiestaNacional'
});
