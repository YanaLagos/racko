const jwt = require('jsonwebtoken');

const ROLES = {
  ADMIN: 1,
  COLABORADOR: 2
};

const verificarToken = (req, res, next) => {
  const header = req.header('Authorization');
  if (!header) return res.status(401).json({ ok: false, error: 'errors.auth.missingToken' });

  const token = header.replace('Bearer ', '');

  try {
    const verificado = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verificado;
    return next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: 'errors.auth.invalidToken' });
  }
};

const esAdmin = (req, res, next) => {
  if (req.user?.id_rol === ROLES.ADMIN) return next();
  return res.status(403).json({ ok: false, error: 'errors.auth.forbidden' });
};

const esAdminOColaborador = (req, res, next) => {
  if (req.user?.id_rol === ROLES.ADMIN || req.user?.id_rol === ROLES.COLABORADOR) return next();
  return res.status(403).json({ ok: false, error: 'errors.auth.forbidden' });
};

module.exports = { verificarToken, esAdmin, esAdminOColaborador, ROLES };
