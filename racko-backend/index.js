const app = require("./app");
const PORT = process.env.PORT || 3000;

console.log("DB_HOST =", process.env.DB_HOST);
console.log("DB_PORT =", process.env.DB_PORT);
console.log("DB_USER =", process.env.DB_USER);
console.log("DB_NAME =", process.env.DB_NAME);
console.log("HAS_DB_PASSWORD =", Boolean(process.env.DB_PASSWORD));

const db = require("./src/config/db");

(async () => {
  try {
    const [rows] = await db.query("SELECT 1 AS ok");
    console.log("✅ DB CONNECTED:", rows);
  } catch (e) {
    console.error("❌ DB CONNECT FAIL:", e.code, e.message);
  }
})();

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
