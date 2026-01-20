const mysql = require('mysql2');
const path = require('path');
// Esto obliga a Node a buscar el .env en la misma carpeta del script
require('dotenv').config({ path: path.resolve(__dirname, '.env') }); 

console.log("Intentando conectar con usuario:", process.env.DB_USER); // Línea para debug

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Error conectando a la DB: ' + err.message);
    return;
  }
  console.log('✅ ¡Conexión exitosa a la base de datos local!');
  connection.end();
});