// ==UserScript==
// @name         Farm Land Auto Quest & Ads Claim (100 Max)
// @namespace    http://tampermonkey.net/
// @version      2.8
// @description  Автоматично відкриває завдання з обмеженням 100 реклам
// @author       Volodymyr_Romanovych
// @match        https://farmy.live/*
// @grant        none
// @icon         https://raw.githubusercontent.com/Vladimir199246/Farm/refs/heads/main/icon.jpg
// @downloadURL  https://github.com/Vladimir199246/Farm/raw/refs/heads/main/user.js
// @updateURL    https://github.com/Vladimir199246/Farm/raw/refs/heads/main/user.js
// @homepage     https://github.com/Vladimir199246/Farm
// @run-at       document-idle
// ==/UserScript==
(function() {
    'use strict';

    let attempts = 0;
    const maxAttempts = 50;
    let isWatchingAd = false;
    let adWatchCount = 0;
    let totalAdWatches = 0;
    const MAX_TOTAL_ADS = 100; // Максимум 100 реклам
    let isRunning = true;
    const MIN_DELAY = 11000; // 11 секунд мінімальна затримка
    const MAX_DELAY = 20000; // 20 секунд максимальна затримка
    let lastAdTime = 0;
    let currentDelay = 0;

    // Функція для отримання випадкової затримки
    function getRandomDelay() {
        return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
    }

    function canWatchAd() {
        if (!isWatchingAd && Date.now() - lastAdTime >= currentDelay && totalAdWatches < MAX_TOTAL_ADS) {
            return true;
        }
        return false;
    }

    function checkMaxAdsReached() {
        if (totalAdWatches >= MAX_TOTAL_ADS) {
            console.log(`⚡⚡⚡ ДОСЯГНУТО МАКСИМАЛЬНУ КІЛЬКІСТЬ РЕКЛАМ: ${MAX_TOTAL_ADS} ⚡⚡⚡`);
            isRunning = false;

            // Показуємо сповіщення
            showMaxAdsNotification();
            return true;
        }
        return false;
    }

    function showMaxAdsNotification() {
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.background = 'linear-gradient(45deg, #ff0000, #ff6b6b)';
        notification.style.color = 'white';
        notification.style.padding = '20px';
        notification.style.borderRadius = '15px';
        notification.style.zIndex = '10000';
        notification.style.fontSize = '18px';
        notification.style.fontWeight = 'bold';
        notification.style.textAlign = 'center';
        notification.style.boxShadow = '0 0 20px rgba(255,0,0,0.5)';
        notification.style.border = '3px solid white';
        notification.innerHTML = `
            <div>🎉 ДОСЯГНУТО ЛІМІТ РЕКЛАМ! 🎉</div>
            <div style="font-size: 24px; margin: 10px 0;">${MAX_TOTAL_ADS} реклам переглянуто</div>
            <div>Скрипт автоматично зупинено</div>
        `;

        document.body.appendChild(notification);

        // Автоматично видаляємо сповіщення через 10 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 10000);
    }

    function openAndClaimQuests() {
        if (!isRunning) {
            console.log('Скрипт зупинено');
            return;
        }

        // Перевіряємо чи досягнуто ліміт
        if (checkMaxAdsReached()) {
            return;
        }

        if (isWatchingAd) {
            console.log('Зараз переглядаємо рекламу, чекаємо...');
            setTimeout(openAndClaimQuests, 3000);
            return;
        }

        // Генеруємо нову затримку для цієї ітерації
        currentDelay = getRandomDelay();

        // Перевіряємо затримку між рекламами
        if (lastAdTime > 0 && Date.now() - lastAdTime < currentDelay) {
            const remaining = currentDelay - (Date.now() - lastAdTime);
            console.log(`Чекаємо випадкову затримку ${Math.round(remaining/1000)}с перед наступною рекламою...`);
            setTimeout(openAndClaimQuests, remaining + 1000);
            return;
        }

        attempts++;
        console.log(`Спроба ${attempts} знайти кнопку завдань... (${totalAdWatches}/${MAX_TOTAL_ADS} реклам)`);

        // Спосіб 1: Шукаємо за data-page="quests"
        let questButton = document.querySelector('.nav-item[data-page="quests"]');

        // Спосіб 2: Шукаємо за текстом у нижньому меню
        if (!questButton) {
            const navItems = document.querySelectorAll('.nav-item, .bottom-nav button');
            for (let item of navItems) {
                const text = item.textContent || item.innerText;
                if (text.includes('Задания') || text.includes('Завдання')) {
                    questButton = item;
                    break;
                }
            }
        }

        if (questButton) {
            console.log('Знайдено кнопку завдань, клікаємо...');
            questButton.click();

            // Чекаємо відкриття модального вікна завдань
            setTimeout(() => {
                processQuestsModal();
            }, 2500);
        } else {
            console.log('Кнопка завдань не знайдена');
            if (attempts < maxAttempts) {
                setTimeout(openAndClaimQuests, 2000);
            } else {
                console.log('Досягнуто максимальну кількість спроб пошуку завдань');
                checkForAdsOnMainScreen();
            }
        }
    }

    function processQuestsModal() {
        // Перевіряємо, чи відкрилося модальне вікно завдань
        const questsModal = document.getElementById('quests-modal');
        if (questsModal && questsModal.style.display !== 'none') {
            console.log('Модальне вікно завдань відкрито');

            // Спочатку пробуємо перемкнути вкладки всередині завдань
            setTimeout(() => {
                switchQuestTabs();
            }, 1500);
        } else {
            console.log('Модальне вікно завдань не відкрилося, спроба знову');
            if (attempts < maxAttempts) {
                setTimeout(openAndClaimQuests, 1500);
            } else {
                checkForAdsOnMainScreen();
            }
        }
    }

    function switchQuestTabs() {
        console.log('Шукаємо вкладки завдань...');

        // Шукаємо вкладки всередині модального вікна завдань
        const tabsContainer = document.getElementById('quests-tabs-container');
        if (tabsContainer) {
            const tabs = tabsContainer.querySelectorAll('.tab, .quest-tab, button, div[data-tab]');
            let foundTab = false;

            tabs.forEach(tab => {
                const text = tab.textContent || tab.innerText;
                if (text.includes('Ежедневные') || text.includes('Щоденні') ||
                    text.includes('Daily') || text.includes('Основные') ||
                    text.includes('Основні') || text.match(/[0-9]+\s*\/\s*[0-9]+/)) {
                    console.log('Знайдено вкладку:', text);
                    tab.click();
                    foundTab = true;

                    // Чекаємо завантаження завдань і шукаємо кнопки
                    setTimeout(() => {
                        clickClaimButtons();
                    }, 2000);
                }
            });

            if (!foundTab) {
                console.log('Спеціальних вкладок не знайдено, шукаємо кнопки безперечно');
                setTimeout(() => {
                    clickClaimButtons();
                }, 1500);
            }
        } else {
            console.log('Контейнер вкладок не знайдено, шукаємо кнопки безпосередньо');
            setTimeout(() => {
                clickClaimButtons();
            }, 1500);
        }
    }

    function clickClaimButtons() {
        if (!isRunning) return;
        if (checkMaxAdsReached()) return;

        console.log('Шукаємо кнопки "Забрати" та "Смотреть рекламу"...');

        const allButtons = document.querySelectorAll('#quests-list button, .quests-list button, .quest-item button, button');
        let foundClaims = false;
        let foundAdButtons = false;

        for (let button of allButtons) {
            if (!isRunning) return;
            if (checkMaxAdsReached()) return;

            const text = (button.textContent || button.innerText).trim();

            // Спочатку шукаємо кнопки "Смотреть рекламу"
            if ((text.includes('Смотреть рекламу') || text.includes('Дивитись рекламу') ||
                 text.includes('Watch ad') || text.includes('Переглянути рекламу')) &&
                !button.disabled && button.style.display !== 'none') {

                console.log('Знайдено кнопку перегляду реклами:', text);

                // Перевіряємо затримку та ліміт
                if (!canWatchAd()) {
                    if (totalAdWatches >= MAX_TOTAL_ADS) {
                        checkMaxAdsReached();
                        return;
                    }
                    const remaining = currentDelay - (Date.now() - lastAdTime);
                    console.log(`Затримка не пройшла, чекаємо ще ${Math.round(remaining/1000)}с`);
                    setTimeout(clickClaimButtons, remaining + 1000);
                    return;
                }

                foundAdButtons = true;
                console.log('Клікаємо на перегляд реклами...');
                button.click();
                isWatchingAd = true;
                adWatchCount++;
                totalAdWatches++;
                lastAdTime = Date.now();

                // Оновлюємо статистику
                updateStatsDisplay();

                // Генеруємо наступну затримку
                const nextDelay = getRandomDelay();
                console.log(`Наступна затримка буде: ${Math.round(nextDelay/1000)}с`);

                // Чекаємо завершення реклами (30 секунд)
                console.log(`Переглядаємо рекламу (${adWatchCount} в цьому циклі, ${totalAdWatches}/${MAX_TOTAL_ADS} всього), чекаємо 30 секунд...`);

                setTimeout(() => {
                    isWatchingAd = false;

                    // Перевіряємо чи досягнуто ліміт після реклами
                    if (checkMaxAdsReached()) {
                        return;
                    }

                    console.log(`Реклама завершена, очікуємо випадкову затримку ${Math.round(nextDelay/1000)} секунд перед наступною...`);

                    // Оновлюємо поточну затримку для наступної перевірки
                    currentDelay = nextDelay;

                    // Після затримки знову шукаємо кнопки
                    setTimeout(() => {
                        if (checkMaxAdsReached()) return;
                        console.log(`Затримка ${Math.round(nextDelay/1000)} секунд завершена, продовжуємо...`);
                        clickClaimButtons();
                    }, nextDelay);

                }, 35000); // 35 секунд для реклами + буфер

                return; // Зупиняємо цикл після знаходження реклами
            }

            // Потім шукаємо кнопки "Забрати"
            if ((text.includes('Забрать') || text.includes('Забрати') ||
                 text.includes('Claim') || text.includes('Получить') ||
                 text.includes('Отримати') || text.includes('Взяти') ||
                 text === 'Забрать' || text === 'Забрати') &&
                !button.disabled && button.style.display !== 'none') {

                console.log('Знайдено активну кнопку забирання:', text);
                button.click();
                foundClaims = true;

                // Невелика затримка між кліками
                setTimeout(() => {}, 1000);
            }
        }

        if (foundAdButtons) {
            // Вже обробляємо рекламу, чекаємо її завершення
            return;
        } else if (foundClaims) {
            console.log('Знайдено та клікнуто кнопки забирання');
            // Після забирання чекаємо і перевіряємо ще раз
            setTimeout(() => {
                clickClaimButtons();
            }, 3000);
        } else {
            console.log('Активних кнопок не знайдено');
            finalCheckAndClose();
        }
    }

    function checkForAdsOnMainScreen() {
        if (!isRunning) return;
        if (checkMaxAdsReached()) return;

        console.log('Перевіряємо головний екран на наявність реклами...');

        // Генеруємо нову затримку для цієї перевірки
        currentDelay = getRandomDelay();

        // Перевіряємо затримку
        if (lastAdTime > 0 && Date.now() - lastAdTime < currentDelay) {
            const remaining = currentDelay - (Date.now() - lastAdTime);
            console.log(`Чекаємо випадкову затримку ${Math.round(remaining/1000)}с перед перевіркою головного екрану...`);
            setTimeout(checkForAdsOnMainScreen, remaining + 1000);
            return;
        }

        // Шукаємо кнопки реклами на головному екрані
        const allButtons = document.querySelectorAll('button');
        let foundAd = false;

        for (let button of allButtons) {
            if (!isRunning) return;
            if (checkMaxAdsReached()) return;

            const text = (button.textContent || button.innerText).trim();
            if ((text.includes('Смотреть рекламу') || text.includes('Дивитись рекламу') ||
                 text.includes('Watch ad') || text.includes('Переглянути рекламу')) &&
                !button.disabled && button.style.display !== 'none') {

                console.log('Знайдено кнопку реклами на головному екрані:', text);

                // Фінальна перевірка затримки та ліміту
                if (!canWatchAd()) {
                    if (totalAdWatches >= MAX_TOTAL_ADS) {
                        checkMaxAdsReached();
                        return;
                    }
                    const remaining = currentDelay - (Date.now() - lastAdTime);
                    console.log(`Затримка не пройшла, чекаємо ще ${Math.round(remaining/1000)}с`);
                    setTimeout(checkForAdsOnMainScreen, remaining + 1000);
                    return;
                }

                foundAd = true;
                console.log('Клікаємо на рекламу на головному екрані...');
                button.click();
                isWatchingAd = true;
                adWatchCount++;
                totalAdWatches++;
                lastAdTime = Date.now();

                // Оновлюємо статистику
                updateStatsDisplay();

                // Генеруємо наступну затримку
                const nextDelay = getRandomDelay();
                console.log(`Наступна затримка буде: ${Math.round(nextDelay/1000)}с`);

                // Чекаємо завершення реклами (30 секунд)
                console.log(`Переглядаємо рекламу з головного екрану (${adWatchCount} в циклі, ${totalAdWatches}/${MAX_TOTAL_ADS} всього)...`);

                setTimeout(() => {
                    isWatchingAd = false;

                    // Перевіряємо ліміт після реклами
                    if (checkMaxAdsReached()) {
                        return;
                    }

                    console.log(`Реклама завершена, очікуємо випадкову затримку ${Math.round(nextDelay/1000)} секунд...`);

                    // Оновлюємо поточну затримку
                    currentDelay = nextDelay;

                    // Після затримки знову перевіряємо
                    setTimeout(() => {
                        if (checkMaxAdsReached()) return;
                        console.log(`Затримка ${Math.round(nextDelay/1000)} секунд завершена, перевіряємо ще раз...`);
                        checkForAdsOnMainScreen();
                    }, nextDelay);

                }, 37000); // 37 секунд для реклами

                break; // Зупиняємо цикл після знаходження реклами
            }
        }

        if (!foundAd) {
            console.log('Реклами на головному екрані не знайдено');
            console.log(`Підсумок циклу: переглянуто ${adWatchCount} реклам в цьому циклі, ${totalAdWatches}/${MAX_TOTAL_ADS} всього`);

            // Скидаємо лічильник для нового циклу
            adWatchCount = 0;
            attempts = 0;

            // Перевіряємо ліміт перед новим циклом
            if (checkMaxAdsReached()) {
                return;
            }

            // Генеруємо затримку перед новим циклом
            const cycleDelay = getRandomDelay();
            console.log(`Чекаємо випадкову затримку ${Math.round(cycleDelay/1000)} секунд перед новим циклом...`);
            setTimeout(() => {
                if (isRunning && totalAdWatches < MAX_TOTAL_ADS) {
                    console.log('Запускаємо новий цикл...');
                    openAndClaimQuests();
                }
            }, cycleDelay);
        }
    }

    function finalCheckAndClose() {
        if (!isRunning) return;
        if (checkMaxAdsReached()) return;

        setTimeout(() => {
            const finalButtons = document.querySelectorAll('button');
            let anyActive = false;

            finalButtons.forEach(btn => {
                const txt = (btn.textContent || btn.innerText).trim();
                if ((txt.includes('Забрать') || txt.includes('Забрати') ||
                     txt.includes('Смотреть рекламу') || txt.includes('Дивитись рекламу')) &&
                    !btn.disabled && btn.style.display !== 'none') {
                    console.log('Знайдено активну кнопку при фінальній перевірці:', txt);
                    anyActive = true;
                }
            });

            if (!anyActive) {
                console.log('Всі завдання виконані, закриваємо модальне вікно');
                closeQuestsModal();

                setTimeout(() => {
                    checkForAdsOnMainScreen();
                }, 2000);
            } else {
                console.log('Ще є активні кнопки, продовжуємо...');
                clickClaimButtons();
            }
        }, 2000);
    }

    function closeQuestsModal() {
        console.log('Закриваємо модальне вікно завдань...');

        const questsModal = document.getElementById('quests-modal');
        if (questsModal) {
            const closeBtn = questsModal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.click();
                console.log('Модальне вікно завдань закрито');
                return;
            }
        }

        const closeButtons = document.querySelectorAll('.modal-close, .close-btn, [onclick*="closeQuestsModal"]');
        if (closeButtons.length > 0) {
            closeButtons[0].click();
            console.log('Модальне вікно закрито через загальну кнопку');
        } else {
            console.log('Кнопку закриття не знайдено');
        }
    }

    function waitForGameLoad() {
        if (!isRunning) return;

        if (document.querySelector('.top-panel, .bottom-nav, .garden-bed, #quests-modal')) {
            console.log('Farm Land гра завантажена, запускаємо автоматизацію...');

            setTimeout(() => {
                openAndClaimQuests();
            }, 5000);
        } else {
            console.log('Очікування завантаження Farm Land...');
            setTimeout(waitForGameLoad, 3000);
        }
    }

    // Функції для ручного керування
    function manualClaim() {
        if (checkMaxAdsReached()) {
            console.log('Ліміт реклам вже досягнуто!');
            return;
        }

        isRunning = true;
        attempts = 0;
        adWatchCount = 0;
        isWatchingAd = false;
        lastAdTime = 0;
        currentDelay = getRandomDelay();
        console.log(`Запуск автоматизації з випадковою затримкою ${Math.round(currentDelay/1000)}с між рекламами...`);
        console.log(`Ліміт: ${MAX_TOTAL_ADS} реклам (вже переглянуто: ${totalAdWatches})`);
        openAndClaimQuests();
    }

    function stopAutoClaim() {
        isRunning = false;
        isWatchingAd = false;
        console.log('Автоматичний режим зупинено');
    }

    function resetCounters() {
        adWatchCount = 0;
        totalAdWatches = 0;
        attempts = 0;
        lastAdTime = 0;
        currentDelay = getRandomDelay();
        isRunning = true;
        console.log('Лічильники скинуті');
        updateStatsDisplay();
    }

    function updateStatsDisplay() {
        const stats = document.getElementById('auto-stats');
        if (stats) {
            const progress = Math.min((totalAdWatches / MAX_TOTAL_ADS) * 100, 100);
            stats.innerHTML = `Реклам: ${totalAdWatches}/${MAX_TOTAL_ADS} (${Math.round(progress)}%)`;

            // Оновлюємо прогрес бар
            const progressBar = document.getElementById('auto-progress-bar');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
                progressBar.style.background = progress >= 100 ? '#ff4444' : '#4CAF50';
            }
        }
    }

    // Додаємо кнопки для ручного керування
    function addManualButtons() {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.right = '10px';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '5px';
        container.style.background = 'rgba(0,0,0,0.9)';
        container.style.padding = '10px';
        container.style.borderRadius = '10px';
        container.style.border = '2px solid #4CAF50';
        container.style.minWidth = '200px';

        const title = document.createElement('div');
        title.innerHTML = '🎲 Farm Land Auto (100 Max)';
        title.style.color = 'white';
        title.style.fontWeight = 'bold';
        title.style.textAlign = 'center';
        title.style.marginBottom = '5px';
        title.style.fontSize = '14px';

        // Прогрес бар
        const progressContainer = document.createElement('div');
        progressContainer.style.width = '100%';
        progressContainer.style.height = '8px';
        progressContainer.style.background = '#333';
        progressContainer.style.borderRadius = '4px';
        progressContainer.style.marginBottom = '5px';
        progressContainer.style.overflow = 'hidden';

        const progressBar = document.createElement('div');
        progressBar.id = 'auto-progress-bar';
        progressBar.style.width = '0%';
        progressBar.style.height = '100%';
        progressBar.style.background = '#4CAF50';
        progressBar.style.borderRadius = '4px';
        progressBar.style.transition = 'width 0.3s ease';

        progressContainer.appendChild(progressBar);

        const stats = document.createElement('div');
        stats.id = 'auto-stats';
        stats.style.color = 'white';
        stats.style.fontSize = '12px';
        stats.style.textAlign = 'center';
        stats.style.marginBottom = '5px';
        stats.innerHTML = `Реклам: 0/${MAX_TOTAL_ADS} (0%)`;

        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '5px';
        buttonsContainer.style.justifyContent = 'space-between';

        const startBtn = document.createElement('button');
        startBtn.innerHTML = '🔄 Старт';
        startBtn.style.background = '#4CAF50';
        startBtn.style.color = 'white';
        startBtn.style.border = 'none';
        startBtn.style.padding = '8px 12px';
        startBtn.style.borderRadius = '5px';
        startBtn.style.cursor = 'pointer';
        startBtn.style.fontSize = '12px';
        startBtn.style.flex = '1';
        startBtn.onclick = manualClaim;

        const stopBtn = document.createElement('button');
        stopBtn.innerHTML = '⏹️ Стоп';
        stopBtn.style.background = '#f44336';
        stopBtn.style.color = 'white';
        stopBtn.style.border = 'none';
        stopBtn.style.padding = '8px 12px';
        stopBtn.style.borderRadius = '5px';
        stopBtn.style.cursor = 'pointer';
        stopBtn.style.fontSize = '12px';
        stopBtn.style.flex = '1';
        stopBtn.onclick = stopAutoClaim;

        const resetBtn = document.createElement('button');
        resetBtn.innerHTML = '🔄 Скинути';
        resetBtn.style.background = '#FF9800';
        resetBtn.style.color = 'white';
        resetBtn.style.border = 'none';
        resetBtn.style.padding = '8px 12px';
        resetBtn.style.borderRadius = '5px';
        resetBtn.style.cursor = 'pointer';
        resetBtn.style.fontSize = '12px';
        resetBtn.style.flex = '1';
        resetBtn.onclick = resetCounters;

        buttonsContainer.appendChild(startBtn);
        buttonsContainer.appendChild(stopBtn);
        buttonsContainer.appendChild(resetBtn);

        const delayInfo = document.createElement('div');
        delayInfo.style.color = '#4CAF50';
        delayInfo.style.fontSize = '10px';
        delayInfo.style.textAlign = 'center';
        delayInfo.style.marginTop = '3px';
        delayInfo.innerHTML = '🎲 Затримка 11-20 секунд';

        container.appendChild(title);
        container.appendChild(progressContainer);
        container.appendChild(stats);
        container.appendChild(buttonsContainer);
        container.appendChild(delayInfo);
        document.body.appendChild(container);

        setInterval(updateStatsDisplay, 2000);
        console.log('Додано панель керування з лімітом 100 реклам');
    }

    // Ініціалізація
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

    // Робимо функції доступними глобально
    window.autoClaimQuests = manualClaim;
    window.stopAutoClaim = stopAutoClaim;
    window.resetAutoCounters = resetCounters;
    window.farmLandAutoClaim = manualClaim;

    console.log('Farm Land Auto Quest & Ads Claim (100 Max) скрипт активовано!');
    console.log(`Максимальна кількість реклам: ${MAX_TOTAL_ADS}`);
    console.log('Випадкова затримка між рекламами: 11-20 секунд');

})();
