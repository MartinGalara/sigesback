const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('pc', {
        alias: {
            type: DataTypes.STRING,
        },
        teamviewer_id: {
            type: DataTypes.STRING,
        },
        razonSocial:{
            type: DataTypes.STRING,
        },
        bandera:{
            type: DataTypes.STRING,
        },
        identificador:{
            type: DataTypes.STRING,
        },
        ciudad:{
            type: DataTypes.STRING,
        },
        area: {
            type: DataTypes.STRING,
        },
        prefijo:{
            type: DataTypes.INTEGER,
        },
        extras:{
            type: DataTypes.INTEGER,
        },
    },
        {
            timestamps: false,
        }
    )
}
