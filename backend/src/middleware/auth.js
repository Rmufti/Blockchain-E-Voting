// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../db');
require('dotenv').config();

module.exports = async function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1]; // 'Bearer <token>'

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        req.userId = decoded.userId;
        req.role = decoded.role;
        req.roles = Array.isArray(decoded.roles)
            ? decoded.roles
            : decoded.role
            ? [decoded.role]
            : [];

        // Attach faculty so election routes can filter by it
        // We look it up fresh each request so it's always current
        try {
            const user = await User.findById(decoded.userId).select('faculty').lean();
            req.faculty = user ? (user.faculty || null) : null;
        } catch {
            req.faculty = null; // non-fatal
        }

        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token invalid or expired' });
    }
};