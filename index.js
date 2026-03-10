// User Swipe Plugin - 极简可见版
(function() {
    'use strict';
    const PLUGIN_NAME = 'user-swipe';
    console.log(`[${PLUGIN_NAME}] 加载中...`);

    // 加载样式
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `extensions/${PLUGIN_NAME}/style.css`;
    document.head.appendChild(link);

    // 获取 SillyTavern 上下文
    function getContext() {
        try {
            return SillyTavern.getContext();
        } catch {
            return window.SillyTavern?.getContext?.() || null;
        }
    }

    // 确保用户消息包含版本数据
    function ensureUserSwipeData(message) {
        if (!message || !message.is_user) return;
        if (!message.user_swipes) {
            message.user_swipes = {
                versions: [message.mes],
                currentIndex: 0
            };
        }
    }

    // 更新消息显示
    function updateMessageContent(message, element, newText) {
        message.mes = newText;
        const mesText = element.querySelector('.mes_text');
        if (!mesText) return;

        const context = getContext();
        if (context?.renderMessageText) {
            mesText.innerHTML = context.renderMessageText(message, newText);
        } else if (window.renderMessageText) {
            mesText.innerHTML = window.renderMessageText(message, newText);
        } else {
            mesText.textContent = newText;
        }
    }

    // 触发编辑（模拟双击消息）
    function triggerEdit(element) {
        if (!element) return;
        element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    }

    // 从元素获取消息对象
    function getMessageFromElement(element) {
        const context = getContext();
        if (!context?.chat) return null;

        const mesId = element.getAttribute('mesid');
        if (mesId && context.chat[mesId]) {
            return context.chat[mesId];
        }
        return null;
    }

    // 为消息添加滑动控件
    function addSwipeControls(message, element) {
        if (!message || !element || !message.is_user) return;
        if (element.querySelector('.user-swipe-left')) return;

        ensureUserSwipeData(message);

        // 左箭头
        const leftArrow = document.createElement('span');
        leftArrow.className = 'user-swipe-left fa-solid fa-chevron-left';
        leftArrow.title = '上一个版本';

        // 右箭头
        const rightArrow = document.createElement('span');
        rightArrow.className = 'user-swipe-right fa-solid fa-chevron-right';
        rightArrow.title = '新建版本';

        element.appendChild(leftArrow);
        element.appendChild(rightArrow);

        // 更新左箭头显示状态
        function updateLeftArrow() {
            const count = message.user_swipes.versions.length;
            leftArrow.style.display = count > 1 ? 'flex' : 'none';
        }
        updateLeftArrow();

        // 切换版本（循环）
        function setVersion(newIndex) {
            const swipes = message.user_swipes;
            const total = swipes.versions.length;
            if (total === 0) return;
            newIndex = (newIndex + total) % total;
            swipes.currentIndex = newIndex;
            updateMessageContent(message, element, swipes.versions[newIndex]);
            updateLeftArrow();

            const context = getContext();
            if (context?.saveChat) context.saveChat();
        }

        // 左箭头点击
        leftArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            setVersion(message.user_swipes.currentIndex - 1);
        });

        // 右箭头点击
        rightArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('是否创建新版本？')) {
                const swipes = message.user_swipes;
                swipes.versions.push('');
                setVersion(swipes.versions.length - 1);
                triggerEdit(element);
            }
        });
    }

    // 扫描所有用户消息并添加控件
    function scanUserMessages() {
        document.querySelectorAll('.mes[is_user="true"], .mes[data-is-user="true"]').forEach(el => {
            const message = getMessageFromElement(el);
            if (message) {
                addSwipeControls(message, el);
            }
        });
    }

    // 监听新消息
    function observeNewMessages() {
        const chat = document.getElementById('chat');
        if (!chat) return;

        const observer = new MutationObserver(() => {
            setTimeout(scanUserMessages, 50);
        });
        observer.observe(chat, { childList: true, subtree: true });
    }

    // 初始化
    function init() {
        setTimeout(scanUserMessages, 500);
        observeNewMessages();
        setInterval(scanUserMessages, 2000);
        console.log(`[${PLUGIN_NAME}] 初始化完成`);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();