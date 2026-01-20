const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const i18next = require("i18next");

const {
  verificarToken,
  esAdminOColaborador,
} = require("../middlewares/auth.middleware");
const { sendOk, sendError } = require("../utils/http");

const auditoriaService = require("../services/auditoria.service");
const auditoriaPrestamosService = require("../services/auditoriaPrestamo.service");

const es = require("../locales/es.json");
const en = require("../locales/en.json");

if (!i18next.isInitialized) {
  i18next.init({
    fallbackLng: "es",
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    interpolation: { escapeValue: false },
  });
}

// ---------- helpers ----------

function parseDetalleForPdf(detalleStr, t) {
  if (!detalleStr) return t("audits.unknown", { defaultValue: "Desconocido" });
  if (!detalleStr.includes("|")) return detalleStr;

  const [rawKey, ...paramsRaw] = String(detalleStr).split("|");

  const key = rawKey.startsWith("audit.")
    ? rawKey.replace(/^audit\./, "audits.")
    : rawKey;

  const params = {};
  paramsRaw.forEach((p) => {
    const [k, v] = p.split("=");
    if (k && v) params[k] = v;
  });

  return t(key, { ...params, defaultValue: key });
}

function isValidDateYYYYMMDD(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toIntOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function buildFiltrosMovimientosFromQuery(query) {
  const {
    tipo_evento,
    desde,
    hasta,
    id_usuario_interno,
    rut_usuario_externo,
    id_recurso,
    id_registro_prestamo,
    id_categoria,
    id_ubicacion,
    q,
    usuario,
    sortDir,
    ref_tipo,
    ref,
  } = query;

  if (desde && !isValidDateYYYYMMDD(desde))
    return { error: "errors.validation.invalidFromDate" };
  if (hasta && !isValidDateYYYYMMDD(hasta))
    return { error: "errors.validation.invalidToDate" };

  const nIdUsuario = toIntOrNull(id_usuario_interno);
  if (Number.isNaN(nIdUsuario))
    return { error: "errors.validation.invalidInternalUserId" };

  const nIdRecurso = toIntOrNull(id_recurso);
  if (Number.isNaN(nIdRecurso))
    return { error: "errors.validation.invalidResourceId" };

  const nIdPrestamo = toIntOrNull(id_registro_prestamo);
  if (Number.isNaN(nIdPrestamo))
    return { error: "errors.validation.invalidLoanId" };

  const nIdCategoria = toIntOrNull(id_categoria);
  if (Number.isNaN(nIdCategoria))
    return { error: "errors.validation.invalidCategoryId" };

  const nIdUbicacion = toIntOrNull(id_ubicacion);
  if (Number.isNaN(nIdUbicacion))
    return { error: "errors.validation.invalidLocationId" };

  const dir = String(sortDir || "desc").toLowerCase();
  if (!["asc", "desc"].includes(dir))
    return { error: "errors.validation.invalidSortDir" };

  const rt = ref_tipo ? String(ref_tipo).toLowerCase().trim() : null;
  if (
    rt &&
    !["recurso", "categoria", "ubicacion", "externo", "prestamo"].includes(rt)
  ) {
    return { error: "errors.validation.invalidRefType" };
  }

  return {
    filtros: {
      tipo_evento: tipo_evento || null,
      desde: desde || null,
      hasta: hasta || null,
      id_usuario_interno: nIdUsuario,
      usuario: usuario ? String(usuario).trim() : null,
      rut_usuario_externo: rut_usuario_externo || null,
      id_recurso: nIdRecurso,
      id_registro_prestamo: nIdPrestamo,
      id_categoria: nIdCategoria,
      id_ubicacion: nIdUbicacion,
      q: q || null,
      ref_tipo: rt,
      ref: ref ? String(ref).trim() : null,
    },
    sort: { dir },
  };
}

function human(v) {
  if (v === undefined || v === null || v === "") return "—";
  return String(v);
}

function formatDateCLShort(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CL");
}

function buildResumenFiltrosPrestamos(filtros, sortKey, sortDir) {
  const parts = [
    `Modo: ${human(filtros?.modo)}`,
    `Usuario: ${human(filtros?.usuario)}`,
    `RUT: ${human(filtros?.rut)}`,
    `Recurso: ${human(filtros?.recurso)}`,
    `Día: ${human(filtros?.dia)}`,
    `Desde: ${human(filtros?.desde)}`,
    `Hasta: ${human(filtros?.hasta)}`,
    `Orden: ${human(sortKey)} ${human(sortDir)}`,
  ];
  return parts.join(" | ");
}

/* Movimientos */
router.get(
  "/movimientos",
  verificarToken,
  esAdminOColaborador,
  async (req, res) => {
    try {
      const parsed = buildFiltrosMovimientosFromQuery(req.query);
      if (parsed.error)
        return sendError(res, { status: 400, error: parsed.error });

      const { filtros, sort } = parsed;
      const page = req.query.page ?? 1;
      const limit = req.query.limit ?? 25;

      const data = await auditoriaService.listarMovimientos({
        filtros,
        page,
        limit,
        sortDir: sort.dir,
      });

      return sendOk(res, {
        status: 200,
        message: "success.audit.fetched",
        data: data.rows,
        meta: { page: data.page, limit: data.limit, total: data.total },
      });
    } catch (error) {
      console.error(error);
      return sendError(res, { status: 500, error: "errors.audit.fetchFailed" });
    }
  }
);

router.get(
  "/reporte.pdf",
  verificarToken,
  esAdminOColaborador,
  async (req, res) => {
    try {
      const parsed = buildFiltrosMovimientosFromQuery(req.query);
      if (parsed.error)
        return sendError(res, { status: 400, error: parsed.error });

      const { filtros, sort } = parsed;

      const lang =
        String(req.query.lang || "es").toLowerCase() === "en" ? "en" : "es";
      const tPdf = (key, opts = {}) => i18next.t(key, { lng: lang, ...opts });

      const rows = await auditoriaService.obtenerMovimientosParaReporte({
        filtros,
        maxRows: 1000,
        sortDir: sort?.dir || "desc",
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'inline; filename="reporte_eventos.pdf"'
      );

      const doc = new PDFDocument({ margin: 40, size: "A4" });
      doc.pipe(res);

      // ===== Header PDF =====
      doc.fontSize(16).text(
        tPdf("events.pdf.title", {
          defaultValue: "Reporte de eventos - Racko",
        }),
        { align: "center" }
      );

      doc.moveDown(0.3);

      doc.fontSize(10).text(
        `${tPdf("events.pdf.generated", {
          defaultValue: "Generado",
        })}: ${new Date().toLocaleString(lang === "en" ? "en-US" : "es-CL")}`,
        { align: "center" }
      );

      doc.moveDown(1);

      // ===== Tabla =====
      doc.fontSize(9);

      const COL = {
        fecha: { x: 40, w: 95 },
        tipo: { x: 140, w: 95 },
        usuario: { x: 240, w: 120 },
        refs: { x: 365, w: 90 },
        detalle: { x: 460, w: 95 },
      };

      const tableLeft = 40;
      const tableRight = 555;
      const tableWidth = tableRight - tableLeft;

      const rowMinHeight = 24;
      const cellPadY = 4;

      // ===== Header row =====
      const yHead = doc.y;

      doc.save();
      doc.fillColor("#ece6f6");
      doc.rect(tableLeft, yHead - 2, tableWidth, rowMinHeight).fill();
      doc.restore();

      doc.text(
        tPdf("events.pdf.cols.date", { defaultValue: "Fecha" }),
        COL.fecha.x,
        yHead + cellPadY,
        { width: COL.fecha.w, lineBreak: false, ellipsis: true }
      );
      doc.text(
        tPdf("events.pdf.cols.type", { defaultValue: "Tipo" }),
        COL.tipo.x,
        yHead + cellPadY,
        { width: COL.tipo.w, lineBreak: false, ellipsis: true }
      );
      doc.text(
        tPdf("events.pdf.cols.user", { defaultValue: "Usuario" }),
        COL.usuario.x,
        yHead + cellPadY,
        { width: COL.usuario.w, lineBreak: false, ellipsis: true }
      );
      doc.text(
        tPdf("events.pdf.cols.refs", { defaultValue: "Refs" }),
        COL.refs.x,
        yHead + cellPadY,
        { width: COL.refs.w, lineBreak: false, ellipsis: true }
      );
      doc.text(
        tPdf("events.pdf.cols.detail", { defaultValue: "Detalle" }),
        COL.detalle.x,
        yHead + cellPadY,
        { width: COL.detalle.w, lineBreak: false, ellipsis: true }
      );

      doc.save();
      doc.strokeColor("#d0c6dd").lineWidth(0.7);
      doc
        .moveTo(tableLeft, yHead - 2 + rowMinHeight)
        .lineTo(tableRight, yHead - 2 + rowMinHeight)
        .stroke();
      doc.restore();

      const colXs = [
        COL.fecha.x,
        COL.tipo.x,
        COL.usuario.x,
        COL.refs.x,
        COL.detalle.x,
        tableRight,
      ];

      doc.save();
      doc.strokeColor("#d8d2e0").lineWidth(0.5);
      for (const x of colXs) {
        doc
          .moveTo(x, yHead - 2)
          .lineTo(x, yHead - 2 + rowMinHeight)
          .stroke();
      }
      doc.restore();

      doc.y = yHead - 2 + rowMinHeight;

      for (let idx = 0; idx < rows.length; idx++) {
        const r = rows[idx];
        const y = doc.y;

        if (idx % 2 === 1) {
          doc.save();
          doc.fillColor("#f6f3fa");
          doc.rect(tableLeft, y, tableWidth, rowMinHeight).fill();
          doc.restore();
        }

        const usuario = r.nombre_usuario
          ? `${r.nombre_usuario} ${r.apellido_usuario || ""}`.trim()
          : tPdf("events.pdf.noUser", { defaultValue: "(sin usuario)" });

        const fecha = r.fecha_hora
          ? new Date(r.fecha_hora).toLocaleString(
              lang === "en" ? "en-US" : "es-CL"
            )
          : "";

        const tipoTxt = r.tipo_evento
          ? tPdf(`events.type.${r.tipo_evento}`, {
              defaultValue: r.tipo_evento,
            })
          : "-";

        const refParts = [];
        if (r.rut_usuario_externo) {
          refParts.push(
            `${tPdf("events.refs.externo", { defaultValue: "Externo" })}: ${
              r.rut_usuario_externo
            }`
          );
        }
        if (r.id_recurso) {
          refParts.push(
            `${tPdf("events.refs.recurso", { defaultValue: "Recurso" })}: #${
              r.id_recurso
            }`
          );
        }
        if (r.id_registro_prestamo) {
          refParts.push(
            `${tPdf("events.refs.prestamo", { defaultValue: "Préstamo" })}: #${
              r.id_registro_prestamo
            }`
          );
        }
        if (r.id_categoria) {
          refParts.push(
            `${tPdf("events.refs.categoria", {
              defaultValue: "Categoría",
            })}: #${r.id_categoria}`
          );
        }
        if (r.id_ubicacion) {
          refParts.push(
            `${tPdf("events.refs.ubicacion", {
              defaultValue: "Ubicación",
            })}: #${r.id_ubicacion}`
          );
        }
        const refsTxt = refParts.join(" · ");

        const detalleTxt = parseDetalleForPdf(r.detalle, tPdf);

        let effectiveRowHeight = rowMinHeight;

        const refsHeight = doc.heightOfString(refsTxt || "-", {
          width: COL.refs.w,
          lineBreak: false,
          ellipsis: true,
        });

        const detHeight = doc.heightOfString(detalleTxt || "-", {
          width: COL.detalle.w,
          lineBreak: false,
          ellipsis: true,
        });

        effectiveRowHeight = Math.max(
          effectiveRowHeight,
          refsHeight + cellPadY * 2,
          detHeight + cellPadY * 2
        );

        if (idx % 2 === 1 && effectiveRowHeight !== rowMinHeight) {
          doc.save();
          doc.fillColor("#f6f3fa");
          doc.rect(tableLeft, y, tableWidth, effectiveRowHeight).fill();
          doc.restore();
        }

        doc.text(fecha, COL.fecha.x, y + cellPadY, {
          width: COL.fecha.w,
          lineBreak: false,
          ellipsis: true,
        });
        doc.text(tipoTxt, COL.tipo.x, y + cellPadY, {
          width: COL.tipo.w,
          lineBreak: false,
          ellipsis: true,
        });
        doc.text(usuario, COL.usuario.x, y + cellPadY, {
          width: COL.usuario.w,
          lineBreak: false,
          ellipsis: true,
        });
        doc.text(refsTxt || "-", COL.refs.x, y + cellPadY, {
          width: COL.refs.w,
          lineBreak: false,
          ellipsis: true,
        });
        doc.text(detalleTxt || "-", COL.detalle.x, y + cellPadY, {
          width: COL.detalle.w,
          lineBreak: false,
          ellipsis: true,
        });

        doc.save();
        doc.strokeColor("#e0d8ea").lineWidth(0.5);

        doc
          .moveTo(tableLeft, y + effectiveRowHeight)
          .lineTo(tableRight, y + effectiveRowHeight)
          .stroke();

        for (const x of colXs) {
          doc
            .moveTo(x, y)
            .lineTo(x, y + effectiveRowHeight)
            .stroke();
        }
        doc.restore();
        doc.y = y + effectiveRowHeight;

        if (doc.y > 760) doc.addPage();
      }

      doc.end();
    } catch (error) {
      console.error(error);
      return sendError(res, { status: 500, error: "errors.audit.pdfFailed" });
    }
  }
);

/* Préstamos */
router.get(
  "/prestamos",
  verificarToken,
  esAdminOColaborador,
  async (req, res) => {
    try {
      const filtros = {
        usuario: req.query.usuario || null,
        rut: req.query.rut || null,
        recurso: req.query.recurso || null,
        dia: req.query.dia || null,
        desde: req.query.desde || null,
        hasta: req.query.hasta || null,
        modo: req.query.modo || "en_curso",
      };

      const page = req.query.page ?? 1;
      const limit = req.query.limit ?? 25;
      const sortKey = req.query.sortKey ?? "fecha_prestamo";
      const sortDir = req.query.sortDir ?? "desc";

      const result = await auditoriaPrestamosService.listarPrestamos({
        filtros,
        page,
        limit,
        sortKey,
        sortDir,
      });

      if (!result.ok)
        return sendError(res, { status: result.status, error: result.error });

      return sendOk(res, {
        status: 200,
        message: "success.audit.fetched",
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      console.error(error);
      return sendError(res, { status: 500, error: "errors.audit.fetchFailed" });
    }
  }
);

router.get(
  "/prestamos/reporte.pdf",
  verificarToken,
  esAdminOColaborador,
  async (req, res) => {
    try {
      const filtros = {
        usuario: req.query.usuario || null,
        rut: req.query.rut || null,
        recurso: req.query.recurso || null,
        dia: req.query.dia || null,
        desde: req.query.desde || null,
        hasta: req.query.hasta || null,
        modo: req.query.modo || "en_curso",
      };

      const sortKey = req.query.sortKey ?? "fecha_prestamo";
      const sortDir = req.query.sortDir ?? "desc";

      const lang =
        String(req.query.lang || "es").toLowerCase() === "en" ? "en" : "es";
      const tPdf = (key, opts = {}) => i18next.t(key, { lng: lang, ...opts });

      const result =
        await auditoriaPrestamosService.obtenerPrestamosParaReporte({
          filtros,
          maxRows: 1000,
          sortKey,
          sortDir,
        });

      if (!result.ok)
        return sendError(res, { status: result.status, error: result.error });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'inline; filename="reporte_prestamos.pdf"'
      );

      const doc = new PDFDocument({ margin: 40, size: "A4" });
      doc.pipe(res);

      // ===== Header PDF =====
      doc.fontSize(16).text(
        tPdf("loans.pdf.title", {
          defaultValue: "Reporte de préstamos - Racko",
        }),
        {
          align: "center",
        }
      );

      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .text(
          `${tPdf("loans.pdf.generated", {
            defaultValue: "Generado",
          })}: ${new Date().toLocaleString(lang === "en" ? "en-US" : "es-CL")}`,
          { align: "center" }
        );

      doc.moveDown(0.5);

      doc.moveDown(0.8);

      // ===== Tabla =====
      doc.fontSize(9);

      const tableLeft = 40;
      const tableRight = 555;
      const tableWidth = tableRight - tableLeft;

      const rowMinHeight = 24;
      const cellPadY = 4;

      const isFreq = filtros.modo === "frecuencia";

      // anchos exactos que SUMAN 515 (555 - 40)
      const widths = isFreq
        ? {
            idOrFreq: 60, // Frecuencia
            recurso: 105,
            prestadoA: 100,
            rut: 70,
            prestamo: 55,
            devol: 55,
            venc: 70, // ← suficiente para fecha
          }
        : {
            idOrFreq: 35, // ID
            recurso: 110,
            prestadoA: 120,
            rut: 80,
            prestamo: 55,
            devol: 55,
            venc: 60,
          };

      // construcción EN CADENA (no se desarma nunca)
      let x = tableLeft;
      const COL2 = {
        idOrFreq: { x, w: widths.idOrFreq },
        recurso: { x: (x += widths.idOrFreq), w: widths.recurso },
        prestadoA: { x: (x += widths.recurso), w: widths.prestadoA },
        rut: { x: (x += widths.prestadoA), w: widths.rut },
        prestamo: { x: (x += widths.rut), w: widths.prestamo },
        devol: { x: (x += widths.prestamo), w: widths.devol },
        venc: { x: (x += widths.devol), w: widths.venc },
      };

      const colXs = [
        COL2.idOrFreq.x,
        COL2.recurso.x,
        COL2.prestadoA.x,
        COL2.rut.x,
        COL2.prestamo.x,
        COL2.devol.x,
        COL2.venc.x,
        tableRight,
      ];

      // ===== Header row =====
      const yHead = doc.y;

      doc.save();
      doc.fillColor("#ece6f6");
      doc.rect(tableLeft, yHead - 2, tableWidth, rowMinHeight).fill();
      doc.restore();

      doc.text(
        isFreq
          ? tPdf("loans.pdf.cols.frequency", { defaultValue: "Frecuencia" })
          : tPdf("loans.pdf.cols.id", { defaultValue: "ID" }),
        COL2.idOrFreq.x,
        yHead + cellPadY,
        { width: COL2.idOrFreq.w, lineBreak: false, ellipsis: true }
      );

      doc.text(
        tPdf("loans.pdf.cols.resource", { defaultValue: "Recurso" }),
        COL2.recurso.x,
        yHead + cellPadY,
        { width: COL2.recurso.w, lineBreak: false, ellipsis: true }
      );

      doc.text(
        tPdf("loans.pdf.cols.loanedTo", { defaultValue: "Prestado a" }),
        COL2.prestadoA.x,
        yHead + cellPadY,
        { width: COL2.prestadoA.w, lineBreak: false, ellipsis: true }
      );

      doc.text(
        tPdf("loans.pdf.cols.rut", { defaultValue: "RUT" }),
        COL2.rut.x,
        yHead + cellPadY,
        { width: COL2.rut.w, lineBreak: false, ellipsis: true }
      );

      doc.text(
        tPdf("loans.pdf.cols.loanDate", { defaultValue: "Préstamo" }),
        COL2.prestamo.x,
        yHead + cellPadY,
        { width: COL2.prestamo.w, lineBreak: false, ellipsis: true }
      );

      doc.text(
        tPdf("loans.pdf.cols.returnDate", { defaultValue: "Devol." }),
        COL2.devol.x,
        yHead + cellPadY,
        { width: COL2.devol.w, lineBreak: false, ellipsis: true }
      );

      doc.text(
        tPdf("loans.pdf.cols.dueDate", { defaultValue: "Venc." }),
        COL2.venc.x,
        yHead + cellPadY,
        { width: COL2.venc.w, lineBreak: false, ellipsis: true }
      );

      doc.save();
      doc.strokeColor("#d0c6dd").lineWidth(0.7);
      doc
        .moveTo(tableLeft, yHead - 2 + rowMinHeight)
        .lineTo(tableRight, yHead - 2 + rowMinHeight)
        .stroke();
      doc.restore();

      doc.save();
      doc.strokeColor("#d8d2e0").lineWidth(0.5);
      for (const x of colXs) {
        doc
          .moveTo(x, yHead - 2)
          .lineTo(x, yHead - 2 + rowMinHeight)
          .stroke();
      }
      doc.restore();

      doc.y = yHead - 2 + rowMinHeight;

      const dataRows = result.data || [];

      if (dataRows.length === 0) {
        doc.moveDown(1);
        doc
          .fontSize(10)
          .text(tPdf("loans.pdf.empty", { defaultValue: "Sin registros" }), {
            align: "center",
          });
        doc.end();
        return;
      }

      for (let idx = 0; idx < dataRows.length; idx++) {
        const r = dataRows[idx];
        const y = doc.y;

        if (idx % 2 === 1) {
          doc.save();
          doc.fillColor("#f6f3fa");
          doc.rect(tableLeft, y, tableWidth, rowMinHeight).fill();
          doc.restore();
        }

        const fPrestamo = r.fecha_prestamo
          ? new Date(r.fecha_prestamo).toLocaleDateString(
              lang === "en" ? "en-US" : "es-CL"
            )
          : "--";

        const fDev = r.fecha_devolucion
          ? new Date(r.fecha_devolucion).toLocaleDateString(
              lang === "en" ? "en-US" : "es-CL"
            )
          : "--";

        const fVenc = r.fecha_vencimiento
          ? new Date(r.fecha_vencimiento).toLocaleDateString(
              lang === "en" ? "en-US" : "es-CL"
            )
          : "--";

        const recursoTxt =
          isFreq && r.frecuencia != null
            ? `${String(r.nombre_recurso ?? "-")} (${r.frecuencia})`
            : String(r.nombre_recurso ?? "-");

        const prestadoATxt = String(r.prestado_a ?? "-");
        const rutTxt = String(r.rut_usuario ?? "-");

        const idOrFreqTxt = isFreq
          ? String(r.frecuencia ?? "")
          : String(r.id_prestamo ?? "");

        let effectiveRowHeight = rowMinHeight;

        const recursoH = doc.heightOfString(recursoTxt, {
          width: COL2.recurso.w,
          lineBreak: false,
          ellipsis: true,
        });
        const prestadoH = doc.heightOfString(prestadoATxt, {
          width: COL2.prestadoA.w,
          lineBreak: false,
          ellipsis: true,
        });

        effectiveRowHeight = Math.max(
          effectiveRowHeight,
          recursoH + cellPadY * 2,
          prestadoH + cellPadY * 2
        );

        if (idx % 2 === 1 && effectiveRowHeight !== rowMinHeight) {
          doc.save();
          doc.fillColor("#f6f3fa");
          doc.rect(tableLeft, y, tableWidth, effectiveRowHeight).fill();
          doc.restore();
        }

        doc.text(idOrFreqTxt, COL2.idOrFreq.x, y + cellPadY, {
          width: COL2.idOrFreq.w,
          lineBreak: false,
          ellipsis: true,
        });
        doc.text(recursoTxt, COL2.recurso.x, y + cellPadY, {
          width: COL2.recurso.w,
          lineBreak: false,
          ellipsis: true,
        });
        doc.text(prestadoATxt, COL2.prestadoA.x, y + cellPadY, {
          width: COL2.prestadoA.w,
          lineBreak: false,
          ellipsis: true,
        });
        doc.text(rutTxt, COL2.rut.x, y + cellPadY, {
          width: COL2.rut.w,
          lineBreak: false,
          ellipsis: true,
        });
        doc.text(fPrestamo, COL2.prestamo.x, y + cellPadY, {
          width: COL2.prestamo.w,
          lineBreak: false,
          ellipsis: true,
        });
        doc.text(fDev, COL2.devol.x, y + cellPadY, {
          width: COL2.devol.w,
          lineBreak: false,
          ellipsis: true,
        });
        doc.text(fVenc, COL2.venc.x, y + cellPadY, {
          width: COL2.venc.w,
          lineBreak: false,
          ellipsis: true,
        });

        doc.save();
        doc.strokeColor("#e0d8ea").lineWidth(0.5);

        doc
          .moveTo(tableLeft, y + effectiveRowHeight)
          .lineTo(tableRight, y + effectiveRowHeight)
          .stroke();

        for (const x of colXs) {
          doc
            .moveTo(x, y)
            .lineTo(x, y + effectiveRowHeight)
            .stroke();
        }

        doc.restore();

        doc.y = y + effectiveRowHeight;
        if (doc.y > 760) doc.addPage();
      }

      doc.end();
    } catch (error) {
      console.error(error);
      return sendError(res, { status: 500, error: "errors.audit.pdfFailed" });
    }
  }
);

module.exports = router;
