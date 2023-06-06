const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('webuser', {
        hashPassword: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            unique:true
        },
        defaultEmail:{
            type: DataTypes.STRING
        },
        role: {
            type: DataTypes.STRING,
            defaultValue: "User"
        },
        active: {
            type: DataTypes.BOOLEAN,
            defualtValue: false
        }
    },
        {
            timestamps: false,
        }
    )
}
