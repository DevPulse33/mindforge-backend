const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  try {
    let result = await db.query(
      `SELECT p.username, p.level, p.xp, p.avatar_url, u.role 
       FROM profiles p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      await db.query(
        'INSERT INTO profiles (user_id, username, level, xp, avatar_url) VALUES ($1, $2, $3, $4, $5)',
        [userId, `Student_${userId}`, 1, 0, '']
      );
      result = await db.query(
        `SELECT p.username, p.level, p.xp, p.avatar_url, u.role 
         FROM profiles p JOIN users u ON p.user_id = u.id WHERE p.user_id = $1`,
        [userId]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/update', auth, async (req, res) => {
  const userId = req.user.id;
  const { username, avatar_url } = req.body;
  try {
    await db.query('UPDATE profiles SET username = $1, avatar_url = $2 WHERE user_id = $3', [username, avatar_url || '', userId]);
    res.json({ message: 'Profile updated' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/leaderboard', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT username, level, xp, avatar_url 
      FROM profiles 
      ORDER BY level DESC, xp DESC 
      LIMIT 10
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;