const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

const app = express();

// Мидлвар для работы с JSON
app.use(express.json());

// 1. Раздаем статические файлы из папки public (style.css, script.js и т.д.)
app.use(express.static(path.join(__dirname, 'public')));

// 2. Явно отдаем index.html при заходе на корень сайта /
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 3. Эндпоинт для пинга (чтобы сервер и бот не засыпали)
app.get('/ping', (req, res) => {
    res.status(200).send('OK');
});

// ===== ФУНКЦИЯ ЗАПУСКА И МОНИТОРИНГА PYTHON БОТА =====
function startTelegramBot() {
    // На Windows используется 'python', на Linux (Render/Koyeb) — 'python3'
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    console.log(`🚀 Запуск бота: ${pythonCmd} bot.py...`);

    const botProcess = spawn(pythonCmd, ['bot.py']);

    // Вывод стандартных логов из bot.py в консоль сервера
    botProcess.stdout.on('data', (data) => {
        console.log(`[BOT]: ${data.toString().trim()}`);
    });

    // Вывод логов ошибок из bot.py
    botProcess.stderr.on('data', (data) => {
        console.error(`[BOT ERROR]: ${data.toString().trim()}`);
    });

    // Если бот упал или закрылся — перезапускаем через 3 секунды
    botProcess.on('close', (code) => {
        console.log(`[BOT] Процесс завершился с кодом ${code}`);
        console.log('🔄 Перезапуск бота через 3 секунды...');
        setTimeout(startTelegramBot, 3000);
    });
}

// Запускаем бота
startTelegramBot();

// ===== ВНУТРЕННИЙ АВТО-ПИНГ (Каждые 10 минут) =====
// Render автоматически передает адрес вашего сайта в переменную RENDER_EXTERNAL_URL
const SITE_URL = process.env.RENDER_EXTERNAL_URL;

if (SITE_URL) {
    setInterval(() => {
        const client = SITE_URL.startsWith('https') ? https : http;
        client.get(`${SITE_URL}/ping`, (res) => {
            console.log(`[KEEP-ALIVE]: Пинг отправлен (${res.statusCode})`);
        }).on('error', (err) => {
            console.error(`[KEEP-ALIVE ERROR]: ${err.message}`);
        });
    }, 10 * 60 * 1000); // 10 минут
}

// ===== ЗАПУСК СЕРВЕРА =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Сервер запущен на порту ${PORT}`);
});
