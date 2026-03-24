const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

// Example: create election
router.post("/elections", authMiddleware, adminOnly, async (req, res) => {
    const { title } = req.body;

    // later connect to DB
    res.json({ message: "Election created", title });
});

// Example: view results
router.get("/results", authMiddleware, adminOnly, async (req, res) => {
    res.json({ message: "Admin results here" });
});

module.exports = router;