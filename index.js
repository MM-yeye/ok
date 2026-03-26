// AI Character Generator - 五页版（含API测试）
(function() {
    setTimeout(() => {
        try {
            initPlugin();
        } catch (e) {
            console.warn("AI人设生成器启动失败:", e);
        }
    }, 1000);

    function initPlugin() {
        const PANEL_ID = 'ai-char-generator-panel';
        
        // 配置
        let config = {
            apiUrl: 'https://api.openai.com/v1/chat/completions',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            cardType: 'character',
            themeMode: 'auto', // 'auto' 或 'fixed'
            panelWidth: 350,
            panelHeight: 550
        };

        // 读取存储
        try {
            const saved = localStorage.getItem('ai_char_gen_config');
            if (saved) config = { ...config, ...JSON.parse(saved) };
        } catch (err) {}

        function saveConfig() {
            localStorage.setItem('ai_char_gen_config', JSON.stringify(config));
        }

        // 测试API连接
        async function testAPIConnection() {
            if (!config.apiKey) {
                toastr.error('请先填写 API Key');
                return false;
            }
            
            const testMessage = {
                model: config.model,
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 5
            };
            
            try {
                const response = await fetch(config.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify(testMessage)
                });
                
                if (response.ok) {
                    toastr.success('API连接成功！');
                    return true;
                } else {
                    const error = await response.text();
                    toastr.error(`连接失败: ${error.substring(0, 100)}`);
                    return false;
                }
            } catch (err) {
                toastr.error(`连接失败: ${err.message}`);
                return false;
            }
        }

        // 模板
        const TEMPLATE = `name: 
nickname: 
age: 
gender: 
height: 
identity: 
background: 
appearance: 
personality: 
likes: 
dislikes: 
first_message: 
example_messages: `;

        function getSystemPrompt(cardType) {
            if (cardType === 'character') {
                return `你是一个专业的角色设定助手。根据用户输入的简单描述，生成一个完整的SillyTavern角色卡。
请严格按照以下YAML模板格式输出，不要添加任何额外解释，只输出YAML内容。
模板：
${TEMPLATE}

要求：
1. 所有字段都要填充，不能留空
2. 生成的内容要符合角色设定，有趣且合理
3. first_message 是角色说的第一句话，要自然生动
4. example_messages 是对话示例，格式如：<START>\\n{{user}}: 你好\\n{{char}}: 你好啊`;
            } else {
                return `你是一个专业的用户设定助手。根据用户输入的简单描述，生成一个完整的用户人设。
请严格按照以下YAML模板格式输出，不要添加任何额外解释，只输出YAML内容。
模板：
${TEMPLATE.replace('name', 'user_name')}

要求：
1. 所有字段都要填充，不能留空
2. 生成的内容要符合用户设定`;
            }
        }

        async function generateCharacter(userInput, cardType) {
            if (!config.apiKey) {
                toastr.error('请先设置 API Key');
                return null;
            }

            const systemPrompt = getSystemPrompt(cardType);
            
            const response = await fetch(config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userInput }
                    ],
                    temperature: 0.8,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                const error = await response.text();
                toastr.error(`API调用失败: ${error}`);
                return null;
            }

            const data = await response.json();
            let content = data.choices[0].message.content;
            
            const yamlMatch = content.match(/```(?:yaml)?\n([\s\S]*?)\n```/);
            if (yamlMatch) {
                content = yamlMatch[1];
            }
            
            return content;
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                toastr.success('已复制到剪贴板');
            }).catch(() => {
                toastr.error('复制失败');
            });
        }

        // 创建面板
        function createPanel() {
            if (document.getElementById(PANEL_ID)) return;

            const panel = document.createElement('div');
            panel.id = PANEL_ID;
            panel.className = 'ai-char-panel';
            panel.style.width = `${config.panelWidth}px`;
            panel.style.height = `${config.panelHeight}px`;
            panel.innerHTML = `
                <div class="ai-panel-header" id="ai-panel-drag-handle">
                    <span>🤖 AI人设生成器</span>
                    <div class="ai-panel-controls">
                        <span class="ai-panel-close" title="关闭">✕</span>
                    </div>
                </div>
                
                <div class="ai-tab-bar">
                    <button class="ai-tab-btn active" data-tab="api">🔑 API</button>
                    <button class="ai-tab-btn" data-tab="char">👤 角色卡</button>
                    <button class="ai-tab-btn" data-tab="user">👾 用户人设</button>
                    <button class="ai-tab-btn" data-tab="theme">🎨 主题</button>
                    <button class="ai-tab-btn" data-tab="size">📐 大小</button>
                </div>
                
                <!-- 页1: API设置 -->
                <div class="ai-tab-content active" id="tab-api">
                    <div class="ai-setting-group">
                        <label>API地址</label>
                        <input type="text" id="ai-api-url" placeholder="https://api.openai.com/v1/chat/completions" value="${config.apiUrl}">
                    </div>
                    <div class="ai-setting-group">
                        <label>API Key</label>
                        <input type="password" id="ai-api-key" placeholder="sk-..." value="${config.apiKey}">
                    </div>
                    <div class="ai-setting-group">
                        <label>模型</label>
                        <input type="text" id="ai-model" placeholder="gpt-3.5-turbo" value="${config.model}">
                    </div>
                    <div class="ai-button-group">
                        <button id="ai-test-connection" class="ai-btn ai-btn-secondary">🔌 测试连接</button>
                        <button id="ai-save-api" class="ai-btn ai-btn-primary">💾 保存设置</button>
                    </div>
                </div>
                
                <!-- 页2: 角色卡生成 -->
                <div class="ai-tab-content" id="tab-char">
                    <div class="ai-setting-group">
                        <label>简单设定</label>
                        <textarea id="ai-char-input" rows="3" placeholder="例如：前锋，蜡像师的挚爱，所有屠孝子心里最柔软的地方"></textarea>
                    </div>
                    <div class="ai-button-group">
                        <button id="ai-char-generate" class="ai-btn ai-btn-primary">✨ 生成角色卡</button>
                    </div>
                    <div class="ai-setting-group">
                        <label>生成结果</label>
                        <textarea id="ai-char-result" rows="8" readonly placeholder="生成结果会显示在这里..."></textarea>
                    </div>
                    <div class="ai-button-group">
                        <button id="ai-char-copy" class="ai-btn ai-btn-secondary" disabled>📋 复制</button>
                        <button id="ai-char-import" class="ai-btn ai-btn-secondary" disabled>📥 导入</button>
                    </div>
                </div>
                
                <!-- 页3: 用户人设生成 -->
                <div class="ai-tab-content" id="tab-user">
                    <div class="ai-setting-group">
                        <label>简单设定</label>
                        <textarea id="ai-user-input" rows="3" placeholder="例如：菲利普，锋儿最爱的老公"></textarea>
                    </div>
                    <div class="ai-button-group">
                        <button id="ai-user-generate" class="ai-btn ai-btn-primary">✨ 生成用户人设</button>
                    </div>
                    <div class="ai-setting-group">
                        <label>生成结果</label>
                        <textarea id="ai-user-result" rows="8" readonly placeholder="生成结果会显示在这里..."></textarea>
                    </div>
                    <div class="ai-button-group">
                        <button id="ai-user-copy" class="ai-btn ai-btn-secondary" disabled>📋 复制</button>
                        <button id="ai-user-import" class="ai-btn ai-btn-secondary" disabled>📥 导入</button>
                    </div>
                </div>
                
                <!-- 页4: 主题设置 -->
                <div class="ai-tab-content" id="tab-theme">
                    <div class="ai-setting-group">
                        <label>界面主题</label>
                        <div class="ai-radio-group">
                            <label><input type="radio" name="theme-mode" value="auto" ${config.themeMode === 'auto' ? 'checked' : ''}> 适配酒馆美化</label>
                            <label><input type="radio" name="theme-mode" value="fixed" ${config.themeMode === 'fixed' ? 'checked' : ''}> 白底黑字</label>
                        </div>
                    </div>
                    <div class="ai-setting-group theme-preview">
                        <div class="theme-preview-box" id="theme-preview-box">
                            <span>预览效果</span>
                            <span class="preview-text">示例文字</span>
                        </div>
                    </div>
                </div>
                
                <!-- 页5: 大小设置 -->
                <div class="ai-tab-content" id="tab-size">
                    <div class="ai-setting-group">
                        <label>面板宽度 <span id="width-value">${config.panelWidth}</span> px</label>
                        <input type="range" id="panel-width-slider" min="300" max="600" step="10" value="${config.panelWidth}">
                    </div>
                    <div class="ai-setting-group">
                        <label>面板高度 <span id="height-value">${config.panelHeight}</span> px</label>
                        <input type="range" id="panel-height-slider" min="400" max="800" step="10" value="${config.panelHeight}">
                    </div>
                    <div class="ai-setting-group">
                        <label>字体大小 <span id="font-value">13</span> px</label>
                        <input type="range" id="font-size-slider" min="10" max="18" step="1" value="13">
                    </div>
                </div>
            `;
            document.body.appendChild(panel);

            // 拖动功能
            let isDragging = false;
            let dragStartX, dragStartY, panelStartLeft, panelStartTop;

            const handle = document.getElementById('ai-panel-drag-handle');
            
            handle.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('ai-panel-close')) return;
                isDragging = true;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                const rect = panel.getBoundingClientRect();
                panelStartLeft = rect.left;
                panelStartTop = rect.top;
                panel.style.cursor = 'grabbing';
                e.preventDefault();
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const dx = e.clientX - dragStartX;
                const dy = e.clientY - dragStartY;
                panel.style.left = `${panelStartLeft + dx}px`;
                panel.style.top = `${panelStartTop + dy}px`;
                panel.style.transform = 'none';
            });

            window.addEventListener('mouseup', () => {
                isDragging = false;
                panel.style.cursor = '';
            });

            // 关闭按钮
            panel.querySelector('.ai-panel-close').onclick = () => {
                panel.style.display = 'none';
            };

            // 选项卡切换
            const tabBtns = panel.querySelectorAll('.ai-tab-btn');
            const tabContents = panel.querySelectorAll('.ai-tab-content');
            
            tabBtns.forEach(btn => {
                btn.onclick = () => {
                    const tabId = btn.dataset.tab;
                    tabBtns.forEach(b => b.classList.remove('active'));
                    tabContents.forEach(c => c.classList.remove('active'));
                    btn.classList.add('active');
                    document.getElementById(`tab-${tabId}`).classList.add('active');
                };
            });

            // API 保存和测试
            const apiUrlInput = document.getElementById('ai-api-url');
            const apiKeyInput = document.getElementById('ai-api-key');
            const modelInput = document.getElementById('ai-model');
            
            document.getElementById('ai-save-api').onclick = () => {
                config.apiUrl = apiUrlInput.value;
                config.apiKey = apiKeyInput.value;
                config.model = modelInput.value;
                saveConfig();
                toastr.success('API配置已保存');
            };
            
            document.getElementById('ai-test-connection').onclick = async () => {
                // 先保存当前输入的值
                config.apiUrl = apiUrlInput.value;
                config.apiKey = apiKeyInput.value;
                config.model = modelInput.value;
                saveConfig();
                await testAPIConnection();
            };

            // 主题切换
            const themeRadios = document.querySelectorAll('input[name="theme-mode"]');
            themeRadios.forEach(radio => {
                radio.onchange = () => {
                    if (radio.checked) {
                        config.themeMode = radio.value;
                        saveConfig();
                        applyTheme();
                    }
                };
            });

            // 大小滑块
            const widthSlider = document.getElementById('panel-width-slider');
            const heightSlider = document.getElementById('panel-height-slider');
            const fontSlider = document.getElementById('font-size-slider');
            const widthValue = document.getElementById('width-value');
            const heightValue = document.getElementById('height-value');
            const fontValue = document.getElementById('font-value');

            widthSlider.oninput = () => {
                const val = widthSlider.value;
                widthValue.textContent = val;
                panel.style.width = `${val}px`;
                config.panelWidth = parseInt(val);
                saveConfig();
            };
            heightSlider.oninput = () => {
                const val = heightSlider.value;
                heightValue.textContent = val;
                panel.style.height = `${val}px`;
                config.panelHeight = parseInt(val);
                saveConfig();
            };
            fontSlider.oninput = () => {
                const val = fontSlider.value;
                fontValue.textContent = val;
                panel.style.fontSize = `${val}px`;
                document.querySelectorAll('.ai-setting-group input, .ai-setting-group textarea, .ai-btn').forEach(el => {
                    el.style.fontSize = `${val}px`;
                });
            };

            // 角色卡生成逻辑
            let charResult = '';
            const charInput = document.getElementById('ai-char-input');
            const charGenerate = document.getElementById('ai-char-generate');
            const charResultArea = document.getElementById('ai-char-result');
            const charCopy = document.getElementById('ai-char-copy');
            const charImport = document.getElementById('ai-char-import');

            charGenerate.onclick = async () => {
                const input = charInput.value.trim();
                if (!input) { toastr.warning('请输入设定'); return; }
                if (!config.apiKey) { toastr.warning('请先设置 API Key'); return; }

                charGenerate.disabled = true;
                charGenerate.textContent = '⏳ 生成中...';
                try {
                    const result = await generateCharacter(input, 'character');
                    if (result) {
                        charResult = result;
                        charResultArea.value = result;
                        charCopy.disabled = false;
                        charImport.disabled = false;
                        toastr.success('生成成功！');
                    }
                } catch (err) {
                    toastr.error('生成失败');
                } finally {
                    charGenerate.disabled = false;
                    charGenerate.textContent = '✨ 生成角色卡';
                }
            };
            charCopy.onclick = () => { if (charResult) copyToClipboard(charResult); };
            charImport.onclick = () => { if (charResult) { copyToClipboard(charResult); toastr.info('已复制，请去角色管理 → 新建角色 → 粘贴'); } };

            // 用户人设生成逻辑
            let userResult = '';
            const userInput = document.getElementById('ai-user-input');
            const userGenerate = document.getElementById('ai-user-generate');
            const userResultArea = document.getElementById('ai-user-result');
            const userCopy = document.getElementById('ai-user-copy');
            const userImport = document.getElementById('ai-user-import');

            userGenerate.onclick = async () => {
                const input = userInput.value.trim();
                if (!input) { toastr.warning('请输入设定'); return; }
                if (!config.apiKey) { toastr.warning('请先设置 API Key'); return; }

                userGenerate.disabled = true;
                userGenerate.textContent = '⏳ 生成中...';
                try {
                    const result = await generateCharacter(input, 'user');
                    if (result) {
                        userResult = result;
                        userResultArea.value = result;
                        userCopy.disabled = false;
                        userImport.disabled = false;
                        toastr.success('生成成功！');
                    }
                } catch (err) {
                    toastr.error('生成失败');
                } finally {
                    userGenerate.disabled = false;
                    userGenerate.textContent = '✨ 生成用户人设';
                }
            };
            userCopy.onclick = () => { if (userResult) copyToClipboard(userResult); };
            userImport.onclick = () => { if (userResult) { copyToClipboard(userResult); toastr.info('已复制，请去用户设置 → 人设管理 → 新建'); } };

            // 应用主题
            function applyTheme() {
                const panelEl = document.getElementById(PANEL_ID);
                if (config.themeMode === 'fixed') {
                    panelEl.style.setProperty('--ai-bg', '#ffffff');
                    panelEl.style.setProperty('--ai-text', '#333333');
                    panelEl.style.setProperty('--ai-border', '#dddddd');
                    panelEl.style.setProperty('--ai-input-bg', '#ffffff');
                } else {
                    panelEl.style.setProperty('--ai-bg', 'var(--SmartThemeBlurTintColor, #fff)');
                    panelEl.style.setProperty('--ai-text', 'var(--SmartThemeBodyColor, #333)');
                    panelEl.style.setProperty('--ai-border', 'var(--SmartThemeBorderColor, #ddd)');
                    panelEl.style.setProperty('--ai-input-bg', 'var(--SmartThemeBlurTintColor, #fff)');
                }
            }
            applyTheme();
        }

        // 添加菜单项
        function addMenuItem() {
            const checkExist = setInterval(() => {
                const menu = document.querySelector('#options .options-content');
                if (menu) {
                    clearInterval(checkExist);
                    if (document.querySelector('.ai-menu-item')) return;
                    
                    const menuItem = document.createElement('div');
                    menuItem.className = 'ai-menu-item';
                    menuItem.innerHTML = '<i class="fa-solid fa-robot"></i> AI人设生成器';
                    menuItem.onclick = () => {
                        const panel = document.getElementById(PANEL_ID);
                        if (panel) {
                            panel.style.display = 'flex';
                            const winWidth = window.innerWidth;
                            const winHeight = window.innerHeight;
                            const panelWidth = config.panelWidth;
                            const panelHeight = config.panelHeight;
                            panel.style.left = `${(winWidth - panelWidth) / 2}px`;
                            panel.style.top = `${(winHeight - panelHeight) / 2}px`;
                            panel.style.transform = 'none';
                        }
                    };
                    menu.appendChild(menuItem);
                }
            }, 500);
        }

        createPanel();
        addMenuItem();

        // 样式
        const style = document.createElement('style');
        style.textContent = `
            .ai-char-panel {
                position: fixed;
                width: 350px;
                height: 550px;
                background: var(--ai-bg, #fff);
                border: 1px solid var(--ai-border, #ddd);
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                z-index: 100000;
                display: none;
                flex-direction: column;
                overflow: hidden;
                font-family: inherit;
                color: var(--ai-text, #333);
            }
            .ai-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 14px;
                background: var(--ai-bg, #f5f5f5);
                border-bottom: 1px solid var(--ai-border, #ddd);
                cursor: grab;
                user-select: none;
            }
            .ai-panel-header:active { cursor: grabbing; }
            .ai-panel-close { cursor: pointer; font-size: 18px; opacity: 0.7; }
            .ai-panel-close:hover { opacity: 1; }
            .ai-tab-bar {
                display: flex;
                border-bottom: 1px solid var(--ai-border, #ddd);
                background: var(--ai-bg, #f5f5f5);
            }
            .ai-tab-btn {
                flex: 1;
                padding: 8px 0;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 12px;
                color: var(--ai-text, #666);
                transition: all 0.2s;
            }
            .ai-tab-btn.active {
                color: var(--ai-text, #333);
                border-bottom: 2px solid #4A6FA5;
                font-weight: 500;
            }
            .ai-tab-content {
                flex: 1;
                padding: 14px;
                overflow-y: auto;
                display: none;
            }
            .ai-tab-content.active { display: block; }
            .ai-setting-group { margin-bottom: 14px; }
            .ai-setting-group label {
                display: block;
                margin-bottom: 6px;
                font-size: 12px;
                font-weight: 500;
            }
            .ai-setting-group input,
            .ai-setting-group textarea {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid var(--ai-border, #ddd);
                border-radius: 8px;
                background: var(--ai-input-bg, #fff);
                color: var(--ai-text, #333);
                font-size: 13px;
                box-sizing: border-box;
            }
            .ai-setting-group textarea { resize: vertical; font-family: monospace; }
            .ai-radio-group { display: flex; gap: 16px; }
            .ai-radio-group label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-weight: normal; }
            .ai-button-group { display: flex; gap: 8px; margin: 12px 0; }
            .ai-btn {
                flex: 1;
                padding: 8px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s;
            }
            .ai-btn-primary { background: #4A6FA5; color: white; }
            .ai-btn-primary:hover { background: #3a5a8a; }
            .ai-btn-secondary { background: var(--ai-border, #e0e0e0); color: var(--ai-text, #333); }
            .ai-btn-secondary:hover { background: #ccc; }
            .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .theme-preview-box {
                padding: 16px;
                border: 1px solid var(--ai-border, #ddd);
                border-radius: 8px;
                text-align: center;
                background: var(--ai-input-bg, #fff);
            }
            .preview-text { display: block; margin-top: 8px; color: var(--ai-text, #333); }
            input[type="range"] { width: 100%; padding: 0; }
            .ai-menu-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                cursor: pointer;
                border-radius: 6px;
                transition: background 0.2s;
                color: var(--SmartThemeBodyColor, #333);
            }
            .ai-menu-item i { width: 20px; }
        `;
        document.head.appendChild(style);
    }
})();
