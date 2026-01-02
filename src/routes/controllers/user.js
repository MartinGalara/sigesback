const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { User, Client } = require("../../db.js");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const accountTransport = require("../../../account_transport.json");

// Configuración de OAuth2 para envío de correos
const oauth2Client = new OAuth2(
  accountTransport.auth.clientId,
  accountTransport.auth.clientSecret,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: accountTransport.auth.refreshToken,
});

// Utilidad para obtener un transporter de correo
async function getEmailTransporter() {
  const gmailUser = process.env.GMAIL_USER || accountTransport.auth.user;
  const clientId = process.env.GMAIL_CLIENT_ID || accountTransport.auth.clientId;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || accountTransport.auth.clientSecret;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN || accountTransport.auth.refreshToken;

  if (!gmailUser || !clientId || !clientSecret || !refreshToken) {
    console.error("[MAIL] Faltan credenciales OAuth2 (user/clientId/clientSecret/refreshToken)");
    return { transporter: null, reason: "CREDENCIALES_INCOMPLETAS" };
  }
  let accessToken;
  try {
    const accessTokenResult = await oauth2Client.getAccessToken();
    accessToken =
      typeof accessTokenResult === "string" ? accessTokenResult : accessTokenResult?.token;
  } catch (e) {
    console.error(
      "[MAIL] Error obteniendo accessToken OAuth2:",
      e?.response?.data || e?.message || e
    );
    return { transporter: null, reason: "ERROR_ACCESS_TOKEN" };
  }
  if (!accessToken) {
    console.error("[MAIL] No se obtuvo accessToken de OAuth2 (posible refresh token inválido)");
    return { transporter: null, reason: "ACCESS_TOKEN_VACIO" };
  }
  const transportConfig = {
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: gmailUser,
      clientId,
      clientSecret,
      refreshToken,
      accessToken,
    },
  };
  let transporter;
  try {
    transporter = nodemailer.createTransport(transportConfig);
  } catch (e) {
    console.error("[MAIL] Error instanciando createTransport:", e);
    return { transporter: null, reason: "ERROR_CREATE_TRANSPORT" };
  }
  try {
    await transporter.verify();
    console.log("[MAIL] Verificación SMTP correcta");
  } catch (verifyErr) {
    console.warn(
      "[MAIL] Falló verify(); se intentará enviar igualmente. Detalle:",
      verifyErr?.message || verifyErr
    );
  }
  return { transporter, reason: null };
}

async function sendMail(mailOptions) {
  const { transporter, reason } = await getEmailTransporter();
  if (!transporter) {
    throw new Error(
      `No se pudo crear el transportador de correo (motivo: ${reason || "DESCONOCIDO"})`
    );
  }
  // Asegurar from correcto
  if (!mailOptions.from) {
    mailOptions.from = process.env.GMAIL_USER || accountTransport.auth.user;
  }
  return transporter.sendMail(mailOptions);
}

// Obtener todos los usuarios
router.get("/", async (req, res) => {
  try {
    const users = await User.findAll({
      include: [
        {
          model: Client,
          as: "clientInfo", // Este alias DEBE coincidir con el 'as' que definiste en User.belongsTo en tu modelo User.js
          // Seleccionamos los atributos específicos de Client que queremos incluir en la respuesta
          attributes: ["id", "info", "email", "vip", "vipmail", "testing"],
        },
      ],
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para recibir datos desde la web
router.post("/web", async (req, res) => {
  try {
    console.log("Payload recibido en /users/web:", req.body);
    
    const { firstName, email, password, role, status, razonSocial, clientId, owner } = req.body;

    // Validar campos requeridos
    if (!firstName || !email || !password || !clientId || !razonSocial) {
      return res.status(400).json({ 
        error: "Faltan campos requeridos: firstName, email, password, clientId, razonSocial" 
      });
    }

    // Validar formato de email
    const emailValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    if (!emailValido) {
      return res.status(400).json({ 
        error: "El formato del email no es válido" 
      });
    }

    // 1. Crear el cliente
    const newClient = await Client.create({
      id: clientId,
      email: email,
      info: razonSocial,
      vip: null,
      vipmail: null,
      testing: null
    });

    console.log("Cliente creado:", newClient.toJSON());

    // 2. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Crear el usuario
    const newUser = await User.create({
      firstName: firstName,
      email: email,
      password: hashedPassword,
      role: role,
      status: status,
      razonSocial: razonSocial,
      clientId: clientId,
      owner: owner
    });

    console.log("Usuario creado:", newUser.toJSON());

    // 4. Enviar correo electrónico con las credenciales
    const frontendBaseUrl = (process.env.FRONTEND_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
    const onboardingUrl = `${frontendBaseUrl}/client-onboarding`;
    const loginUrl = `${frontendBaseUrl}/#inicio`;

    const mailOptions = {
      from: `SIGES Soporte <${accountTransport.auth.user}>`,
      to: email,
      subject: "¡Bienvenido a SIGES! - Credenciales de acceso",
      text: `Hola ${firstName},

¡Bienvenido al Portal de SIGES!

Se ha generado un nuevo usuario para acceder a nuestro sistema de soporte. A continuación encontrarás tus credenciales de acceso:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREDENCIALES DE ACCESO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usuario: ${email}
Contraseña: ${password}

Razón Social: ${razonSocial}
ID de Cliente: ${clientId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRÓXIMOS PASOS:

1. Ingresa al portal de onboarding para completar tu perfil:
   ${onboardingUrl}

2. Completa los datos de tu empresa y configura tus preferencias

3. Una vez completado el onboarding, podrás acceder a todas las herramientas de soporte:
   - Sistema de tickets
   - Gestión de equipos
   - Soporte técnico
   - Capacitaciones
   - Y mucho más

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANTE:
- Te recomendamos cambiar tu contraseña después del primer inicio de sesión
- Guarda estas credenciales en un lugar seguro
- Si tienes algún problema para acceder, contacta a nuestro equipo de soporte

━━━━━━━━━━━━━━━━━━━━━━━━━━━━���━━━

¿Necesitas ayuda?
Nuestro equipo está disponible para asistirte en cualquier momento.

Saludos,
Equipo de SIGES`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                ¡Bienvenido a SIGES!
              </h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
                Tu cuenta ha sido creada exitosamente
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hola <strong>${firstName}</strong>,
              </p>
              
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Se ha generado un nuevo usuario para acceder a nuestro <strong>Portal de Soporte SIGES</strong>. A continuación encontrarás tus credenciales de acceso:
              </p>

              <!-- Credentials Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; border: 2px solid #e5e7eb; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px; font-weight: 600; text-align: center;">
                      🔐 Credenciales de Acceso
                    </h2>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Usuario:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">${email}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Contraseña:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right; font-family: 'Courier New', monospace;">${password}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 15px 0 8px 0; border-top: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px; font-weight: 600;">Razón Social:</span>
                          <span style="color: #1f2937; font-size: 14px; font-weight: 500; float: right;">${razonSocial}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">ID de Cliente:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">${clientId}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 4px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px; font-weight: 600;">
                  📋 Próximos Pasos
                </h3>
                <ol style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;">
                  <li style="margin-bottom: 8px;">Completa tu perfil en el portal de onboarding</li>
                  <li style="margin-bottom: 8px;">Configura los datos de tu empresa</li>
                  <li style="margin-bottom: 0;">Accede a todas las herramientas de soporte</li>
                </ol>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${onboardingUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                      Completar Onboarding
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px; text-align: center;">
                O copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0 0 30px 0; color: #3b82f6; font-size: 13px; text-align: center; word-break: break-all;">
                ${onboardingUrl}
              </p>

              <!-- Features -->
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px; font-weight: 600; text-align: center;">
                  ✨ Herramientas Disponibles
                </h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">✓ Sistema de tickets de soporte</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">✓ Gestión de equipos y computadoras</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">✓ Acceso a capacitaciones</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">✓ Soporte técnico especializado</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">✓ Panel de control personalizado</td>
                  </tr>
                </table>
              </div>

              <!-- Important Notice -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin-bottom: 30px;">
                <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; font-weight: 600;">
                  ⚠️ Importante:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 13px; line-height: 1.6;">
                  <li style="margin-bottom: 5px;">Te recomendamos cambiar tu contraseña después del primer inicio de sesión</li>
                  <li style="margin-bottom: 5px;">Guarda estas credenciales en un lugar seguro</li>
                  <li style="margin-bottom: 0;">Si tienes problemas para acceder, contacta a nuestro equipo de soporte</li>
                </ul>
              </div>

              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                ¿Necesitas ayuda? Nuestro equipo está disponible para asistirte en cualquier momento.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; font-weight: 600;">
                Equipo de SIGES
              </p>
              <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 13px;">
                Sistema Integral de Gestión y Soporte
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Este es un correo automático, por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    };

    // Intentar enviar el correo
    const mailWarnings = [];
    let mailSent = false;

    try {
      const sendResult = await sendMail(mailOptions);
      console.log(
        "[MAIL][WEB-USER] messageId:",
        sendResult?.messageId,
        "accepted:",
        sendResult?.accepted,
        "rejected:",
        sendResult?.rejected
      );
      
      if (sendResult?.rejected?.length) {
        mailWarnings.push("Correo rechazado: " + sendResult.rejected.join(","));
      } else {
        mailSent = true;
      }
    } catch (mailError) {
      console.error("[MAIL][WEB-USER] Error enviando correo:", mailError?.message || mailError);
      mailWarnings.push("Error al enviar correo: " + (mailError?.message || "Error desconocido"));
    }

    // Respuesta exitosa
    const response = {
      message: "Cliente y usuario creados correctamente",
      client: newClient,
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        razonSocial: newUser.razonSocial,
        clientId: newUser.clientId,
        owner: newUser.owner
      },
      emailSent: mailSent
    };

    if (mailWarnings.length > 0) {
      response.emailWarnings = mailWarnings;
    }

    res.status(201).json(response);
  } catch (err) {
    console.error("Error en /users/web:", err);
    res.status(500).json({ error: err.message });
  }
});

// Crear un nuevo usuario o múltiples usuarios
router.post("/", async (req, res) => {
  try {
    const { bulk, users, ...userData } = req.body;

    // Si el parámetro 'bulk' es true, crear múltiples usuarios
    if (bulk && users && Array.isArray(users)) {
      console.log(`[DEBUG] Creación en lote solicitada para ${users.length} usuarios`);

      const createdUsers = [];
      const failedUsers = [];

      for (const user of users) {
        try {
          // Hashear la contraseña si está presente
          if (user.password) {
            user.password = await bcrypt.hash(user.password, 10);
          }

          const createdUser = await User.create(user);
          createdUsers.push(createdUser);
          console.log(`[DEBUG] Usuario creado exitosamente: ${createdUser.id}`);
        } catch (error) {
          console.error(`[DEBUG] Error al crear usuario:`, error.message);
          failedUsers.push({
            userData: user,
            error: error.message,
          });
        }
      }

      res.status(201).json({
        message: `Proceso de creación completado. ${createdUsers.length} usuarios creados, ${failedUsers.length} fallaron.`,
        created: createdUsers,
        failed: failedUsers,
        totalCreated: createdUsers.length,
        totalFailed: failedUsers.length,
      });
    } else {
      // Crear un solo usuario (comportamiento original)
      // Hashear la contraseña si está presente
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }

      const user = await User.create(userData);
      res.status(201).json(user);
    }
  } catch (err) {
    console.error("Error en la creación de usuario(s):", err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener un usuario por ID
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      // También incluimos el cliente al obtener un solo usuario por ID
      include: [
        {
          model: Client,
          as: "clientInfo",
          attributes: ["id", "info", "email", "vip", "vipmail", "testing"],
        },
      ],
    });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "Usuario no encontrado" });
    }
  } catch (err) {
    console.error("Error al obtener usuario por ID:", err);
    res.status(500).json({ error: err.message });
  }
});

// src/routes/user.js (fragmento de la ruta P
// ... (tu código anterior para otras rutas y la importación de User, Client) ...

// Actualizar un usuario por ID (Esta ruta maneja la "activación" del usuario y la asignación de cliente)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[DEBUG] Recibida solicitud PUT para usuario ID: ${id}`);
    console.log("[DEBUG] req.body recibido:", req.body); // Imprime el cuerpo completo de la solicitud

    const user = await User.findByPk(id);
    if (!user) {
      console.warn(`[DEBUG] Usuario con ID ${id} no encontrado.`);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    console.log("[DEBUG] Usuario encontrado:", user.toJSON()); // Imprime el usuario actual antes de la actualización

    // *** CAMBIO AQUI: Ahora desestructuramos 'info' y 'email' directamente ***
    const { info, email, ...updateData } = req.body;

    console.log(`[DEBUG] info (Razon Social Cliente) extraído: "${info}"`);
    console.log(`[DEBUG] email (Email Cliente) extraído: "${email}"`);
    console.log("[DEBUG] updateData (resto de req.body):", updateData);

    let actualClientId = null; // Inicializamos el clientId que vamos a guardar en el usuario

    // --- Lógica para encontrar el cliente (NO CREARLO si no existe) ---
    // Esta lógica se ejecuta SOLO si se enviaron 'info' o 'email' en la solicitud PUT.
    if (info || email) {
      // Condición con los nuevos nombres
      console.log(
        "[DEBUG] Datos de cliente (info o email) presentes. Iniciando búsqueda de cliente."
      );
      let client = null;

      // Prioridad 1: Si el frontend ya envió un clientId (porque el admin seleccionó de autocompletado)
      if (updateData.clientId) {
        // Verificar si updateData.clientId existe y no es nulo/vacío
        console.log(
          `[DEBUG] Intentando buscar cliente por clientId en updateData: ${updateData.clientId}`
        );
        client = await Client.findByPk(updateData.clientId);
        if (client) {
          console.log("[DEBUG] Cliente encontrado por clientId:", client.toJSON());
        } else {
          console.log(`[DEBUG] Cliente con clientId ${updateData.clientId} NO encontrado.`);
        }
      }

      // Prioridad 2: Si no se encontró por ID (o no se envió ID), busca por 'info' y 'email'
      if (!client && (info || email)) {
        // Condición con los nuevos nombres
        console.log(`[DEBUG] Intentando buscar cliente por info: "${info}" y email: "${email}"`);
        client = await Client.findOne({
          where: {
            info: info, // *** USANDO 'info' AQUI ***
            email: email, // *** USANDO 'email' AQUI ***
          },
        });

        if (client) {
          console.log("[DEBUG] Cliente encontrado por info/email:", client.toJSON());
        } else {
          // Esta es la advertencia crucial si no se encuentra el cliente
          console.warn(
            `[DEBUG] Cliente NO encontrado para Razón Social: "${info}" y Email: "${email}".`
          );
        }
      }

      // Si se encontró un cliente existente, obtenemos su ID para asignarlo al usuario.
      if (client) {
        actualClientId = client.id;
        console.log(`[DEBUG] Cliente encontrado, actualClientId establecido a: ${actualClientId}`);
      } else {
        // Si NO se encontró un cliente existente con los datos proporcionados,
        // el clientId del usuario se establecerá en NULL (o no se modificará si ya era NULL).
        console.log(
          `[DEBUG] No se encontró un cliente coincidente. actualClientId se mantiene como null o su valor anterior.`
        );
        actualClientId = null; // Aseguramos que sea NULL si no se encontró un cliente válido
      }
    } else {
      // Si no se proporcionaron 'info' ni 'email' en la solicitud PUT,
      // mantenemos el clientId existente del usuario.
      actualClientId = user.clientId;
      console.log(
        `[DEBUG] No se proporcionaron datos de cliente. actualClientId se mantiene como el existente: ${actualClientId}`
      );
    }
    // ---------------------------------------------------------------------------------

    // Asignar el clientId determinado a los datos que se actualizarán en el usuario.
    updateData.clientId = actualClientId;
    console.log("[DEBUG] updateData final antes de la actualización:", updateData);

    // Actualizar el usuario con todos los campos en 'updateData' (incluido el clientId)
    await user.update(updateData);
    console.log("[DEBUG] Usuario actualizado en la base de datos.");

    // Opcional: Re-obtener el usuario con su información de cliente actualizada para la respuesta.
    const updatedUser = await User.findByPk(id, {
      include: [
        {
          model: Client,
          as: "clientInfo",
          attributes: ["id", "info", "email", "vip", "vipmail", "testing"],
        },
      ],
    });
    console.log("[DEBUG] Usuario re-obtenido con clientInfo para la respuesta.");

    res.json(updatedUser); // Responde con el usuario actualizado y su información de cliente
  } catch (err) {
    console.error("Error al actualizar/activar usuario:", err); // Imprime el error completo
    res.status(500).json({ error: err.message });
  }
});

// Eliminar un usuario por ID
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (user) {
      await user.destroy();
      res.json({ message: "Usuario eliminado" });
    } else {
      res.status(404).json({ error: "Usuario no encontrado" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
