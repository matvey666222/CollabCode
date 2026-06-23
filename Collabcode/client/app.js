let ws, currentRoom, currentUser, token;
let editors = { html: null, css: null, js: null };
let monacoLoaded = false;
let isUpdatingFromServer = false;
let currentTheme = 'vs-dark';
let isMobileView = false;
let isLandscape = false;
let cursorDecorations = {};
let typingTimeouts = {};
let lastUpdateTime = 0;
let heartbeatInterval;
let prevHtml = '', prevCss = '', prevJs = '';

const PROJECT_TEMPLATES = {
    default: {
        html: `<div class="container">\n    <h1>Добро пожаловать в CollabCode!</h1>\n    <p>Начните писать код вместе с друзьями</p>\n    <button onclick="alert('Привет от CollabCode!')">Нажми меня</button>\n</div>`,
        css: `.container {\n    text-align: center;\n    padding: 50px;\n    font-family: system-ui;\n    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n    color: white;\n    border-radius: 10px;\n}\nbutton {\n    background: white;\n    border: none;\n    padding: 10px 20px;\n    border-radius: 5px;\n    cursor: pointer;\n}`,
        js: `// Ваш JavaScript код`
    },
    'todo-list': {
        html: `<div class="todo-container">\n  <h2>Мои задачи</h2>\n  <div class="todo-input-row">\n    <input id="todo-input" placeholder="Что нужно сделать?" />\n    <button id="add-btn">Добавить</button>\n  </div>\n  <ul id="todo-list"></ul>\n</div>`,
        css: `body { font-family: sans-serif; background: #f4f4f4; display: flex; justify-content: center; padding-top: 50px; }\n.todo-container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 300px; }\nh2 { text-align: center; }\n.todo-input-row { display: flex; gap: 5px; margin-bottom: 15px; }\n#todo-input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 5px; }\n#add-btn { background: #3b82f6; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; }\nul { list-style: none; padding: 0; }\nli { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 1px solid #eee; }\nli span { cursor: pointer; }\nli span.done { text-decoration: line-through; color: #888; }\n.del-btn { background: #e74c3c; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; line-height: 1; cursor: pointer; }`,
        js: `// JS для Todo List\nconst input = document.getElementById('todo-input');\nconst addBtn = document.getElementById('add-btn');\nconst list = document.getElementById('todo-list');\n\naddBtn.onclick = () => {\n  const text = input.value.trim();\n  if (!text) return;\n  const li = document.createElement('li');\n  li.innerHTML = '<span>' + text + '</span> <button class="del-btn">✖</button>';\n  li.querySelector('span').onclick = () => li.classList.toggle('done');\n  li.querySelector('.del-btn').onclick = () => li.remove();\n  list.appendChild(li);\n  input.value = '';\n};`
    },
    'profile-card': {
        html: `<div class="profile-card">\n  <img src="https://i.pravatar.cc/150" alt="Аватар" />\n  <h2>Анна Иванова</h2>\n  <p>Frontend-разработчик</p>\n  <button>Написать</button>\n</div>`,
        css: `body { background: #f0f0f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: sans-serif; }\n.profile-card { background: white; border-radius: 16px; padding: 30px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }\n.profile-card img { border-radius: 50%; width: 100px; height: 100px; object-fit: cover; margin-bottom: 15px; }\nh2 { margin: 0 0 5px; color: #333; }\np { color: #666; margin-bottom: 20px; }\nbutton { background: #3b82f6; color: white; border: none; padding: 10px 25px; border-radius: 8px; font-size: 14px; cursor: pointer; }`,
        js: `// Карточка профиля\nconsole.log('Профиль загружен');`
    },
    'animated-gradient': {
        html: `<div class="animated-bg"></div>`,
        css: `body { margin: 0; overflow: hidden; background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); }\n.animated-bg { position: absolute; width: 100%; height: 100%; }\n.circle { position: absolute; border-radius: 50%; opacity: 0.6; animation: float 8s infinite ease-in-out; }\n@keyframes float {\n  0% { transform: translateY(0) scale(1); }\n  50% { transform: translateY(-30px) scale(1.1); }\n  100% { transform: translateY(0) scale(1); }\n}`,
        js: `// Анимированный фон с движущимися кругами\nconst container = document.querySelector('.animated-bg');\nconst colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'];\n\nfor (let i = 0; i < 20; i++) {\n  const circle = document.createElement('div');\n  circle.className = 'circle';\n  const size = Math.random() * 100 + 50;\n  circle.style.width = size + 'px';\n  circle.style.height = size + 'px';\n  circle.style.background = colors[Math.floor(Math.random() * colors.length)];\n  circle.style.left = Math.random() * 100 + '%';\n  circle.style.top = Math.random() * 100 + '%';\n  circle.style.animationDuration = (Math.random() * 10 + 5) + 's';\n  circle.style.animationDelay = (Math.random() * 5) + 's';\n  container.appendChild(circle);\n}`
    }
};

require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
require(['vs/editor/editor.main'], () => {
    monacoLoaded = true;
    hideLoadingOverlay();
    if (currentRoom) initMonacoEditors();
});

document.addEventListener('DOMContentLoaded', () => {
    showLoadingOverlay();

    // === ЛЕНДИНГ ===
    const landing = document.getElementById('landingScreen');
    const startBtn = document.getElementById('startBtn');
    const agreementLink = document.getElementById('showAgreementBtn');
    const agreementModal = document.getElementById('agreementModal');

    startBtn.addEventListener('click', () => {
        landing.classList.remove('active');
        showAuthScreen();
    });

    agreementLink.addEventListener('click', (e) => {
        e.preventDefault();
        agreementModal.style.display = 'flex';
    });

    window.closeAgreement = () => {
        agreementModal.style.display = 'none';
    };

    // Проверка токена
    token = localStorage.getItem('token');
    if (token) {
        fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json())
            .then(user => {
                if (user._id) { currentUser = user; showRoomScreen(); }
                else { localStorage.removeItem('token'); showAuthScreen(); }
            })
            .catch(() => { localStorage.removeItem('token'); showAuthScreen(); });
    }

    // Обработчики форм
    document.getElementById('loginTabBtn').addEventListener('click', () => switchTab('login'));
    document.getElementById('registerTabBtn').addEventListener('click', () => switchTab('register'));
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('createRoomBtn').addEventListener('click', createRoom);
    document.getElementById('joinRoomBtn').addEventListener('click', joinRoom);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('shareBtn').addEventListener('click', shareRoom);
    document.getElementById('leaveBtn').addEventListener('click', leaveRoom);
    document.getElementById('downloadBtn').addEventListener('click', downloadProject);
    document.getElementById('saveBtn').addEventListener('click', manualSave);
    document.getElementById('newRoomBtn').addEventListener('click', showRoomScreen);
    document.getElementById('chatToggle').addEventListener('click', toggleChat);
    document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);
    document.getElementById('formatBtn').addEventListener('click', formatCurrentEditor);
    document.getElementById('themeBtn').addEventListener('click', toggleTheme);
    document.getElementById('toggleSettingsBtn').addEventListener('click', toggleSettings);
    document.getElementById('settingsThemeBtn').addEventListener('click', toggleTheme);
    document.getElementById('chatInput').addEventListener('keypress', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
    });
    document.querySelectorAll('.editor-tab').forEach(tab => {
        tab.addEventListener('click', () => switchEditor(tab.dataset.language));
    });

    // Автоудаление решётки при вставке в поле ID комнаты
    document.getElementById('roomIdInput').addEventListener('paste', (e) => {
        e.preventDefault();
        let text = (e.clipboardData || window.clipboardData).getData('text');
        if (text.startsWith('#')) text = text.slice(1);
        document.getElementById('roomIdInput').value = text;
    });

    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'console') {
            const logContainer = document.getElementById('consoleOutput');
            if (logContainer) {
                const msg = document.createElement('div');
                msg.className = 'console-log ' + (e.data.method === 'log' ? 'info' : e.data.method);
                msg.textContent = e.data.args.join(' ');
                logContainer.appendChild(msg);
                logContainer.scrollTop = logContainer.scrollHeight;
            }
        }
    });

    // Resizer
    const resizer = document.getElementById('resizer');
    const sidePanel = document.getElementById('sidePanel');
    let isResizing = false, startX = 0, startWidth = 0;
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true; startX = e.clientX; startWidth = sidePanel.offsetWidth;
        document.body.classList.add('no-select'); resizer.classList.add('active');
    });
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        let newWidth = startWidth + (startX - e.clientX);
        if (newWidth < 250) newWidth = 250;
        if (newWidth > 600) newWidth = 600;
        sidePanel.style.width = newWidth + 'px';
        if (editors.html) { editors.html.layout(); editors.css.layout(); editors.js.layout(); }
    });
    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.classList.remove('no-select'); resizer.classList.remove('active');
    });
});

// Вспомогательные функции
function showLoadingOverlay() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.add('active');
}
function hideLoadingOverlay() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.remove('active');
}
function showNotification(title, message, duration = 4000) {
    const container = document.getElementById('notificationContainer');
    const notif = document.createElement('div'); notif.className = 'notification';
    notif.innerHTML = `<strong>${title}</strong>: ${message}`;
    container.appendChild(notif);
    setTimeout(() => notif.remove(), duration);
}

function showAuthScreen() {
    document.getElementById('landingScreen')?.classList.remove('active');
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('roomScreen').style.display = 'none';
    document.getElementById('mainInterface').style.display = 'none';
    document.getElementById('settingsPanel').style.display = 'none';
}
function showRoomScreen() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('roomScreen').style.display = 'flex';
    document.getElementById('mainInterface').style.display = 'none';
    document.getElementById('settingsPanel').style.display = 'none';
    document.getElementById('userNameDisplay').textContent = currentUser?.name || 'Гость';
}
function showMainScreen() {
    document.getElementById('roomScreen').style.display = 'none';
    const main = document.getElementById('mainInterface');
    main.style.display = 'flex';
    main.classList.add('active');
    document.getElementById('settingsPanel').style.display = 'none';
}
function switchTab(tab) {
    document.getElementById('loginTabBtn').classList.toggle('active', tab === 'login');
    document.getElementById('registerTabBtn').classList.toggle('active', tab === 'register');
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

// Авторизация
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            currentUser = data;
            showRoomScreen();
        } else errEl.textContent = data.message || 'Ошибка';
    } catch { errEl.textContent = 'Ошибка сети'; }
}
async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errEl = document.getElementById('registerError');
    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            currentUser = data;
            showRoomScreen();
        } else errEl.textContent = data.message || 'Ошибка';
    } catch { errEl.textContent = 'Ошибка сети'; }
}
function logout() {
    localStorage.removeItem('token');
    currentUser = null; token = null;
    if (ws) ws.close();
    clearInterval(heartbeatInterval);
    showAuthScreen();
}

// Комнаты
async function createRoom() {
    const template = document.getElementById('templateSelect')?.value || 'default';
    const roomCode = PROJECT_TEMPLATES[template] || PROJECT_TEMPLATES.default;
    try {
        const res = await fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: roomCode })
        });
        const data = await res.json();
        if (res.ok) { currentRoom = data.roomId; joinRoomWS(currentRoom); }
        else document.getElementById('roomError').textContent = data.message || 'Ошибка';
    } catch { document.getElementById('roomError').textContent = 'Ошибка сети'; }
}
async function joinRoom() {
    let roomId = document.getElementById('roomIdInput').value.trim();
    if (roomId.startsWith('#')) roomId = roomId.slice(1);
    if (!roomId) { document.getElementById('roomError').textContent = 'Введите ID'; return; }
    try {
        const res = await fetch(`/api/rooms/${roomId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) { currentRoom = roomId; joinRoomWS(currentRoom); }
        else document.getElementById('roomError').textContent = 'Комната не найдена';
    } catch { document.getElementById('roomError').textContent = 'Ошибка сети'; }
}
function joinRoomWS(roomId) {
    showMainScreen();
    document.getElementById('roomIdDisplay').textContent = roomId;
    window.history.pushState({}, '', `?room=${roomId}`);
    connectWebSocket(roomId);
}

// WebSocket
function connectWebSocket(roomId) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${location.host}/ws`);
    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', roomId, user: { id: currentUser._id, name: currentUser.name, color: currentUser.color } }));
        fetch(`/api/rooms/${roomId}/join`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
        startHeartbeat();
        showNotification('Подключение', 'Соединение установлено');
    };
    ws.onmessage = e => {
        const data = JSON.parse(e.data);
        if (data.type === 'joined') loadRoomData(roomId);
        else if (data.type === 'user_joined') { addSystemMsg(`${data.user.name} присоединился`); updateUsersList(); }
        else if (data.type === 'user_left') { addSystemMsg(`${data.user.name} покинул комнату`); updateUsersList(); }
        else if (data.type === 'chat_message') addChatMsg(data.message, data.user, data.timestamp);
        else if (data.type === 'code_update') handleCodeUpdate(data.language, data.code);
        else if (data.type === 'cursor_update') handleCursorUpdate(data);
        else if (data.type === 'typing') showTypingIndicator(data.language, data.user.name, data.isTyping);
    };
    ws.onclose = () => {
        clearInterval(heartbeatInterval);
        showNotification('Соединение потеряно', 'Попытка переподключения...');
        setTimeout(() => { if (currentRoom) connectWebSocket(currentRoom); }, 3000);
    };
}
function startHeartbeat() {
    clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'heartbeat' })); }, 30000);
}

// Загрузка данных комнаты
async function loadRoomData(roomId) {
    try {
        const res = await fetch(`/api/rooms/${roomId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const room = await res.json();
        if (!monacoLoaded) {
            await new Promise(resolve => {
                const check = setInterval(() => { if (monacoLoaded) { clearInterval(check); resolve(); } }, 100);
            });
        }
        initMonacoEditors();
        if (room.code) {
            isUpdatingFromServer = true;
            editors.html?.setValue(room.code.html || '');
            editors.css?.setValue(room.code.css || '');
            editors.js?.setValue(room.code.js || '');
            isUpdatingFromServer = false;
            prevHtml = editors.html?.getValue() || '';
            prevCss = editors.css?.getValue() || '';
            prevJs = editors.js?.getValue() || '';
        }
        updateUsersList();
        updatePreview();
    } catch (e) { console.error(e); }
}

// Инициализация Monaco
function initMonacoEditors() {
    if (editors.html) return;
    const savedFontSize = localStorage.getItem('editorFontSize') || 14;
    const initialFontSize = parseInt(savedFontSize);
    document.getElementById('fontSizeValue').textContent = initialFontSize + 'px';
    const commonOpts = {
        theme: currentTheme, fontSize: initialFontSize, fontFamily: 'Fira Code, monospace',
        minimap: { enabled: false }, automaticLayout: true, scrollBeyondLastLine: false, wordWrap: 'on'
    };
    editors.html = monaco.editor.create(document.getElementById('htmlEditor'), { ...commonOpts, language: 'html' });
    editors.css  = monaco.editor.create(document.getElementById('cssEditor'), { ...commonOpts, language: 'css' });
    editors.js   = monaco.editor.create(document.getElementById('jsEditor'), { ...commonOpts, language: 'javascript' });

    editors.html.onDidChangeModelContent(() => {
        const cur = editors.html.getValue();
        if (cur !== prevHtml) { sendCodeUpdate('html'); sendTyping('html', true); prevHtml = cur; }
    });
    editors.css.onDidChangeModelContent(() => {
        const cur = editors.css.getValue();
        if (cur !== prevCss) { sendCodeUpdate('css'); sendTyping('css', true); prevCss = cur; }
    });
    editors.js.onDidChangeModelContent(() => {
        const cur = editors.js.getValue();
        if (cur !== prevJs) { sendCodeUpdate('js'); sendTyping('js', true); prevJs = cur; }
    });

    editors.html.onDidChangeCursorPosition(e => sendCursorUpdate('html', e));
    editors.css.onDidChangeCursorPosition(e => sendCursorUpdate('css', e));
    editors.js.onDidChangeCursorPosition(e => sendCursorUpdate('js', e));

    switchEditor('html');
    updatePreview();
}

function sendCodeUpdate(language) {
    if (isUpdatingFromServer || !ws || ws.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    if (now - lastUpdateTime < 500) return;
    lastUpdateTime = now;
    ws.send(JSON.stringify({ type: 'code_update', language, code: editors[language].getValue() }));
    updatePreview();
}
function sendCursorUpdate(language, position) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'cursor_update', language, position: { lineNumber: position.lineNumber, column: position.column }, user: currentUser }));
}
function handleCursorUpdate(data) {
    if (data.user.id === currentUser._id) return;
    const editor = editors[data.language];
    if (!editor) return;
    const oldDecorations = cursorDecorations[data.user.id] || [];
    const decorations = [];
    if (data.position) {
        decorations.push({
            range: new monaco.Range(data.position.lineNumber, data.position.column, data.position.lineNumber, data.position.column),
            options: { className: 'remote-cursor', hoverMessage: { value: data.user.name }, after: { content: data.user.name, inlineClassName: 'remote-cursor-label' } }
        });
    }
    cursorDecorations[data.user.id] = editor.deltaDecorations(oldDecorations, decorations);
}
function handleCodeUpdate(language, code) {
    if (!editors[language]) return;
    if (editors[language].getValue() === code) return;
    isUpdatingFromServer = true;
    editors[language].setValue(code);
    isUpdatingFromServer = false;
    updatePreview();
    if (language === 'html') prevHtml = code;
    else if (language === 'css') prevCss = code;
    else prevJs = code;
}
function switchEditor(language) {
    document.getElementById('htmlEditor').classList.toggle('active', language === 'html');
    document.getElementById('cssEditor').classList.toggle('active', language === 'css');
    document.getElementById('jsEditor').classList.toggle('active', language === 'js');
    document.querySelectorAll('.editor-tab').forEach(t => t.classList.toggle('active', t.dataset.language === language));
    const editor = editors[language];
    if (editor) setTimeout(() => { editor.layout(); editor.focus(); }, 50);
}
function updatePreview() {
    const html = editors.html?.getValue() || '';
    const css = editors.css?.getValue() || '';
    const js = editors.js?.getValue() || '';
    const consoleOutput = document.getElementById('consoleOutput');
    if (consoleOutput) consoleOutput.innerHTML = '';
    const consoleCapture = `(function(){var m=['log','error','warn','info'];m.forEach(function(x){var o=console[x];console[x]=function(){o.apply(console,arguments);window.parent.postMessage({type:'console',method:x,args:Array.prototype.map.call(arguments,String)},'*');};});})();`;
    document.getElementById('previewFrame').srcdoc = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}<script>${consoleCapture}${js}<\/script></body></html>`;
}
function formatCurrentEditor() {
    const lang = document.querySelector('.editor-tab.active')?.dataset.language;
    if (lang && editors[lang]) editors[lang].getAction('editor.action.formatDocument').run();
}
function toggleTheme() {
    currentTheme = currentTheme === 'vs-dark' ? 'vs' : 'vs-dark';
    if (editors.html) monaco.editor.setTheme(currentTheme);
    document.getElementById('themeBtn').innerHTML = currentTheme === 'vs-dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}
function toggleOrientation() { isLandscape = !isLandscape; document.getElementById('previewFrame').classList.toggle('landscape', isLandscape); }
function toggleDevice() { isMobileView = !isMobileView; document.getElementById('previewFrame').classList.toggle('mobile', isMobileView); }
function downloadProject() {
    const zip = new JSZip();
    zip.file('index.html', editors.html?.getValue() || '');
    zip.file('styles.css', editors.css?.getValue() || '');
    zip.file('script.js', editors.js?.getValue() || '');
    zip.generateAsync({ type: 'blob' }).then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'collabcode-project.zip'; a.click(); });
}

// Чат
function sendChatMessage() {
    const msg = document.getElementById('chatInput').value.trim();
    if (msg && ws?.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ type: 'chat_message', message: msg })); document.getElementById('chatInput').value = ''; }
}
function addChatMsg(msg, user, ts) {
    const c = document.getElementById('chatMessages');
    const d = document.createElement('div'); d.className = 'message';
    d.innerHTML = `<div class="message-avatar" style="background:${user.color}">${user.name[0]}</div><div class="message-content"><div class="message-user">${user.name}</div><div class="message-text">${msg}</div><div class="message-time">${new Date(ts).toLocaleTimeString()}</div></div>`;
    c.appendChild(d); c.scrollTop = c.scrollHeight;
}
function addSystemMsg(text) {
    const c = document.getElementById('chatMessages'); const d = document.createElement('div'); d.className = 'system-message'; d.textContent = text;
    c.appendChild(d); c.scrollTop = c.scrollHeight;
}
function toggleChat() { document.querySelector('.chat-section').classList.toggle('collapsed'); }

async function updateUsersList() {
    if (!currentRoom) return;
    try {
        const res = await fetch(`/api/rooms/${currentRoom}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const room = await res.json();
        const container = document.getElementById('usersList'); if (!container) return;
        container.innerHTML = '';
        if (room.users) room.users.forEach(u => {
            const avatar = document.createElement('div'); avatar.className = 'user-avatar'; avatar.style.background = u.color || '#3b82f6'; avatar.title = u.name; avatar.textContent = u.name.charAt(0);
            container.appendChild(avatar);
        });
    } catch (e) { console.error(e); }
}
function sendTyping(language, isTyping) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (typingTimeouts[language]) clearTimeout(typingTimeouts[language]);
    ws.send(JSON.stringify({ type: 'typing', language, isTyping: true }));
    typingTimeouts[language] = setTimeout(() => { ws.send(JSON.stringify({ type: 'typing', language, isTyping: false })); }, 1000);
}
function showTypingIndicator(language, userName, isTyping) {
    const ind = document.getElementById('typingIndicator');
    if (isTyping) { ind.textContent = `${userName} печатает в ${language.toUpperCase()}...`; setTimeout(() => { if (ind.textContent?.includes(userName)) ind.textContent = ''; }, 2000); }
    else ind.textContent = '';
}
function shareRoom() {
    const url = `${location.origin}${location.pathname}?room=${currentRoom}`;
    navigator.clipboard.writeText(url).then(() => alert('Ссылка скопирована!'));
}
async function leaveRoom() {
    if (ws) { ws.close(); }
    if (currentRoom) await fetch(`/api/rooms/${currentRoom}/leave`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    if (editors.html) { editors.html.dispose(); editors.css.dispose(); editors.js.dispose(); editors = {}; }
    clearInterval(heartbeatInterval);
    showRoomScreen();
}

async function manualSave() {
    if (!currentRoom || !token || !editors.html) return;
    try {
        const code = { html: editors.html.getValue(), css: editors.css.getValue(), js: editors.js.getValue() };
        const res = await fetch(`/api/rooms/${currentRoom}/save`, {
            method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ code })
        });
        if (res.ok) showNotification('✅ Сохранено', 'Код сохранён в облаке');
        else showNotification('Ошибка', 'Не удалось сохранить');
    } catch (e) { showNotification('Ошибка', 'Сетевая ошибка'); }
}

function changeFontSize(delta) {
    const current = parseInt(document.getElementById('fontSizeValue').textContent) || 14;
    let newSize = current + delta;
    if (newSize < 12) newSize = 12; if (newSize > 24) newSize = 24;
    document.getElementById('fontSizeValue').textContent = newSize + 'px';
    localStorage.setItem('editorFontSize', newSize);
    ['html','css','js'].forEach(lang => { if (editors[lang]) { editors[lang].updateOptions({ fontSize: newSize }); editors[lang].layout(); } });
}
function increaseFontSize() { changeFontSize(1); }
function decreaseFontSize() { changeFontSize(-1); }
function toggleSettings() { const panel = document.getElementById('settingsPanel'); panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; }

window.shareRoom = shareRoom;
window.leaveRoom = leaveRoom;
window.sendChatMessage = sendChatMessage;
window.refreshPreview = updatePreview;
window.toggleDevice = toggleDevice;
window.toggleOrientation = toggleOrientation;
window.downloadProject = downloadProject;
window.toggleSettings = toggleSettings;
window.increaseFontSize = increaseFontSize;
window.decreaseFontSize = decreaseFontSize;
window.toggleTheme = toggleTheme;