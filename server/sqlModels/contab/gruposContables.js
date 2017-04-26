
GruposContables_sql = sequelize.define('gruposContables', {
    grupo: { type: Sequelize.INTEGER, field: 'Grupo', primaryKey: true },
    descripcion: { type: Sequelize.STRING, field: 'Descripcion' },
    ordenBalanceGeneral: { type: Sequelize.STRING, field: 'OrdenBalanceGeneral' },
}, {
     tableName: 'tGruposContables'
});
