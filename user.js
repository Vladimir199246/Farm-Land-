// ==UserScript==
// @name         Farm Land Auto Quest
// @namespace    http://tampermonkey.net/
// @version      1.37
// @description  Покращена версія з виправленим інтерфейсом та оптимізацією
// @author       Volodymyr_Romanovych
// @match        https://farmy.live/*
// @grant        none
// @icon         https://raw.githubusercontent.com/Volodymyr-Romanovych/Farm/refs/heads/main/icon.jpg
// @downloadURL  https://github.com/Volodymyr-Romanovych/Farm/raw/refs/heads/main/user.js
// @updateURL    https://github.com/Volodymyr-Romanovych/Farm/raw/refs/heads/main/user.js
// @homepage     https://github.com/Volodymyr-Romanovych/Farm
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Константи та налаштування
    const DEFAULT_SETTINGS = {
        maxAds: 100,
        minDelay: 13000,
        maxDelay: 20000,
        maxErrors: 5,
        enableSound: false,
        autoStart: false,
        adaptiveDelays: true,
        safetyChecks: true
    };

    // Стан скрипта
    let state = {
        attempts: 0,
        maxAttempts: 30,
        isWatchingAd: false,
        adWatchCount: 0,
        totalAdWatches: 0,
        isRunning: false,
        lastAdTime: 0,
        currentDelay: 0,
        currentCycle: 0,
        errorCount: 0,
        lastActionTime: Date.now(),
        healthStatus: 'healthy'
    };

    // Налаштування
    let settings = { ...DEFAULT_SETTINGS };

    // Змінні для перетягування
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let isPanelMinimized = false;

    // Таймери
    let healthCheckInterval;
    let statusUpdateInterval;

    // Словник для пошуку елементів
    const TEXT_PATTERNS = {
        quests: ['Задания', 'Завдання', 'Quests', 'Квести', 'Задачи'],
        claim: ['Забрать', 'Забрати', 'Claim', 'Получить', 'Отримати', 'Взяти', 'Собрать', 'Зібрати'],
        watchAd: ['Смотреть рекламу', 'Дивитись рекламу', 'Watch ad', 'Переглянути рекламу', 'Подивитись рекламу'],
        daily: ['Ежедневные', 'Щоденні', 'Daily', 'Основные', 'Основні', 'Щоденні завдання'],
        close: ['Закрыть', 'Закрити', 'Close', '×', 'X'],
        home: ['Главная', 'Головна', 'Home', 'Main']
    };

    // Ініціалізація
    function init() {
        console.log('🚀 Farm Land Auto Quest & Ads Claim - Ultimate Edition v1.37 завантажується...');

        loadSettings();
        loadProgress();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(initializeScript, 3000);
            });
        } else {
            setTimeout(initializeScript, 3000);
        }
    }

    function initializeScript() {
        waitForGameLoad();
        setTimeout(createEnhancedControlPanel, 2000);
        startHealthMonitor();
        startStatusUpdater();

        if (settings.autoStart && state.totalAdWatches < settings.maxAds) {
            setTimeout(() => {
                showNotification('Автозапуск активовано!', 'success');
                manualClaim();
            }, 5000);
        }
    }

    // === СИСТЕМА НАЛАШТУВАНЬ ===
    function loadSettings() {
        try {
            const saved = localStorage.getItem('farmLandSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                settings = { ...DEFAULT_SETTINGS, ...parsed };
                console.log('⚙️ Налаштування завантажені:', settings);
            }
        } catch (error) {
            console.error('Помилка завантаження налаштувань:', error);
            settings = { ...DEFAULT_SETTINGS };
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem('farmLandSettings', JSON.stringify(settings));
            showNotification('Налаштування збережено!', 'success');
            console.log('💾 Налаштування збережено:', settings);
        } catch (error) {
            console.error('Помилка збереження налаштувань:', error);
            showNotification('Помилка збереження налаштувань!', 'error');
        }
    }

    // === СИСТЕМА ЗДОРОВ'Я ТА БЕЗПЕКИ ===
    function startHealthMonitor() {
        healthCheckInterval = setInterval(() => {
            checkScriptHealth();
        }, 15000);
    }

    function checkScriptHealth() {
        const now = Date.now();

        // Перевірка на зависання
        if (state.isWatchingAd && now - state.lastAdTime > 60000) {
            console.error('⚡ Реклама зависла! Скидаємо стан...');
            state.isWatchingAd = false;
            state.errorCount++;
            state.healthStatus = 'warning';
            showNotification('Виявлено завислу рекламу!', 'error');
        }

        // Перевірка загальної активності
        if (state.isRunning && now - state.lastActionTime > 120000) {
            console.warn('⚡ Скрипт неактивний більше 2 хвилин!');
            state.healthStatus = 'warning';
        }

        // Попередження про помилки
        if (state.errorCount > settings.maxErrors / 2) {
            state.healthStatus = 'warning';
        }

        if (state.errorCount >= settings.maxErrors) {
            state.healthStatus = 'error';
            stopAutoClaim();
            showNotification('Досягнуто максимальну кількість помилок! Скрипт зупинено.', 'error');
        }

        updateHealthIndicator();
    }

    function updateHealthIndicator() {
        const indicator = document.getElementById('health-indicator');
        if (!indicator) return;

        let healthText, healthColor;

        switch (state.healthStatus) {
            case 'healthy':
                healthText = '✅ Стан: Оптимальний';
                healthColor = '#4CAF50';
                break;
            case 'warning':
                healthText = `⚠️ Стан: Попередження (${state.errorCount} помилок)`;
                healthColor = '#FF9800';
                break;
            case 'error':
                healthText = '❌ Стан: Критичний';
                healthColor = '#f44336';
                break;
            default:
                healthText = '❓ Стан: Невідомий';
                healthColor = '#9E9E9E';
        }

        indicator.textContent = healthText;
        indicator.style.color = healthColor;
    }

    function checkSafety() {
        // Перевірка на помилки
        const errorElements = document.querySelectorAll('.error, .warning, .alert, .ban-message, [class*="error"], [class*="warning"]');
        for (let element of errorElements) {
            const text = element.textContent || '';
            if (text.includes('бан') || text.includes('ban') ||
                text.includes('підозріла') || text.includes('suspicious') ||
                text.includes('блок') || text.includes('block')) {
                console.error('⚡ ВИЯВЛЕНО ПРОБЛЕМУ: ', text);
                state.healthStatus = 'error';
                stopAutoClaim();
                showNotification('Виявлено проблему! Скрипт зупинено.', 'error');
                return false;
            }
        }

        if (state.errorCount >= settings.maxErrors) {
            stopAutoClaim();
            return false;
        }

        return true;
    }

    // === ПОКРАЩЕНИЙ ІНТЕРФЕЙС ===
    function createEnhancedControlPanel() {
        if (document.getElementById('auto-control-panel')) return;

        const container = document.createElement('div');
        container.id = 'auto-control-panel';
        container.innerHTML = `
            <div class="panel-header" id="panel-header">
                <span> Farm Land Auto v1.37</span>
                <div class="header-buttons">
                    <button class="minimize-btn" id="minimize-btn">−</button>
                </div>
            </div>
            <div class="panel-content" id="panel-content">
                <div class="progress-section">
                    <div class="stats" id="auto-stats">Реклам: 0/100 (0%)</div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="auto-progress-bar"></div>
                    </div>
                </div>

                <div class="status-section">
                    <div class="health-status" id="health-indicator">✅ Стан: Оптимальний</div>
                    <div class="current-status" id="current-status">⏹️ Зупинено</div>
                    <div class="timer" id="next-action-timer">Наступна дія: --</div>
                </div>

                <div class="controls">
                    <button class="btn start" id="start-btn">▶️ Старт</button>
                    <button class="btn stop" id="stop-btn">⏹️ Стоп</button>
                    <button class="btn reset" id="reset-btn">🔄 Скинути</button>
                </div>

                <div class="quick-settings">
                    <div class="setting-item">
                        <label>Макс. реклам:</label>
                        <input type="number" id="max-ads-input" value="100" min="1" max="500" class="setting-input">
                    </div>
                    <div class="delay-settings">
                        <div class="setting-item">
                            <label>Затримка від (сек):</label>
                            <input type="number" id="min-delay-input" value="13" min="5" max="60" class="setting-input">
                        </div>
                        <div class="setting-item">
                            <label>Затримка до (сек):</label>
                            <input type="number" id="max-delay-input" value="20" min="10" max="120" class="setting-input">
                        </div>
                    </div>
                </div>

                <div class="info-footer">
                    <div>🛡️ Захищений режим</div>
                    <div>👆 Перетягни для переміщення</div>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        addEnhancedStyles();
        setupPanelEventListeners();
        updateSettingsForm();
        loadPanelPosition();
        updateStatsDisplay();

        console.log('🎮 Покращена панель керування створена!');
    }

    function addEnhancedStyles() {
        const styles = `
            #auto-control-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                background: rgba(25, 25, 35, 0.95);
                backdrop-filter: blur(20px);
                border: 2px solid #4CAF50;
                border-radius: 15px;
                padding: 0;
                width: 280px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.6);
                user-select: none;
                font-family: 'Segoe UI', system-ui, sans-serif;
                transition: all 0.3s ease;
                color: white;
            }

            #auto-control-panel.minimized {
                width: 200px !important;
                height: 45px !important;
                overflow: hidden;
            }

            #auto-control-panel.minimized .panel-content {
                display: none !important;
            }

            #auto-control-panel:not(.minimized) {
                width: 280px !important;
                height: auto !important;
            }

            #auto-control-panel:not(.minimized) .panel-content {
                display: block !important;
            }

            .panel-header {
                background: linear-gradient(135deg, #2E7D32, #4CAF50);
                padding: 12px 16px;
                border-radius: 13px 13px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: grab;
                user-select: none;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .panel-header span {
                color: white;
                font-weight: 600;
                font-size: 14px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }

            .minimize-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                font-weight: bold;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }

            .minimize-btn:hover, .minimize-btn:active {
                background: rgba(255,255,255,0.3);
                transform: scale(1.1);
            }

            .panel-content {
                padding: 16px;
                transition: all 0.3s ease;
            }

            .progress-section {
                margin-bottom: 16px;
            }

            .stats {
                color: #4CAF50;
                font-size: 15px;
                font-weight: 600;
                text-align: center;
                margin-bottom: 8px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            }

            .progress-bar {
                width: 100%;
                height: 12px;
                background: rgba(255,255,255,0.1);
                border-radius: 6px;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,0.2);
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(135deg, #4CAF50, #8BC34A);
                border-radius: 6px;
                transition: width 0.5s ease, background 0.3s ease;
                box-shadow: 0 2px 8px rgba(76, 175, 80, 0.4);
            }

            .status-section {
                background: rgba(255,255,255,0.05);
                padding: 12px;
                border-radius: 10px;
                margin-bottom: 16px;
                border: 1px solid rgba(255,255,255,0.1);
            }

            .health-status, .current-status, .timer {
                font-size: 12px;
                margin: 4px 0;
                font-weight: 500;
            }

            .current-status {
                color: #FF9800;
            }

            .timer {
                color: #2196F3;
            }

            .controls {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 8px;
                margin-bottom: 16px;
            }

            .btn {
                padding: 12px 8px;
                border: none;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
                min-height: 40px;
            }

            .btn.start {
                background: linear-gradient(135deg, #4CAF50, #45a049);
            }

            .btn.stop {
                background: linear-gradient(135deg, #f44336, #da190b);
            }

            .btn.reset {
                background: linear-gradient(135deg, #FF9800, #e68900);
            }

            .btn:hover, .btn:active {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }

            .btn:active {
                transform: translateY(0);
            }

            .quick-settings {
                background: rgba(255,255,255,0.05);
                padding: 12px;
                border-radius: 10px;
                margin-bottom: 12px;
                border: 1px solid rgba(255,255,255,0.1);
            }

            .delay-settings {
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid rgba(255,255,255,0.1);
            }

            .setting-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .setting-item:last-child {
                margin-bottom: 0;
            }

            .setting-item label {
                font-size: 12px;
                color: #ccc;
            }

            .setting-input {
                width: 60px;
                padding: 6px 8px;
                border: 1px solid #4CAF50;
                border-radius: 6px;
                background: rgba(255,255,255,0.1);
                color: white;
                font-size: 12px;
                text-align: center;
                touch-action: manipulation;
            }

            .setting-input:focus {
                outline: none;
                border-color: #8BC34A;
                box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
            }

            .info-footer {
                color: #888;
                font-size: 10px;
                text-align: center;
                line-height: 1.4;
            }

            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* Для сенсорних пристроїв */
            @media (hover: none) and (pointer: coarse) {
                .btn, .minimize-btn {
                    min-height: 44px;
                    min-width: 44px;
                }
                
                .minimize-btn {
                    width: 36px;
                    height: 36px;
                    font-size: 20px;
                }
                
                .setting-input {
                    min-height: 36px;
                    font-size: 14px;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    function setupPanelEventListeners() {
        const panel = document.getElementById('auto-control-panel');
        const header = document.getElementById('panel-header');
        const minimizeBtn = document.getElementById('minimize-btn');
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        const resetBtn = document.getElementById('reset-btn');
        const maxAdsInput = document.getElementById('max-ads-input');
        const minDelayInput = document.getElementById('min-delay-input');
        const maxDelayInput = document.getElementById('max-delay-input');

        // Перетягування
        header.addEventListener('mousedown', startDrag);
        header.addEventListener('touchstart', startDrag, { passive: false });

        // Кнопки управління
        minimizeBtn.addEventListener('click', toggleMinimize);
        minimizeBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            toggleMinimize();
        }, { passive: false });
        
        startBtn.addEventListener('click', manualClaim);
        startBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            manualClaim();
        }, { passive: false });
        
        stopBtn.addEventListener('click', stopAutoClaim);
        stopBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            stopAutoClaim();
        }, { passive: false });
        
        resetBtn.addEventListener('click', resetCounters);
        resetBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            resetCounters();
        }, { passive: false });

        // Налаштування в реальному часі
        maxAdsInput.addEventListener('change', updateMaxAds);
        minDelayInput.addEventListener('change', updateMinDelay);
        maxDelayInput.addEventListener('change', updateMaxDelay);

        // Валідація затримок
        minDelayInput.addEventListener('blur', validateDelays);
        maxDelayInput.addEventListener('blur', validateDelays);
    }

    function toggleMinimize() {
        const panel = document.getElementById('auto-control-panel');
        const minimizeBtn = document.getElementById('minimize-btn');

        isPanelMinimized = !isPanelMinimized;

        if (isPanelMinimized) {
            // Згортаємо панель
            panel.classList.add('minimized');
            minimizeBtn.textContent = '+';
            panel.style.width = '200px';
            panel.style.height = '45px';
        } else {
            // Розгортаємо панель
            panel.classList.remove('minimized');
            minimizeBtn.textContent = '−';
            panel.style.width = '280px';
            panel.style.height = 'auto';
        }

        savePanelPosition();
        showNotification(isPanelMinimized ? 'Панель згорнуто' : 'Панель розгорнуто', 'info');
    }

    function validateDelays() {
        const minDelay = parseInt(document.getElementById('min-delay-input').value) || 13;
        const maxDelay = parseInt(document.getElementById('max-delay-input').value) || 20;

        if (minDelay > maxDelay) {
            showNotification('Помилка: "Затримка від" не може бути більше ніж "Затримка до"!', 'error');
            document.getElementById('min-delay-input').value = Math.min(minDelay, maxDelay);
            document.getElementById('max-delay-input').value = Math.max(minDelay, maxDelay);
            updateMinDelay();
            updateMaxDelay();
        }
    }

    function updateMaxAds() {
        const input = document.getElementById('max-ads-input');
        settings.maxAds = parseInt(input.value) || 100;
        saveSettings();
        updateStatsDisplay();
    }

    function updateMinDelay() {
        const input = document.getElementById('min-delay-input');
        const minValue = parseInt(input.value) || 13;
        settings.minDelay = minValue * 1000;
        
        // Оновлюємо максимальну затримку якщо потрібно
        const maxDelayInput = document.getElementById('max-delay-input');
        const maxValue = parseInt(maxDelayInput.value) || 20;
        
        if (minValue > maxValue) {
            maxDelayInput.value = minValue + 1;
            settings.maxDelay = (minValue + 1) * 1000;
        }
        
        saveSettings();
        showNotification(`Затримка оновлена: ${minValue}-${maxValue} сек`, 'success');
    }

    function updateMaxDelay() {
        const input = document.getElementById('max-delay-input');
        const maxValue = parseInt(input.value) || 20;
        settings.maxDelay = maxValue * 1000;
        
        // Оновлюємо мінімальну затримку якщо потрібно
        const minDelayInput = document.getElementById('min-delay-input');
        const minValue = parseInt(minDelayInput.value) || 13;
        
        if (maxValue < minValue) {
            minDelayInput.value = Math.max(5, maxValue - 1);
            settings.minDelay = (Math.max(5, maxValue - 1)) * 1000;
        }
        
        saveSettings();
        showNotification(`Затримка оновлена: ${minValue}-${maxValue} сек`, 'success');
    }

    function updateSettingsForm() {
        const maxAdsInput = document.getElementById('max-ads-input');
        const minDelayInput = document.getElementById('min-delay-input');
        const maxDelayInput = document.getElementById('max-delay-input');

        if (maxAdsInput) maxAdsInput.value = settings.maxAds;
        if (minDelayInput) minDelayInput.value = Math.round(settings.minDelay / 1000);
        if (maxDelayInput) maxDelayInput.value = Math.round(settings.maxDelay / 1000);
    }

    // === ФУНКЦІОНАЛ ПЕРЕТЯГУВАННЯ ===
    function startDrag(e) {
        const container = document.getElementById('auto-control-panel');
        if (!container) return;

        isDragging = true;
        const rect = container.getBoundingClientRect();

        if (e.type === 'mousedown') {
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);
        } else if (e.type === 'touchstart') {
            const touch = e.touches[0];
            dragOffsetX = touch.clientX - rect.left;
            dragOffsetY = touch.clientY - rect.top;
            document.addEventListener('touchmove', onDrag, { passive: false });
            document.addEventListener('touchend', stopDrag);
            e.preventDefault();
        }

        container.style.transition = 'none';
        container.style.cursor = 'grabbing';
    }

    function onDrag(e) {
        if (!isDragging) return;

        const container = document.getElementById('auto-control-panel');
        if (!container) return;

        let clientX, clientY;

        if (e.type === 'mousemove') {
            clientX = e.clientX;
            clientY = e.clientY;
        } else if (e.type === 'touchmove') {
            const touch = e.touches[0];
            clientX = touch.clientX;
            clientY = touch.clientY;
            e.preventDefault();
        }

        const maxX = window.innerWidth - container.offsetWidth;
        const maxY = window.innerHeight - container.offsetHeight;

        let newX = clientX - dragOffsetX;
        let newY = clientY - dragOffsetY;

        newX = Math.max(10, Math.min(newX, maxX - 10));
        newY = Math.max(10, Math.min(newY, maxY - 10));

        container.style.left = newX + 'px';
        container.style.top = newY + 'px';
        container.style.right = 'auto';
    }

    function stopDrag() {
        isDragging = false;
        const container = document.getElementById('auto-control-panel');
        if (container) {
            container.style.transition = 'all 0.3s ease';
            container.style.cursor = 'grab';
            savePanelPosition();
        }

        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('touchend', stopDrag);
    }

    function savePanelPosition() {
        const container = document.getElementById('auto-control-panel');
        if (!container) return;

        const position = {
            x: parseInt(container.style.left) || 0,
            y: parseInt(container.style.top) || 0,
            minimized: isPanelMinimized
        };

        localStorage.setItem('farmLandPanelPosition', JSON.stringify(position));
    }

    function loadPanelPosition() {
        try {
            const saved = localStorage.getItem('farmLandPanelPosition');
            if (saved) {
                const position = JSON.parse(saved);
                const container = document.getElementById('auto-control-panel');
                if (container && position.x !== undefined && position.y !== undefined) {
                    container.style.left = position.x + 'px';
                    container.style.top = position.y + 'px';
                    container.style.right = 'auto';

                    if (position.minimized) {
                        isPanelMinimized = true;
                        container.classList.add('minimized');
                        container.style.width = '200px';
                        container.style.height = '45px';
                        const minimizeBtn = document.getElementById('minimize-btn');
                        if (minimizeBtn) minimizeBtn.textContent = '+';
                    }
                }
            }
        } catch (error) {
            console.error('Помилка відновлення позиції панелі:', error);
        }
    }

    // === ОНОВЛЕННЯ СТАТУСУ ===
    function startStatusUpdater() {
        statusUpdateInterval = setInterval(updateStatusDisplay, 1000);
    }

    function updateStatusDisplay() {
        updateStatsDisplay();
        updateNextActionTimer();
    }

    function updateNextActionTimer() {
        const timerElement = document.getElementById('next-action-timer');
        if (!timerElement) return;

        if (!state.isRunning || state.totalAdWatches >= settings.maxAds) {
            timerElement.textContent = 'Наступна дія: --';
            return;
        }

        if (state.isWatchingAd) {
            const adTime = Date.now() - state.lastAdTime;
            const remaining = Math.max(0, 41000 - adTime);
            timerElement.textContent = `Реклама: ${Math.ceil(remaining/1000)}с`;
            return;
        }

        if (state.lastAdTime > 0) {
            const timeSinceLastAd = Date.now() - state.lastAdTime;
            const remaining = Math.max(0, state.currentDelay - timeSinceLastAd);

            if (remaining > 0) {
                timerElement.textContent = `Затримка: ${Math.ceil(remaining/1000)}с`;
            } else {
                timerElement.textContent = 'Пошук реклами...';
            }
        } else {
            timerElement.textContent = 'Готовий до старту';
        }
    }

    function updateCurrentStatus(status) {
        const statusElement = document.getElementById('current-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    // === ОСНОВНА ЛОГІКА ===
    function getAdaptiveDelay() {
        // Генеруємо випадкову затримку в межах minDelay - maxDelay
        const baseDelay = Math.floor(Math.random() * (settings.maxDelay - settings.minDelay + 1)) + settings.minDelay;

        if (!settings.adaptiveDelays) {
            return baseDelay;
        }

        // Адаптивні коригування
        if (state.errorCount > 0) {
            return baseDelay + (state.errorCount * 2000);
        }

        if (state.adWatchCount > 3 && state.errorCount === 0) {
            return Math.max(settings.minDelay, baseDelay - 1000);
        }

        return baseDelay;
    }

    function canWatchAd() {
        if (!state.isRunning || state.isWatchingAd) return false;
        if (state.totalAdWatches >= settings.maxAds) return false;
        if (state.lastAdTime === 0) return true;

        const timeSinceLastAd = Date.now() - state.lastAdTime;
        return timeSinceLastAd >= state.currentDelay;
    }

    function checkMaxAdsReached() {
        if (state.totalAdWatches >= settings.maxAds) {
            console.log(`🎉 ДОСЯГНУТО ЛІМІТ РЕКЛАМ: ${settings.maxAds}`);
            state.isRunning = false;
            showMaxAdsNotification();
            saveProgress();
            updateCurrentStatus('🎉 Завершено!');
            return true;
        }
        return false;
    }

    async function openAndClaimQuests() {
        if (!state.isRunning || !checkSafety()) return;
        if (checkMaxAdsReached()) return;

        state.currentCycle++;
        state.lastActionTime = Date.now();
        console.log(`=== Цикл ${state.currentCycle} ===`);

        if (state.isWatchingAd) {
            console.log('Зараз переглядаємо рекламу, чекаємо...');
            updateCurrentStatus('⏳ Очікування реклами...');
            await wait(3000);
            return openAndClaimQuests();
        }

        state.currentDelay = getAdaptiveDelay();

        if (state.lastAdTime > 0 && Date.now() - state.lastAdTime < state.currentDelay) {
            const remaining = state.currentDelay - (Date.now() - state.lastAdTime);
            console.log(`Чекаємо затримку ${Math.round(remaining/1000)}с...`);
            updateCurrentStatus(`⏰ Затримка: ${Math.round(remaining/1000)}с`);
            await wait(remaining + 1000);
        }

        state.attempts++;
        console.log(`Спроба ${state.attempts} знайти кнопку завдань... (${state.totalAdWatches}/${settings.maxAds} реклам)`);
        updateCurrentStatus('🔍 Пошук завдань...');

        let questButton = findQuestButton();

        if (questButton) {
            console.log('Знайдено кнопку завдань');
            updateCurrentStatus('📋 Відкриття завдань...');
            if (safeClick(questButton)) {
                await wait(2500);
                await processQuestsModal();
            } else {
                console.log('Не вдалося клікнути кнопку завдань');
                state.errorCount++;
                await retryOrContinue();
            }
        } else {
            console.log('Кнопка завдань не знайдена');
            if (state.attempts < state.maxAttempts) {
                await wait(2000);
                await openAndClaimQuests();
            } else {
                console.log('Переходимо до перевірки головного екрану');
                await checkForAdsOnMainScreen();
            }
        }
    }

    function findQuestButton() {
        let button = document.querySelector('[data-page="quests"], [data-tab="quests"], .nav-item[data-page="quests"]');
        if (button) return button;

        const allButtons = document.querySelectorAll('.nav-item, .bottom-nav button, .menu-item, button');
        for (let btn of allButtons) {
            if (matchesPattern(btn.textContent, TEXT_PATTERNS.quests)) {
                return btn;
            }
        }

        button = document.querySelector('.quests-btn, .quests-button, .quests-icon');
        return button || null;
    }

    function matchesPattern(text, patterns) {
        const cleanText = (text || '').toString().trim().toLowerCase();
        return patterns.some(pattern =>
            cleanText.includes(pattern.toLowerCase())
        );
    }

    async function processQuestsModal() {
        if (!state.isRunning) return;

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
        updateCurrentStatus('📑 Перемикання вкладок...');

        const tabsContainer = document.querySelector('#quests-tabs-container, .quests-tabs, .tabs-container');
        const tabs = tabsContainer ?
            tabsContainer.querySelectorAll('.tab, .quest-tab, button, div[data-tab]') :
            document.querySelectorAll('.tab, .quest-tab, [data-tab]');

        let foundTab = false;

        for (let tab of tabs) {
            if (!state.isRunning) break;

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
            console.log('Шукаємо кнопки безпосередньо');
            await wait(1500);
            await clickClaimButtons();
        }
    }

    async function clickClaimButtons() {
        if (!state.isRunning || !checkSafety()) return;
        if (checkMaxAdsReached()) return;

        console.log('Шукаємо кнопки для кліку...');
        updateCurrentStatus('🔍 Пошук кнопок...');

        const allButtons = document.querySelectorAll('button');
        let foundAdButtons = false;

        for (let button of allButtons) {
            if (!state.isRunning) break;
            if (checkMaxAdsReached()) return;

            const text = (button.textContent || '').trim();

            if (matchesPattern(text, TEXT_PATTERNS.watchAd) &&
                !button.disabled &&
                getComputedStyle(button).display !== 'none') {

                console.log('Знайдено кнопку перегляду реклами:', text);

                if (!canWatchAd()) {
                    if (state.totalAdWatches >= settings.maxAds) {
                        checkMaxAdsReached();
                        return;
                    }
                    const remaining = Math.max(0, state.currentDelay - (Date.now() - state.lastAdTime));
                    console.log(`Затримка не пройшла, чекаємо ${Math.round(remaining/1000)}с`);
                    updateCurrentStatus(`⏰ Затримка: ${Math.round(remaining/1000)}с`);
                    await wait(remaining + 1000);
                    return clickClaimButtons();
                }

                foundAdButtons = true;
                console.log('Клікаємо на перегляд реклами...');
                updateCurrentStatus('📺 Перегляд реклами...');

                if (safeClick(button)) {
                    state.isWatchingAd = true;
                    state.adWatchCount++;
                    state.totalAdWatches++;
                    state.lastAdTime = Date.now();
                    state.lastActionTime = Date.now();

                    updateStatsDisplay();
                    saveProgress();

                    const nextDelay = getAdaptiveDelay();
                    console.log(`Переглядаємо рекламу (${state.totalAdWatches}/${settings.maxAds})`);

                    await wait(41000);

                    state.isWatchingAd = false;
                    state.currentDelay = nextDelay;

                    if (checkMaxAdsReached()) return;

                    console.log(`Реклама завершена, чекаємо ${Math.round(nextDelay/1000)}с`);
                    updateCurrentStatus(`⏰ Затримка: ${Math.round(nextDelay/1000)}с`);
                    await wait(nextDelay);

                    return clickClaimButtons();
                } else {
                    state.errorCount++;
                    console.log('Не вдалося клікнути кнопку реклами');
                }
                break;
            }
        }

        if (!foundAdButtons) {
            let foundClaims = false;
            for (let button of allButtons) {
                if (!state.isRunning) break;

                const text = (button.textContent || '').trim();
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
        if (!state.isRunning || !checkSafety()) return;
        if (checkMaxAdsReached()) return;

        console.log('Перевіряємо головний екран...');
        updateCurrentStatus('🔍 Пошук реклами...');

        state.currentDelay = getAdaptiveDelay();

        if (state.lastAdTime > 0 && Date.now() - state.lastAdTime < state.currentDelay) {
            const remaining = state.currentDelay - (Date.now() - state.lastAdTime);
            console.log(`Чекаємо затримку ${Math.round(remaining/1000)}с...`);
            updateCurrentStatus(`⏰ Затримка: ${Math.round(remaining/1000)}с`);
            await wait(remaining + 1000);
        }

        const allButtons = document.querySelectorAll('button');
        let foundAd = false;

        for (let button of allButtons) {
            if (!state.isRunning) break;
            if (checkMaxAdsReached()) return;

            const text = (button.textContent || '').trim();
            if (matchesPattern(text, TEXT_PATTERNS.watchAd) &&
                !button.disabled &&
                getComputedStyle(button).display !== 'none') {

                console.log('Знайдено кнопку реклами на головному екрані:', text);

                if (!canWatchAd()) {
                    if (state.totalAdWatches >= settings.maxAds) {
                        checkMaxAdsReached();
                        return;
                    }
                    const remaining = Math.max(0, state.currentDelay - (Date.now() - state.lastAdTime));
                    console.log(`Затримка не пройшла, чекаємо ${Math.round(remaining/1000)}с`);
                    updateCurrentStatus(`⏰ Затримка: ${Math.round(remaining/1000)}с`);
                    await wait(remaining + 1000);
                    return checkForAdsOnMainScreen();
                }

                foundAd = true;
                console.log('Клікаємо на рекламу...');
                updateCurrentStatus('📺 Перегляд реклами...');

                if (safeClick(button)) {
                    state.isWatchingAd = true;
                    state.adWatchCount++;
                    state.totalAdWatches++;
                    state.lastAdTime = Date.now();
                    state.lastActionTime = Date.now();

                    updateStatsDisplay();
                    saveProgress();

                    const nextDelay = getAdaptiveDelay();
                    console.log(`Переглядаємо рекламу (${state.totalAdWatches}/${settings.maxAds})`);

                    await wait(41000);

                    state.isWatchingAd = false;
                    state.currentDelay = nextDelay;

                    if (checkMaxAdsReached()) return;

                    console.log(`Реклама завершена, чекаємо ${Math.round(nextDelay/1000)}с`);
                    updateCurrentStatus(`⏰ Затримка: ${Math.round(nextDelay/1000)}с`);
                    await wait(nextDelay);

                    return checkForAdsOnMainScreen();
                } else {
                    state.errorCount++;
                }
                break;
            }
        }

        if (!foundAd) {
            console.log('Реклами не знайдено');
            console.log(`Підсумок циклу: ${state.adWatchCount} реклам, ${state.totalAdWatches}/${settings.maxAds} всього`);
            updateCurrentStatus('💤 Очікування...');

            state.adWatchCount = 0;
            state.attempts = 0;

            if (checkMaxAdsReached()) return;

            const cycleDelay = getAdaptiveDelay();
            console.log(`Чекаємо ${Math.round(cycleDelay/1000)}с перед новим циклом...`);
            updateCurrentStatus(`⏰ Очікування: ${Math.round(cycleDelay/1000)}с`);

            await wait(cycleDelay);

            if (state.isRunning && state.totalAdWatches < settings.maxAds) {
                console.log('Запускаємо новий цикл...');
                await openAndClaimQuests();
            }
        }
    }

    // === ДОПОМІЖНІ ФУНКЦІЇ ===
    function safeClick(element) {
        try {
            if (element && element instanceof HTMLElement &&
                !element.disabled &&
                element.style.display !== 'none' &&
                element.offsetParent !== null) {

                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.click();
                state.lastActionTime = Date.now();
                return true;
            }
        } catch (error) {
            console.error('Помилка при кліку:', error);
            state.errorCount++;
        }
        return false;
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function finalCheckAndClose() {
        if (!state.isRunning) return;
        if (checkMaxAdsReached()) return;

        await wait(2000);

        const finalButtons = document.querySelectorAll('button');
        let anyActive = false;

        for (let btn of finalButtons) {
            const txt = (btn.textContent || '').trim();
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

        const overlay = document.querySelector('.modal-backdrop, .modal-overlay');
        if (overlay) {
            safeClick(overlay);
            console.log('Спробували закрити через оверлей');
        }
    }

    async function retryOrContinue() {
        if (state.attempts < state.maxAttempts) {
            state.attempts++;
            await wait(2000);
            await openAndClaimQuests();
        } else {
            console.log('Переходимо до перевірки головного екрану');
            await checkForAdsOnMainScreen();
        }
    }

    function waitForGameLoad() {
        if (!state.isRunning) return;

        const gameElements = document.querySelectorAll('.top-panel, .bottom-nav, .garden-bed, #quests-modal, .game-container');
        if (gameElements.length > 0) {
            console.log('Гра завантажена!');
            updateCurrentStatus('✅ Гра завантажена');

            setTimeout(() => {
                if (state.isRunning && state.totalAdWatches < settings.maxAds && !settings.autoStart) {
                    showNotification('Автоматизація готова до роботи!', 'success');
                }
            }, 3000);
        } else {
            console.log('Очікування завантаження гри...');
            setTimeout(waitForGameLoad, 3000);
        }
    }

    // === СИСТЕМА СПОВІЩЕНЬ ===
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = type === 'error' ? 'linear-gradient(135deg, #ff0000, #ff6b6b)' :
                         type === 'success' ? 'linear-gradient(135deg, #00c853, #64dd17)' :
                         type === 'warning' ? 'linear-gradient(135deg, #FF9800, #FFC107)' :
                         'linear-gradient(135deg, #2196F3, #21CBF3)';

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${bgColor};
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            z-index: 10001;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            border: 2px solid white;
            animation: slideDown 0.3s ease;
            max-width: 80%;
            word-wrap: break-word;
            backdrop-filter: blur(10px);
        `;

        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideDown {
                    from { top: -100px; opacity: 0; }
                    to { top: 20px; opacity: 1; }
                }
                @keyframes slideUp {
                    from { top: 20px; opacity: 1; }
                    to { top: -100px; opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideUp 0.3s ease';
                setTimeout(() => notification.parentNode.removeChild(notification), 300);
            }
        }, 4000);
    }

    function showMaxAdsNotification() {
        showNotification(`🎉 Досягнуто ліміт ${settings.maxAds} реклам! Скрипт зупинено.`, 'success');
    }

    // === ЗБЕРЕЖЕННЯ ТА ВІДНОВЛЕННЯ ===
    function saveProgress() {
        const progress = {
            totalAdWatches: state.totalAdWatches,
            lastRun: Date.now(),
            version: '1.52'
        };
        localStorage.setItem('farmLandAutoProgress', JSON.stringify(progress));
    }

    function loadProgress() {
        try {
            const saved = localStorage.getItem('farmLandAutoProgress');
            if (saved) {
                const data = JSON.parse(saved);
                state.totalAdWatches = data.totalAdWatches || 0;
                console.log(`📊 Відновлено прогрес: ${state.totalAdWatches}/${settings.maxAds} реклам`);
                updateStatsDisplay();
            }
        } catch (error) {
            console.error('Помилка відновлення прогресу:', error);
        }
    }

    function updateStatsDisplay() {
        const stats = document.getElementById('auto-stats');
        if (stats) {
            const progress = Math.min((state.totalAdWatches / settings.maxAds) * 100, 100);
            stats.textContent = `Реклам: ${state.totalAdWatches}/${settings.maxAds} (${Math.round(progress)}%)`;

            const progressBar = document.getElementById('auto-progress-bar');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
                progressBar.style.background = progress >= 100 ? 'linear-gradient(135deg, #ff4444, #ff6b6b)' :
                                              progress >= 80 ? 'linear-gradient(135deg, #ff9800, #FFC107)' :
                                              'linear-gradient(135deg, #4CAF50, #8BC34A)';
            }
        }
    }

    // === ФУНКЦІЇ КЕРУВАННЯ ===
    function manualClaim() {
        if (checkMaxAdsReached()) {
            showNotification('Ліміт реклам вже досягнуто!', 'error');
            return;
        }

        state.isRunning = true;
        state.attempts = 0;
        state.adWatchCount = 0;
        state.errorCount = 0;
        state.lastAdTime = 0;
        state.currentDelay = getAdaptiveDelay();
        state.healthStatus = 'healthy';

        console.log(`🚀 Запуск автоматизації...`);
        showNotification('Автоматизацію запущено!', 'success');
        updateCurrentStatus('▶️ Запущено');
        openAndClaimQuests();
    }

    function stopAutoClaim() {
        state.isRunning = false;
        state.isWatchingAd = false;
        console.log('⏹️ Автоматизацію зупинено');
        showNotification('Автоматизацію зупинено', 'info');
        updateCurrentStatus('⏹️ Зупинено');
        saveProgress();
    }

    function resetCounters() {
        if (confirm('Скинути всі лічильники?')) {
            state.adWatchCount = 0;
            state.totalAdWatches = 0;
            state.attempts = 0;
            state.errorCount = 0;
            state.lastAdTime = 0;
            state.currentDelay = getAdaptiveDelay();
            state.isRunning = false;
            state.healthStatus = 'healthy';

            console.log('🔄 Лічильники скинуті');
            showNotification('Лічильники скинуті!', 'success');
            updateCurrentStatus('⏹️ Зупинено');
            updateStatsDisplay();
            saveProgress();
        }
    }

    // === ГЛОБАЛЬНІ ФУНКЦІЇ ===
    window.autoClaimQuests = manualClaim;
    window.stopAutoClaim = stopAutoClaim;
    window.resetAutoCounters = resetCounters;

    // Запуск скрипта
    console.log('🚀 Farm Land Auto Quest & Ads Claim - Ultimate Edition v1.37 активовано!');
    console.log('🛡️ Захищений режим | 🎲 Адаптивні затримки | 💾 Автозбереження');

    init();
})();
