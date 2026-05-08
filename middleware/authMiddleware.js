const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // Дозволяємо формат "Bearer token_string" або просто "token_string"
  const token = authHeader && authHeader.split(' ')[1] || authHeader;

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Зберігаємо ID юзера (req.user.id)
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};