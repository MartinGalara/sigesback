const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('webuser', {
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        hashPassword: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
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
