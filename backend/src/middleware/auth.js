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

        // Load auth scope from the database so role/permission changes apply immediately.
        try {
            const user = await User.findById(decoded.userId).select('role faculty permissions').lean();
            req.role = user?.role || decoded.role;
            req.faculty = user ? (user.faculty || null) : null;
            req.roles = Array.from(new Set([
                ...(req.role ? [req.role] : []),
                ...(Array.isArray(user?.permissions) ? user.permissions : []),
            ].filter(Boolean)));
        } catch {
            req.role = decoded.role;
            req.faculty = null; // non-fatal
            req.roles = Array.isArray(decoded.roles)
                ? decoded.roles
                : decoded.role
                ? [decoded.role]
                : [];
        }

        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token invalid or expired' });
    }
};