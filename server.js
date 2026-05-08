const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json()); // Дозволяє парсити JSON з body

// Підключення маршрутів
app.use('/auth', require('./routes/auth'));
app.use('/tasks', require('./routes/tasks'));
app.use('/tests', require('./routes/tests'));
app.use('/profile', require('./routes/profile'));

const db = require('./db');

// Перевірочний запит до БД при старті сервера
db.query('SELECT NOW() AS current_time', (err, res) => {
  if (err) {
    console.log('❌ DB Query Error:', err.message);
  } else {
    console.log('✅ DB is working. Server Time:', res.rows[0].current_time);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}...`);
});