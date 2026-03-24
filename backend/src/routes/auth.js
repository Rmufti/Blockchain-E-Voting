const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { connectDB } = require('../db');

require('dotenv').config();

const router = express.Router();

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const db = await connectDB();

    // Find user
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Roles (IMPORTANT: must be array for middleware)
    const roles = [user.role];

    // Create token
    const token = jwt.sign(
      {
        userId: user._id,
        roles,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.fullName,
      },
      role: user.role, // frontend uses this
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;