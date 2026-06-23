require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const Room = require('./models/Room');

connectDB();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
    ws.currentRoom = null;
    ws.currentUser = null;

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            switch(message.type) {
                case 'join': {
                    const room = await Room.findOne({ roomId: message.roomId });
                    if (!room) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Комната не найдена' }));
                        return;
                    }
                    await Room.updateOne({ roomId: message.roomId }, { lastActive: new Date() });
                    ws.currentRoom = message.roomId;
                    ws.currentUser = message.user;
                    ws.send(JSON.stringify({ type: 'joined', roomId: ws.currentRoom, user: ws.currentUser }));
                    broadcastToRoom(ws.currentRoom, { type: 'user_joined', user: ws.currentUser }, ws);
                    break;
                }
                case 'chat_message': {
                    if (ws.currentRoom) {
                        broadcastToRoom(ws.currentRoom, {
                            type: 'chat_message',
                            message: message.message,
                            user: ws.currentUser,
                            timestamp: new Date().toISOString()
                        });
                    }
                    break;
                }
                case 'typing': {
                    if (ws.currentRoom) {
                        broadcastToRoom(ws.currentRoom, {
                            type: 'typing',
                            language: message.language,
                            user: ws.currentUser,
                            isTyping: message.isTyping
                        }, ws);
                    }
                    break;
                }
                case 'code_update': {
                    if (ws.currentRoom) {
                        await Room.findOneAndUpdate(
                            { roomId: ws.currentRoom },
                            { $set: { [`code.${message.language}`]: message.code }, lastActive: new Date() }
                        );
                        // Рассылаем всем, кроме отправителя
                        broadcastToRoom(ws.currentRoom, {
                            type: 'code_update',
                            language: message.language,
                            code: message.code,
                            userId: ws.currentUser?.id
                        }, ws);
                    }
                    break;
                }
                case 'cursor_update': {
                    if (ws.currentRoom) {
                        broadcastToRoom(ws.currentRoom, {
                            type: 'cursor_update',
                            language: message.language,
                            position: message.position,
                            user: ws.currentUser
                        }, ws);
                    }
                    break;
                }
                case 'leave_room': {
                    if (ws.currentRoom && ws.currentUser) {
                        broadcastToRoom(ws.currentRoom, { type: 'user_left', user: ws.currentUser }, ws);
                        await Room.findOneAndUpdate(
                            { roomId: ws.currentRoom },
                            { $pull: { users: { user: ws.currentUser.id } } }
                        );
                    }
                    break;
                }
                case 'heartbeat': {
                    ws.ping();
                    break;
                }
            }
        } catch (error) {
            console.error('Ошибка WebSocket:', error);
        }
    });

    ws.on('close', async () => {
        if (ws.currentRoom && ws.currentUser) {
            broadcastToRoom(ws.currentRoom, { type: 'user_left', user: ws.currentUser });
            await Room.findOneAndUpdate(
                { roomId: ws.currentRoom },
                { $pull: { users: { user: ws.currentUser.id } } }
            );
        }
    });
});

function broadcastToRoom(roomId, message, excludeWs = null) {
    wss.clients.forEach(client => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN && client.currentRoom === roomId) {
            client.send(JSON.stringify(message));
        }
    });
}

server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    if (pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});