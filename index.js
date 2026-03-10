// User Swipe Plugin - 动态克隆 AI 箭头样式，完美还原
(function() {
    'use strict';
    const PLUGIN_NAME = 'user-swipe';
    console.log(`[${PLUGIN_NAME}] 加载中...`);

    // 获取 SillyTavern 上下文
    function getContext() {
        try { return SillyTavern.getContext(); }
        catch { return window.SillyTavern?.getContext?.() || null; }
    }

    // 从 AI 消息克隆箭头、计数器的样式
    let clonedStyles = {
        left: null,
        right: null,
        counter: null,
        rightBlock: null
    };

    function cloneStylesFromAIMessage() {
        const aiMes = document.querySelector('.mes[is_user="false"]');
        if (!aiMes) return false;

        const left = aiMes.querySelector('.swipe_left');
        const right = aiMes.querySelector('.swipe_right');
        const block = aiMes.querySelector('.swipeRightBlock');
        const counter = aiMes.querySelector('.swipes-counter');

        if (left) {
            const cs = getComputedStyle(left);
            clonedStyles.left = {
                backgroundImage: cs.backgroundImage,
                backgroundSize: cs.backgroundSize,
                backgroundRepeat: cs.backgroundRepeat,
                backgroundPosition: cs.backgroundPosition,
                width: cs.width,
                height: cs.height,
                // 保留字体透明（因为主题可能隐藏了字体图标）
                fontSize: '0',
                color: 'transparent'
            };
        }
        if (right) {
            const cs = getComputedStyle(right);
            clonedStyles.right = {
                backgroundImage: cs.backgroundImage,
                backgroundSize: cs.backgroundSize,
                backgroundRepeat: cs.backgroundRepeat,
                backgroundPosition: cs.backgroundPosition,
                width: cs.width,
                height: cs.height,
                fontSize: '0',
                color: 'transparent'
            };
        }
        if (counter) {
            const cs = getComputedStyle(counter);
            clonedStyles.counter = {
                color: cs.color,
                fontSize: cs.fontSize,
                fontWeight: cs.fontWeight,
                lineHeight: cs.lineHeight,
                margin: cs.margin,
                padding: cs.padding
            };
        }
        if (block) {
            const cs = getComputedStyle(block);
            clonedStyles.rightBlock = {
                display: cs.display,
                flexDirection: cs.flexDirection,
                alignItems: cs.alignItems,
                gap: cs.gap,
                margin: cs.margin,
                padding: cs.padding
            };
        }
        return true;
    }

    // 确保消息有版本数据
    function ensureUserSwipeData(message) {
        if (!message?.is_user) return;
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

    // 触发编辑
    function triggerEdit(element) {
        if (!element) return;
        element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    }

    // 从元素获取消息对象
    function getMessageFromElement(element) {
        const context = getContext();
        if (!context?.chat) return null;
        const mesId = element.getAttribute('mesid');
        return mesId ? context.chat[mesId] : null;
    }

    // 为用户消息添加控件
    function addSwipeControls(message, element) {
        if (!message?.is_user || !element) return;
        // 避免重复
        if (element.querySelector('[data-user-swipe]')) return;

        // 如果没有克隆样式，尝试克隆
        if (!clonedStyles.left && !clonedStyles.right) {
            cloneStylesFromAIMessage();
        }

        ensureUserSwipeData(message);

        // 创建左箭头
        const left = document.createElement('span');
        left.className = 'swipe_left fa-solid fa-chevron-left interactable';
        left.setAttribute('data-user-swipe', 'true');
        left.title = '上一个版本';
        if (clonedStyles.left) {
            Object.assign(left.style, clonedStyles.left);
        } else {
            // 后备：使用主题变量
            left.style.fontSize = '20px';
            left.style.color = 'var(--SmartThemeBodyColor, #ccc)';
        }

        // 创建右容器（模仿 AI 结构）
        const rightBlock = document.createElement('div');
        rightBlock.className = 'swipeRightBlock flex-container flexFlow';
        rightBlock.setAttribute('data-user-swipe', 'true');
        if (clonedStyles.rightBlock) {
            Object.assign(rightBlock.style, clonedStyles.rightBlock);
        }

        const right = document.createElement('span');
        right.className = 'swipe_right fa-solid fa-chevron-right interactable';
        right.setAttribute('data-user-swipe', 'true');
        right.title = '下一个/新建';
        if (clonedStyles.right) {
            Object.assign(right.style, clonedStyles.right);
        } else {
            right.style.fontSize = '20px';
            right.style.color = 'var(--SmartThemeBodyColor, #ccc)';
        }

        const counter = document.createElement('span');
        counter.className = 'swipes-counter';
        counter.setAttribute('data-user-swipe', 'true');
        if (clonedStyles.counter) {
            Object.assign(counter.style, clonedStyles.counter);
        } else {
            counter.style.fontSize = '12px';
            counter.style.color = 'var(--SmartThemeBodyColor, #ccc)';
        }

        rightBlock.appendChild(right);
        rightBlock.appendChild(counter);
        element.appendChild(left);
        element.appendChild(rightBlock);

        // 添加绝对定位（确保位置正确）
        left.style.position = 'absolute';
        left.style.bottom = '5px';
        left.style.left = '5px';
        left.style.zIndex = '100';
        left.style.pointerEvents = 'auto';

        rightBlock.style.position = 'absolute';
        rightBlock.style.bottom = '5px';
        rightBlock.style.right = '5px';
        rightBlock.style.zIndex = '100';
        rightBlock.style.pointerEvents = 'auto';

        // 更新 UI
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
            // 逻辑：如果存在下一个版本，则切换到下一个；否则询问创建新版本
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
    function scanUserMessages() {
        document.querySelectorAll('.mes[is_user="true"], .mes[data-is-user="true"]').forEach(el => {
            const msg = getMessageFromElement(el);
            if (msg) addSwipeControls(msg, el);
        });
    }

    // 初始化
    function init() {
        // 尝试多次获取 AI 样式（等待页面加载）
        let attempts = 0;
        const interval = setInterval(() => {
            if (cloneStylesFromAIMessage() || attempts++ > 20) {
                clearInterval(interval);
                // 开始扫描
                setTimeout(scanUserMessages, 500);
                const chat = document.getElementById('chat');
                if (chat) {
                    new MutationObserver(() => setTimeout(scanUserMessages, 50))
                        .observe(chat, { childList: true, subtree: true });
                }
                setInterval(scanUserMessages, 2000);
                console.log(`[${PLUGIN_NAME}] 初始化完成，样式克隆状态：`, clonedStyles);
            }
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();