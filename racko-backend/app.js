const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { sendOk } = require("./src/utils/http");

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("Racko API online");
});

app.use("/api/auditoria", require("./src/routes/auditoria.routes"));
app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/recursos", require("./src/routes/recursos.routes"));
app.use("/api/categorias", require("./src/routes/categorias.routes"));
app.use(
  "/api/usuarios-internos",
  require("./src/routes/usuarios_internos.routes"),
);
app.use(
  "/api/usuarios-externos",
  require("./src/routes/usuarios_externos.routes"),
);
app.use("/api/prestamos", require("./src/routes/prestamo.routes"));
app.use("/api/ubicacion", require("./src/routes/ubicacion.routes"));

app.get("/api/health", (req, res) => {
  return sendOk(res, {
    status: 200,
    message: "success.server.healthOk",
    data: { status: "ok" },
  });
});

module.exports = app;
