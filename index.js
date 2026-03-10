// User Swipe Plugin - 稳定版（使用字体图标+主题变量）
(function() {
    'use strict';
    const PLUGIN_NAME = 'user-swipe';
    console.log(`[${PLUGIN_NAME}] 加载中...`);

    // 获取SillyTavern上下文
    function getContext() {
        try { return SillyTavern.getContext(); } catch { return window.SillyTavern?.getContext?.() || null; }
    }

    // 确保用户消息包含版本数据
    function ensureUserSwipeData(message) {
        if (!message?.is_user) return;
        if (!message.user_swipes) {
            message.user_swipes = { versions: [message.mes], currentIndex: 0 };
        }
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

    // 触发编辑（模拟双击消息）
    function triggerEdit(element) {
        element?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    }

    // 从元素获取消息对象
    function getMessageFromElement(element) {
        const context = getContext();
        if (!context?.chat) return null;
        const mesId = element.getAttribute('mesid');
        return mesId ? context.chat[mesId] : null;
    }

    // 为用户消息添加滑动控件
    function addSwipeControls(message, element) {
        if (!message?.is_user || !element) return;
        if (element.querySelector('.user-swipe-left, .user-swipe-right')) return; // 避免重复

        ensureUserSwipeData(message);

        // 左箭头
        const left = document.createElement('span');
        left.className = 'user-swipe-left fa-solid fa-chevron-left interactable';
        left.title = '上一个版本';

        // 右箭头
        const right = document.createElement('span');
        right.className = 'user-swipe-right fa-solid fa-chevron-right interactable';
        right.title = '下一个/新建';

        // 计数器
        const counter = document.createElement('span');
        counter.className = 'user-swipe-counter';

        // 将右箭头和计数器放入一个容器（便于对齐）
        const rightContainer = document.createElement('div');
        rightContainer.className = 'user-swipe-right-container';
        rightContainer.appendChild(right);
        rightContainer.appendChild(counter);

        element.appendChild(left);
        element.appendChild(rightContainer);

        // 更新UI：左箭头可见性、计数器文本
        function updateUI() {
            const count = message.user_swipes.versions.length;
            const idx = message.user_swipes.currentIndex;
            left.style.display = count > 1 ? 'flex' : 'none';
            counter.textContent = `${idx + 1}/${count}`;
        }
        updateUI();

        // 切换版本（循环）
        function setVersion(newIndex) {
            const swipes = message.user_swipes;
            const total = swipes.versions.length;
            if (total === 0) return;
            newIndex = (newIndex + total) % total;
            swipes.currentIndex = newIndex;
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
                    setVersion(swipes.versions.length - 1);
                    triggerEdit(element);
                }
            }
        });
    }

    // 扫描所有用户消息并添加控件
    function scan() {
        document.querySelectorAll('.mes[is_user="true"]').forEach(el => {
            const msg = getMessageFromElement(el);
            if (msg) addSwipeControls(msg, el);
        });
    }

    // 监听新消息
    const chat = document.getElementById('chat');
    if (chat) {
        new MutationObserver(() => setTimeout(scan, 50)).observe(chat, { childList: true, subtree: true });
    }
    setTimeout(scan, 500);
    setInterval(scan, 2000); // 保险轮询
    console.log(`[${PLUGIN_NAME}] 初始化完成`);
})();