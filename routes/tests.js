const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/authMiddleware');

// 1. Отримати всі тести з БД
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tests ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// 2. АДМІН: Додати новий тест
router.post('/admin/add', auth, async (req, res) => {
  const userId = req.user.id;
  const { title, description, xpReward, questions } = req.body;

  try {
    // Перевіряємо, чи юзер є адміном
    const roleCheck = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (roleCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Зберігаємо тест у БД (масив питань автоматично перетвориться на JSON завдяки JSON.stringify)
    await db.query(
      'INSERT INTO tests (title, description, xp_reward, questions) VALUES ($1, $2, $3, $4)',
      [title, description, xpReward, JSON.stringify(questions)]
    );

    res.json({ message: 'Test successfully added!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add test' });
  }
});

// 3. Завершити тест і отримати XP
router.post('/:id/complete', auth, async (req, res) => {
  const userId = req.user.id;
  const { score, maxScore } = req.body;

  if (score >= Math.ceil(maxScore / 2)) {
    try {
      // Дістаємо нагороду за цей конкретний тест
      const testCheck = await db.query('SELECT xp_reward FROM tests WHERE id = $1', [req.params.id]);
      const reward = testCheck.rows.length > 0 ? testCheck.rows[0].xp_reward : 50;

      const profile = await db.query('SELECT xp, level FROM profiles WHERE user_id = $1', [userId]);
      let { xp, level } = profile.rows[0];
      
      xp += reward; 
      if (xp >= 100) {
        level += Math.floor(xp / 100); 
        xp = xp % 100; 
      }

      await db.query('UPDATE profiles SET xp = $1, level = $2 WHERE user_id = $3', [xp, level, userId]);
      res.json({ message: `Тест успішно пройдено! Нараховано +${reward} XP.`, success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update XP' });
    }
  } else {
    res.json({ message: 'Тест не пройдено. Спробуйте ще раз!', success: false });
  }
});

module.exports = router;