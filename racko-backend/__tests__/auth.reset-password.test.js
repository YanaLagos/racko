const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../app");

jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));
const db = require("../src/config/db");

describe("Integración API - Auth reset-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("400: si falta password -> requiredFields", async () => {
    const res = await request(app).post("/api/auth/reset-password/token123").send({});
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe("errors.validation.requiredFields");
  });

  test("400: token inválido o expirado -> invalidToken", async () => {
    db.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post("/api/auth/reset-password/token_invalido")
      .send({ password: "NuevaClave123" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe("errors.auth.invalidToken");
  });

  test("200: reset exitoso -> passwordUpdated y limpia token en BD", async () => {
    db.query.mockResolvedValueOnce([[{ id_usuario: 7 }]]);

    jest.spyOn(bcrypt, "genSalt").mockResolvedValueOnce("salt_fake");
    jest.spyOn(bcrypt, "hash").mockResolvedValueOnce("hash_fake");

    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .post("/api/auth/reset-password/token_valido")
      .send({ password: "NuevaClave123" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.message).toBe("success.auth.passwordUpdated");

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      "SELECT id_usuario FROM usuario_interno WHERE reset_token = ? AND reset_expiracion > NOW()",
      ["token_valido"]
    );

    expect(db.query).toHaveBeenNthCalledWith(
      2,
      "UPDATE usuario_interno SET password = ?, reset_token = NULL, reset_expiracion = NULL WHERE id_usuario = ?",
      ["hash_fake", 7]
    );
  });
});
