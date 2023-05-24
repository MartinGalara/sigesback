const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('computer', {
        alias: {
            type: DataTypes.STRING,
        },
        teamviewer_id: {
            type: DataTypes.STRING,
        },
        zone: {
            type: DataTypes.STRING,
        },
        order:{
            type: DataTypes.INTEGER,
        }
    },
        {
            timestamps: false,
        }
    )
}
