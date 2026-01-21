const prestamosService = require("../services/prestamo.service");
const { sendOk, sendError } = require("../utils/http");

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

const predictivoService = require("../services/predictivo.service");

async function getPredictivoWidget(req, res) {
  try {
    const data = await predictivoService.obtenerUsuariosPredictivo({
      max: 5,
      hist: 10,
    });

    return sendOk(res, {
      status: 200,
      message: "success.predictivo.fetched",
      data,
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      error: "errors.server.internal",
    });
  }
}

module.exports = {
  getVencimientosWidget,
  getPredictivoWidget,
};
