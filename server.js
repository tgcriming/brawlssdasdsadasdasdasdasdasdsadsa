const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

const app = express();
app.use(express.json());

// Раздаем статику из папки public
app.use(express.static(path.join(__dirname, 'public')));

// ===== ЭНДПОИНТ ДЛЯ ПИНГА =====
app.get('/ping', (req, res) => {
    res.status(200).send('OK');
});

// ===== ФУНКЦИЯ ЗАПУСКА PYTHON БОТА =====
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

startTelegramBot();

// ===== ВНУТРЕННИЙ АВТО-ПИНГ (Каждые 10 минут) =====
// Render автоматически передает переменную RENDER_EXTERNAL_URL
const SITE_URL = process.env.RENDER_EXTERNAL_URL;

if (SITE_URL) {
    setInterval(() => {
        const client = SITE_URL.startsWith('https') ? https : http;
        client.get(`${SITE_URL}/ping`, (res) => {
            console.log(`[KEEP-ALIVE]: Пинг отправлен (${res.statusCode})`);
        }).on('error', (err) => {
            console.error(`[KEEP-ALIVE ERROR]: ${err.message}`);
        });
    }, 10 * 60 * 1000); // 10 минут (10 * 60 * 1000 мс)
}

// ===== ЗАПУСК СЕРВЕРА =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Сервер запущен на порту ${PORT}`);
});
