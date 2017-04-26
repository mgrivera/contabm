

CategoriasRetencion_sql = sequelize.define('categoriasRetencion_sql', {
    categoria: { type: Sequelize.INTEGER, field: 'Categoria', allowNull: false, autoIncrement: true, primaryKey: true,  },
    descripcion: { type: Sequelize.STRING, field: 'Descripcion', allowNull: false, },
}, {
     tableName: 'CategoriasRetencion'
});
