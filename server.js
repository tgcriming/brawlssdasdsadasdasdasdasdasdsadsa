const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
app.use(express.json());

// Раздаем статику из папки public (index.html, style.css, script.js)
app.use(express.static(path.join(__dirname, 'public')));

// ===== ФУНКЦИЯ ЗАПУСКА PYTHON БОТА =====
function startTelegramBot() {
    // В зависимости от сервера команда может быть 'python' или 'python3'
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    console.log(`🚀 Запуск бота: ${pythonCmd} bot.py...`);
    
    const botProcess = spawn(pythonCmd, ['bot.py']);

    // Вывод обычных логов из bot.py в консоль сервера
    botProcess.stdout.on('data', (data) => {
        console.log(`[BOT]: ${data.toString().trim()}`);
    });

    // Вывод ошибок из bot.py
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

// ===== РОУТЫ И ЗАПУСК СЕРВЕРА =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Сервер запущен на порту ${PORT}`);
});
