const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('vipuser', {
        name: {
            type: DataTypes.STRING
        },
        phone: {
            type: DataTypes.STRING,
            unique:true
        }
    },
        {
            timestamps: false,
        }
    )
}
