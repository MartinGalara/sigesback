// src/routes/driveRoutes.js
require("dotenv").config(); // Asegúrate de que dotenv esté configurado para cargar variables de entorno

const express = require("express");
const { google } = require("googleapis"); // Importa la librería de Google APIs

const router = express.Router();
const multer = require("multer");

// Obtiene las credenciales y el ID de la carpeta padre desde las variables de entorno
// ¡IMPORTANTE! Asegúrate de que estas variables estén definidas en tu archivo .env
const GOOGLE_DRIVE_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const GOOGLE_DRIVE_CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const GOOGLE_DRIVE_REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID; // ID de la carpeta padre de Drive para capacitaciones

// Verifica que las variables de entorno estén cargadas
if (
  !GOOGLE_DRIVE_CLIENT_ID ||
  !GOOGLE_DRIVE_CLIENT_SECRET ||
  !GOOGLE_DRIVE_REFRESH_TOKEN ||
  !PARENT_FOLDER_ID
) {
  console.error(
    "ERROR: Las variables de entorno para Google Drive API no están configuradas correctamente."
  );
  // Puedes optar por salir de la aplicación o manejar el error de otra manera
  // process.exit(1);
}

// Configuración del cliente OAuth2 para Google Drive
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_DRIVE_CLIENT_ID,
  GOOGLE_DRIVE_CLIENT_SECRET
  // No se necesita una URL de redirección aquí ya que estamos usando un Refresh Token
);

// Establece las credenciales usando el Refresh Token.
// Esto permitirá a la aplicación obtener nuevos Access Tokens automáticamente.
oauth2Client.setCredentials({
  refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN,
});

// Crea una instancia del cliente de Google Drive API.
// La versión v3 es la más reciente.
const drive = google.drive({
  version: "v3",
  auth: oauth2Client, // Utiliza el cliente OAuth2 autenticado
});

const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /capacitaciones/folders
 * @description Obtiene una lista de subcarpetas (categorías de capacitación) dentro de la carpeta padre de Drive.
 * @returns {Array<object>} 200 - Un arreglo de objetos con 'id' y 'name' de las carpetas.
 * @returns {object} 500 - Error interno del servidor.
 */
router.get("/folders", async (req, res) => {
  try {
    // Busca carpetas dentro de la carpeta padre especificada.
    const response = await drive.files.list({
      q: `'${PARENT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
      pageSize: 100, // Ajusta según la cantidad máxima de carpetas esperadas
    });

    // Mapea los resultados para devolver solo el ID y el nombre.
    const folders = response.data.files.map((file) => ({
      id: file.id,
      name: file.name,
    }));

    // Ordena las carpetas por el número al inicio del nombre
    folders.sort((a, b) => {
      // Extrae el número al inicio del nombre de la carpeta
      const numA = parseInt(a.name.match(/^(\d+)/)?.[1] || "0");
      const numB = parseInt(b.name.match(/^(\d+)/)?.[1] || "0");

      // Si ambos tienen números, ordena numéricamente
      if (numA && numB) {
        return numA - numB;
      }

      // Si solo uno tiene número, el que tiene número va primero
      if (numA && !numB) return -1;
      if (!numA && numB) return 1;

      // Si ninguno tiene número, ordena alfabéticamente
      return a.name.localeCompare(b.name);
    });

    res.status(200).json(folders);
  } catch (error) {
    console.error("Error al obtener carpetas de Drive:", error.message || error);
    res.status(500).json({ message: "Error interno del servidor al obtener carpetas." });
  }
});

/**
 * GET /capacitaciones/files/:folderId
 * @description Obtiene una lista de archivos dentro de una carpeta específica de Drive.
 * @param {string} folderId - El ID de la carpeta de Drive cuyos archivos se quieren obtener.
 * @returns {Array<object>} 200 - Un arreglo de objetos con 'id', 'name' y 'webContentLink' de los archivos.
 * @returns {object} 500 - Error interno del servidor.
 */
router.get("/files/:folderId", async (req, res) => {
  const { folderId } = req.params; // Obtiene el ID de la carpeta de los parámetros de la URL

  try {
    // Busca archivos dentro de la carpeta especificada.
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name, webContentLink, mimeType, size)",
      pageSize: 1000, // Ajusta según la cantidad máxima de archivos por carpeta
    });

    // Mapea los resultados.
    const files = response.data.files.map((file) => ({
      id: file.id,
      name: file.name,
      webContentLink: file.webContentLink,
      mimeType: file.mimeType,
      size: file.size,
    }));

    // Ordena los archivos por el número al inicio del nombre
    files.sort((a, b) => {
      // Extrae el número al inicio del nombre del archivo
      const numA = parseInt(a.name.match(/^(\d+)/)?.[1] || "0");
      const numB = parseInt(b.name.match(/^(\d+)/)?.[1] || "0");

      // Si ambos tienen números, ordena numéricamente
      if (numA && numB) {
        return numA - numB;
      }

      // Si solo uno tiene número, el que tiene número va primero
      if (numA && !numB) return -1;
      if (!numA && numB) return 1;

      // Si ninguno tiene número, ordena alfabéticamente
      return a.name.localeCompare(b.name);
    });

    res.status(200).json(files);
  } catch (error) {
    console.error(`Error al obtener archivos de la carpeta ${folderId}:`, error.message || error);
    res.status(500).json({ message: "Error interno del servidor al obtener archivos." });
  }
});

/**
 * GET /capacitaciones/download/:fileId
 * @description Permite la descarga de un archivo específico de Google Drive.
 * El backend actúa como proxy para asegurar la autenticación y el control de acceso.
 * @param {string} fileId - El ID del archivo de Google Drive a descargar.
 * @returns El archivo como descarga directa.
 * @returns {object} 404 - Si el archivo no se encuentra.
 * @returns {object} 500 - Error interno del servidor.
 */
router.get("/download/:fileId", async (req, res) => {
  const { fileId } = req.params; // Obtiene el ID del archivo de los parámetros de la URL

  try {
    // 1. Obtener los metadatos del archivo para determinar su tipo MIME original
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: "name, mimeType", // Solicita el nombre y el tipo MIME
    });

    const fileName = fileMetadata.data.name || "archivo_descarga";
    const originalMimeType = fileMetadata.data.mimeType;

    let responseStream;
    let downloadMimeType = originalMimeType;
    let downloadFileName = fileName;

    // 2. Determinar si es un archivo de Google Workspace y configurar la exportación
    if (originalMimeType.startsWith("application/vnd.google-apps.")) {
      let exportMimeType;
      let fileExtension = "";

      // Mapeo de tipos MIME de Google Docs a formatos de exportación
      switch (originalMimeType) {
        case "application/vnd.google-apps.document": // Google Doc
          exportMimeType =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; // .docx
          fileExtension = ".docx";
          break;
        case "application/vnd.google-apps.spreadsheet": // Google Sheet
          exportMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; // .xlsx
          fileExtension = ".xlsx";
          break;
        case "application/vnd.google-apps.presentation": // Google Slide
          exportMimeType =
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"; // .pptx
          fileExtension = ".pptx";
          break;
        case "application/vnd.google-apps.drawing": // Google Drawing
          exportMimeType = "image/png"; // .png
          fileExtension = ".png";
          break;
        // Agrega más casos si manejas otros tipos como Apps Script, Forms, etc.
        case "application/vnd.google-apps.script": // Google Apps Script (generalmente no se descarga directamente como un archivo ejecutable)
          exportMimeType = "application/vnd.google-apps.script+json"; // Exporta como JSON del script
          fileExtension = ".json";
          break;
        case "application/vnd.google-apps.form": // Google Forms (no se pueden descargar como archivos, solo se accede vía API de Forms o URL)
          return res.status(400).json({
            message: "No se pueden descargar formularios de Google directamente como archivos.",
          });
        default:
          // Si es un tipo de Google App no manejado explícitamente, intenta como PDF
          exportMimeType = "application/pdf";
          fileExtension = ".pdf";
          break;
      }

      // Ajusta el nombre del archivo con la extensión correcta para la descarga
      // Elimina extensiones comunes existentes para evitar dobles extensiones (ej. documento.docx.pdf)
      const baseFileName = fileName.replace(/\.(pdf|docx|xlsx|pptx|png|jpg|jpeg|gif|txt)$/i, "");
      downloadFileName = baseFileName + fileExtension;

      // Usa drive.files.export para archivos de Google Docs Editors
      const exportResponse = await drive.files.export(
        {
          fileId: fileId,
          mimeType: exportMimeType, // Especifica el formato de exportación
        },
        {
          responseType: "stream", // Configura Axios para transmitir la respuesta
        }
      );
      responseStream = exportResponse.data;
      downloadMimeType = exportMimeType; // Actualiza el tipo MIME de descarga
    } else {
      // 3. Para otros (archivos binarios normales), usa drive.files.get con alt: 'media'
      const getResponse = await drive.files.get(
        {
          fileId: fileId,
          alt: "media", // Indica que se debe devolver el contenido binario
        },
        {
          responseType: "stream",
        }
      );
      responseStream = getResponse.data;
    }

    // 4. Configura los encabezados de respuesta para la descarga y canaliza el flujo
    res.setHeader("Content-Type", downloadMimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${downloadFileName}"`);

    // Canaliza el flujo de datos del archivo directamente a la respuesta HTTP del cliente.
    responseStream.pipe(res);
  } catch (error) {
    // Manejo de errores específicos y generales
    if (error.code === 403 && error.errors?.[0]?.reason === "fileNotDownloadable") {
      // Error específico de Google Drive cuando un archivo no es descargable
      return res.status(403).json({
        message:
          "Este tipo de archivo de Google Drive no se puede descargar directamente o requiere un formato de exportación específico.",
        details: error.message,
      });
    }
    if (error.code === 404) {
      // Archivo no encontrado
      return res.status(404).json({ message: "Archivo no encontrado en Google Drive." });
    }
    // Errores generales
    console.error(`Error al descargar el archivo ${fileId}:`, error.message || error);
    res.status(500).json({ message: "Error interno del servidor al descargar el archivo." });
  }
});

/**
 * POST /capacitaciones/folders
 * @description Crea una nueva subcarpeta dentro de la carpeta padre de capacitaciones en Google Drive.
 * @param {string} name - El nombre de la nueva carpeta.
 * @returns {object} 201 - Objeto con el ID y nombre de la carpeta creada.
 * @returns {object} 400 - Si falta el nombre de la carpeta.
 * @returns {object} 500 - Error interno del servidor.
 */
router.post("/folders", async (req, res) => {
  const { name } = req.body; // Obtiene el nombre de la carpeta del cuerpo de la solicitud

  if (!name) {
    return res.status(400).json({ message: "El nombre de la carpeta es requerido." });
  }

  try {
    // Verifica si ya existe una carpeta con el mismo nombre en la carpeta padre
    const existingFolders = await drive.files.list({
      q: `'${PARENT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`,
      fields: "files(id, name)",
      pageSize: 1, // Solo necesitamos saber si existe al menos una
    });

    if (existingFolders.data.files && existingFolders.data.files.length > 0) {
      return res.status(409).json({ message: `Una carpeta con el nombre '${name}' ya existe.` });
    }

    // Crea la nueva carpeta en Google Drive
    const fileMetadata = {
      name: name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [PARENT_FOLDER_ID], // Ubica la carpeta dentro de la carpeta padre definida
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      fields: "id, name", // Campos a devolver de la carpeta creada
    });

    res.status(201).json({
      id: response.data.id,
      name: response.data.name,
      message: "Carpeta creada exitosamente.",
    });
  } catch (error) {
    console.error("Error al crear carpeta en Drive:", error.message || error);
    res.status(500).json({ message: "Error interno del servidor al crear carpeta." });
  }
});

/**
 * POST /capacitaciones/upload
 * @description Sube uno o varios archivos a una carpeta específica de Google Drive.
 * Incluye validación de nombres duplicados.
 * @param {string} folderId - El ID de la carpeta de destino.
 * @param {Array<File>} files - Los archivos a subir (a través de Multer).
 * @returns {Array<object>} 200 - Un arreglo de objetos con 'id' y 'name' de los archivos subidos.
 * @returns {object} 400 - Si falta la carpeta de destino o los archivos.
 * @returns {object} 409 - Si un archivo con el mismo nombre ya existe en la carpeta.
 * @returns {object} 500 - Error interno del servidor.
 */
router.post("/upload", upload.array("files"), async (req, res) => {
  const { folderId } = req.body; // Obtiene el ID de la carpeta destino
  const filesToUpload = req.files; // Archivos cargados por Multer

  if (!folderId) {
    return res.status(400).json({ message: "El ID de la carpeta de destino es requerido." });
  }
  if (!filesToUpload || filesToUpload.length === 0) {
    return res.status(400).json({ message: "No se proporcionaron archivos para subir." });
  }

  const uploadedFilesInfo = [];
  const failedUploads = [];

  for (const file of filesToUpload) {
    try {
      // 1. Verificar si ya existe un archivo con el mismo nombre en la carpeta destino
      const existingFiles = await drive.files.list({
        q: `'${folderId}' in parents and name='${file.originalname}' and trashed=false`,
        fields: "files(id, name)",
        pageSize: 1,
      });

      if (existingFiles.data.files && existingFiles.data.files.length > 0) {
        failedUploads.push({
          name: file.originalname,
          message: "Ya existe un archivo con este nombre en la carpeta. Por favor, renómbralo.",
          status: "skipped",
        });
        continue; // Pasa al siguiente archivo si hay duplicado
      }

      // 2. Subir el archivo a Google Drive
      const fileMetadata = {
        name: file.originalname,
        parents: [folderId], // La carpeta de destino
      };

      const media = {
        mimeType: file.mimetype,
        body: require("stream").Readable.from([file.buffer]), // Crea un stream desde el buffer
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id, name", // Campos a devolver del archivo subido
      });

      uploadedFilesInfo.push({ id: response.data.id, name: response.data.name, status: "success" });
    } catch (error) {
      console.error(`Error al subir el archivo ${file.originalname}:`, error.message || error);
      failedUploads.push({
        name: file.originalname,
        message: `Error al subir: ${error.message || "Error desconocido."}`,
        status: "failed",
      });
    }
  }

  if (uploadedFilesInfo.length > 0 && failedUploads.length === 0) {
    res
      .status(200)
      .json({ message: "Archivos subidos exitosamente.", uploaded: uploadedFilesInfo });
  } else if (uploadedFilesInfo.length > 0 && failedUploads.length > 0) {
    res.status(200).json({
      message: "Algunos archivos se subieron, otros fallaron o eran duplicados.",
      uploaded: uploadedFilesInfo,
      failed: failedUploads,
    });
  } else {
    res
      .status(500)
      .json({ message: "Fallo la subida de todos los archivos.", failed: failedUploads });
  }
});

// --- NUEVAS RUTAS DE ELIMINACIÓN ---

/**
 * DELETE /upload/files/:fileId
 * @description Mueve un archivo a la papelera de Google Drive.
 * Requiere autenticación de administrador.
 * @param {string} fileId - El ID del archivo a eliminar.
 * @returns {object} 200 - Mensaje de éxito.
 * @returns {object} 400 - Si el ID del archivo no está presente.
 * @returns {object} 401 - No autorizado.
 * @returns {object} 403 - Acceso denegado (no admin).
 * @returns {object} 404 - Archivo no encontrado.
 * @returns {object} 500 - Error interno del servidor.
 */
router.delete("/files/:fileId", async (req, res) => {
  const fileId = req.params.fileId;

  if (!fileId) {
    return res.status(400).json({ message: "El ID del archivo es requerido para la eliminación." });
  }

  try {
    await drive.files.delete({ fileId: fileId });
    console.log(`Archivo ${fileId} movido a la papelera.`);
    res.status(200).json({ message: "Archivo movido a la papelera exitosamente." });
  } catch (error) {
    console.error("Error al mover el archivo a la papelera:", error);
    if (error.code === 404) {
      return res.status(404).json({ message: "Archivo no encontrado o ya eliminado." });
    }
    res.status(500).json({
      message: "Error al procesar la solicitud de eliminación de archivo.",
      error: error.message,
    });
  }
});

/**
 * DELETE /capacitaciones/folders/:folderId
 * @description Mueve una carpeta (y su contenido) a la papelera de Google Drive.
 * Requiere autenticación de administrador.
 * @param {string} folderId - El ID de la carpeta a eliminar.
 * @returns {object} 200 - Mensaje de éxito.
 * @returns {object} 400 - Si el ID de la carpeta no está presente.
 * @returns {object} 401 - No autorizado.
 * @returns {object} 403 - Acceso denegado (no admin).
 * @returns {object} 404 - Carpeta no encontrada.
 * @returns {object} 500 - Error interno del servidor.
 */
router.delete("/folders/:folderId", async (req, res) => {
  const folderId = req.params.folderId;

  if (!folderId) {
    return res
      .status(400)
      .json({ message: "El ID de la carpeta es requerido para la eliminación." });
  }

  try {
    await drive.files.delete({ fileId: folderId });
    console.log(`Carpeta ${folderId} y su contenido movidos a la papelera.`);
    res.status(200).json({ message: "Carpeta y su contenido movidos a la papelera exitosamente." });
  } catch (error) {
    console.error("Error al mover la carpeta a la papelera:", error);
    if (error.code === 404) {
      return res.status(404).json({ message: "Carpeta no encontrada o ya eliminada." });
    }
    res.status(500).json({
      message: "Error al procesar la solicitud de eliminación de carpeta.",
      error: error.message,
    });
  }
});

module.exports = router;
