const prestamosService = require('../services/prestamo.service');
const { sendOk, sendError } = require('../utils/http');

async function getVencimientosWidget(req, res) {
  const result = await prestamosService.vencimientosWidget();

  if (!result.ok) {
    return sendError(res, { status: result.status, error: result.error });
  }

  return sendOk(res, {
    status: result.status,
    message: result.message,
    data: result.data,
  });
}

module.exports = {
  getVencimientosWidget,
};
