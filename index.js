// AI Character Generator - 简洁高级版
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
        
        let config = {
            apiBaseUrl: 'https://key.laopobao.online/v1',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            themeMode: 'auto',
            panelWidth: 420,
            panelHeight: 580,
            panelLeft: 20,
            panelTop: 50,
            availableModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
            savedTemplates: [],
            generationHistory: [],
            draftContent: {},
            relationChars: [],
            graphChars: [],
            relationshipData: {}
        };

        try {
            const saved = localStorage.getItem('ai_char_gen_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                config = { ...config, ...parsed };
                if (!config.model) config.model = 'gpt-3.5-turbo';
                if (!config.availableModels) config.availableModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
                if (!config.savedTemplates) config.savedTemplates = [];
                if (!config.generationHistory) config.generationHistory = [];
                if (!config.draftContent) config.draftContent = {};
                if (!config.relationChars) config.relationChars = [];
                if (!config.graphChars) config.graphChars = [];
                if (!config.relationshipData) config.relationshipData = {};
                if (config.panelLeft + config.panelWidth > window.innerWidth - 10) {
                    config.panelLeft = Math.max(10, window.innerWidth - config.panelWidth - 10);
                }
            }
        } catch (err) {}

        function saveConfig() {
            localStorage.setItem('ai_char_gen_config', JSON.stringify(config));
        }

        // ========== 模板 ==========
        const CHAR_TEMPLATE = `char_name:
  chinese_name: 
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

        const USER_TEMPLATE = `user_name:
  chinese_name: 
  nickname: 
  age: 
  gender: 
  height: 
  identity: 
  background: 
  appearance: 
  personality: 
  likes: 
  dislikes: `;

        // API 地址处理
        function getFullApiUrl() {
            let url = config.apiBaseUrl;
            if (url.endsWith('/v1')) return url + '/chat/completions';
            if (url.endsWith('/')) return url + 'chat/completions';
            if (url.includes('/chat/completions')) return url;
            return url + '/v1/chat/completions';
        }

        function getModelsUrl() {
            let url = config.apiBaseUrl;
            if (url.endsWith('/v1')) return url + '/models';
            if (url.endsWith('/')) return url + 'models';
            return url + '/v1/models';
        }

        async function fetchModels() {
            if (!config.apiKey) return config.availableModels;
            const modelsUrl = getModelsUrl();
            try {
                const response = await fetch(modelsUrl, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${config.apiKey}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.data && Array.isArray(data.data)) {
                        return data.data.map(m => m.id);
                    }
                }
            } catch (err) {}
            return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
        }

        async function testAPIConnection() {
            if (!config.apiKey) {
                toastr.error('请先填写 API Key');
                return false;
            }
            const fullUrl = getFullApiUrl();
            const testMessage = {
                model: config.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 5
            };
            try {
                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify(testMessage)
                });
                if (response.ok) {
                    toastr.success('连接成功，正在获取模型列表...');
                    const models = await fetchModels();
                    if (models && models.length > 0) {
                        config.availableModels = models;
                        saveConfig();
                        updateModelSelect(models);
                        toastr.success(`已获取 ${models.length} 个模型`);
                    }
                    return true;
                } else {
                    toastr.error('连接失败');
                    return false;
                }
            } catch (err) {
                toastr.error(`连接失败: ${err.message}`);
                return false;
            }
        }

        function updateModelSelect(models) {
            const select = document.getElementById('ai-model-select');
            if (!select) return;
            const currentModel = config.model || 'gpt-3.5-turbo';
            select.innerHTML = '';
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                if (model === currentModel) option.selected = true;
                select.appendChild(option);
            });
        }

        function addToHistory(type, input, output) {
            config.generationHistory.unshift({
                type,
                input: input.substring(0, 100),
                output,
                timestamp: new Date().toLocaleString()
            });
            if (config.generationHistory.length > 20) config.generationHistory.pop();
            saveConfig();
            refreshHistoryList();
        }

        function saveDraft(tabId, content) {
            config.draftContent[tabId] = content;
            saveConfig();
        }

        function loadDraft(tabId) {
            return config.draftContent[tabId] || '';
        }

        function exportTemplates() {
            const data = JSON.stringify(config.savedTemplates, null, 2);
            const blob = new Blob([data], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `templates_${new Date().toISOString().slice(0,19)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toastr.success('模板已导出');
        }

        function importTemplates(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    if (Array.isArray(imported)) {
                        config.savedTemplates = [...config.savedTemplates, ...imported];
                        saveConfig();
                        refreshTemplateList();
                        toastr.success(`导入 ${imported.length} 个模板`);
                    } else {
                        toastr.error('文件格式错误');
                    }
                } catch (err) {
                    toastr.error('解析失败');
                }
            };
            reader.readAsText(file);
        }

        function refreshHistoryList() {
            const container = document.getElementById('history-list');
            if (!container) return;
            if (config.generationHistory.length === 0) {
                container.innerHTML = '<div class="empty-tip">暂无历史记录</div>';
                return;
            }
            container.innerHTML = config.generationHistory.map((h, i) => `
                <div class="history-item" data-index="${i}">
                    <div class="history-header">
                        <span class="history-type">${h.type}</span>
                        <span class="history-time">${h.timestamp}</span>
                    </div>
                    <div class="history-preview">${h.input}</div>
                </div>
            `).join('');
            
            container.querySelectorAll('.history-item').forEach(item => {
                item.onclick = () => {
                    const idx = parseInt(item.dataset.index);
                    const history = config.generationHistory[idx];
                    if (history) {
                        if (history.type === '角色卡') {
                            document.getElementById('char-result').value = history.output;
                        } else if (history.type === '用户人设') {
                            document.getElementById('user-result').value = history.output;
                        } else if (history.type === '世界书') {
                            document.getElementById('world-result').value = history.output;
                        } else if (history.type === '关系描述') {
                            document.getElementById('relation-result').value = history.output;
                        } else if (history.type === '魔法衣橱') {
                            document.getElementById('wardrobe-result').value = history.output;
                        }
                        toastr.success(`已加载: ${history.type}`);
                    }
                };
            });
        }

        function refreshTemplateList() {
            const container = document.getElementById('template-list');
            if (!container) return;
            if (config.savedTemplates.length === 0) {
                container.innerHTML = '<div class="empty-tip">暂无保存的模板</div>';
                return;
            }
            container.innerHTML = config.savedTemplates.map((t, i) => `
                <div class="template-item">
                    <span class="template-name">${t.name}</span>
                    <div class="template-actions">
                        <button class="load-template" data-index="${i}">加载</button>
                        <button class="delete-template" data-index="${i}">删除</button>
                    </div>
                </div>
            `).join('');
            
            container.querySelectorAll('.load-template').forEach(btn => {
                btn.onclick = () => {
                    const idx = parseInt(btn.dataset.index);
                    const template = config.savedTemplates[idx];
                    if (template) {
                        const activeTab = document.querySelector('.tab-content.active');
                        const resultArea = activeTab?.querySelector('.result-text');
                        if (resultArea) {
                            resultArea.value = template.content;
                            toastr.success(`已加载: ${template.name}`);
                        }
                    }
                };
            });
            container.querySelectorAll('.delete-template').forEach(btn => {
                btn.onclick = () => {
                    const idx = parseInt(btn.dataset.index);
                    config.savedTemplates.splice(idx, 1);
                    saveConfig();
                    refreshTemplateList();
                    toastr.success('已删除');
                };
            });
        }// ========== 角色关系生成 ==========
        let relationChars = [];

        function addRelationChar(name, desc) {
            if (!name) return;
            relationChars.push({ name, desc: desc || '' });
            saveRelationChars();
            refreshRelationCharList();
        }

        function removeRelationChar(index) {
            relationChars.splice(index, 1);
            saveRelationChars();
            refreshRelationCharList();
        }

        function saveRelationChars() {
            config.relationChars = relationChars;
            saveConfig();
        }

        function loadRelationChars() {
            relationChars = config.relationChars || [];
        }
        loadRelationChars();

        function refreshRelationCharList() {
            const container = document.getElementById('relation-char-list');
            if (!container) return;
            if (relationChars.length === 0) {
                container.innerHTML = '<div class="empty-tip">暂无角色，点击添加</div>';
                return;
            }
            container.innerHTML = relationChars.map((c, i) => `
                <div class="char-item">
                    <span><strong>${c.name}</strong>${c.desc ? ` - ${c.desc.substring(0, 30)}` : ''}</span>
                    <button class="delete-char" data-index="${i}">删除</button>
                </div>
            `).join('');
            
            container.querySelectorAll('.delete-char').forEach(btn => {
                btn.onclick = () => removeRelationChar(parseInt(btn.dataset.index));
            });
        }

        async function generateRelationText(buttonElement, resultArea) {
            if (!config.apiKey) {
                toastr.error('请先设置 API Key');
                return null;
            }
            if (relationChars.length < 2) {
                toastr.warning('至少需要2个角色');
                return null;
            }
            
            const fullUrl = getFullApiUrl();
            const charList = relationChars.map(c => `- ${c.name}: ${c.desc || '暂无描述'}`).join('\n');
            
            const systemPrompt = `分析以下角色之间的关系，用生动语言描述每对角色之间的关系。输出纯文本，不要用JSON格式。`;
            const userPrompt = `角色列表：\n${charList}\n\n请描述他们之间的关系。`;
            
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.innerHTML = '⏳ 生成中...';
            }
            
            try {
                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: config.model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        temperature: 0.7,
                        max_tokens: 1500
                    })
                });

                if (!response.ok) {
                    toastr.error(`API调用失败: ${response.status}`);
                    return null;
                }

                const data = await response.json();
                let content = data.choices[0].message.content;
                
                if (resultArea) {
                    resultArea.value = content;
                    addToHistory('关系描述', userPrompt, content);
                    // 启用复制按钮
                    const copyBtn = resultArea.parentElement?.querySelector('.copy-btn');
                    if (copyBtn) copyBtn.disabled = false;
                }
                
                toastr.success('生成成功');
                return content;
            } catch (err) {
                toastr.error(`生成失败: ${err.message}`);
                return null;
            } finally {
                if (buttonElement) {
                    buttonElement.disabled = false;
                    buttonElement.innerHTML = '生成关系描述';
                }
            }
        }

        // ========== 魔法衣橱 ==========
        async function generateWardrobe(userInput, buttonElement, resultArea) {
            if (!config.apiKey) {
                toastr.error('请先设置 API Key');
                return null;
            }
            if (!userInput.trim()) {
                toastr.warning('请输入服装描述');
                return null;
            }
            
            const fullUrl = getFullApiUrl();
            
            const systemPrompt = `你是一个专业的服装设计师。根据用户输入，生成详细的服装、饰品、造型描写。

规则：
1. 只描写用户提到的内容，不要添加无关设定
2. 语言优美细腻，用文字呈现画面感
3. 包括服装款式、颜色、材质、细节、搭配的饰品、发型妆容等
4. 如果用户输入简单，补充合理细节但不要过度创作
5. 输出纯文本，不分段，自然流畅`;
            
            const userPrompt = `请详细描写：${userInput}`;
            
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.innerHTML = '⏳ 生成中...';
            }
            
            try {
                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: config.model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        temperature: 0.8,
                        max_tokens: 800
                    })
                });

                if (!response.ok) {
                    toastr.error(`API调用失败: ${response.status}`);
                    return null;
                }

                const data = await response.json();
                let content = data.choices[0].message.content;
                
                if (resultArea) {
                    resultArea.value = content;
                    addToHistory('魔法衣橱', userInput, content);
                    const copyBtn = resultArea.parentElement?.querySelector('.copy-btn');
                    if (copyBtn) copyBtn.disabled = false;
                }
                
                toastr.success('生成成功');
                return content;
            } catch (err) {
                toastr.error(`生成失败: ${err.message}`);
                return null;
            } finally {
                if (buttonElement) {
                    buttonElement.disabled = false;
                    buttonElement.innerHTML = '生成衣橱';
                }
            }
        }// 生成角色卡
        async function generateCharacter(userInput, cardType, buttonElement, resultArea) {
            if (!config.apiKey) {
                toastr.error('请先设置 API Key');
                return null;
            }
            
            const fullUrl = getFullApiUrl();
            const template = cardType === 'character' ? CHAR_TEMPLATE : USER_TEMPLATE;
            const typeName = cardType === 'character' ? '角色卡' : '用户人设';

            const systemPrompt = `根据用户输入，生成完整的${typeName}。严格按照以下YAML格式输出，不要添加额外解释，所有字段都要填满：

${template}

规则：用户输入可能很简单，你需要合理推断补充所有字段。只输出YAML内容，不要用\`\`\`标记。`;
            
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.innerHTML = '⏳ 生成中...';
            }
            
            try {
                const response = await fetch(fullUrl, {
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
                    toastr.error(`API调用失败: ${response.status}`);
                    return null;
                }

                const data = await response.json();
                let content = data.choices[0].message.content;
                content = content.replace(/```yaml\n?/g, '').replace(/```\n?/g, '').trim();
                
                if (resultArea) {
                    resultArea.value = content;
                    addToHistory(typeName, userInput, content);
                    const copyBtn = resultArea.parentElement?.querySelector('.copy-btn');
                    const importBtn = resultArea.parentElement?.querySelector('.import-btn');
                    if (copyBtn) copyBtn.disabled = false;
                    if (importBtn) importBtn.disabled = false;
                }
                
                toastr.success('生成成功');
                return content;
            } catch (err) {
                toastr.error(`生成失败: ${err.message}`);
                return null;
            } finally {
                if (buttonElement) {
                    buttonElement.disabled = false;
                    buttonElement.innerHTML = cardType === 'character' ? '生成角色卡' : '生成用户人设';
                }
            }
        }

        // 生成世界书
        async function generateWorldbook(userInput, buttonElement, resultArea) {
            if (!config.apiKey) {
                toastr.error('请先设置 API Key');
                return null;
            }
            if (!userInput.trim()) {
                toastr.warning('请输入设定要求');
                return null;
            }
            
            const fullUrl = getFullApiUrl();

            const systemPrompt = `根据用户要求，生成详细的世界设定。自由创作，包括世界观、地理、历史、文化、势力、科技、魔法等。语言生动，逻辑自洽。直接输出内容。`;
            
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.innerHTML = '⏳ 生成中...';
            }
            
            try {
                const response = await fetch(fullUrl, {
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
                        temperature: 0.9,
                        max_tokens: 2000
                    })
                });

                if (!response.ok) {
                    toastr.error(`API调用失败: ${response.status}`);
                    return null;
                }

                const data = await response.json();
                let content = data.choices[0].message.content;
                
                if (resultArea) {
                    resultArea.value = content;
                    addToHistory('世界书', userInput, content);
                    const copyBtn = resultArea.parentElement?.querySelector('.copy-btn');
                    if (copyBtn) copyBtn.disabled = false;
                }
                
                toastr.success('生成成功');
                return content;
            } catch (err) {
                toastr.error(`生成失败: ${err.message}`);
                return null;
            } finally {
                if (buttonElement) {
                    buttonElement.disabled = false;
                    buttonElement.innerHTML = '生成世界书';
                }
            }
        }

        // 导入角色卡
        async function importCharacterCard(yamlContent) {
            try {
                const nameMatch = yamlContent.match(/chinese_name:\s*(.+)/m);
                const name = nameMatch ? nameMatch[1].trim() : '新角色';
                
                const description = extractField(yamlContent, 'appearance');
                const personality = extractField(yamlContent, 'personality');
                const scenario = extractField(yamlContent, 'background');
                const first_mes = extractField(yamlContent, 'first_message') || `你好，我是${name}`;
                const mes_example = extractField(yamlContent, 'example_messages') || '';
                
                const characterCard = { name, description, personality, scenario, first_mes, mes_example };
                
                if (window.SillyTavern && window.SillyTavern.getContext) {
                    const context = window.SillyTavern.getContext();
                    if (context && context.createCharacter) {
                        await context.createCharacter(characterCard);
                        toastr.success(`角色卡 "${name}" 已创建`);
                        return;
                    }
                }
                copyToClipboard(yamlContent);
                toastr.info('已复制到剪贴板，请手动创建');
            } catch (err) {
                copyToClipboard(yamlContent);
                toastr.error('创建失败，已复制到剪贴板');
            }
        }

        // 导入用户人设
        async function importUserPersona(yamlContent) {
            try {
                const nameMatch = yamlContent.match(/chinese_name:\s*(.+)/m);
                const name = nameMatch ? nameMatch[1].trim() : '新用户';
                
                const description = extractField(yamlContent, 'appearance');
                const personality = extractField(yamlContent, 'personality');
                
                if (window.SillyTavern && window.SillyTavern.getContext) {
                    const context = window.SillyTavern.getContext();
                    if (context && context.createPersona) {
                        await context.createPersona({ name, description, personality });
                        toastr.success(`用户人设 "${name}" 已创建`);
                        return;
                    }
                }
                copyToClipboard(yamlContent);
                toastr.info('已复制到剪贴板，请手动创建');
            } catch (err) {
                copyToClipboard(yamlContent);
                toastr.error('创建失败，已复制到剪贴板');
            }
        }

        function extractField(content, field) {
            const regex = new RegExp(`${field}:\\s*(.+?)(?=\\n\\w|$)`, 'ms');
            const match = content.match(regex);
            return match ? match[1].trim() : '';
        }

        function copyToClipboard(text) {
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => {
                toastr.success('已复制');
            }).catch(() => {
                toastr.error('复制失败');
            });
        }// ========== 创建面板 ==========
function createPanel() {
    if (document.getElementById(PANEL_ID)) return;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'ai-panel';
    panel.style.position = 'fixed';
    panel.style.left = `${config.panelLeft}px`;
    panel.style.top = `${config.panelTop}px`;
    panel.style.width = `${config.panelWidth}px`;
    panel.style.height = `${config.panelHeight}px`;
    
    const modelOptions = (config.availableModels || ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'])
        .map(m => `<option value="${m}" ${m === config.model ? 'selected' : ''}>${m}</option>`).join('');
    
    panel.innerHTML = `
        <div class="panel-header">
            <span>AI 人设生成器</span>
            <span class="panel-close">✕</span>
        </div>
        
        <div class="tab-bar">
            <button class="tab-btn active" data-tab="api">API</button>
            <button class="tab-btn" data-tab="char">角色卡</button>
            <button class="tab-btn" data-tab="user">用户人设</button>
            <button class="tab-btn" data-tab="world">世界书</button>
            <button class="tab-btn" data-tab="relation">关系网</button>
            <button class="tab-btn" data-tab="wardrobe">魔法衣橱</button>
            <button class="tab-btn" data-tab="history">历史</button>
            <button class="tab-btn" data-tab="templates">模板</button>
            <button class="tab-btn" data-tab="theme">主题</button>
            <button class="tab-btn" data-tab="size">大小</button>
        </div>
        
        <!-- API -->
        <div class="tab-content active" id="tab-api">
            <div class="field-group">
                <label>API地址</label>
                <input type="text" id="api-url" placeholder="https://key.laopobao.online/v1" value="${config.apiBaseUrl}">
            </div>
            <div class="field-group">
                <label>API Key</label>
                <input type="password" id="api-key" placeholder="sk-..." value="${config.apiKey}">
            </div>
            <div class="field-group">
                <label>模型</label>
                <select id="model-select">${modelOptions}</select>
            </div>
            <div class="button-group">
                <button id="test-connection">测试连接</button>
                <button id="save-api">保存设置</button>
            </div>
        </div>
        
        <!-- 角色卡 -->
        <div class="tab-content" id="tab-char">
            <div class="field-group">
                <label>简单设定</label>
                <textarea id="char-input" rows="3" placeholder="例如：前锋，是所有屠孝子心里最柔软的地方"></textarea>
            </div>
            <button id="char-generate" class="primary-btn">生成角色卡</button>
            <div class="field-group">
                <label>生成结果</label>
                <textarea id="char-result" class="result-text" rows="10" placeholder="生成结果会显示在这里..."></textarea>
            </div>
            <div class="button-group">
                <button id="char-copy" class="copy-btn" disabled>复制</button>
                <button id="char-import" class="import-btn" disabled>导入酒馆</button>
                <button id="char-clear">清空</button>
            </div>
            <div class="field-group">
                <label>保存为模板</label>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="char-template-name" placeholder="模板名称">
                    <button id="char-save-template">保存</button>
                </div>
            </div>
        </div>
        
        <!-- 用户人设 -->
        <div class="tab-content" id="tab-user">
            <div class="field-group">
                <label>简单设定</label>
                <textarea id="user-input" rows="3" placeholder="例如：菲利普，锋儿最爱的老公"></textarea>
            </div>
            <button id="user-generate" class="primary-btn">生成用户人设</button>
            <div class="field-group">
                <label>生成结果</label>
                <textarea id="user-result" class="result-text" rows="10" placeholder="生成结果会显示在这里..."></textarea>
            </div>
            <div class="button-group">
                <button id="user-copy" class="copy-btn" disabled>复制</button>
                <button id="user-import" class="import-btn" disabled>导入酒馆</button>
                <button id="user-clear">清空</button>
            </div>
            <div class="field-group">
                <label>保存为模板</label>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="user-template-name" placeholder="模板名称">
                    <button id="user-save-template">保存</button>
                </div>
            </div>
        </div>
        
        <!-- 世界书 -->
        <div class="tab-content" id="tab-world">
            <div class="field-group">
                <label>设定要求</label>
                <textarea id="world-input" rows="5" placeholder="例如：赛博朋克风格的都市，有大型企业控制、义体改造、地下黑客文化..."></textarea>
            </div>
            <button id="world-generate" class="primary-btn">生成世界书</button>
            <div class="field-group">
                <label>生成结果</label>
                <textarea id="world-result" class="result-text" rows="10" placeholder="生成结果会显示在这里..."></textarea>
            </div>
            <div class="button-group">
                <button id="world-copy" class="copy-btn" disabled>复制</button>
                <button id="world-clear">清空</button>
            </div>
            <div class="field-group">
                <label>保存为模板</label>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="world-template-name" placeholder="模板名称">
                    <button id="world-save-template">保存</button>
                </div>
            </div>
        </div>
        
        <!-- 关系网 -->
        <div class="tab-content" id="tab-relation">
            <div class="field-group">
                <label>角色列表</label>
                <div id="relation-char-list" class="char-list"></div>
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <input type="text" id="relation-char-name" placeholder="角色名称" style="flex: 1;">
                    <button id="relation-add-char">添加</button>
                </div>
                <textarea id="relation-char-desc" rows="2" placeholder="角色描述（可选）"></textarea>
            </div>
            <button id="relation-generate" class="primary-btn">生成关系描述</button>
            <div class="field-group">
                <label>关系描述</label>
                <textarea id="relation-result" class="result-text" rows="8" placeholder="生成的关系描述会显示在这里..."></textarea>
            </div>
            <div class="button-group">
                <button id="relation-copy" class="copy-btn" disabled>复制</button>
                <button id="relation-clear">清空</button>
            </div>
            <div class="field-group">
                <label>保存为模板</label>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="relation-template-name" placeholder="模板名称">
                    <button id="relation-save-template">保存</button>
                </div>
            </div>
        </div>
        
        <!-- 魔法衣橱 -->
        <div class="tab-content" id="tab-wardrobe">
            <div class="field-group">
                <label>服装描述</label>
                <textarea id="wardrobe-input" rows="3" placeholder="例如：黑色的哥特服装"></textarea>
            </div>
            <button id="wardrobe-generate" class="primary-btn">生成衣橱</button>
            <div class="field-group">
                <label>生成结果</label>
                <textarea id="wardrobe-result" class="result-text" rows="10" placeholder="服装描写会显示在这里..."></textarea>
            </div>
            <div class="button-group">
                <button id="wardrobe-copy" class="copy-btn" disabled>复制</button>
                <button id="wardrobe-clear">清空</button>
            </div>
            <div class="field-group">
                <label>保存为模板</label>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="wardrobe-template-name" placeholder="模板名称">
                    <button id="wardrobe-save-template">保存</button>
                </div>
            </div>
        </div>
        
        <!-- 历史 -->
        <div class="tab-content" id="tab-history">
            <div class="field-group">
                <div id="history-list" class="history-list"></div>
                <button id="history-clear" style="margin-top: 8px;">清空历史</button>
            </div>
        </div>
        
        <!-- 模板库 -->
        <div class="tab-content" id="tab-templates">
            <div class="field-group">
                <div class="button-group" style="margin-bottom: 12px;">
                    <button id="templates-export">导出模板</button>
                    <button id="templates-import">导入模板</button>
                    <input type="file" id="templates-import-file" accept=".json" style="display: none;">
                </div>
                <div id="template-list" class="template-list"></div>
            </div>
        </div>
        
        <!-- 主题 -->
        <div class="tab-content" id="tab-theme">
            <div class="field-group">
                <label>界面主题</label>
                <div class="radio-group">
                    <label><input type="radio" name="theme-mode" value="auto" ${config.themeMode === 'auto' ? 'checked' : ''}> 适配酒馆美化</label>
                    <label><input type="radio" name="theme-mode" value="fixed" ${config.themeMode === 'fixed' ? 'checked' : ''}> 纯净白底黑字</label>
                </div>
            </div>
        </div>
        
        <!-- 大小 -->
        <div class="tab-content" id="tab-size">
            <div class="field-group">
                <label>宽度 <span id="width-val">${config.panelWidth}</span> px</label>
                <input type="range" id="width-slider" min="300" max="600" step="10" value="${config.panelWidth}">
            </div>
            <div class="field-group">
                <label>高度 <span id="height-val">${config.panelHeight}</span> px</label>
                <input type="range" id="height-slider" min="400" max="800" step="10" value="${config.panelHeight}">
            </div>
            <div class="field-group">
                <label>左边距 <span id="left-val">${config.panelLeft}</span> px</label>
                <input type="range" id="left-slider" min="0" max="${window.innerWidth - 50}" step="10" value="${config.panelLeft}">
            </div>
            <div class="field-group">
                <label>上边距 <span id="top-val">${config.panelTop}</span> px</label>
                <input type="range" id="top-slider" min="0" max="500" step="10" value="${config.panelTop}">
            </div>
            <div class="field-group">
                <label>字体大小 <span id="font-val">13</span> px</label>
                <input type="range" id="font-slider" min="10" max="18" step="1" value="13">
            </div>
        </div>
    `;
    document.body.appendChild(panel);// 选项卡切换
const tabBtns = panel.querySelectorAll('.tab-btn');
const tabContents = panel.querySelectorAll('.tab-content');
tabBtns.forEach(btn => {
    btn.onclick = () => {
        const tabId = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.add('active');
        
        const resultArea = document.getElementById(`${tabId}-result`);
        if (resultArea && resultArea.classList.contains('result-text')) {
            const draft = loadDraft(tabId);
            if (draft && !resultArea.value) {
                resultArea.value = draft;
            }
        }
        if (tabId === 'relation') {
            refreshRelationCharList();
        }
    };
});

// 关闭按钮
panel.querySelector('.panel-close').onclick = () => panel.style.display = 'none';

// API 操作
const apiUrlInput = document.getElementById('api-url');
const apiKeyInput = document.getElementById('api-key');
const modelSelect = document.getElementById('model-select');

document.getElementById('save-api').onclick = () => {
    config.apiBaseUrl = apiUrlInput.value;
    config.apiKey = apiKeyInput.value;
    config.model = modelSelect.value;
    saveConfig();
    toastr.success('API配置已保存');
};
document.getElementById('test-connection').onclick = async () => {
    config.apiBaseUrl = apiUrlInput.value;
    config.apiKey = apiKeyInput.value;
    saveConfig();
    await testAPIConnection();
};
modelSelect.onchange = () => {
    config.model = modelSelect.value;
    saveConfig();
};

// 主题切换
const themeRadios = document.querySelectorAll('input[name="theme-mode"]');

function applyTheme() {
    const panelEl = document.getElementById(PANEL_ID);
    if (!panelEl) return;
    
    if (config.themeMode === 'fixed') {
        panelEl.classList.add('fixed-mode');
        panelEl.style.backgroundColor = '#ffffff';
        panelEl.style.color = '#000000';
        panelEl.style.border = '1px solid #cccccc';
    } else {
        panelEl.classList.remove('fixed-mode');
        const root = document.documentElement;
        const computed = getComputedStyle(root);
        panelEl.style.backgroundColor = computed.getPropertyValue('--SmartThemeBlurTintColor') || '#f5f5f5';
        panelEl.style.color = computed.getPropertyValue('--SmartThemeBodyColor') || '#333333';
        panelEl.style.border = `1px solid ${computed.getPropertyValue('--SmartThemeBorderColor') || '#dddddd'}`;
    }
}

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
const widthSlider = document.getElementById('width-slider');
const heightSlider = document.getElementById('height-slider');
const leftSlider = document.getElementById('left-slider');
const topSlider = document.getElementById('top-slider');
const fontSlider = document.getElementById('font-slider');

widthSlider.oninput = () => {
    const val = parseInt(widthSlider.value);
    document.getElementById('width-val').textContent = val;
    config.panelWidth = val;
    saveConfig();
    panel.style.width = `${val}px`;
};
heightSlider.oninput = () => {
    const val = parseInt(heightSlider.value);
    document.getElementById('height-val').textContent = val;
    config.panelHeight = val;
    saveConfig();
    panel.style.height = `${val}px`;
};
leftSlider.oninput = () => {
    const val = parseInt(leftSlider.value);
    document.getElementById('left-val').textContent = val;
    config.panelLeft = val;
    saveConfig();
    panel.style.left = `${val}px`;
};
topSlider.oninput = () => {
    const val = parseInt(topSlider.value);
    document.getElementById('top-val').textContent = val;
    config.panelTop = val;
    saveConfig();
    panel.style.top = `${val}px`;
};
fontSlider.oninput = () => {
    const val = fontSlider.value;
    document.getElementById('font-val').textContent = val;
    panel.style.fontSize = `${val}px`;
};// 角色卡
            const charInput = document.getElementById('char-input');
            const charGenerate = document.getElementById('char-generate');
            const charResult = document.getElementById('char-result');
            const charCopy = document.getElementById('char-copy');
            const charImport = document.getElementById('char-import');
            const charClear = document.getElementById('char-clear');
            const charTemplateName = document.getElementById('char-template-name');
            const charSaveTemplate = document.getElementById('char-save-template');

            charGenerate.onclick = async () => {
                const input = charInput.value.trim();
                if (!input) { toastr.warning('请输入设定'); return; }
                if (!config.apiKey) { toastr.warning('请先设置 API Key'); return; }
                await generateCharacter(input, 'character', charGenerate, charResult);
            };
            charCopy.onclick = () => { if (charResult.value) copyToClipboard(charResult.value); };
            charImport.onclick = async () => {
                if (!charResult.value) { toastr.warning('没有可导入的内容'); return; }
                charImport.disabled = true;
                charImport.textContent = '导入中...';
                try {
                    await importCharacterCard(charResult.value);
                } finally {
                    charImport.disabled = false;
                    charImport.textContent = '导入酒馆';
                }
            };
            charClear.onclick = () => { charResult.value = ''; charCopy.disabled = true; charImport.disabled = true; };
            charSaveTemplate.onclick = () => {
                const name = charTemplateName.value.trim();
                if (!name) { toastr.warning('请输入模板名称'); return; }
                if (!charResult.value) { toastr.warning('没有可保存的内容'); return; }
                config.savedTemplates.push({ name, content: charResult.value });
                saveConfig();
                refreshTemplateList();
                toastr.success(`模板 "${name}" 已保存`);
                charTemplateName.value = '';
            };
            charResult.addEventListener('input', () => {
                const has = !!charResult.value;
                charCopy.disabled = !has;
                charImport.disabled = !has;
                saveDraft('char', charResult.value);
            });
            charResult.value = loadDraft('char');

            // 用户人设
            const userInput = document.getElementById('user-input');
            const userGenerate = document.getElementById('user-generate');
            const userResult = document.getElementById('user-result');
            const userCopy = document.getElementById('user-copy');
            const userImport = document.getElementById('user-import');
            const userClear = document.getElementById('user-clear');
            const userTemplateName = document.getElementById('user-template-name');
            const userSaveTemplate = document.getElementById('user-save-template');

            userGenerate.onclick = async () => {
                const input = userInput.value.trim();
                if (!input) { toastr.warning('请输入设定'); return; }
                if (!config.apiKey) { toastr.warning('请先设置 API Key'); return; }
                await generateCharacter(input, 'user', userGenerate, userResult);
            };
            userCopy.onclick = () => { if (userResult.value) copyToClipboard(userResult.value); };
            userImport.onclick = async () => {
                if (!userResult.value) { toastr.warning('没有可导入的内容'); return; }
                userImport.disabled = true;
                userImport.textContent = '导入中...';
                try {
                    await importUserPersona(userResult.value);
                } finally {
                    userImport.disabled = false;
                    userImport.textContent = '导入酒馆';
                }
            };
            userClear.onclick = () => { userResult.value = ''; userCopy.disabled = true; userImport.disabled = true; };
            userSaveTemplate.onclick = () => {
                const name = userTemplateName.value.trim();
                if (!name) { toastr.warning('请输入模板名称'); return; }
                if (!userResult.value) { toastr.warning('没有可保存的内容'); return; }
                config.savedTemplates.push({ name, content: userResult.value });
                saveConfig();
                refreshTemplateList();
                toastr.success(`模板 "${name}" 已保存`);
                userTemplateName.value = '';
            };
            userResult.addEventListener('input', () => {
                const has = !!userResult.value;
                userCopy.disabled = !has;
                userImport.disabled = !has;
                saveDraft('user', userResult.value);
            });
            userResult.value = loadDraft('user');

            // 世界书
            const worldInput = document.getElementById('world-input');
            const worldGenerate = document.getElementById('world-generate');
            const worldResult = document.getElementById('world-result');
            const worldCopy = document.getElementById('world-copy');
            const worldClear = document.getElementById('world-clear');
            const worldTemplateName = document.getElementById('world-template-name');
            const worldSaveTemplate = document.getElementById('world-save-template');

            worldGenerate.onclick = async () => {
                const input = worldInput.value.trim();
                if (!input) { toastr.warning('请输入设定要求'); return; }
                if (!config.apiKey) { toastr.warning('请先设置 API Key'); return; }
                await generateWorldbook(input, worldGenerate, worldResult);
            };
            worldCopy.onclick = () => { if (worldResult.value) copyToClipboard(worldResult.value); };
            worldClear.onclick = () => { worldResult.value = ''; worldCopy.disabled = true; };
            worldSaveTemplate.onclick = () => {
                const name = worldTemplateName.value.trim();
                if (!name) { toastr.warning('请输入模板名称'); return; }
                if (!worldResult.value) { toastr.warning('没有可保存的内容'); return; }
                config.savedTemplates.push({ name, content: worldResult.value });
                saveConfig();
                refreshTemplateList();
                toastr.success(`模板 "${name}" 已保存`);
                worldTemplateName.value = '';
            };
            worldResult.addEventListener('input', () => {
                worldCopy.disabled = !worldResult.value;
                saveDraft('world', worldResult.value);
            });
            worldResult.value = loadDraft('world');

            // 关系网
            const relationCharName = document.getElementById('relation-char-name');
            const relationCharDesc = document.getElementById('relation-char-desc');
            const relationAddChar = document.getElementById('relation-add-char');
            const relationGenerate = document.getElementById('relation-generate');
            const relationResult = document.getElementById('relation-result');
            const relationCopy = document.getElementById('relation-copy');
            const relationClear = document.getElementById('relation-clear');
            const relationTemplateName = document.getElementById('relation-template-name');
            const relationSaveTemplate = document.getElementById('relation-save-template');

            relationAddChar.onclick = () => {
                const name = relationCharName.value.trim();
                if (!name) { toastr.warning('请输入角色名称'); return; }
                addRelationChar(name, relationCharDesc.value.trim());
                relationCharName.value = '';
                relationCharDesc.value = '';
            };
            relationGenerate.onclick = async () => {
                await generateRelationText(relationGenerate, relationResult);
            };
            relationCopy.onclick = () => { if (relationResult.value) copyToClipboard(relationResult.value); };
            relationClear.onclick = () => { relationResult.value = ''; relationCopy.disabled = true; };
            relationSaveTemplate.onclick = () => {
                const name = relationTemplateName.value.trim();
                if (!name) { toastr.warning('请输入模板名称'); return; }
                if (!relationResult.value) { toastr.warning('没有可保存的内容'); return; }
                config.savedTemplates.push({ name, content: relationResult.value });
                saveConfig();
                refreshTemplateList();
                toastr.success(`模板 "${name}" 已保存`);
                relationTemplateName.value = '';
            };
            relationResult.addEventListener('input', () => {
                relationCopy.disabled = !relationResult.value;
                saveDraft('relation', relationResult.value);
            });
            relationResult.value = loadDraft('relation');
            
            // 魔法衣橱
            const wardrobeInput = document.getElementById('wardrobe-input');
            const wardrobeGenerate = document.getElementById('wardrobe-generate');
            const wardrobeResult = document.getElementById('wardrobe-result');
            const wardrobeCopy = document.getElementById('wardrobe-copy');
            const wardrobeClear = document.getElementById('wardrobe-clear');
            const wardrobeTemplateName = document.getElementById('wardrobe-template-name');
            const wardrobeSaveTemplate = document.getElementById('wardrobe-save-template');

            wardrobeGenerate.onclick = async () => {
                const input = wardrobeInput.value.trim();
                if (!input) { toastr.warning('请输入服装描述'); return; }
                if (!config.apiKey) { toastr.warning('请先设置 API Key'); return; }
                await generateWardrobe(input, wardrobeGenerate, wardrobeResult);
            };
            wardrobeCopy.onclick = () => { if (wardrobeResult.value) copyToClipboard(wardrobeResult.value); };
            wardrobeClear.onclick = () => { wardrobeResult.value = ''; wardrobeCopy.disabled = true; };
            wardrobeSaveTemplate.onclick = () => {
                const name = wardrobeTemplateName.value.trim();
                if (!name) { toastr.warning('请输入模板名称'); return; }
                if (!wardrobeResult.value) { toastr.warning('没有可保存的内容'); return; }
                config.savedTemplates.push({ name, content: wardrobeResult.value });
                saveConfig();
                refreshTemplateList();
                toastr.success(`模板 "${name}" 已保存`);
                wardrobeTemplateName.value = '';
            };
            wardrobeResult.addEventListener('input', () => {
                wardrobeCopy.disabled = !wardrobeResult.value;
                saveDraft('wardrobe', wardrobeResult.value);
            });
            wardrobeResult.value = loadDraft('wardrobe');
            
            // 模板库
            const templatesExport = document.getElementById('templates-export');
            const templatesImport = document.getElementById('templates-import');
            const templatesImportFile = document.getElementById('templates-import-file');
            templatesExport.onclick = () => exportTemplates();
            templatesImport.onclick = () => templatesImportFile.click();
            templatesImportFile.onchange = (e) => {
                if (e.target.files.length) importTemplates(e.target.files[0]);
                templatesImportFile.value = '';
            };
            
            // 历史
            const historyClear = document.getElementById('history-clear');
            historyClear.onclick = () => {
                if (confirm('确定清空所有历史记录吗？')) {
                    config.generationHistory = [];
                    saveConfig();
                    refreshHistoryList();
                    toastr.success('历史已清空');
                }
            };
            
            refreshHistoryList();
            refreshTemplateList();
            refreshRelationCharList();
            
            applyTheme();
        }

        // 添加左下角菜单项
        function addMenuItem() {
            const checkExist = setInterval(() => {
                const menu = document.querySelector('#options .options-content');
                if (menu) {
                    clearInterval(checkExist);
                    if (document.querySelector('.ai-menu-item')) return;
                    
                    const menuItem = document.createElement('div');
                    menuItem.className = 'ai-menu-item';
                    menuItem.innerHTML = '<i class="fa-regular fa-robot"></i> AI人设生成器';
                    menuItem.onclick = () => {
                        const panel = document.getElementById(PANEL_ID);
                        if (panel) panel.style.display = 'flex';
                    };
                    menu.appendChild(menuItem);
                }
            }, 500);
        }

        // 样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .ai-panel {
                position: fixed;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                z-index: 100000;
                display: none;
                flex-direction: column;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: #f5f5f5;
                border-bottom: 1px solid #e0e0e0;
                font-weight: 500;
            }
            .panel-close {
                cursor: pointer;
                font-size: 18px;
                opacity: 0.6;
            }
            .panel-close:hover { opacity: 1; }
            .tab-bar {
                display: flex;
                flex-wrap: wrap;
                gap: 2px;
                padding: 8px 12px 0 12px;
                background: #fafafa;
                border-bottom: 1px solid #e0e0e0;
            }
            .tab-btn {
                padding: 6px 12px;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 12px;
                color: #666;
                border-radius: 6px 6px 0 0;
            }
            .tab-btn.active {
                background: #fff;
                color: #333;
                font-weight: 500;
                border: 1px solid #e0e0e0;
                border-bottom-color: #fff;
                margin-bottom: -1px;
            }
            .tab-content {
                flex: 1;
                padding: 16px;
                overflow-y: auto;
                display: none;
            }
            .tab-content.active { display: block; }
            .field-group {
                margin-bottom: 16px;
            }
            .field-group label {
                display: block;
                margin-bottom: 6px;
                font-size: 12px;
                font-weight: 500;
                color: #666;
            }
            .field-group input, .field-group textarea, .field-group select {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 13px;
                box-sizing: border-box;
                background: #fff;
                color: #333;
            }
            .field-group textarea {
                resize: vertical;
                font-family: monospace;
            }
            .result-text {
                font-family: monospace;
                font-size: 12px;
                line-height: 1.5;
                background: #fafafa;
            }
            button {
                padding: 6px 12px;
                background: #e0e0e0;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            button:hover { background: #d0d0d0; }
            .primary-btn {
                background: #4A6FA5;
                color: white;
                width: 100%;
                margin-bottom: 16px;
            }
            .primary-btn:hover { background: #3a5a8a; }
            .button-group {
                display: flex;
                gap: 8px;
                margin: 12px 0;
            }
            button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .radio-group {
                display: flex;
                gap: 16px;
            }
            .radio-group label {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                font-weight: normal;
            }
            .char-list, .history-list, .template-list {
                max-height: 150px;
                overflow-y: auto;
                border: 1px solid #eee;
                border-radius: 6px;
                margin-bottom: 8px;
            }
            .char-item, .history-item, .template-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                border-bottom: 1px solid #eee;
                cursor: pointer;
            }
            .char-item:hover, .history-item:hover { background: #f5f5f5; }
            .history-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
            }
            .history-type { font-weight: 500; }
            .history-time { font-size: 10px; color: #999; }
            .history-preview { font-size: 11px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .template-name { flex: 1; }
            .template-actions { display: flex; gap: 8px; }
            .empty-tip {
                text-align: center;
                padding: 20px;
                color: #999;
                font-size: 12px;
            }
            .ai-menu-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                cursor: pointer;
                border-radius: 6px;
                transition: background 0.2s;
            }
            .ai-menu-item:hover { background: rgba(0,0,0,0.05); }
            .fixed-mode .panel-header { background: #f5f5f5; border-bottom-color: #ccc; }
            .fixed-mode .tab-bar { background: #f5f5f5; }
            .fixed-mode input, .fixed-mode textarea, .fixed-mode select { background: #fff; border-color: #ccc; }
        `;
        document.head.appendChild(style);

        addMenuItem();
        createPanel();
    }
})();
