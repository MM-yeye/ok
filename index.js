// AI Character Generator - 左下角菜单版
(function() {
    setTimeout(() => {
        try {
            initPlugin();
        } catch (e) {
            console.warn("AI人设生成器启动失败:", e);
        }
    }, 500);

    function initPlugin() {
        const MENU_ID = 'ai-char-generator-panel';
        
        // 配置
        let config = {
            apiUrl: 'https://api.openai.com/v1/chat/completions',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            cardType: 'character'
        };

        // 读取存储
        try {
            const saved = localStorage.getItem('ai_char_gen_config');
            if (saved) config = { ...config, ...JSON.parse(saved) };
        } catch (err) {}

        function saveConfig() {
            localStorage.setItem('ai_char_gen_config', JSON.stringify(config));
        }

        // 模板（精简版，适合AI生成）
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

        // 生成系统提示词
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
4. example_messages 是对话示例，格式如：<START>\n{{user}}: 你好\n{{char}}: 你好啊`;
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

        // 调用自定义 API
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
            
            // 提取 YAML 内容
            const yamlMatch = content.match(/```(?:yaml)?\n([\s\S]*?)\n```/);
            if (yamlMatch) {
                content = yamlMatch[1];
            }
            
            return content;
        }

        // 导入角色卡
        async function importCharacter(yamlContent) {
            // 解析 YAML 并创建角色卡
            // 简化版：弹出窗口让用户确认并导入
            try {
                // 这里可以调用酒馆的 API 创建角色卡
                // 目前先复制到剪贴板，并提示手动创建
                await navigator.clipboard.writeText(yamlContent);
                toastr.success('已复制到剪贴板！请去角色管理 → 新建角色 → 粘贴内容');
            } catch (err) {
                toastr.error('复制失败，请手动复制');
            }
        }

        // 复制到剪贴板
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                toastr.success('已复制到剪贴板');
            }).catch(() => {
                toastr.error('复制失败');
            });
        }

        // 创建浮动面板（左下角）
        function createFloatingPanel() {
            if (document.getElementById(MENU_ID)) return;

            const panel = document.createElement('div');
            panel.id = MENU_ID;
            panel.className = 'ai-char-panel';
            panel.innerHTML = `
                <div class="ai-panel-header">
                    <span>🤖 AI人设生成器</span>
                    <span class="ai-panel-close">✕</span>
                </div>
                <div class="ai-panel-content">
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
                    <div class="ai-setting-group">
                        <label>生成类型</label>
                        <div class="ai-radio-group">
                            <label><input type="radio" name="card-type" value="character" ${config.cardType === 'character' ? 'checked' : ''}> 角色卡</label>
                            <label><input type="radio" name="card-type" value="user" ${config.cardType === 'user' ? 'checked' : ''}> 用户人设</label>
                        </div>
                    </div>
                    <div class="ai-setting-group">
                        <label>简单设定（随便写几个字）</label>
                        <textarea id="ai-user-input" rows="3" placeholder="例如：温喻言，黑市大佬，冷傲，掌控欲强，28岁，银发红瞳"></textarea>
                    </div>
                    <div class="ai-button-group">
                        <button id="ai-generate-btn" class="ai-btn ai-btn-primary">✨ 生成人设</button>
                        <button id="ai-copy-btn" class="ai-btn ai-btn-secondary" disabled>📋 复制结果</button>
                        <button id="ai-import-btn" class="ai-btn ai-btn-secondary" disabled>📥 导入酒馆</button>
                    </div>
                    <div class="ai-setting-group">
                        <label>生成结果</label>
                        <textarea id="ai-result" rows="8" readonly placeholder="生成结果会显示在这里..."></textarea>
                    </div>
                </div>
            `;
            document.body.appendChild(panel);

            let generatedContent = '';

            // 关闭按钮
            panel.querySelector('.ai-panel-close').onclick = () => {
                panel.classList.remove('open');
            };

            // 保存配置
            const apiUrlInput = document.getElementById('ai-api-url');
            const apiKeyInput = document.getElementById('ai-api-key');
            const modelInput = document.getElementById('ai-model');
            const radioBtns = document.querySelectorAll('input[name="card-type"]');

            apiUrlInput.onchange = () => { config.apiUrl = apiUrlInput.value; saveConfig(); };
            apiKeyInput.onchange = () => { config.apiKey = apiKeyInput.value; saveConfig(); };
            modelInput.onchange = () => { config.model = modelInput.value; saveConfig(); };
            radioBtns.forEach(btn => {
                btn.onchange = () => {
                    if (btn.checked) {
                        config.cardType = btn.value;
                        saveConfig();
                    }
                };
            });

            // 生成按钮
            const generateBtn = document.getElementById('ai-generate-btn');
            const copyBtn = document.getElementById('ai-copy-btn');
            const importBtn = document.getElementById('ai-import-btn');
            const resultArea = document.getElementById('ai-result');
            const userInputArea = document.getElementById('ai-user-input');

            generateBtn.onclick = async () => {
                const userInput = userInputArea.value.trim();
                if (!userInput) {
                    toastr.warning('请输入角色设定');
                    return;
                }
                if (!config.apiKey) {
                    toastr.warning('请先设置 API Key');
                    return;
                }

                generateBtn.disabled = true;
                generateBtn.textContent = '⏳ 生成中...';

                try {
                    const result = await generateCharacter(userInput, config.cardType);
                    if (result) {
                        generatedContent = result;
                        resultArea.value = result;
                        copyBtn.disabled = false;
                        importBtn.disabled = false;
                        toastr.success('生成成功！');
                    }
                } catch (err) {
                    toastr.error('生成失败: ' + err.message);
                } finally {
                    generateBtn.disabled = false;
                    generateBtn.textContent = '✨ 生成人设';
                }
            };

            copyBtn.onclick = () => {
                if (generatedContent) {
                    copyToClipboard(generatedContent);
                }
            };

            importBtn.onclick = () => {
                if (generatedContent) {
                    importCharacter(generatedContent);
                }
            };
        }

        // 添加左下角菜单按钮
        function addMenuButton() {
            // 找到左下角的三条杠按钮（选项按钮）
            const optionsButton = document.getElementById('options_button');
            if (!optionsButton) return;

            // 创建新的菜单项
            const menuItem = document.createElement('div');
            menuItem.className = 'ai-menu-item';
            menuItem.innerHTML = '<i class="fa-solid fa-robot"></i> AI人设生成器';
            menuItem.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                cursor: pointer;
                border-radius: 6px;
                transition: background 0.2s;
            `;
            menuItem.onclick = () => {
                const panel = document.getElementById(MENU_ID);
                if (panel) {
                    panel.classList.toggle('open');
                }
            };
            menuItem.onmouseenter = () => { menuItem.style.background = 'rgba(128,128,128,0.1)'; };
            menuItem.onmouseleave = () => { menuItem.style.background = 'transparent'; };

            // 等待菜单出现
            const checkMenu = setInterval(() => {
                const menu = document.querySelector('#options .options-content');
                if (menu) {
                    menu.appendChild(menuItem);
                    clearInterval(checkMenu);
                }
            }, 500);
        }

        // 创建浮动面板
        createFloatingPanel();
        
        // 添加菜单按钮
        addMenuButton();

        // 设置主题适配
        const style = document.createElement('style');
        style.textContent = `
            .ai-char-panel {
                position: fixed;
                bottom: 80px;
                left: 20px;
                width: 380px;
                max-width: calc(100vw - 40px);
                background: var(--SmartThemeBlurTintColor, #fff);
                border: 1px solid var(--SmartThemeBorderColor, #ddd);
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                transform: translateX(-120%);
                transition: transform 0.3s ease;
                font-family: inherit;
            }
            .ai-char-panel.open {
                transform: translateX(0);
            }
            .ai-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid var(--SmartThemeBorderColor, #eee);
                font-weight: 600;
                background: inherit;
                border-radius: 12px 12px 0 0;
            }
            .ai-panel-close {
                cursor: pointer;
                font-size: 18px;
                opacity: 0.7;
            }
            .ai-panel-close:hover {
                opacity: 1;
            }
            .ai-panel-content {
                padding: 16px;
                max-height: 70vh;
                overflow-y: auto;
            }
            .ai-setting-group {
                margin-bottom: 12px;
            }
            .ai-setting-group label {
                display: block;
                margin-bottom: 4px;
                font-size: 12px;
                font-weight: 500;
                color: var(--SmartThemeBodyColor, #333);
            }
            .ai-setting-group input,
            .ai-setting-group textarea {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid var(--SmartThemeBorderColor, #ddd);
                border-radius: 6px;
                background: var(--SmartThemeBlurTintColor, #fff);
                color: var(--SmartThemeBodyColor, #333);
                font-size: 13px;
                box-sizing: border-box;
            }
            .ai-setting-group textarea {
                resize: vertical;
            }
            .ai-radio-group {
                display: flex;
                gap: 16px;
            }
            .ai-radio-group label {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
            }
            .ai-button-group {
                display: flex;
                gap: 8px;
                margin: 16px 0;
            }
            .ai-btn {
                flex: 1;
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
            }
            .ai-btn-primary {
                background: #4A6FA5;
                color: white;
            }
            .ai-btn-primary:hover {
                background: #3a5a8a;
            }
            .ai-btn-secondary {
                background: var(--SmartThemeBorderColor, #e0e0e0);
                color: var(--SmartThemeBodyColor, #333);
            }
            .ai-btn-secondary:hover {
                background: #ccc;
            }
            .ai-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .ai-menu-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                cursor: pointer;
                border-radius: 6px;
                transition: background 0.2s;
                color: var(--SmartThemeBodyColor, #333);
            }
            .ai-menu-item i {
                width: 20px;
            }
        `;
        document.head.appendChild(style);
    }
})();
