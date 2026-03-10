// User Swipe Plugin - 完美克隆AI消息样式 + 右箭头双重功能
(function() {
    'use strict';
    const PLUGIN_NAME = 'user-swipe';
    console.log(`[${PLUGIN_NAME}] 加载中...`);

    function getContext() {
        try { return SillyTavern.getContext(); } catch { return null; }
    }

    // 样式缓存
    let leftArrowStyles = null, rightArrowStyles = null, counterStyles = null;

    // 获取AI消息箭头的计算样式
    function fetchAIStyles() {
        const aiMes = document.querySelector('.mes[is_user="false"]');
        if (!aiMes) return false;

        const left = aiMes.querySelector('.swipe_left');
        const rightContainer = aiMes.querySelector('.swipeRightBlock');
        const right = rightContainer?.querySelector('.swipe_right');
        const counter = rightContainer?.querySelector('.swipes-counter');

        if (left) {
            const style = window.getComputedStyle(left);
            leftArrowStyles = {};
            ['backgroundImage','backgroundSize','backgroundRepeat','backgroundPosition',
             'width','height','minWidth','minHeight','border','borderRadius','boxShadow',
             'display','alignItems','justifyContent','color','fontSize','opacity',
             'transform','transition','margin','padding'].forEach(prop => {
                leftArrowStyles[prop] = style.getPropertyValue(prop);
            });
        }
        if (right) {
            const style = window.getComputedStyle(right);
            rightArrowStyles = {};
            ['backgroundImage','backgroundSize','backgroundRepeat','backgroundPosition',
             'width','height','minWidth','minHeight','border','borderRadius','boxShadow',
             'display','alignItems','justifyContent','color','fontSize','opacity',
             'transform','transition'].forEach(prop => {
                rightArrowStyles[prop] = style.getPropertyValue(prop);
            });
        }
        if (counter) {
            const style = window.getComputedStyle(counter);
            counterStyles = {};
            ['color','fontSize','fontWeight','lineHeight','margin','padding','display','textAlign'].forEach(prop => {
                counterStyles[prop] = style.getPropertyValue(prop);
            });
        }
        return !!(leftArrowStyles && rightArrowStyles && counterStyles);
    }

    function ensureUserSwipeData(message) {
        if (!message || !message.is_user) return;
        if (!message.user_swipes) {
            message.user_swipes = { versions: [message.mes], currentIndex: 0 };
        }
    }

    function updateMessageContent(message, element, newText) {
        message.mes = newText;
        const mesText = element.querySelector('.mes_text');
        if (!mesText) return;
        const context = getContext();
        if (context?.renderMessageText) {
            mesText.innerHTML = context.renderMessageText(message, newText);
        } else {
            mesText.textContent = newText;
        }
    }

    function triggerEdit(element) {
        element?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    }

    function getMessageFromElement(element) {
        const context = getContext();
        if (!context?.chat) return null;
        const mesId = element.getAttribute('mesid');
        return mesId && context.chat[mesId] ? context.chat[mesId] : null;
    }

    function addSwipeControls(message, element) {
        if (!message || !element || !message.is_user) return;
        if (element.querySelector('.swipe_left[data-user-swipe]')) return;

        if (!leftArrowStyles || !rightArrowStyles || !counterStyles) return;

        ensureUserSwipeData(message);

        // 左箭头
        const leftArrow = document.createElement('span');
        leftArrow.className = 'swipe_left fa-solid fa-chevron-left interactable';
        leftArrow.setAttribute('data-user-swipe', 'true');
        leftArrow.title = '上一个版本';
        Object.assign(leftArrow.style, leftArrowStyles, {
            position: 'absolute', left: '5px', bottom: '5px', zIndex: '1000', pointerEvents: 'auto'
        });

        // 右容器
        const rightContainer = document.createElement('div');
        rightContainer.className = 'swipeRightBlock flex-container flexFlow';
        rightContainer.setAttribute('data-user-swipe', 'true');
        rightContainer.style.cssText = 'position:absolute; right:5px; bottom:5px; z-index:1000; display:flex; flex-direction:column; align-items:center; pointer-events:auto;';

        // 右箭头
        const rightArrow = document.createElement('span');
        rightArrow.className = 'swipe_right fa-solid fa-chevron-right interactable';
        rightArrow.setAttribute('data-user-swipe', 'true');
        rightArrow.title = '下一个 / 新建版本';
        Object.assign(rightArrow.style, rightArrowStyles);

        // 计数器
        const counter = document.createElement('span');
        counter.className = 'swipes-counter';
        counter.setAttribute('data-user-swipe', 'true');
        Object.assign(counter.style, counterStyles);

        rightContainer.appendChild(rightArrow);
        rightContainer.appendChild(counter);
        element.appendChild(leftArrow);
        element.appendChild(rightContainer);

        function updateUI() {
            const idx = message.user_swipes.currentIndex;
            const total = message.user_swipes.versions.length;
            counter.textContent = `${idx + 1}/${total}`;
            leftArrow.style.display = total > 1 ? 'flex' : 'none';
        }
        updateUI();

        function setVersion(newIndex) {
            const swipes = message.user_swipes;
            const total = swipes.versions.length;
            newIndex = (newIndex + total) % total;
            swipes.currentIndex = newIndex;
            updateMessageContent(message, element, swipes.versions[newIndex]);
            updateUI();
            getContext()?.saveChat?.();
        }

        leftArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            setVersion(message.user_swipes.currentIndex - 1);
        });

        rightArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            const swipes = message.user_swipes;
            const idx = swipes.currentIndex;
            const total = swipes.versions.length;
            if (idx < total - 1) {
                setVersion(idx + 1);
            } else {
                if (confirm('是否创建新版本？')) {
                    swipes.versions.push('');
                    setVersion(swipes.versions.length - 1);
                    triggerEdit(element);
                }
            }
        });
    }

    function scanUserMessages() {
        document.querySelectorAll('.mes[is_user="true"], .mes[data-is-user="true"]').forEach(el => {
            const message = getMessageFromElement(el);
            if (message) addSwipeControls(message, el);
        });
    }

    function observeNewMessages() {
        const chat = document.getElementById('chat');
        if (!chat) return;
        new MutationObserver(() => setTimeout(scanUserMessages, 50))
            .observe(chat, { childList: true, subtree: true });
    }

    function init() {
        let attempts = 0;
        const interval = setInterval(() => {
            if (fetchAIStyles() || attempts++ > 30) {
                clearInterval(interval);
                if (!leftArrowStyles || !rightArrowStyles || !counterStyles) {
                    console.warn(`[${PLUGIN_NAME}] 使用后备样式`);
                    leftArrowStyles = { width:'30px', height:'30px', fontSize:'20px', color:'#ccc', display:'flex', alignItems:'center', justifyContent:'center' };
                    rightArrowStyles = { ...leftArrowStyles };
                    counterStyles = { color:'#ccc', fontSize:'12px', display:'block', textAlign:'center' };
                }
                setTimeout(scanUserMessages, 500);
                observeNewMessages();
                setInterval(scanUserMessages, 2000);
            }
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();