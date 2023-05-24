const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('operator', {
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique:true
        },
        hashPassword: {
            type: DataTypes.STRING,
            allowNull: false
        },
    },
        {
            timestamps: false,
        }
    )
}
