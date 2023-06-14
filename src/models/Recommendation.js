const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('recommendation', {
        title: {
            type: DataTypes.STRING,
            allowNull: false
          },
          text: {
            type: DataTypes.STRING,
            allowNull: false
          },
          image: {
            type: DataTypes.STRING,
            allowNull: true
          },
          flags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true
          }
    },
        {
            timestamps: false,
        }
    )
}
