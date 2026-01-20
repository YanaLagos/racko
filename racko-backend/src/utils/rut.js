function cleanRut(input) {
  if (!input) return "";
  return String(input)
    .trim()
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "");
}

function normalizeRut(input) {
  const raw = cleanRut(input);

  const m1 = raw.match(/^(\d+)([0-9K])$/);
  if (m1) return `${m1[1]}-${m1[2]}`;

  const m2 = raw.match(/^(\d+)-([0-9K])$/);
  if (m2) return `${m2[1]}-${m2[2]}`;

  return "";
}

function computeDV(body) {
  let sum = 0;
  let mul = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }

  const mod = 11 - (sum % 11);
  if (mod === 11) return "0";
  if (mod === 10) return "K";
  return String(mod);
}

function isValidRut(input) {
  const norm = normalizeRut(input);
  if (!norm) return false;

  const [body, dv] = norm.split("-");
  if (!/^\d{7,8}$/.test(body)) return false;
  if (!/^[0-9K]$/.test(dv)) return false;

  return computeDV(body) === dv;
}

module.exports = { cleanRut, normalizeRut, isValidRut, computeDV };
