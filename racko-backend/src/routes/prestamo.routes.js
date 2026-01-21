const express = require('express');
const router = express.Router();

const { verificarToken, esAdminOColaborador } = require('../middlewares/auth.middleware');
const prestamosService = require('../services/prestamo.service');
const { sendOk, sendError } = require('../utils/http');
const { getVencimientosWidget, getPredictivoWidget  } = require('../controllers/prestamo.controller');



function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isValidDateInput(v) {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v));
}

router.post('/prestar', verificarToken, esAdminOColaborador, async (req, res) => {
  const { rut_usuario_ext, id_recurso, fecha_vencimiento = null, observaciones = null } = req.body;
  const id_usuario_interno = req.user.id_usuario;

  if (!isNonEmptyString(rut_usuario_ext)) {
    return sendError(res, { status: 400, error: 'errors.validation.invalidRut' });
  }

  const idRecurso = toInt(id_recurso);
  if (Number.isNaN(idRecurso)) {
    return sendError(res, { status: 400, error: 'errors.validation.invalidResourceId' });
  }

  if (fecha_vencimiento !== null && fecha_vencimiento !== undefined && fecha_vencimiento !== '') {
    if (!isValidDateInput(fecha_vencimiento)) {
      return sendError(res, { status: 400, error: 'errors.validation.invalidDueDate' });
    }
  }

  if (observaciones !== null && observaciones !== undefined && typeof observaciones !== 'string') {
    return sendError(res, { status: 400, error: 'errors.validation.invalidObservations' });
  }

  const result = await prestamosService.prestar({
    id_usuario_interno,
    rut_usuario_ext: rut_usuario_ext.trim(),
    id_recurso: idRecurso,
    fecha_vencimiento: fecha_vencimiento || null,
    observaciones: observaciones ?? null
  });

  if (!result.ok) return sendError(res, { status: result.status, error: result.error });

  return sendOk(res, { status: result.status, message: result.message, data: result.data });
});

router.patch('/devolver/:id_prestamo', verificarToken, esAdminOColaborador, async (req, res) => {
  const idPrestamo = toInt(req.params.id_prestamo);
  const id_usuario_interno = req.user.id_usuario;

  if (Number.isNaN(idPrestamo)) {
    return sendError(res, { status: 400, error: 'errors.validation.invalidLoanId' });
  }

  const result = await prestamosService.devolver({ id_usuario_interno, id_prestamo: idPrestamo });
  if (!result.ok) return sendError(res, { status: result.status, error: result.error });

  return sendOk(res, { status: result.status, message: result.message, data: result.data ?? null });
});

router.patch('/observaciones/:id_prestamo', verificarToken, esAdminOColaborador, async (req, res) => {
  const idPrestamo = toInt(req.params.id_prestamo);
  const { observaciones = null } = req.body;
  const id_usuario_interno = req.user.id_usuario;

  if (Number.isNaN(idPrestamo)) {
    return sendError(res, { status: 400, error: 'errors.validation.invalidLoanId' });
  }

  if (observaciones !== null && observaciones !== undefined && typeof observaciones !== 'string') {
    return sendError(res, { status: 400, error: 'errors.validation.invalidObservations' });
  }

  const result = await prestamosService.actualizarObservaciones({ id_usuario_interno, id_prestamo: idPrestamo, observaciones });
  if (!result.ok) return sendError(res, { status: result.status, error: result.error });

  return sendOk(res, { status: result.status, message: result.message, data: null });
});

router.get('/historial', verificarToken, esAdminOColaborador, async (req, res) => {
  const result = await prestamosService.historial();
  if (!result.ok) return sendError(res, { status: result.status, error: result.error });

  return sendOk(res, { status: result.status, message: result.message, data: result.data });
});

router.get(
  "/vencimientos/widget",
  verificarToken,
  esAdminOColaborador,
  getVencimientosWidget
);

router.get(
  "/predictivo",
  verificarToken,
  esAdminOColaborador,
  getPredictivoWidget 
);

module.exports = router;
