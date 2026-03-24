module.exports = function adminOnly(req, res, next) {
    if (req.roles !== "admin") {
        return res.status(403).json({ message: "Admins only" });
    }
    next();
};