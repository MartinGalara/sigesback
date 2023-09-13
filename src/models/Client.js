const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('client', {
        id: {
            type: DataTypes.STRING,
            unique: true,
            primaryKey: true,
            allowNull: false
          },
        email: {
            type: DataTypes.STRING,
            allowNull: false
        },
        info: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        vip: {
            type: DataTypes.STRING,
        },
        vipmail: {
            type: DataTypes.STRING,
        },
        testing:{
            type: DataTypes.BOOLEAN,
        }
    },
        {
            timestamps: false,
        }
    )
}