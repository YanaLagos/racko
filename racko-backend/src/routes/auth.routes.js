const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const crypto = require('crypto');
const { enviarCorreoRecuperacion } = require('../services/email.service');
const { sendOk, sendError } = require('../utils/http');

const JWT_SECRET = process.env.JWT_SECRET;

// LOGIN
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return sendError(res, { status: 400, error: "errors.validation.requiredFields" });
    }

    const usernameNorm = String(username).trim().toLowerCase();

    const [rows] = await db.query(
      "SELECT id_usuario, id_rol, nombre, apellido, password FROM usuario_interno WHERE username = ? AND estado = 1",
      [usernameNorm]
    );

    if (rows.length === 0) {
      return sendError(res, { status: 401, error: "errors.auth.invalidCredentials" });
    }

    const usuario = rows[0];

    const validPassword = await bcrypt.compare(password, usuario.password);
    if (!validPassword) {
      return sendError(res, { status: 401, error: "errors.auth.invalidCredentials" });
    }

    const token = jwt.sign(
      { id_usuario: usuario.id_usuario, id_rol: usuario.id_rol },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    return sendOk(res, {
      status: 200,
      message: "success.auth.loginOk",
      data: {
        token,
        usuario: {
          id_usuario: usuario.id_usuario,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          id_rol: usuario.id_rol,
        },
      },
    });
  } catch (error) {
    console.error(error);
    return sendError(res, { status: 500, error: "errors.server.internal" });
  }
});


// REGISTRO
router.post('/register', async (req, res) => {
  const { username, email, nombre, apellido, password, id_rol, estado, idioma } = req.body;

  try {
    if (!username || !email || !nombre || !password || !id_rol) {
      return sendError(res, {
        status: 400,
        error: 'errors.validation.requiredFields'
      });
    }

    const usernameNorm = String(username).trim().toLowerCase();
    const emailNorm = String(email).trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNorm)) {
      return sendError(res, {
        status: 400,
        error: 'errors.validation.invalidEmail'
      });
    }

    if (idioma && !['es', 'en'].includes(idioma)) {
      return sendError(res, {
        status: 400,
        error: 'errors.validation.invalidLanguage'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await db.query(
      `INSERT INTO usuario_interno
       (username, email, nombre, apellido, password, id_rol, estado, idioma)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [usernameNorm, emailNorm, nombre, apellido || null, hashedPassword, id_rol, estado ?? 1, idioma || 'es']
    );

    return sendOk(res, {
      status: 201,
      message: 'success.users.registered',
      data: null
    });
  } catch (error) {
    console.error(error);

    if (error.code === 'ER_DUP_ENTRY') {
      const msg = String(error.message || '').toLowerCase();

      if (msg.includes("for key 'username'") || msg.includes('for key `username`') || msg.includes('for key username')) {
        return sendError(res, { status: 400, error: 'errors.internalUsers.usernameAlreadyExists' });
      }

      if (msg.includes("for key 'email'") || msg.includes('for key `email`') || msg.includes('for key email')) {
        return sendError(res, { status: 400, error: 'errors.internalUsers.emailAlreadyExists' });
      }

      return sendError(res, { status: 400, error: 'errors.validation.duplicateEntry' });
    }

    return sendError(res, {
      status: 500,
      error: 'errors.server.internal'
    });
  }
});


//OLVIDO DE CONTRASEÑA
router.post('/forgot-password', async (req, res) => {
  const { username, email } = req.body;

  try {
    if (!username || !email) {
      return sendError(res, {
        status: 400,
        error: 'errors.validation.requiredFields'
      });
    }

    const usernameNorm = String(username).trim().toLowerCase();
    const emailNorm = String(email).trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNorm)) {
      return sendError(res, {
        status: 400,
        error: 'errors.validation.invalidEmail'
      });
    }

    const [rows] = await db.query(
      'SELECT id_usuario FROM usuario_interno WHERE username = ? AND email = ? AND estado = 1',
      [usernameNorm, emailNorm]
    );

    if (rows.length === 0) {
      return sendOk(res, {
        status: 200,
        message: 'success.auth.resetRequested',
        data: null
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiracion = new Date(Date.now() + 3600000);

    await db.query(
      'UPDATE usuario_interno SET reset_token = ?, reset_expiracion = ? WHERE id_usuario = ?',
      [token, expiracion, rows[0].id_usuario]
    );

    try {
      await enviarCorreoRecuperacion(emailNorm, token);
    } catch (emailError) {
      console.error('Error enviando correo:', emailError);
    }

    return sendOk(res, {
      status: 200,
      message: 'success.auth.resetRequested',
      data: null
    });
  } catch (error) {
    console.error('Error en forgot-password:', error);
    return sendError(res, {
      status: 500,
      error: 'errors.server.internal'
    });
  }
});

// RESETEAR CONTRASEÑA
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    if (!password) {
      return sendError(res, { status: 400, error: 'errors.validation.requiredFields' });
    }

    const [rows] = await db.query(
      'SELECT id_usuario FROM usuario_interno WHERE reset_token = ? AND reset_expiracion > NOW()',
      [token]
    );

    if (rows.length === 0) {
      return sendError(res, { status: 400, error: 'errors.auth.invalidToken' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await db.query(
      'UPDATE usuario_interno SET password = ?, reset_token = NULL, reset_expiracion = NULL WHERE id_usuario = ?',
      [hashedPassword, rows[0].id_usuario]
    );

    return sendOk(res, { status: 200, message: 'success.auth.passwordUpdated', data: null });
  } catch (error) {
    console.error(error);
    return sendError(res, { status: 500, error: 'errors.server.internal' });
  }
});

module.exports = router;
