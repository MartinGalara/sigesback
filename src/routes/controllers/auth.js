const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Client } = require("../../db.js");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const accountTransport = require("../../../account_transport.json");

// Middleware para verificar el token
const verifyToken = (req, res, next) => {
  const apiKey = req.headers["x-api-key"]; // El bot enviará esto
  if (apiKey) {
    // Si se proporciona una API Key
    if (!process.env.BACKEND_STATIC_API_KEY) {
      console.error(
        "BACKEND_STATIC_API_KEY no está definida en las variables de entorno del backend."
      );
      return res
        .status(500)
        .json({ message: "Error de configuración del servidor: API Key estática no definida." });
    }

    if (apiKey === process.env.BACKEND_STATIC_API_KEY) {
      // Si la API Key es válida, asumimos que es el bot y permitimos el acceso
      // Opcional: Puedes añadir información al req si la necesitas más adelante, ej. req.isBot = true;
      console.log("Acceso permitido por API Key estática (Bot).");
      return next();
    } else {
      // API Key proporcionada pero inválida
      console.warn(`Intento de acceso con API Key inválida desde IP: ${req.ip}`);
      return res.status(403).json({ message: "Acceso denegado: API Key inválida." });
    }
  }

  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ error: "No token provided" });

  jwt.verify(token, "secretKey", (err, decoded) => {
    if (err) {
      console.error("Error de verificación JWT:", err); // ¡Esto es fundamental!
      return res.status(500).json({ error: "Failed to authenticate token" });
    }
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.userEmail = decoded.email;
    req.userClientId = decoded.clientId;
    next();
  });
};

// Configuración de OAuth2
const oauth2Client = new OAuth2(
  accountTransport.auth.clientId,
  accountTransport.auth.clientSecret,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: accountTransport.auth.refreshToken,
});

// Utilidad para obtener un transporter listo (async/await) con diagnósticos detallados
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

// Registro de usuario
router.post("/register", async (req, res) => {
  try {
    const { firstName, razonSocial, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      razonSocial,
      email,
      password: hashedPassword,
      status: 0,
    });

    const adminRecipients = process.env.ADMIN_NOTIFICATION_EMAILS.split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    const rawUserEmail = (email || "").trim();
    const userEmailValida = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rawUserEmail);

    const welcomeMail = {
      from: `SIGES Soporte <${accountTransport.auth.user}>`,
      to: rawUserEmail,
      subject: "Bienvenido a SIGES - Registro recibido",
      text: `Hola ${firstName || ""} ${
        razonSocial || ""
      }\n\nTu registro fue recibido y está pendiente de habilitación por un administrador. Te avisaremos cuando tu cuenta esté activa.\n\nDatos registrados:\nNombre: ${firstName}\nRazón Social: ${razonSocial}\nEmail: ${email}\n\nSi no solicitaste esta cuenta ignora este correo.`,
      html: `<p>Hola <strong>${firstName || ""} ${razonSocial || ""}</strong>,</p>
             <p>Tu registro fue recibido y está <strong>pendiente de habilitación</strong> por un administrador.</p>
             <p><strong>Datos registrados:</strong><br/>Nombre: ${firstName}<br/>Razón Social: ${razonSocial}<br/>Email: ${email}</p>
             <p>Te avisaremos cuando tu cuenta esté activa.</p>
             <hr style="border:none;border-top:1px solid #eee"/>
             <p style="font-size:12px;color:#777">Si no solicitaste esta cuenta ignora este correo.</p>`,
    };

    const adminMail = {
      from: `SIGES Notificador <${accountTransport.auth.user}>`,
      to: adminRecipients.join(","),
      subject: "Nuevo usuario registrado",
      text: `Nuevo registro:\nNombre: ${firstName}\nRazón Social: ${razonSocial}\nEmail: ${email}`,
    };

    const sendResults = { welcome: null, admin: null };
    const warnings = [];

    if (userEmailValida) {
      try {
        sendResults.welcome = await sendMail(welcomeMail);
        console.log(
          "[MAIL][REGISTER][WELCOME] messageId:",
          sendResults.welcome?.messageId,
          "accepted:",
          sendResults.welcome?.accepted,
          "rejected:",
          sendResults.welcome?.rejected,
          "to:",
          welcomeMail.to
        );
        if (sendResults.welcome?.rejected?.length)
          warnings.push(
            "Correo de bienvenida rechazado: " + sendResults.welcome.rejected.join(",")
          );
      } catch (eWelcome) {
        console.error("[MAIL][REGISTER][WELCOME] Error:", eWelcome?.message || eWelcome);
        warnings.push("Fallo envío correo bienvenida: " + (eWelcome?.message || eWelcome));
      }
    } else {
      warnings.push("Email de usuario inválido, no se intentó enviar bienvenida");
      console.warn("[MAIL][REGISTER][WELCOME] Email inválido ->", rawUserEmail);
    }

    try {
      sendResults.admin = await sendMail(adminMail);
      console.log(
        "[MAIL][REGISTER][ADMIN] messageId:",
        sendResults.admin?.messageId,
        "accepted:",
        sendResults.admin?.accepted,
        "rejected:",
        sendResults.admin?.rejected,
        "to:",
        adminMail.to
      );
      if (sendResults.admin?.rejected?.length)
        warnings.push("Notificación admin rechazada: " + sendResults.admin.rejected.join(","));
    } catch (eAdmin) {
      console.error("[MAIL][REGISTER][ADMIN] Error:", eAdmin?.message || eAdmin);
      warnings.push("Fallo notificación admin: " + (eAdmin?.message || eAdmin));
    }

    if (warnings.length) {
      return res.status(201).json({
        user,
        warnings,
        debug: {
          welcomeAccepted: sendResults.welcome?.accepted,
          welcomeRejected: sendResults.welcome?.rejected,
          adminAccepted: sendResults.admin?.accepted,
          adminRejected: sendResults.admin?.rejected,
        },
      });
    }
    res.status(201).json({
      user,
      message: "Usuario creado y correos enviados",
      debug: {
        welcomeAccepted: sendResults.welcome?.accepted,
        adminAccepted: sendResults.admin?.accepted,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inicio de sesión
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Client,
          as: "clientInfo",
          attributes: ["email"], // Solo necesitamos el email del cliente
        },
      ],
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    if (user.status === 0) {
      return res.status(403).json({ error: "Usuario no habilitado" });
    }

    // Obtener el email del cliente si existe
    const clientEmail = user.clientInfo ? user.clientInfo.email : null;

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, "secretKey", {
      expiresIn: "1h",
    });
    res.json({
      token,
      user: {
        firstName: user.firstName,
        razonSocial: user.razonSocial,
        email: user.email,
        role: user.role,
        clientEmail: clientEmail,
        clientId: user.clientId,
        owner: user.owner,
        onboarding_completed: user.onboarding_completed,
      },
    });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener datos del usuario actual
router.get("/currentUser", verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ["firstName", "clientId", "email", "role"],
    });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Habilitar usuario
router.put("/enable/:id", verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    user.status = 1;
    await user.save();
    res.json({ message: "Usuario habilitado correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res
        .status(404)
        .json({ error: "No se encontró un usuario con ese correo electrónico" });
    }

    const resetToken = jwt.sign({ id: user.id }, "secretKey", { expiresIn: "1h" });

    try {
      // Base del frontend (puerto 5173 por defecto para Vite)
      const frontendBase = (process.env.FRONTEND_BASE_URL || "http://localhost:5173").replace(
        /\/$/,
        ""
      );
      // Usamos query param para poder detectarlo fácilmente en el navbar y abrir el modal reset
      const resetLink = `${frontendBase}/?resetToken=${resetToken}#inicio`;

      const mailOptions = {
        from: `SIGES Soporte <${accountTransport.auth.user}>`,
        to: user.email,
        subject: "Recuperación de contraseña - SIGES",
        text: `Has solicitado recuperar tu contraseña. Si no fuiste tú ignora este correo.\n\nPara restablecerla ingresa al siguiente enlace (válido 1 hora): ${resetLink}`,
        html: `<p>Has solicitado recuperar tu contraseña. Si no fuiste tú ignora este correo.</p>
               <p>Para restablecerla haz clic en el siguiente botón (válido 1 hora):</p>
               <p><a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">¿Querés restablecer la contraseña?</a></p>
               <p style="font-size:12px;color:#666">Si el botón no funciona copia y pega este enlace en tu navegador:<br/><span style="word-break:break-all">${resetLink}</span></p>`,
      };

      let sendResult = null;
      try {
        sendResult = await sendMail(mailOptions);
        console.log(
          "[MAIL][FORGOT-PASSWORD] messageId:",
          sendResult?.messageId,
          "accepted:",
          sendResult?.accepted,
          "rejected:",
          sendResult?.rejected
        );
      } catch (eSend) {
        console.error(
          "[MAIL][FORGOT-PASSWORD] Error enviando correo de recuperación:",
          eSend?.message || eSend
        );
        return res.status(500).json({ error: "Error al enviar el correo electrónico" });
      }
      res.json({
        message: "Correo de recuperación enviado",
        debug: {
          accepted: sendResult?.accepted,
          rejected: sendResult?.rejected,
          previewLink: resetLink,
        },
      });
    } catch (mailErr) {
      console.error("[MAIL][FORGOT-PASSWORD] Error general preparando envío:", mailErr);
      return res.status(500).json({ error: "Error preparando correo de recuperación" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/reset-password/:token?", async (req, res) => {
  try {
    // Permitimos token por param, body o query para flexibilidad en el frontend
    const token = req.params.token || req.body.token || req.query.token;
    const { newPassword } = req.body;

    if (!token) return res.status(400).json({ error: "Token requerido" });
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ error: "Nueva contraseña inválida (mínimo 6 caracteres)" });
    }

    let payload;
    try {
      payload = jwt.verify(token, "secretKey");
    } catch {
      return res.status(400).json({ error: "Token inválido o expirado" });
    }

    const user = await User.findByPk(payload.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = {
  router,
  verifyToken,
};
