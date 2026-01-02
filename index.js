const server = require("./src/app.js");
const { conn } = require("./src/db.js");
require("dotenv").config();
const PORT = process.env.PORT || 3000;
require('cors')

console.log("Iniciando la sincronización de la base de datos...");

conn
  .sync({ force: false })
  .then(() => {
    console.log("Sincronización completada. Iniciando servidor...");
    server.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error al sincronizar la base de datos:", error);
  });
