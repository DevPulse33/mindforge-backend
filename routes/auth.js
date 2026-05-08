const router = require('express').Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/authMiddleware');
require('dotenv').config();

// Реєстрація
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);
    
    // Створюємо юзера і повертаємо його ID
    const userResult = await db.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
      [email, hash]
    );

    const userId = userResult.rows[0].id;

    // Одразу створюємо пустий профіль (1 рівень, 0 XP)
    await db.query(
      'INSERT INTO profiles (user_id, username, level, xp) VALUES ($1, $2, $3, $4)',
      [userId, `Student_${userId}`, 1, 0]
    );

    res.status(201).json({ message: 'User registered successfully!' });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // Код помилки PostgreSQL для унікального поля
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Логін
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({ message: 'Wrong password' });
    }

    // Створюємо токен
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.put('/change-password', auth, async (req, res) => {
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;

  try {
    // 1. Шукаємо юзера
    const result = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    // 2. Перевіряємо старий пароль
    const valid = await bcrypt.compare(oldPassword, result.rows[0].password);
    if (!valid) return res.status(400).json({ message: 'Неправильний старий пароль' });

    // 3. Хешуємо і зберігаємо новий пароль
    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [newHash, userId]);

    res.json({ message: 'Пароль успішно змінено!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;