// ==UserScript==
// @name         Farm Land Auto Quest & Ads Claim (100 Max) - Enhanced
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Покращена версія з виправленнями помилок та додатковими функціями
// @author       Volodymyr_Romanovych
// @match        https://farmy.live/*
// @grant        none
// @icon         https://raw.githubusercontent.com/Volodymyr-Romanovych/Farm/refs/heads/main/icon.jpg
// @downloadURL  https://github.com/Volodymyr-Romanovych/Farm/raw/refs/heads/main/user_enhanced.js
// @updateURL    https://github.com/Volodymyr-Romanovych/Farm/raw/refs/heads/main/user_enhanced.js
// @homepage     https://github.com/Volodymyr-Romanovych/Farm
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    let attempts = 0;
    const maxAttempts = 30;
    let isWatchingAd = false;
    let adWatchCount = 0;
    let totalAdWatches = 0;
    const MAX_TOTAL_ADS = 100;
    let isRunning = true;
    const MIN_DELAY = 11000;
    const MAX_DELAY = 20000;
    let lastAdTime = 0;
    let currentDelay = 0;
    let currentCycle = 0;
    let errorCount = 0;
    const MAX_ERRORS = 5;

    // Розширений словник для пошуку елементів
    const TEXT_PATTERNS = {
        quests: ['Задания', 'Завдання', 'Quests', 'Квести', 'Задачи'],
        claim: ['Забрать', 'Забрати', 'Claim', 'Получить', 'Отримати', 'Взяти', 'Собрать', 'Зібрати'],
        watchAd: ['Смотреть рекламу', 'Дивитись рекламу', 'Watch ad', 'Переглянути рекламу', 'Подивитись рекламу'],
        daily: ['Ежедневные', 'Щоденні', 'Daily', 'Основные', 'Основні', 'Щоденні завдання'],
        close: ['Закрыть', 'Закрити', 'Close', '×', 'X']
    };

    // Функція для безпечного пошуку тексту
    function matchesPattern(text, patterns) {
        const cleanText = (text || '').toString().trim().toLowerCase();
        return patterns.some(pattern => 
            cleanText.includes(pattern.toLowerCase())
        );
    }

    // Функція для отримання випадкової затримки
    function getRandomDelay() {
        return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
    }

    // Функція для безпечного кліку
    function safeClick(element) {
        try {
            if (element && element instanceof HTMLElement && 
                !element.disabled && 
                element.style.display !== 'none' &&
                element.offsetParent !== null) {
                
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.click();
                return true;
            }
        } catch (error) {
            console.error('Помилка при кліку:', error);
        }
        return false;
    }

    // Функція для очікування
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Перевірка безпеки
    function checkSafety() {
        // Перевірка на помилки
        const errorElements = document.querySelectorAll('.error, .warning, .alert, .ban-message, [class*="error"], [class*="warning"]');
        for (let element of errorElements) {
            const text = element.textContent || '';
            if (text.includes('бан') || text.includes('ban') || 
                text.includes('підозріла') || text.includes('suspicious') ||
                text.includes('блок') || text.includes('block')) {
                console.error('⚡ ВИЯВЛЕНО ПРОБЛЕМУ: ', text);
                stopAutoClaim();
                showNotification('Виявлено проблему! Скрипт зупинено.', 'error');
                return false;
            }
        }

        // Перевірка кількості помилок
        if (errorCount >= MAX_ERRORS) {
            console.error('Досягнуто максимальну кількість помилок');
            stopAutoClaim();
            showNotification('Забагато помилок! Скрипт зупинено.', 'error');
            return false;
        }

        return true;
    }

    function canWatchAd() {
        if (!isRunning || isWatchingAd) return false;
        if (totalAdWatches >= MAX_TOTAL_ADS) return false;
        if (lastAdTime === 0) return true;
        
        const timeSinceLastAd = Date.now() - lastAdTime;
        return timeSinceLastAd >= currentDelay;
    }

    function checkMaxAdsReached() {
        if (totalAdWatches >= MAX_TOTAL_ADS) {
            console.log(`⚡⚡⚡ ДОСЯГНУТО МАКСИМАЛЬНУ КІЛЬКІСТЬ РЕКЛАМ: ${MAX_TOTAL_ADS} ⚡⚡⚡`);
            isRunning = false;
            showMaxAdsNotification();
            saveProgress();
            return true;
        }
        return false;
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = type === 'error' ? 'linear-gradient(45deg, #ff0000, #ff6b6b)' : 
                         type === 'success' ? 'linear-gradient(45deg, #00c853, #64dd17)' :
                         'linear-gradient(45deg, #2196F3, #21CBF3)';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${bgColor};
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 10001;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            border: 2px solid white;
            animation: slideDown 0.3s ease;
            max-width: 80%;
            word-wrap: break-word;
        `;

        // Додаємо CSS анімацію
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideDown {
                    from { top: -100px; opacity: 0; }
                    to { top: 20px; opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        notification.innerHTML = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideUp 0.3s ease';
                setTimeout(() => notification.parentNode.removeChild(notification), 300);
            }
        }, 4000);
    }

    function showMaxAdsNotification() {
        showNotification(`
            <div>🎉 ДОСЯГНУТО ЛІМІТ РЕКЛАМ! 🎉</div>
            <div style="font-size: 16px; margin: 8px 0;">${MAX_TOTAL_ADS} реклам переглянуто</div>
            <div>Скрипт автоматично зупинено</div>
        `, 'success');
    }

    async function openAndClaimQuests() {
        if (!isRunning || !checkSafety()) return;
        if (checkMaxAdsReached()) return;

        currentCycle++;
        console.log(`=== Цикл ${currentCycle} ===`);

        if (isWatchingAd) {
            console.log('Зараз переглядаємо рекламу, чекаємо...');
            await wait(3000);
            return openAndClaimQuests();
        }

        // Генеруємо нову затримку
        currentDelay = getRandomDelay();

        // Перевіряємо затримку
        if (lastAdTime > 0 && Date.now() - lastAdTime < currentDelay) {
            const remaining = currentDelay - (Date.now() - lastAdTime);
            console.log(`Чекаємо затримку ${Math.round(remaining/1000)}с...`);
            await wait(remaining + 1000);
        }

        attempts++;
        console.log(`Спроба ${attempts} знайти кнопку завдань... (${totalAdWatches}/${MAX_TOTAL_ADS} реклам)`);

        // Покращений пошук кнопки завдань
        let questButton = findQuestButton();
        
        if (questButton) {
            console.log('Знайдено кнопку завдань, клікаємо...');
            if (safeClick(questButton)) {
                await wait(2500);
                await processQuestsModal();
            } else {
                console.log('Не вдалося клікнути кнопку завдань');
                errorCount++;
                await retryOrContinue();
            }
        } else {
            console.log('Кнопка завдань не знайдена');
            if (attempts < maxAttempts) {
                await wait(2000);
                await openAndClaimQuests();
            } else {
                console.log('Досягнуто максимальну кількість спроб пошуку завдань');
                await checkForAdsOnMainScreen();
            }
        }
    }

    function findQuestButton() {
        // Спосіб 1: За data-атрибутами
        let button = document.querySelector('[data-page="quests"], [data-tab="quests"], .nav-item[data-page="quests"]');
        if (button) return button;

        // Спосіб 2: За текстом
        const allButtons = document.querySelectorAll('.nav-item, .bottom-nav button, .menu-item, button');
        for (let btn of allButtons) {
            if (matchesPattern(btn.textContent, TEXT_PATTERNS.quests)) {
                return btn;
            }
        }

        // Спосіб 3: За класами
        button = document.querySelector('.quests-btn, .quests-button, .quests-icon');
        return button || null;
    }

    async function processQuestsModal() {
        if (!isRunning) return;

        // Перевіряємо модальне вікно
        const questsModal = document.querySelector('#quests-modal, .quests-modal, [class*="quests-modal"], .modal[style*="display: block"]');
        if (questsModal && getComputedStyle(questsModal).display !== 'none') {
            console.log('Модальне вікно завдань відкрито');
            await wait(1500);
            await switchQuestTabs();
        } else {
            console.log('Модальне вікно завдань не відкрилося');
            await retryOrContinue();
        }
    }

    async function switchQuestTabs() {
        console.log('Шукаємо вкладки завдань...');

        // Пошук вкладок
        const tabsContainer = document.querySelector('#quests-tabs-container, .quests-tabs, .tabs-container');
        const tabs = tabsContainer ? 
            tabsContainer.querySelectorAll('.tab, .quest-tab, button, div[data-tab]') :
            document.querySelectorAll('.tab, .quest-tab, [data-tab]');

        let foundTab = false;

        for (let tab of tabs) {
            if (!isRunning) break;
            
            if (matchesPattern(tab.textContent, TEXT_PATTERNS.daily) || 
                tab.textContent.match(/[0-9]+\s*\/\s*[0-9]+/)) {
                
                console.log('Знайдено вкладку:', tab.textContent);
                if (safeClick(tab)) {
                    foundTab = true;
                    await wait(2000);
                    await clickClaimButtons();
                    break;
                }
            }
        }

        if (!foundTab) {
            console.log('Спеціальних вкладок не знайдено, шукаємо кнопки безпосередньо');
            await wait(1500);
            await clickClaimButtons();
        }
    }

    async function clickClaimButtons() {
        if (!isRunning || !checkSafety()) return;
        if (checkMaxAdsReached()) return;

        console.log('Шукаємо кнопки для кліку...');

        const allButtons = document.querySelectorAll('#quests-list button, .quests-list button, .quest-item button, .quest-button, button');
        let foundAdButtons = false;

        for (let button of allButtons) {
            if (!isRunning) break;
            if (checkMaxAdsReached()) return;

            const text = (button.textContent || button.innerText).trim();

            // Спочатку шукаємо кнопки реклами
            if (matchesPattern(text, TEXT_PATTERNS.watchAd) && 
                !button.disabled && 
                getComputedStyle(button).display !== 'none') {

                console.log('Знайдено кнопку перегляду реклами:', text);

                if (!canWatchAd()) {
                    if (totalAdWatches >= MAX_TOTAL_ADS) {
                        checkMaxAdsReached();
                        return;
                    }
                    const remaining = Math.max(0, currentDelay - (Date.now() - lastAdTime));
                    console.log(`Затримка не пройшла, чекаємо ${Math.round(remaining/1000)}с`);
                    await wait(remaining + 1000);
                    // Продовжуємо пошук після затримки
                    return clickClaimButtons();
                }

                foundAdButtons = true;
                console.log('Клікаємо на перегляд реклами...');
                
                if (safeClick(button)) {
                    isWatchingAd = true;
                    adWatchCount++;
                    totalAdWatches++;
                    lastAdTime = Date.now();

                    updateStatsDisplay();
                    saveProgress();

                    const nextDelay = getRandomDelay();
                    console.log(`Переглядаємо рекламу (${totalAdWatches}/${MAX_TOTAL_ADS}), наступна затримка: ${Math.round(nextDelay/1000)}с`);

                    // Очікування завершення реклами
                    await wait(32000); // 32 секунди

                    isWatchingAd = false;
                    currentDelay = nextDelay;

                    if (checkMaxAdsReached()) return;

                    console.log(`Реклама завершена, чекаємо ${Math.round(nextDelay/1000)}с`);
                    await wait(nextDelay);
                    
                    // Продовжуємо пошук після реклами
                    return clickClaimButtons();
                } else {
                    errorCount++;
                    console.log('Не вдалося клікнути кнопку реклами');
                }
                break;
            }
        }

        // Якщо рекламу не знайшли, шукаємо кнопки забирання
        if (!foundAdButtons) {
            let foundClaims = false;
            for (let button of allButtons) {
                if (!isRunning) break;

                const text = (button.textContent || button.innerText).trim();
                if (matchesPattern(text, TEXT_PATTERNS.claim) && 
                    !button.disabled && 
                    getComputedStyle(button).display !== 'none') {

                    console.log('Знайдено кнопку забирання:', text);
                    if (safeClick(button)) {
                        foundClaims = true;
                        await wait(1000);
                    }
                }
            }

            if (foundClaims) {
                console.log('Знайдено та клікнуто кнопки забирання');
                await wait(2000);
                await clickClaimButtons();
            } else {
                console.log('Активних кнопок не знайдено');
                await finalCheckAndClose();
            }
        }
    }

    async function checkForAdsOnMainScreen() {
        if (!isRunning || !checkSafety()) return;
        if (checkMaxAdsReached()) return;

        console.log('Перевіряємо головний екран на наявність реклами...');

        currentDelay = getRandomDelay();

        // Перевіряємо затримку
        if (lastAdTime > 0 && Date.now() - lastAdTime < currentDelay) {
            const remaining = currentDelay - (Date.now() - lastAdTime);
            console.log(`Чекаємо затримку ${Math.round(remaining/1000)}с...`);
            await wait(remaining + 1000);
        }

        const allButtons = document.querySelectorAll('button');
        let foundAd = false;

        for (let button of allButtons) {
            if (!isRunning) break;
            if (checkMaxAdsReached()) return;

            const text = (button.textContent || button.innerText).trim();
            if (matchesPattern(text, TEXT_PATTERNS.watchAd) && 
                !button.disabled && 
                getComputedStyle(button).display !== 'none') {

                console.log('Знайдено кнопку реклами на головному екрані:', text);

                if (!canWatchAd()) {
                    if (totalAdWatches >= MAX_TOTAL_ADS) {
                        checkMaxAdsReached();
                        return;
                    }
                    const remaining = Math.max(0, currentDelay - (Date.now() - lastAdTime));
                    console.log(`Затримка не пройшла, чекаємо ${Math.round(remaining/1000)}с`);
                    await wait(remaining + 1000);
                    return checkForAdsOnMainScreen();
                }

                foundAd = true;
                console.log('Клікаємо на рекламу на головному екрані...');
                
                if (safeClick(button)) {
                    isWatchingAd = true;
                    adWatchCount++;
                    totalAdWatches++;
                    lastAdTime = Date.now();

                    updateStatsDisplay();
                    saveProgress();

                    const nextDelay = getRandomDelay();
                    console.log(`Переглядаємо рекламу (${totalAdWatches}/${MAX_TOTAL_ADS})`);

                    await wait(37000); // 37 секунди

                    isWatchingAd = false;
                    currentDelay = nextDelay;

                    if (checkMaxAdsReached()) return;

                    console.log(`Реклама завершена, чекаємо ${Math.round(nextDelay/1000)}с`);
                    await wait(nextDelay);
                    
                    return checkForAdsOnMainScreen();
                } else {
                    errorCount++;
                }
                break;
            }
        }

        if (!foundAd) {
            console.log('Реклами не знайдено');
            console.log(`Підсумок циклу: ${adWatchCount} реклам в циклі, ${totalAdWatches}/${MAX_TOTAL_ADS} всього`);

            adWatchCount = 0;
            attempts = 0;

            if (checkMaxAdsReached()) return;

            const cycleDelay = getRandomDelay();
            console.log(`Чекаємо ${Math.round(cycleDelay/1000)}с перед новим циклом...`);
            
            await wait(cycleDelay);
            
            if (isRunning && totalAdWatches < MAX_TOTAL_ADS) {
                console.log('Запускаємо новий цикл...');
                await openAndClaimQuests();
            }
        }
    }

    async function finalCheckAndClose() {
        if (!isRunning) return;
        if (checkMaxAdsReached()) return;

        await wait(2000);

        const finalButtons = document.querySelectorAll('button');
        let anyActive = false;

        for (let btn of finalButtons) {
            const txt = (btn.textContent || btn.innerText).trim();
            if ((matchesPattern(txt, TEXT_PATTERNS.claim) || matchesPattern(txt, TEXT_PATTERNS.watchAd)) &&
                !btn.disabled && getComputedStyle(btn).display !== 'none') {
                console.log('Знайдено активну кнопку при фінальній перевірці:', txt);
                anyActive = true;
                break;
            }
        }

        if (!anyActive) {
            console.log('Всі завдання виконані, закриваємо модальне вікно');
            await closeQuestsModal();
            await wait(2000);
            await checkForAdsOnMainScreen();
        } else {
            console.log('Ще є активні кнопки, продовжуємо...');
            await clickClaimButtons();
        }
    }

    async function closeQuestsModal() {
        console.log('Закриваємо модальне вікно завдань...');

        // Різні способи закриття
        const closeSelectors = [
            '.modal-close', '.close-btn', '[onclick*="close"]', '.btn-close',
            '[class*="close"]', '.modal .btn', 'button[data-dismiss="modal"]'
        ];

        for (let selector of closeSelectors) {
            const closeBtn = document.querySelector(selector);
            if (closeBtn && safeClick(closeBtn)) {
                console.log('Модальне вікно закрито');
                return;
            }
        }

        // Спроба закриття кліком на затемнення
        const overlay = document.querySelector('.modal-backdrop, .modal-overlay');
        if (overlay) {
            safeClick(overlay);
            console.log('Спробували закрити через оверлей');
        }
    }

    async function retryOrContinue() {
        if (attempts < maxAttempts) {
            attempts++;
            await wait(2000);
            await openAndClaimQuests();
        } else {
            console.log('Переходимо до перевірки головного екрану');
            await checkForAdsOnMainScreen();
        }
    }

    function waitForGameLoad() {
        if (!isRunning) return;

        const gameElements = document.querySelectorAll('.top-panel, .bottom-nav, .garden-bed, #quests-modal, .game-container');
        if (gameElements.length > 0) {
            console.log('Гра завантажена, запускаємо автоматизацію...');
            loadProgress();
            
            setTimeout(() => {
                if (isRunning && totalAdWatches < MAX_TOTAL_ADS) {
                    openAndClaimQuests();
                }
            }, 5000);
        } else {
            console.log('Очікування завантаження гри...');
            setTimeout(waitForGameLoad, 3000);
        }
    }

    // Збереження/відновлення прогресу
    function saveProgress() {
        const progress = {
            totalAdWatches: totalAdWatches,
            lastRun: Date.now(),
            version: '1.1'
        };
        localStorage.setItem('farmLandAutoProgress', JSON.stringify(progress));
    }

    function loadProgress() {
        try {
            const saved = localStorage.getItem('farmLandAutoProgress');
            if (saved) {
                const data = JSON.parse(saved);
                totalAdWatches = data.totalAdWatches || 0;
                console.log(`Відновлено прогрес: ${totalAdWatches}/${MAX_TOTAL_ADS} реклам`);
            }
        } catch (error) {
            console.error('Помилка відновлення прогресу:', error);
        }
    }

    // Функції для ручного керування
    function manualClaim() {
        if (checkMaxAdsReached()) {
            showNotification('Ліміт реклам вже досягнуто!', 'error');
            return;
        }

        isRunning = true;
        attempts = 0;
        adWatchCount = 0;
        errorCount = 0;
        lastAdTime = 0;
        currentDelay = getRandomDelay();
        
        console.log(`Запуск автоматизації з затримкою ${Math.round(currentDelay/1000)}с...`);
        showNotification('Автоматизацію запущено!', 'success');
        openAndClaimQuests();
    }

    function stopAutoClaim() {
        isRunning = false;
        isWatchingAd = false;
        console.log('Автоматизацію зупинено');
        showNotification('Автоматизацію зупинено', 'info');
        saveProgress();
    }

    function resetCounters() {
        adWatchCount = 0;
        totalAdWatches = 0;
        attempts = 0;
        errorCount = 0;
        lastAdTime = 0;
        currentDelay = getRandomDelay();
        isRunning = true;
        
        console.log('Лічильники скинуті');
        showNotification('Лічильники скинуті!', 'success');
        updateStatsDisplay();
        saveProgress();
    }

    function updateStatsDisplay() {
        const stats = document.getElementById('auto-stats');
        if (stats) {
            const progress = Math.min((totalAdWatches / MAX_TOTAL_ADS) * 100, 100);
            stats.innerHTML = `Реклам: ${totalAdWatches}/${MAX_TOTAL_ADS} (${Math.round(progress)}%)`;

            const progressBar = document.getElementById('auto-progress-bar');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
                progressBar.style.background = progress >= 100 ? '#ff4444' : 
                                              progress >= 80 ? '#ff9800' : '#4CAF50';
            }
        }
    }

    function addManualButtons() {
        if (document.getElementById('auto-control-panel')) return;

        const container = document.createElement('div');
        container.id = 'auto-control-panel';
        container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 5px;
            background: rgba(0,0,0,0.95);
            padding: 12px;
            border-radius: 12px;
            border: 2px solid #4CAF50;
            min-width: 220px;
            backdrop-filter: blur(10px);
            font-family: Arial, sans-serif;
        `;

        const title = document.createElement('div');
        title.innerHTML = '🎲 Farm Land Auto (100 Max) v1.1';
        title.style.cssText = `
            color: white;
            font-weight: bold;
            text-align: center;
            margin-bottom: 8px;
            font-size: 14px;
            border-bottom: 1px solid #4CAF50;
            padding-bottom: 5px;
        `;

        // Прогрес бар
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            width: 100%;
            height: 10px;
            background: #333;
            border-radius: 5px;
            margin-bottom: 8px;
            overflow: hidden;
        `;

        const progressBar = document.createElement('div');
        progressBar.id = 'auto-progress-bar';
        progressBar.style.cssText = `
            width: 0%;
            height: 100%;
            background: #4CAF50;
            border-radius: 5px;
            transition: width 0.3s ease, background 0.3s ease;
        `;

        progressContainer.appendChild(progressBar);

        const stats = document.createElement('div');
        stats.id = 'auto-stats';
        stats.style.cssText = `
            color: white;
            font-size: 12px;
            text-align: center;
            margin-bottom: 8px;
            font-weight: bold;
        `;
        stats.innerHTML = `Реклам: 0/${MAX_TOTAL_ADS} (0%)`;

        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            gap: 5px;
            justify-content: space-between;
            margin-bottom: 5px;
        `;

        const startBtn = createButton('🔄 Старт', '#4CAF50', manualClaim);
        const stopBtn = createButton('⏹️ Стоп', '#f44336', stopAutoClaim);
        const resetBtn = createButton('🔄 Скинути', '#FF9800', resetCounters);

        buttonsContainer.appendChild(startBtn);
        buttonsContainer.appendChild(stopBtn);
        buttonsContainer.appendChild(resetBtn);

        const infoText = document.createElement('div');
        infoText.style.cssText = `
            color: #4CAF50;
            font-size: 10px;
            text-align: center;
            margin-top: 3px;
        `;
        infoText.innerHTML = '🎲 Затримка 11-20 секунд | 🛡️ Захищений режим';

        container.appendChild(title);
        container.appendChild(progressContainer);
        container.appendChild(stats);
        container.appendChild(buttonsContainer);
        container.appendChild(infoText);
        document.body.appendChild(container);

        updateStatsDisplay();
        console.log('Додано покращену панель керування');
    }

    function createButton(text, color, onClick) {
        const button = document.createElement('button');
        button.innerHTML = text;
        button.style.cssText = `
            background: ${color};
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            flex: 1;
            font-weight: bold;
            transition: all 0.3s ease;
        `;
        
        button.onmouseover = () => button.style.opacity = '0.8';
        button.onmouseout = () => button.style.opacity = '1';
        button.onclick = onClick;
        
        return button;
    }

    // Ініціалізація
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(() => {
                    waitForGameLoad();
                    setTimeout(addManualButtons, 6000);
                }, 3000);
            });
        } else {
            setTimeout(() => {
                waitForGameLoad();
                setTimeout(addManualButtons, 6000);
            }, 3000);
        }
    }

    // Робимо функції доступними глобально
    window.autoClaimQuests = manualClaim;
    window.stopAutoClaim = stopAutoClaim;
    window.resetAutoCounters = resetCounters;

    console.log('Farm Land Auto Quest & Ads Claim (100 Max) - Enhanced v1.1 активовано!');
    console.log('🛡️ Захищений режим | 🎲 Випадкові затримки | 💾 Автозбереження');

    init();

})();
