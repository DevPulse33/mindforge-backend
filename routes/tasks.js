const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/authMiddleware');

// Додати нове завдання
router.post('/add', auth, async (req, res) => {
  const { description } = req.body;
  try {
    await db.query('INSERT INTO tasks (user_id, description, status) VALUES ($1, $2, $3)', [req.user.id, description, 'pending']);
    res.status(201).json({ message: 'Task added' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Отримати свої завдання
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// [НОВЕ] Відправити завдання на перевірку
router.put('/:id/submit-for-review', auth, async (req, res) => {
  const { reflection_text, proof_url } = req.body;
  try {
    await db.query(
      "UPDATE tasks SET status = 'under_review', reflection_text = $1, proof_url = $2 WHERE id = $3 AND user_id = $4",
      [reflection_text, proof_url, req.params.id, req.user.id]
    );
    res.json({ message: 'Task submitted for review' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Відмінити (UNDO)
router.put('/:id/undo', auth, async (req, res) => {
  try {
    const task = await db.query('SELECT status FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (task.rows.length === 0 || task.rows[0].status === 'pending') return res.status(400).json({ message: 'Invalid state' });
    
    // Якщо завдання було підтверджено, треба відняти XP. Якщо просто було на перевірці - нічого не віднімаємо
    if (task.rows[0].status === 'completed') {
      const profile = await db.query('SELECT xp, level FROM profiles WHERE user_id = $1', [req.user.id]);
      let { xp, level } = profile.rows[0];
      xp -= 20;
      if (xp < 0) { if (level > 1) { level -= 1; xp = 100 + xp; } else { xp = 0; } }
      await db.query('UPDATE profiles SET xp = $1, level = $2 WHERE user_id = $3', [xp, level, req.user.id]);
    }
    
    await db.query("UPDATE tasks SET status = 'pending', reflection_text = '', proof_url = '' WHERE id = $1", [req.params.id]);
    res.json({ message: 'Undone' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ==========================================
// МАРШРУТИ ДЛЯ АДМІНІСТРАТОРА
// ==========================================

// Отримати всі завдання "на перевірці"
router.get('/admin/review-list', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*, p.username, p.avatar_url 
      FROM tasks t 
      JOIN profiles p ON t.user_id = p.user_id 
      WHERE t.status = 'under_review' 
      ORDER BY t.created_at ASC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Адмін: СХВАЛИТИ
router.put('/admin/:id/approve', auth, async (req, res) => {
  try {
    const taskResult = await db.query('SELECT user_id FROM tasks WHERE id = $1', [req.params.id]);
    if (taskResult.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    
    const taskOwnerId = taskResult.rows[0].user_id;

    await db.query("UPDATE tasks SET status = 'completed' WHERE id = $1", [req.params.id]);

    const profile = await db.query('SELECT xp, level FROM profiles WHERE user_id = $1', [taskOwnerId]);
    let { xp, level } = profile.rows[0];
    xp += 20;
    if (xp >= 100) { level += 1; xp -= 100; }
    
    await db.query('UPDATE profiles SET xp = $1, level = $2 WHERE user_id = $3', [xp, level, taskOwnerId]);
    res.json({ message: 'Approved' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Адмін: ВІДХИЛИТИ
router.put('/admin/:id/reject', auth, async (req, res) => {
  try {
    await db.query("UPDATE tasks SET status = 'pending' WHERE id = $1", [req.params.id]);
    res.json({ message: 'Rejected' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;