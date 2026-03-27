function requireRole(...allowedRoles) {
  const rolesList = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;

  return (req, res, next) => {
    if (!req.roles || !req.roles.some((role) => rolesList.includes(role))) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

module.exports = requireRole;