const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('staff', {
        name: {
            type: DataTypes.STRING
        },
        phone: {
            type: DataTypes.STRING
        },
        email: {
            type: DataTypes.STRING,
        },
        zone: {
            type: DataTypes.STRING,
        },
        startShift: {
            type: DataTypes.INTEGER,
        },
        endShift: {
            type: DataTypes.INTEGER,
        }
    },
        {
            timestamps: false,
        }
    )
}
