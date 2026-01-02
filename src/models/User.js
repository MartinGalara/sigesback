const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "user",
    {
      id: {
        // Agregamos la definición explícita del ID que ya tienes en DB
        type: DataTypes.INTEGER, // Basado en tu captura de DB, es INTEGER
        primaryKey: true,
        autoIncrement: true, // Asumiendo que es autoincremental en tu DB
        allowNull: false,
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      razonSocial: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM,
        values: ["Admin", "Cliente"],
      },
      status: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      owner: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      onboarding_completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      clientId: {
        type: DataTypes.STRING, // Debe coincidir con el tipo de 'Client.id' (que es STRING)
        allowNull: true, // Puede ser nulo si no todos los usuarios están asociados a un cliente
        field: "clientId", // Nombre de la columna en la base de datos (puedes usar 'client_id' si prefieres snake_case)
        references: {
          model: "clients", // Nombre de la tabla a la que hace referencia en tu DB
          key: "id",
        },
        onUpdate: "CASCADE", // Comportamiento cuando el ID del cliente se actualiza
        onDelete: "SET NULL", // Comportamiento cuando el cliente se elimina (pone clientId a NULL)
      },
    },
    {
      timestamps: false,
    }
  );
  const Client = sequelize.models.client; // Accede al modelo 'client' (en minúscula)

  if (Client) {
    // Solo establece la relación si el modelo Client ya está definido
    // Un usuario pertenece a un cliente
    User.belongsTo(Client, { foreignKey: "clientId", as: "clientInfo" }); // 'as' es el alias para acceder a los datos del cliente desde el usuario

    // Un cliente tiene muchos usuarios (relación inversa, útil pero opcional aquí)
    Client.hasMany(User, { foreignKey: "clientId", as: "users" });
  } else {
    console.warn(
      "Advertencia: El modelo 'Client' no está definido al configurar las asociaciones de 'User'. Asegúrate de que 'Client.js' se cargue antes."
    );
  }
  return User;
};
