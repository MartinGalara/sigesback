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
            defaultValue:""
        },
        info: {
            type: DataTypes.STRING,
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