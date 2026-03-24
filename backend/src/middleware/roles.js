function requireRole(role) {
  return (req, res, next) => {
    if (!req.roles || !req.roles.includes(role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

module.exports = requireRole;