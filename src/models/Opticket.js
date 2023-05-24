const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('opticket', {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        client: {
            type: DataTypes.STRING
        },
        detail: {
            type: DataTypes.STRING,
            allowNull: false
        },
        resolved: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    },
        {
            timestamps: false,
        }
    )
}
