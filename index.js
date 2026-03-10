// User Swipe Plugin - 增强版
(function() {
    const pluginName = 'user-swipe';
    console.log(`[${pluginName}] 插件加载中...`);

    // 加载样式
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `extensions/${pluginName}/style.css`;  // 注意路径调整为 extensions
    link.onload = () => console.log(`[${pluginName}] 样式加载成功`);
    link.onerror = (e) => console.error(`[${pluginName}] 样式加载失败`, e);
    document.head.appendChild(link);

    // 获取 SillyTavern 上下文（如果可用）
    let STcontext = null;
    try {
        STcontext = SillyTavern.getContext();
        console.log(`[${pluginName}] 获取到 ST 上下文`, STcontext);
    } catch (e) {
        console.warn(`[${pluginName}] 无法获取 ST 上下文，将使用备用方法`, e);
    }

    // 确保用户消息包含版本数据
    function ensureUserSwipeData(message) {
        if (!message || typeof message !== 'object') return;
        if (message.is_user && !message.user_swipes) {
            message.user_swipes = {
                versions: [message.mes],
                currentIndex: 0
            };
            console.log(`[${pluginName}] 初始化消息版本`, message);
        }
    }

    // 更新消息显示内容
    function updateMessageContent(message, element, newText) {
        if (!element) return;
        message.mes = newText;
        const mesText = element.querySelector('.mes_text');
        if (!mesText) {
            console.warn(`[${pluginName}] 未找到消息文本元素`, element);
            return;
        }

        if (STcontext && typeof STcontext.renderMessageText === 'function') {
            mesText.innerHTML = STcontext.renderMessageText(message, newText);
        } else if (typeof window.renderMessageText === 'function') {
            mesText.innerHTML = window.renderMessageText(message, newText);
        } else {
            mesText.textContent = newText; // 降级
        }
    }

    // 为消息元素添加滑动控件
    function addSwipeControls(message, element) {
        if (!message || !element) return;
        if (!message.is_user) {
            return; // 只处理用户消息
        }
        if (element.querySelector('.user-swipe-controls')) return; // 已存在

        console.log(`[${pluginName}] 为用户消息添加控件`, message, element);

        ensureUserSwipeData(message);

        const controls = document.createElement('div');
        controls.className = 'user-swipe-controls';

        const leftArrow = document.createElement('span');
        leftArrow.className = 'user-swipe-arrow user-swipe-left fa-solid fa-chevron-left';
        leftArrow.title = '上一个版本';

        const counter = document.createElement('span');
        counter.className = 'user-swipe-counter';

        const rightArrow = document.createElement('span');
        rightArrow.className = 'user-swipe-arrow user-swipe-right fa-solid fa-chevron-right';
        rightArrow.title = '下一个版本';

        const addButton = document.createElement('span');
        addButton.className = 'user-swipe-add fa-solid fa-plus';
        addButton.title = '新建版本';

        controls.appendChild(leftArrow);
        controls.appendChild(counter);
        controls.appendChild(rightArrow);
        controls.appendChild(addButton);
        element.appendChild(controls);

        // 更新计数和箭头状态
        function updateCounterAndArrows() {
            const { versions, currentIndex } = message.user_swipes;
            counter.textContent = `${currentIndex + 1}/${versions.length}`;
            leftArrow.classList.toggle('disabled', currentIndex === 0);
            rightArrow.classList.toggle('disabled', currentIndex === versions.length - 1);
        }
        updateCounterAndArrows();

        function setVersion(newIndex) {
            const swipes = message.user_swipes;
            if (newIndex >= 0 && newIndex < swipes.versions.length) {
                swipes.currentIndex = newIndex;
                updateMessageContent(message, element, swipes.versions[newIndex]);
                updateCounterAndArrows();
                // 尝试保存聊天
                if (STcontext && STcontext.saveChat) {
                    STcontext.saveChat();
                } else if (typeof window.chat_save === 'function') {
                    window.chat_save();
                }
                console.log(`[${pluginName}] 切换到版本 ${newIndex+1}`);
            }
        }

        leftArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            setVersion(message.user_swipes.currentIndex - 1);
        });

        rightArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            setVersion(message.user_swipes.currentIndex + 1);
        });

        // 加号：弹出新建版本窗口
        addButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentMes = message.mes;
            const escaped = escapeHtml(currentMes);
            const popupContent = `
                <div class="user-swipe-popup">
                    <h3>新建版本</h3>
                    <textarea id="user-swipe-new-message" rows="5" style="width:100%;">${escaped}</textarea>
                </div>
            `;
            if (typeof window.callPopup === 'function') {
                window.callPopup(popupContent, 'confirm', {
                    ok: () => {
                        const textarea = document.getElementById('user-swipe-new-message');
                        if (textarea) {
                            const newText = textarea.value;
                            if (newText && newText !== currentMes) {
                                const swipes = message.user_swipes;
                                swipes.versions.push(newText);
                                setVersion(swipes.versions.length - 1);
                            }
                        }
                    },
                    cancel: () => {}
                });
            } else {
                alert('弹出窗口功能不可用。');
            }
        });
    }

    function escapeHtml(unsafe) {
        return unsafe.replace(/[&<>"']/g, (m) => {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            if (m === '"') return '&quot;';
            if (m === "'") return '&#039;';
            return m;
        });
    }

    // 初始化所有现有消息
    function initExistingMessages() {
        console.log(`[${pluginName}] 扫描现有消息...`);
        const messageElements = document.querySelectorAll('.mes');
        messageElements.forEach(el => {
            // 尝试从元素获取消息对象
            let message = null;
            const mesId = el.getAttribute('mesid');
            if (mesId && STcontext && STcontext.chat) {
                message = STcontext.chat[parseInt(mesId)];
            } else {
                // 后备：通过 data-message-id 或其他属性
                // 这里简单假设消息对象可通过 window.chat 和 data-mes-id 获取
                const idx = el.getAttribute('data-mes-id');
                if (idx && window.chat) {
                    message = window.chat[parseInt(idx)];
                }
            }
            if (message && message.is_user) {
                addSwipeControls(message, el);
            }
        });
    }

    // 监听事件
    function setupEventListeners() {
        if (STcontext && STcontext.eventSource) {
            // 使用 SillyTavern 事件系统
            STcontext.eventSource.on('message_rendered', (message, element) => {
                console.log(`[${pluginName}] 事件 message_rendered`, message, element);
                if (message && message.is_user) {
                    addSwipeControls(message, element);
                }
            });

            STcontext.eventSource.on('chat_loaded', () => {
                console.log(`[${pluginName}] 事件 chat_loaded`);
                initExistingMessages();
            });

            STcontext.eventSource.on('message_sent', (message) => {
                console.log(`[${pluginName}] 事件 message_sent`, message);
                if (message && message.is_user) {
                    ensureUserSwipeData(message);
                }
            });
        } else {
            // 后备：使用 MutationObserver 监听 DOM 变化
            console.log(`[${pluginName}] 使用 MutationObserver 后备方案`);
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mut => {
                    mut.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('mes')) {
                            // 新消息节点添加
                            setTimeout(() => {
                                // 延迟以确保消息内容已渲染
                                const idx = node.getAttribute('mesid');
                                if (idx !== null && window.chat && window.chat[idx]) {
                                    addSwipeControls(window.chat[idx], node);
                                }
                            }, 10);
                        }
                    });
                });
            });
            observer.observe(document.getElementById('chat') || document.body, { childList: true, subtree: true });

            // 初始化现有消息
            setTimeout(initExistingMessages, 500);
        }
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupEventListeners);
    } else {
        setupEventListeners();
    }

    console.log(`[${pluginName}] 插件加载完成`);
})();