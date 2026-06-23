const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
        const user = await User.create({ name, email, password });
        res.status(201).json({
            _id: user._id, name: user.name, email: user.email, color: user.color,
            token: generateToken(user._id)
        });
    } catch (err) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id, name: user.name, email: user.email, color: user.color,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Неверный email или пароль' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/me', protect, async (req, res) => {
    res.json(req.user);
});

module.exports = router;