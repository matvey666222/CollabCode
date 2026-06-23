const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    code: {
        html: { type: String, default: '' },
        css: { type: String, default: '' },
        js: { type: String, default: '' }
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    users: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, joinedAt: { type: Date, default: Date.now } }],
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', RoomSchema);