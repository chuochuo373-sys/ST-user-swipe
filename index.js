// User Swipe Plugin - 动态复制AI消息箭头样式
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

    // 存储AI消息箭头的样式
    let leftArrowStyle = null;
    let rightArrowStyle = null;

    // 获取AI消息箭头的计算样式
    function fetchAISwipeStyles() {
        const aiMes = document.querySelector('.mes[is_user="false"]');
        if (!aiMes) return false;

        const left = aiMes.querySelector('.swipe_left');
        const right = aiMes.querySelector('.swipe_right');
        const rightContainer = aiMes.querySelector('.swipeRightBlock');

        if (left) {
            const style = window.getComputedStyle(left);
            leftArrowStyle = {
                backgroundImage: style.backgroundImage,
                width: style.width,
                height: style.height,
                backgroundSize: style.backgroundSize,
                backgroundRepeat: style.backgroundRepeat,
                backgroundPosition: style.backgroundPosition,
                // 保留一些关键定位属性，但我们会自己定位
            };
            console.log(`[${PLUGIN_NAME}] 获取到左箭头样式:`, leftArrowStyle);
        }

        if (right) {
            const style = window.getComputedStyle(right);
            rightArrowStyle = {
                backgroundImage: style.backgroundImage,
                width: style.width,
                height: style.height,
                backgroundSize: style.backgroundSize,
                backgroundRepeat: style.backgroundRepeat,
                backgroundPosition: style.backgroundPosition,
            };
            console.log(`[${PLUGIN_NAME}] 获取到右箭头样式:`, rightArrowStyle);
        }

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

        // 如果没有获取到AI样式，尝试重新获取
        if (!leftArrowStyle && !rightArrowStyle) {
            fetchAISwipeStyles();
        }

        ensureUserSwipeData(message);

        // 左箭头
        const leftArrow = document.createElement('span');
        leftArrow.className = 'swipe_left fa-solid fa-chevron-left interactable';
        leftArrow.setAttribute('data-user-swipe', 'true');
        leftArrow.title = '上一个版本';

        // 右箭头容器（模仿AI消息结构）
        const rightContainer = document.createElement('div');
        rightContainer.className = 'swipeRightBlock flex-container flexFlow';
        rightContainer.setAttribute('data-user-swipe', 'true');

        const rightArrow = document.createElement('span');
        rightArrow.className = 'swipe_right fa-solid fa-chevron-right interactable';
        rightArrow.setAttribute('data-user-swipe', 'true');
        rightArrow.title = '新建版本';

        const counter = document.createElement('span');
        counter.className = 'swipes-counter';
        counter.setAttribute('data-user-swipe', 'true');

        rightContainer.appendChild(rightArrow);
        rightContainer.appendChild(counter);
        element.appendChild(leftArrow);
        element.appendChild(rightContainer);

        // 应用从AI消息复制来的样式
        if (leftArrowStyle) {
            Object.assign(leftArrow.style, {
                backgroundImage: leftArrowStyle.backgroundImage,
                width: leftArrowStyle.width,
                height: leftArrowStyle.height,
                backgroundSize: leftArrowStyle.backgroundSize,
                backgroundRepeat: leftArrowStyle.backgroundRepeat,
                backgroundPosition: leftArrowStyle.backgroundPosition,
                fontSize: '0', // 隐藏字体图标
                color: 'transparent',
            });
        }

        if (rightArrowStyle) {
            Object.assign(rightArrow.style, {
                backgroundImage: rightArrowStyle.backgroundImage,
                width: rightArrowStyle.width,
                height: rightArrowStyle.height,
                backgroundSize: rightArrowStyle.backgroundSize,
                backgroundRepeat: rightArrowStyle.backgroundRepeat,
                backgroundPosition: rightArrowStyle.backgroundPosition,
                fontSize: '0',
                color: 'transparent',
            });
        }

        // 更新计数器文本和左箭头显示
        function updateLeftArrow() {
            const count = message.user_swipes.versions.length;
            leftArrow.style.display = count > 1 ? 'flex' : 'none';
        }
        updateLeftArrow();

        function updateCounter() {
            const idx = message.user_swipes.currentIndex;
            const total = message.user_swipes.versions.length;
            counter.textContent = `${idx + 1}/${total}`;
        }
        updateCounter();

        // 切换版本（循环）
        function setVersion(newIndex) {
            const swipes = message.user_swipes;
            const total = swipes.versions.length;
            if (total === 0) return;
            newIndex = (newIndex + total) % total;
            swipes.currentIndex = newIndex;
            updateMessageContent(message, element, swipes.versions[newIndex]);
            updateLeftArrow();
            updateCounter();

            const context = getContext();
            if (context?.saveChat) context.saveChat();
        }

        leftArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            setVersion(message.user_swipes.currentIndex - 1);
        });

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

    // 初始化：先尝试获取AI样式，再开始扫描
    function init() {
        // 尝试多次获取AI样式，直到成功或超时
        let attempts = 0;
        const interval = setInterval(() => {
            if (fetchAISwipeStyles() || attempts++ > 20) {
                clearInterval(interval);
                setTimeout(scanUserMessages, 500);
                observeNewMessages();
                setInterval(scanUserMessages, 2000);
                console.log(`[${PLUGIN_NAME}] 初始化完成，AI样式${leftArrowStyle ? '已' : '未'}获取`);
            }
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();