const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

const app = express();

// Мидлвар для работы с JSON
app.use(express.json());

// 1. Раздаем статические файлы из КОРНЯ проекта
app.use(express.static(__dirname));

// 2. Отдаем index.html из КОРНЯ проекта
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 3. Эндпоинт для пинга (защита от засыпания)
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

// Запускаем бота
startTelegramBot();

// ===== ВНУТРЕННИЙ АВТО-ПИНГ (Каждые 10 минут) =====
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
