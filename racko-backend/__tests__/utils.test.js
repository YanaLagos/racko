const { normalizeRut, isValidRut } = require('../src/utils/rut');

describe('Pruebas unitarias - Utilidades RUT', () => {

  test('normalizeRut elimina puntos y espacios del RUT', () => {
    const rut = '12.345.678-5';
    const result = normalizeRut(rut);
    expect(result).toBe('12345678-5');
  });

  test('isValidRut retorna true para un RUT válido', () => {
    expect(isValidRut('12345678-5')).toBe(true);
  });

  test('isValidRut retorna false para un RUT inválido', () => {
    expect(isValidRut('12345678-0')).toBe(false);
  });

});
