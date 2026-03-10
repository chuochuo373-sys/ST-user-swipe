// User Swipe Plugin - 终极克隆版
(function() {
    'use strict';
    const PLUGIN_NAME = 'user-swipe';
    console.log(`[${PLUGIN_NAME}] 加载中...`);

    function getContext() {
        try { return SillyTavern.getContext(); } catch { return window.SillyTavern?.getContext?.() || null; }
    }

    // 存储克隆的样式
    let leftStyle = null, rightStyle = null, counterStyle = null, containerStyle = null;

    function cloneStylesFromAI(aiMes) {
        if (!aiMes) return false;
        const left = aiMes.querySelector('.swipe_left');
        const right = aiMes.querySelector('.swipe_right');
        const block = aiMes.querySelector('.swipeRightBlock');
        const counter = aiMes.querySelector('.swipes-counter');

        if (left) {
            const cs = getComputedStyle(left);
            leftStyle = {
                backgroundImage: cs.backgroundImage,
                backgroundSize: cs.backgroundSize,
                backgroundRepeat: cs.backgroundRepeat,
                backgroundPosition: cs.backgroundPosition,
                width: cs.width,
                height: cs.height,
            };
        }
        if (right) {
            const cs = getComputedStyle(right);
            rightStyle = {
                backgroundImage: cs.backgroundImage,
                backgroundSize: cs.backgroundSize,
                backgroundRepeat: cs.backgroundRepeat,
                backgroundPosition: cs.backgroundPosition,
                width: cs.width,
                height: cs.height,
            };
        }
        if (counter) {
            const cs = getComputedStyle(counter);
            counterStyle = {
                color: cs.color,
                fontSize: cs.fontSize,
                fontWeight: cs.fontWeight,
                lineHeight: cs.lineHeight,
                margin: cs.margin,
            };
        }
        if (block) {
            const cs = getComputedStyle(block);
            containerStyle = {
                display: cs.display,
                flexDirection: cs.flexDirection,
                alignItems: cs.alignItems,
                gap: cs.gap,
            };
        }
        return true;
    }

    function ensureUserSwipeData(message) {
        if (!message?.is_user) return;
        if (!message.user_swipes) {
            message.user_swipes = { versions: [message.mes], currentIndex: 0 };
        }
    }

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
        if (!message?.is_user || !element || element.querySelector('[data-user-swipe]')) return;

        // 尝试获取AI样式（如果还没有）
        if (!leftStyle && !rightStyle) {
            const aiMes = document.querySelector('.mes[is_user="false"]');
            if (aiMes) cloneStylesFromAI(aiMes);
        }

        ensureUserSwipeData(message);

        // 左箭头
        const left = document.createElement('span');
        left.className = 'swipe_left fa-solid fa-chevron-left interactable';
        left.setAttribute('data-user-swipe', 'true');
        left.title = '上一个版本';
        if (leftStyle) {
            Object.assign(left.style, leftStyle);
            left.style.fontSize = '0';
            left.style.color = 'transparent';
        } else {
            left.style.fontSize = '20px';
            left.style.color = 'var(--SmartThemeBodyColor, #ccc)';
        }

        // 右容器
        const rightBlock = document.createElement('div');
        rightBlock.className = 'swipeRightBlock flex-container flexFlow';
        rightBlock.setAttribute('data-user-swipe', 'true');
        if (containerStyle) Object.assign(rightBlock.style, containerStyle);

        const right = document.createElement('span');
        right.className = 'swipe_right fa-solid fa-chevron-right interactable';
        right.setAttribute('data-user-swipe', 'true');
        right.title = '下一个/新建';
        if (rightStyle) {
            Object.assign(right.style, rightStyle);
            right.style.fontSize = '0';
            right.style.color = 'transparent';
        } else {
            right.style.fontSize = '20px';
            right.style.color = 'var(--SmartThemeBodyColor, #ccc)';
        }

        const counter = document.createElement('span');
        counter.className = 'swipes-counter';
        counter.setAttribute('data-user-swipe', 'true');
        if (counterStyle) Object.assign(counter.style, counterStyle);
        else {
            counter.style.fontSize = '12px';
            counter.style.color = 'var(--SmartThemeBodyColor, #ccc)';
        }

        rightBlock.appendChild(right);
        rightBlock.appendChild(counter);
        element.appendChild(left);
        element.appendChild(rightBlock);

        // 定位
        left.style.position = 'absolute';
        left.style.bottom = '5px';
        left.style.left = '5px';
        left.style.zIndex = '100';
        rightBlock.style.position = 'absolute';
        rightBlock.style.bottom = '5px';
        rightBlock.style.right = '5px';
        rightBlock.style.zIndex = '100';

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
            if (!total) return;
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