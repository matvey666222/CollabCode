const express = require('express');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/', protect, async (req, res) => {
    try {
        const roomId = Math.random().toString(36).substring(2, 10);
        const code = req.body.code || {
            html: `<div class="container">\n    <h1>Добро пожаловать в CollabCode!</h1>\n    <p>Начните писать код вместе с друзьями</p>\n    <button onclick="alert('Привет от CollabCode!')">Нажми меня</button>\n</div>`,
            css: `.container {\n    text-align: center;\n    padding: 50px;\n    font-family: system-ui;\n    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n    color: white;\n    border-radius: 10px;\n}\nbutton {\n    background: white;\n    border: none;\n    padding: 10px 20px;\n    border-radius: 5px;\n    cursor: pointer;\n}`,
            js: `console.log('CollabCode готов к работе!');`
        };
        const room = await Room.create({ roomId, createdBy: req.user._id, code });
        res.status(201).json({ roomId: room.roomId });
    } catch (err) { res.status(500).json({ message: 'Ошибка создания комнаты' }); }
});

router.get('/:roomId', protect, async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId }).populate('users.user', 'name color');
        if (!room) return res.status(404).json({ message: 'Комната не найдена' });
        res.json({ roomId: room.roomId, code: room.code, users: room.users.map(u => ({ id: u.user._id, name: u.user.name, color: u.user.color })), createdBy: room.createdBy });
    } catch (err) { res.status(500).json({ message: 'Ошибка сервера' }); }
});

router.post('/:roomId/join', protect, async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) return res.status(404).json({ message: 'Комната не найдена' });
        if (!room.users.some(u => u.user.toString() === req.user._id.toString())) {
            room.users.push({ user: req.user._id });
            await room.save();
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ message: 'Ошибка сервера' }); }
});

router.post('/:roomId/leave', protect, async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) return res.status(404).json({ message: 'Комната не найдена' });
        room.users = room.users.filter(u => u.user.toString() !== req.user._id.toString());
        await room.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ message: 'Ошибка сервера' }); }
});

// Новый маршрут для ручного сохранения
router.put('/:roomId/save', protect, async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) return res.status(404).json({ message: 'Комната не найдена' });
        room.code = req.body.code;
        room.lastActive = new Date();
        await room.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ message: 'Ошибка сервера' }); }
});

module.exports = router;