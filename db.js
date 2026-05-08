const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Перевірка з'єднання при старті
pool.connect()
  .then(() => console.log('✅ Supabase connected successfully!'))
  .catch(err => console.error('❌ DB connection error:', err.message));

module.exports = pool;