// User Swipe Plugin - 最终完美版
(function() {
    'use strict';
    const PLUGIN_NAME = 'user-swipe';
    console.log(`[${PLUGIN_NAME}] 加载中...`);

    // 获取 SillyTavern 上下文
    function getContext() {
        try {
            return SillyTavern.getContext();
        } catch {
            return window.SillyTavern?.getContext?.() || null;
        }
    }

    // 存储AI消息箭头样式
    let arrowStyles = null;

    // 提取AI消息箭头样式并注入CSS
    function extractAndInjectStyles() {
        const aiMes = document.querySelector('.mes[is_user="false"]');
        if (!aiMes) return false;

        const leftArrow = aiMes.querySelector('.swipe_left');
        const rightArrow = aiMes.querySelector('.swipe_right');
        const rightContainer = aiMes.querySelector('.swipeRightBlock');
        const counter = aiMes.querySelector('.swipes-counter');

        if (!leftArrow || !rightArrow || !rightContainer) return false;

        // 获取计算样式
        const leftStyle = window.getComputedStyle(leftArrow);
        const rightStyle = window.getComputedStyle(rightArrow);
        const containerStyle = window.getComputedStyle(rightContainer);
        const counterStyle = counter ? window.getComputedStyle(counter) : null;

        // 构建CSS规则
        const cssRules = [];

        // 左箭头
        cssRules.push(`
            .mes[is_user="true"] .swipe_left[data-user-swipe] {
                position: absolute !important;
                left: 5px !important;
                bottom: 5px !important;
                z-index: 1000 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: pointer !important;
                width: ${leftStyle.width} !important;
                height: ${leftStyle.height} !important;
                background: ${leftStyle.background} !important;
                background-image: ${leftStyle.backgroundImage} !important;
                background-size: ${leftStyle.backgroundSize} !important;
                background-repeat: ${leftStyle.backgroundRepeat} !important;
                background-position: ${leftStyle.backgroundPosition} !important;
                font-size: 0 !important; /* 隐藏字体图标 */
                color: transparent !important;
                opacity: ${leftStyle.opacity} !important;
                filter: ${leftStyle.filter} !important;
                transform: none !important;
                -webkit-transform: none !important;
                pointer-events: auto !important;
            }
        `);

        // 右箭头容器
        cssRules.push(`
            .mes[is_user="true"] .swipeRightBlock[data-user-swipe] {
                position: absolute !important;
                right: 5px !important;
                bottom: 5px !important;
                z-index: 1000 !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: default !important;
                width: ${containerStyle.width} !important;
                height: ${containerStyle.height} !important;
                background: ${containerStyle.background} !important;
                opacity: ${containerStyle.opacity} !important;
                filter: ${containerStyle.filter} !important;
                transform: none !important;
                -webkit-transform: none !important;
                pointer-events: none !important; /* 容器不接收点击，箭头接收 */
            }
        `);

        // 右箭头
        cssRules.push(`
            .mes[is_user="true"] .swipe_right[data-user-swipe] {
                display: block !important;
                cursor: pointer !important;
                width: ${rightStyle.width} !important;
                height: ${rightStyle.height} !important;
                background: ${rightStyle.background} !important;
                background-image: ${rightStyle.backgroundImage} !important;
                background-size: ${rightStyle.backgroundSize} !important;
                background-repeat: ${rightStyle.backgroundRepeat} !important;
                background-position: ${rightStyle.backgroundPosition} !important;
                font-size: 0 !important;
                color: transparent !important;
                opacity: ${rightStyle.opacity} !important;
                filter: ${rightStyle.filter} !important;
                transform: none !important;
                -webkit-transform: none !important;
                pointer-events: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
            }
        `);

        // 计数器
        if (counterStyle) {
            cssRules.push(`
                .mes[is_user="true"] .swipes-counter[data-user-swipe] {
                    display: block !important;
                    font-size: ${counterStyle.fontSize} !important;
                    color: ${counterStyle.color} !important;
                    font-weight: ${counterStyle.fontWeight} !important;
                    line-height: ${counterStyle.lineHeight} !important;
                    margin: ${counterStyle.margin} !important;
                    padding: ${counterStyle.padding} !important;
                    opacity: ${counterStyle.opacity} !important;
                    filter: ${counterStyle.filter} !important;
                    pointer-events: none !important;
                    background: none !important;
                    border: none !important;
                    box-shadow: none !important;
                }
            `);
        }

        // 注入CSS
        const style = document.createElement('style');
        style.id = 'user-swipe-styles';
        style.textContent = cssRules.join('\n');
        document.head.appendChild(style);

        console.log(`[${PLUGIN_NAME}] 样式注入成功`);
        return true;
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

    // 为用户消息添加滑动控件
    function addSwipeControls(message, element) {
        if (!message || !element || !message.is_user) return;
        if (element.querySelector('.swipe_left[data-user-swipe]')) return;

        ensureUserSwipeData(message);

        // 左箭头
        const leftArrow = document.createElement('span');
        leftArrow.className = 'swipe_left fa-solid fa-chevron-left interactable';
        leftArrow.setAttribute('data-user-swipe', 'true');
        leftArrow.title = '上一个版本';

        // 右箭头容器
        const rightContainer = document.createElement('div');
        rightContainer.className = 'swipeRightBlock flex-container flexFlow';
        rightContainer.setAttribute('data-user-swipe', 'true');

        const rightArrow = document.createElement('span');
        rightArrow.className = 'swipe_right fa-solid fa-chevron-right interactable';
        rightArrow.setAttribute('data-user-swipe', 'true');
        rightArrow.title = '新建/下一个版本';

        const counter = document.createElement('span');
        counter.className = 'swipes-counter';
        counter.setAttribute('data-user-swipe', 'true');

        rightContainer.appendChild(rightArrow);
        rightContainer.appendChild(counter);
        element.appendChild(leftArrow);
        element.appendChild(rightContainer);

        // 初始化显示
        const swipes = message.user_swipes;
        const updateUI = () => {
            const total = swipes.versions.length;
            const idx = swipes.currentIndex;
            leftArrow.style.display = total > 1 ? 'flex' : 'none';
            counter.textContent = `${idx + 1}/${total}`;
        };
        updateUI();

        // 切换版本（循环）
        const setVersion = (newIndex) => {
            const total = swipes.versions.length;
            if (total === 0) return;
            newIndex = (newIndex + total) % total;
            swipes.currentIndex = newIndex;
            updateMessageContent(message, element, swipes.versions[newIndex]);
            updateUI();

            const context = getContext();
            if (context?.saveChat) context.saveChat();
        };

        // 左箭头点击
        leftArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            setVersion(swipes.currentIndex - 1);
        });

        // 右箭头点击
        rightArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            const total = swipes.versions.length;
            const idx = swipes.currentIndex;
            if (idx < total - 1) {
                // 有下一个版本，直接切换
                setVersion(idx + 1);
            } else {
                // 已经是最后一个版本，询问创建新版本
                if (confirm('是否创建新版本？')) {
                    swipes.versions.push('');
                    setVersion(swipes.versions.length - 1);
                    triggerEdit(element);
                }
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

    // 初始化：先提取样式，然后扫描消息
    function init() {
        // 尝试多次提取样式（等待AI消息加载）
        let attempts = 0;
        const interval = setInterval(() => {
            if (extractAndInjectStyles() || attempts++ > 20) {
                clearInterval(interval);
                setTimeout(scanUserMessages, 500);
                observeNewMessages();
                setInterval(scanUserMessages, 2000);
                console.log(`[${PLUGIN_NAME}] 初始化完成`);
            }
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();