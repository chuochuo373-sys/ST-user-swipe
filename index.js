// User Swipe Plugin - 完整版，包含计数器，右箭头智能行为
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

    // 存储从AI消息复制来的样式
    let leftArrowStyle = null;
    let rightArrowStyle = null;
    let counterStyle = null;

    // 获取AI消息箭头的计算样式
    function fetchAISwipeStyles() {
        const aiMes = document.querySelector('.mes[is_user="false"]');
        if (!aiMes) return false;

        const left = aiMes.querySelector('.swipe_left');
        const right = aiMes.querySelector('.swipe_right');
        const counter = aiMes.querySelector('.swipes-counter');

        if (left) {
            const style = window.getComputedStyle(left);
            leftArrowStyle = {
                backgroundImage: style.backgroundImage,
                width: style.width,
                height: style.height,
                backgroundSize: style.backgroundSize,
                backgroundRepeat: style.backgroundRepeat,
                backgroundPosition: style.backgroundPosition,
                margin: style.margin,
                padding: style.padding,
                // 不复制定位属性，我们会自己定位
            };
            console.log(`[${PLUGIN_NAME}] 获取到左箭头样式`);
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
                margin: style.margin,
                padding: style.padding,
            };
            console.log(`[${PLUGIN_NAME}] 获取到右箭头样式`);
        }

        if (counter) {
            const style = window.getComputedStyle(counter);
            counterStyle = {
                color: style.color,
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                fontFamily: style.fontFamily,
                margin: style.margin,
                padding: style.padding,
                // 其他文本样式
            };
            console.log(`[${PLUGIN_NAME}] 获取到计数器样式`);
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
                margin: leftArrowStyle.margin,
                padding: leftArrowStyle.padding,
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
                margin: rightArrowStyle.margin,
                padding: rightArrowStyle.padding,
                fontSize: '0',
                color: 'transparent',
            });
        }

        if (counterStyle) {
            Object.assign(counter.style, {
                color: counterStyle.color,
                fontSize: counterStyle.fontSize,
                fontWeight: counterStyle.fontWeight,
                fontFamily: counterStyle.fontFamily,
                margin: counterStyle.margin,
                padding: counterStyle.padding,
            });
        }

        // 更新UI函数
        function updateLeftArrow() {
            const count = message.user_swipes.versions.length;
            leftArrow.style.display = count > 1 ? 'flex' : 'none';
        }

        function updateCounter() {
            const idx = message.user_swipes.currentIndex;
            const total = message.user_swipes.versions.length;
            counter.textContent = `${idx + 1}/${total}`;
        }

        // 初始化显示
        updateLeftArrow();
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

        // 左箭头点击
        leftArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            setVersion(message.user_swipes.currentIndex - 1);
        });

        // 右箭头点击：智能行为
        rightArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            const swipes = message.user_swipes;
            const currentIdx = swipes.currentIndex;
            const total = swipes.versions.length;

            // 如果不是最后一个版本，切换到下一个
            if (currentIdx < total - 1) {
                setVersion(currentIdx + 1);
                return;
            }

            // 是最后一个版本，询问是否创建新版本
            if (confirm('是否创建新版本？')) {
                swipes.versions.push('');
                setVersion(swipes.versions.length - 1); // 切换到新版本
                triggerEdit(element); // 立即打开编辑
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
                console.log(`[${PLUGIN_NAME}] 初始化完成，样式获取状态: 左${!!leftArrowStyle} 右${!!rightArrowStyle} 计数器${!!counterStyle}`);
            }
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();