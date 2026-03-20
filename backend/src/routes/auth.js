const express = require('express');
const jwt = require('jsonwebtoken');
const {getUserByEmail , listRoles} = require('../repos');
const router = express.Router();

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (!user){
        return res.status(401).json({ message: 'Invalid email or password' });
    }
    const roles = await listRoles(user.id);

    const token = jwt.sign(
        { userId: user.userId, roles }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
    );
    res.json({ token });
});

module.exports = router;    
