const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1]; // expects 'Bearer <token>'

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    req.userId = decoded.userId;
    req.role = decoded.role; // ✅ match what we send in login
    req.roles = Array.isArray(decoded.roles)
      ? decoded.roles
      : decoded.role
      ? [decoded.role]
      : [];
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};