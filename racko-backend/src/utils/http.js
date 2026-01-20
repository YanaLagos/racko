function sendOk(res, { status = 200, message = null, data = null, meta = null } = {}) {
  const payload = { ok: true };
  if (message) payload.message = message;
  if (data !== null && data !== undefined) payload.data = data;
  if (meta) payload.meta = meta;
  return res.status(status).json(payload);
}

function sendError(res, { status = 400, error = 'errors.server.internal', details = null } = {}) {
  const payload = { ok: false, error };
  if (details) payload.details = details;
  return res.status(status).json(payload);
}

module.exports = { sendOk, sendError };
