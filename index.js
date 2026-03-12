// User Swipe Plugin - 兼容管理插件版
(function() {
    'use strict';
    const PLUGIN_NAME = 'user-swipe';
    console.log(`[${PLUGIN_NAME}] 加载中...`);

    function getContext() {
        try { return SillyTavern.getContext(); } catch { return window.SillyTavern?.getContext?.() || null; }
    }

    // 确保用户消息包含版本数据，并同步到标准字段
    function ensureUserSwipeData(message) {
        if (!message?.is_user) return;

        // 情况1: 已有user_swipes，同步到swipes/swipe_id
        if (message.user_swipes) {
            message.swipes = message.user_swipes.versions;
            message.swipe_id = message.user_swipes.currentIndex;
            return;
        }

        // 情况2: 已有swipes（比如被其他插件初始化），创建user_swipes
        if (Array.isArray(message.swipes) && message.swipes.length > 0) {
            message.user_swipes = {
                versions: message.swipes,
                currentIndex: message.swipe_id || 0
            };
            return;
        }

        // 情况3: 完全初始化
        message.user_swipes = {
            versions: [message.mes],
            currentIndex: 0
        };
        message.swipes = message.user_swipes.versions;
        message.swipe_id = 0;
    }

    // 更新消息显示
    function updateMessageContent(message, element, newText) {
        message.mes = newText;
        const mesText = element.querySelector('.mes_text');
        if (!mesText) return;
        const context = getContext();
        if (context?.renderMessageText) mesText.innerHTML = context.renderMessageText(message, newText);
        else if (window.renderMessageText) mesText.innerHTML = window.renderMessageText(message, newText);
        else mesText.textContent = newText;
    }

    function triggerEdit(element) {
        element?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    }

    function getMessageFromElement(element) {
        const context = getContext();
        if (!context?.chat) return null;
        const mesId = element.getAttribute('mesid');
        return mesId ? context.chat[mesId] : null;
    }

    function addSwipeControls(message, element) {
        if (!message?.is_user || !element) return;
        if (element.querySelector('.user-swipe-left, .user-swipe-right-container')) return;

        ensureUserSwipeData(message);

        // 创建DOM元素
        const left = document.createElement('span');
        left.className = 'user-swipe-left fa-solid fa-chevron-left interactable';
        left.title = '上一个版本';

        const right = document.createElement('span');
        right.className = 'user-swipe-right fa-solid fa-chevron-right interactable';
        right.title = '下一个/新建';

        const counter = document.createElement('span');
        counter.className = 'user-swipe-counter';

        const rightContainer = document.createElement('div');
        rightContainer.className = 'user-swipe-right-container';
        rightContainer.appendChild(right);
        rightContainer.appendChild(counter);

        element.appendChild(left);
        element.appendChild(rightContainer);

        function updateUI() {
            const count = message.user_swipes.versions.length;
            const idx = message.user_swipes.currentIndex;
            left.style.display = count > 1 ? 'flex' : 'none';
            counter.textContent = `${idx + 1}/${count}`;
        }
        updateUI();

        function setVersion(newIndex) {
            const swipes = message.user_swipes;
            const total = swipes.versions.length;
            if (total === 0) return;
            newIndex = (newIndex + total) % total;
            swipes.currentIndex = newIndex;
            // 同步标准字段
            message.swipe_id = newIndex;
            updateMessageContent(message, element, swipes.versions[newIndex]);
            updateUI();
            getContext()?.saveChat?.();
        }

        left.addEventListener('click', (e) => {
            e.stopPropagation();
            setVersion(message.user_swipes.currentIndex - 1);
        });

        right.addEventListener('click', (e) => {
            e.stopPropagation();
            const swipes = message.user_swipes;
            if (swipes.currentIndex < swipes.versions.length - 1) {
                setVersion(swipes.currentIndex + 1);
            } else {
                if (confirm('是否创建新版本？')) {
                    swipes.versions.push('');
                    // 同步标准字段：swipes数组自动同步（因为是同一个数组引用）
                    setVersion(swipes.versions.length - 1);
                    triggerEdit(element);
                }
            }
        });
    }

    function scan() {
        document.querySelectorAll('.mes[is_user="true"]').forEach(el => {
            const msg = getMessageFromElement(el);
            if (msg) addSwipeControls(msg, el);
        });
    }

    const chat = document.getElementById('chat');
    if (chat) {
        new MutationObserver(() => setTimeout(scan, 50)).observe(chat, { childList: true, subtree: true });
    }
    setTimeout(scan, 500);
    setInterval(scan, 2000);
    console.log(`[${PLUGIN_NAME}] 初始化完成`);
})();