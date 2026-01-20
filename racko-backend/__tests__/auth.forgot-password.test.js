const request = require("supertest");
const crypto = require("crypto");

// Mock db
jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));
const db = require("../src/config/db");

// Mock email service (para que NO mande correos)
jest.mock("../src/services/email.service", () => ({
  enviarCorreoRecuperacion: jest.fn().mockResolvedValue(true),
}));
const { enviarCorreoRecuperacion } = require("../src/services/email.service");

const app = require("../app");

describe("Integración API - Auth forgot-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ✅ solo mockeamos randomBytes, NO todo crypto
    jest.spyOn(crypto, "randomBytes").mockReturnValue(Buffer.from("a".repeat(32)));
  });

  afterAll(() => {
    crypto.randomBytes.mockRestore();
  });

  test("400: si faltan campos -> requiredFields", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({});
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe("errors.validation.requiredFields");
  });

  test("400: email inválido -> invalidEmail", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ username: "user", email: "no-es-email" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe("errors.validation.invalidEmail");
  });

  test("200: si NO existe usuario, igual responde resetRequested (sin revelar info)", async () => {
    db.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ username: "noexiste", email: "no@existe.com" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.message).toBe("success.auth.resetRequested");
    expect(enviarCorreoRecuperacion).not.toHaveBeenCalled();
  });

  test("200: si existe usuario, guarda token y llama a enviarCorreoRecuperacion", async () => {
    // 1) SELECT id_usuario
    db.query.mockResolvedValueOnce([[{ id_usuario: 5 }]]);
    // 2) UPDATE token + expiración
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ username: "colab", email: "colab@test.com" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.message).toBe("success.auth.resetRequested");

    const tokenEsperado = Buffer.from("a".repeat(32)).toString("hex");

    expect(db.query).toHaveBeenNthCalledWith(
      2,
      "UPDATE usuario_interno SET reset_token = ?, reset_expiracion = ? WHERE id_usuario = ?",
      [tokenEsperado, expect.any(Date), 5]
    );

    expect(enviarCorreoRecuperacion).toHaveBeenCalledWith("colab@test.com", tokenEsperado);
  });
});
