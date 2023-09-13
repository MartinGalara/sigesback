const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('botuser', {
        name: {
            type: DataTypes.STRING
        },
        phone: {
            type: DataTypes.STRING,
            unique: true
        },
        createUser: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        canSOS: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        adminPdf: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        manager: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        area: {
            type: DataTypes.ENUM('P', 'A', 'B', 'T', 'G'),
        },
        email: {
            type: DataTypes.STRING,
        },
        createdBy: {
            type: DataTypes.STRING,
        },
    }, {
        timestamps: false,
    });
};
