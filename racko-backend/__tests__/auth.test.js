const request = require('supertest');
const app = require('../app');

describe('Pruebas automatizadas de API - Seguridad básica', () => {

  test('GET /api/health responde correctamente', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body.data).toHaveProperty('status', 'ok');
  });

  test('Acceso a endpoint protegido sin token retorna 401', async () => {
    const res = await request(app).get('/api/auditoria/movimientos');

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('ok', false);
  });

});
