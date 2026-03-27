// AI Character Generator - 完美箭头版
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
            apiBaseUrl: 'https://key.laopobao.online/v1',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            themeMode: 'auto',
            panelWidth: 400,
            panelHeight: 550,
            panelLeft: 20,
            panelTop: 50,
            availableModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
            savedTemplates: [],
            generationHistory: [],
            draftContent: {},
            relationshipCharacters: [],
            relationshipData: {}
        };

        // 读取存储
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
                if (!config.relationshipCharacters) config.relationshipCharacters = [];
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
        const FULL_TEMPLATE = `char_name:
  chinese_name: 
  nickname: 
  age: 
  gender: 
  height: 
  identity:
    - 
  background_story:
    childhood(0-12):
    adolescence(13-18):
    young_adult(19-35):
    middle_age(35-present):
    current_situation:
  
  social_status: 
    - 

  appearance:
    hair: 
    eyes: 
    skin:
    face_shape: 
    height: 
    build: 
      - 
  attire:
    business_formal:
    business_casual:
    casual:
    home:

  archetype: 

  personality:
    core_traits: 
      - : ""
    romantic_traits: 
      - : ""
  
  personality_tags:
    - 
  
  worldview_and_values:
    - 

  lifestyle_behaviors:
    - 
    - 
  
  work_behaviors:
    - 
  
  emotional_behaviors:
    anger:
      towards_user:
      towards_others:
    happiness:
      towards_user:
      towards_others:

  romantic_behavior:
    during_courtship:
    after_commitment:
    changes_in_relationship:
  
  relationship_preferences:
    ideal_type:
    views_on_love:
    dealbreakers:
  
  goals:
    - 
  
  current_pursuit:
    - 
  
  weaknesses:
    - 

  likes:
    - 

  dislikes:
    specific_behaviors:
    specific_people_types:
    general:
    - 
  
  skills:
    professional: ["", ""]
    daily: ["", ""]
    hobbies: ["", ""]

  NSFW_information:
    sexual_traits:
      experience:
      orientation:
      role:
      habits:
        - 
    kinks:
    limits:`;

        const USER_TEMPLATE = FULL_TEMPLATE.replace(/char_name:/g, 'user_name:');

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
                    toastr.success('API连接成功！正在获取模型列表...');
                    const models = await fetchModels();
                    if (models && models.length > 0) {
                        config.availableModels = models;
                        saveConfig();
                        updateModelSelect(models);
                        toastr.success(`已获取 ${models.length} 个可用模型`);
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

        // 保存历史记录
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

        // 保存草稿
        function saveDraft(tabId, content) {
            config.draftContent[tabId] = content;
            saveConfig();
        }

        function loadDraft(tabId) {
            return config.draftContent[tabId] || '';
        }

        // 导出/导入模板
        function exportTemplates() {
            const data = JSON.stringify(config.savedTemplates, null, 2);
            const blob = new Blob([data], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai_templates_${new Date().toISOString().slice(0,19)}.json`;
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
                        toastr.success(`成功导入 ${imported.length} 个模板`);
                    } else {
                        toastr.error('文件格式错误');
                    }
                } catch (err) {
                    toastr.error('解析失败');
                }
            };
            reader.readAsText(file);
        }

        // 刷新历史记录
        function refreshHistoryList() {
            const container = document.getElementById('ai-history-list');
            if (!container) return;
            if (config.generationHistory.length === 0) {
                container.innerHTML = '<div style="padding: 8px; color: #888;">暂无历史记录</div>';
                return;
            }
            container.innerHTML = config.generationHistory.map((h, i) => `
                <div style="border-bottom: 1px solid var(--ai-border, #eee); padding: 8px 0; cursor: pointer;" class="history-item" data-index="${i}">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-weight: 500;">${h.type}</span>
                        <span style="font-size: 10px; color: #888;">${h.timestamp}</span>
                    </div>
                    <div style="font-size: 11px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">输入: ${h.input}</div>
                </div>
            `).join('');
            
            container.querySelectorAll('.history-item').forEach(item => {
                item.onclick = (e) => {
                    e.stopPropagation();
                    const idx = parseInt(item.dataset.index);
                    const history = config.generationHistory[idx];
                    if (history) {
                        if (history.type === '角色卡') {
                            document.getElementById('ai-char-result').value = history.output;
                        } else if (history.type === '用户人设') {
                            document.getElementById('ai-user-result').value = history.output;
                        } else if (history.type === '世界书') {
                            document.getElementById('ai-world-result').value = history.output;
                        } else if (history.type === '关系网') {
                            document.getElementById('ai-relation-result').value = history.output;
                        }
                        toastr.success(`已加载历史记录: ${history.type}`);
                    }
                };
            });
        }

        // 刷新模板列表
        function refreshTemplateList() {
            const container = document.getElementById('ai-template-list');
            if (!container) return;
            if (config.savedTemplates.length === 0) {
                container.innerHTML = '<div style="padding: 8px; color: #888;">暂无保存的模板</div>';
                return;
            }
            container.innerHTML = config.savedTemplates.map((t, i) => `
                <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px;">
                    <button class="ai-btn load-template" data-index="${i}" style="flex: 2; padding: 4px;">📂 ${t.name}</button>
                    <button class="ai-btn delete-template" data-index="${i}" style="flex: 0; padding: 4px 8px;">🗑️</button>
                </div>
            `).join('');
            
            container.querySelectorAll('.load-template').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.index);
                    const template = config.savedTemplates[idx];
                    if (template) {
                        const activeTab = document.querySelector('.ai-tab-content.active');
                        const resultArea = activeTab?.querySelector('.editable-result');
                        if (resultArea) {
                            resultArea.value = template.content;
                            toastr.success(`已加载模板: ${template.name}`);
                        }
                    }
                };
            });
            container.querySelectorAll('.delete-template').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    config.savedTemplates.splice(parseInt(btn.dataset.index), 1);
                    saveConfig();
                    refreshTemplateList();
                    toastr.success('模板已删除');
                };
            });
        }// ========== 关系网 - 文字生成页 ==========
        let relationChars = [];

        function addRelationChar(name, desc) {
            relationChars.push({ name, desc });
            saveRelationChars();
            refreshRelationCharList();
        }

        function removeRelationChar(index) {
            relationChars.splice(index, 1);
            saveRelationChars();
            refreshRelationCharList();
        }

        function saveRelationChars() {
            localStorage.setItem('st_ambient_relation_chars', JSON.stringify(relationChars));
        }

        function loadRelationChars() {
            const saved = localStorage.getItem('st_ambient_relation_chars');
            if (saved) relationChars = JSON.parse(saved);
        }
        loadRelationChars();

        function refreshRelationCharList() {
            const container = document.getElementById('ai-relation-char-list');
            if (!container) return;
            if (relationChars.length === 0) {
                container.innerHTML = '<div style="font-size: 11px; color: #888; text-align: center; padding: 20px;">暂无角色，点击上方添加</div>';
                return;
            }
            container.innerHTML = relationChars.map((c, i) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px; border-bottom: 1px solid var(--ai-border, #eee);">
                    <span><strong>${c.name}</strong><span style="font-size: 10px; color: #888; margin-left: 8px;">${c.desc ? c.desc.substring(0, 30) : ''}</span></span>
                    <button class="ai-btn delete-relation-char" data-index="${i}" style="padding: 2px 6px;">🗑️</button>
                </div>
            `).join('');
            
            container.querySelectorAll('.delete-relation-char').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    removeRelationChar(parseInt(btn.dataset.index));
                };
            });
        }

        // 生成关系网文字描述
        async function generateRelationText(buttonElement, resultArea) {
            if (!config.apiKey) {
                toastr.error('请先设置 API Key');
                return null;
            }
            if (relationChars.length < 2) {
                toastr.warning('至少需要2个角色才能生成关系网');
                return null;
            }
            
            const fullUrl = getFullApiUrl();
            const modelToUse = config.model || 'gpt-3.5-turbo';

            const charList = relationChars.map(c => `- ${c.name}: ${c.desc || '暂无描述'}`).join('\n');
            
            const systemPrompt = `你是一个专业的关系网分析助手。根据提供的角色列表，分析他们之间的关系，生成关系描述。

规则：
1. 分析每对角色之间的关系，区分双向、单向、无关系
2. 输出格式为JSON，格式如下：
{
  "relationships": {
    "角色A": [{"name": "角色B", "relation": "认识", "direction": "to"}],
    "角色B": []
  },
  "details": "详细关系描述文本..."
}
3. direction: "to" 表示指向对方，"from" 表示被指向，"both" 表示双向
4. 关系词语最多4个字（如：盟友、敌对、暗恋、师徒、家人、同事、主仆、仇敌、挚友、单恋）`;
            
            const userPrompt = `请分析以下角色之间的关系：\n${charList}`;
            
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.innerHTML = '<span style="display: inline-block; animation: ai-spin 0.8s linear infinite;">⏳</span> 生成中...';
            }
            
            try {
                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelToUse,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        temperature: 0.7,
                        max_tokens: 2000
                    })
                });

                if (!response.ok) {
                    toastr.error(`API调用失败: ${response.status}`);
                    return null;
                }

                const data = await response.json();
                let content = data.choices[0].message.content;
                content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                
                if (resultArea) {
                    resultArea.value = content;
                    addToHistory('关系网', `角色数: ${relationChars.length}`, content);
                }
                
                toastr.success('关系网生成成功！');
                return content;
            } catch (err) {
                toastr.error(`生成失败: ${err.message}`);
                return null;
            } finally {
                if (buttonElement) {
                    buttonElement.disabled = false;
                    buttonElement.innerHTML = '📝 生成关系描述';
                }
            }
        }

        // ========== 关系图谱（可视化，支持箭头方向）==========
        let selectedCharIndices = [];
        let graphChars = [];

        function addGraphChar(name, desc) {
            graphChars.push({ name, desc });
            saveGraphChars();
            refreshGraphCharList();
            refreshGraphCanvas();
        }

        function removeGraphChar(index) {
            graphChars.splice(index, 1);
            selectedCharIndices = selectedCharIndices.filter(i => i !== index).map(i => i > index ? i - 1 : i);
            saveGraphChars();
            refreshGraphCharList();
            refreshGraphCanvas();
        }

        function saveGraphChars() {
            localStorage.setItem('st_ambient_graph_chars', JSON.stringify(graphChars));
        }

        function loadGraphChars() {
            const saved = localStorage.getItem('st_ambient_graph_chars');
            if (saved) graphChars = JSON.parse(saved);
        }
        loadGraphChars();

        function refreshGraphCharList() {
            const container = document.getElementById('ai-graph-char-list');
            if (!container) return;
            if (graphChars.length === 0) {
                container.innerHTML = '<div style="font-size: 11px; color: #888; text-align: center; padding: 20px;">暂无角色，点击上方添加</div>';
                return;
            }
            container.innerHTML = graphChars.map((c, i) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px; border-bottom: 1px solid var(--ai-border, #eee);">
                    <span><strong>${c.name}</strong><span style="font-size: 10px; color: #888; margin-left: 8px;">${c.desc ? c.desc.substring(0, 30) : ''}</span></span>
                    <button class="ai-btn delete-graph-char" data-index="${i}" style="padding: 2px 6px;">🗑️</button>
                </div>
            `).join('');
            
            container.querySelectorAll('.delete-graph-char').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    removeGraphChar(parseInt(btn.dataset.index));
                };
            });
        }

        function refreshGraphCanvas() {
            const container = document.getElementById('ai-graph-canvas');
            if (!container) return;
            if (graphChars.length === 0) {
                container.innerHTML = '<div style="font-size: 11px; color: #888; text-align: center; padding: 40px;">暂无角色，请添加</div>';
                return;
            }
            
            const chars = graphChars;
            const relationships = config.relationshipData.relationships || {};
            
            // 构建连线（支持方向）
            let lines = [];
            for (let i = 0; i < chars.length; i++) {
                const rels = relationships[chars[i].name] || [];
                for (const rel of rels) {
                    const targetIndex = chars.findIndex(c => c.name === rel.name);
                    if (targetIndex !== -1) {
                        const direction = rel.direction || 'both';
                        const relationText = (rel.relation || '关联').substring(0, 4);
                        lines.push({ 
                            from: i, 
                            to: targetIndex, 
                            relation: relationText,
                            direction: direction
                        });
                    }
                }
            }
            
            const canvasWidth = container.clientWidth - 20;
            const canvasHeight = 320;
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            const radius = Math.min(canvasWidth, canvasHeight) * 0.35;
            const angles = chars.map((_, i) => (i * 2 * Math.PI / chars.length) - Math.PI / 2);
            const positions = chars.map((_, i) => ({
                x: centerX + radius * Math.cos(angles[i]),
                y: centerY + radius * Math.sin(angles[i])
            }));
            
            // 去重，合并双向箭头
            const lineMap = new Map();
            for (const line of lines) {
                const key = `${Math.min(line.from, line.to)}-${Math.max(line.from, line.to)}`;
                if (!lineMap.has(key)) {
                    lineMap.set(key, { from: line.from, to: line.to, directions: [] });
                }
                const existing = lineMap.get(key);
                if (line.direction === 'to') {
                    existing.directions.push({ from: line.from, to: line.to, relation: line.relation });
                } else if (line.direction === 'from') {
                    existing.directions.push({ from: line.to, to: line.from, relation: line.relation });
                } else if (line.direction === 'both') {
                    existing.directions.push({ from: line.from, to: line.to, relation: line.relation });
                    existing.directions.push({ from: line.to, to: line.from, relation: line.relation });
                }
            }
            
            // 去重同一方向
            for (const [key, val] of lineMap) {
                const uniqueDirs = [];
                const dirSet = new Set();
                for (const d of val.directions) {
                    const dirKey = `${d.from}-${d.to}`;
                    if (!dirSet.has(dirKey)) {
                        dirSet.add(dirKey);
                        uniqueDirs.push(d);
                    }
                }
                val.directions = uniqueDirs;
            }
            
            container.innerHTML = `
                <div style="position: relative; width: 100%; height: ${canvasHeight}px;">
                    <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
                        ${Array.from(lineMap.values()).map(line => {
                            const from = positions[line.from];
                            const to = positions[line.to];
                            const angle = Math.atan2(to.y - from.y, to.x - from.x);
                            const arrowSize = 8;
                            
                            return line.directions.map((dir, idx) => {
                                const isReverse = dir.from !== line.from;
                                const start = isReverse ? to : from;
                                const end = isReverse ? from : to;
                                const dx = end.x - start.x;
                                const dy = end.y - start.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                const offset = idx === 0 ? 0 : (idx === 1 ? 12 : -12);
                                const perpX = -dy / dist * offset;
                                const perpY = dx / dist * offset;
                                
                                const startX = start.x + perpX;
                                const startY = start.y + perpY;
                                const endX = end.x + perpX;
                                const endY = end.y + perpY;
                                const midX = (startX + endX) / 2;
                                const midY = (startY + endY) / 2;
                                
                                const arrowAngle = Math.atan2(endY - startY, endX - startX);
                                const arrowX = endX - arrowSize * Math.cos(arrowAngle);
                                const arrowY = endY - arrowSize * Math.sin(arrowAngle);
                                
                                const isHighlighted = selectedCharIndices.includes(line.from) || selectedCharIndices.includes(line.to);
                                
                                return `
                                    <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${isHighlighted ? '#4A6FA5' : '#aaa'}" stroke-width="${isHighlighted ? '3' : '1.5'}" marker-end="url(#arrowhead)" />
                                    <polygon points="${arrowX},${arrowY} ${arrowX - arrowSize/2},${arrowY - arrowSize/2} ${arrowX - arrowSize/2},${arrowY + arrowSize/2}" fill="${isHighlighted ? '#4A6FA5' : '#aaa'}" />
                                    <text x="${midX}" y="${midY - 5}" font-size="10" fill="#666" text-anchor="middle">${dir.relation}</text>
                                `;
                            }).join('');
                        }).join('')}
                        <defs>
                            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                                <polygon points="0 0, 8 4, 0 8" fill="#aaa" />
                            </marker>
                        </defs>
                    </svg>
                    <div>
                        ${chars.map((c, i) => {
                            const pos = positions[i];
                            const isSelected = selectedCharIndices.includes(i);
                            return `
                                <div class="graph-node" data-index="${i}" style="position: absolute; left: ${pos.x - 28}px; top: ${pos.y - 28}px; width: 56px; height: 56px; border-radius: 50%; background: ${isSelected ? '#4A6FA5' : '#e0e0e0'}; color: ${isSelected ? 'white' : '#333'}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                    ${c.name.charAt(0)}
                                </div>
                                <div style="position: absolute; left: ${pos.x - 30}px; top: ${pos.y + 30}px; width: 60px; text-align: center; font-size: 11px;">
                                    ${c.name}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
            
            container.querySelectorAll('.graph-node').forEach(node => {
                node.onclick = (e) => {
                    e.stopPropagation();
                    const idx = parseInt(node.dataset.index);
                    if (e.ctrlKey || e.metaKey) {
                        if (selectedCharIndices.includes(idx)) {
                            selectedCharIndices = selectedCharIndices.filter(i => i !== idx);
                        } else {
                            selectedCharIndices.push(idx);
                        }
                    } else {
                        if (selectedCharIndices.length === 1 && selectedCharIndices[0] === idx) {
                            const char = graphChars[idx];
                            const rels = (config.relationshipData.relationships || {})[char.name] || [];
                            let detail = `📌 ${char.name}\n\n📝 描述:\n${char.desc || '暂无描述'}\n\n🔗 关系:\n`;
                            rels.forEach(r => {
                                const dirText = r.direction === 'to' ? '→' : (r.direction === 'from' ? '←' : '↔');
                                detail += `  ${dirText} ${r.name}: ${r.relation || '关联'}\n`;
                            });
                            alert(detail);
                        } else {
                            selectedCharIndices = [idx];
                        }
                    }
                    refreshGraphCanvas();
                    updateGraphDetail();
                };
            });
        }
        
        function updateGraphDetail() {
            const detailArea = document.getElementById('ai-graph-detail');
            if (!detailArea) return;
            if (selectedCharIndices.length === 0) {
                detailArea.innerHTML = '<div style="padding: 10px; color: #888;">点击角色头像查看关系</div>';
                return;
            }
            const chars = graphChars;
            const relationships = config.relationshipData.relationships || {};
            const details = selectedCharIndices.map(idx => {
                const char = chars[idx];
                const rels = relationships[char.name] || [];
                return `
                    <div style="margin-bottom: 8px; padding: 6px; background: rgba(74,111,165,0.1); border-radius: 6px;">
                        <strong>${char.name}</strong>
                        ${rels.length ? rels.map(r => {
                            const dirText = r.direction === 'to' ? '→' : (r.direction === 'from' ? '←' : '↔');
                            return `<div>${dirText} ${r.name}: ${r.relation || '关联'}</div>`;
                        }).join('') : '<div style="color: #888;">暂无关系数据</div>'}
                    </div>
                `;
            }).join('');
            detailArea.innerHTML = details;
        }

        // 生成图谱数据（支持方向）
        async function generateGraphData(buttonElement) {
            if (!config.apiKey) {
                toastr.error('请先设置 API Key');
                return null;
            }
            if (graphChars.length < 2) {
                toastr.warning('至少需要2个角色才能生成关系网');
                return null;
            }
            
            const fullUrl = getFullApiUrl();
            const modelToUse = config.model || 'gpt-3.5-turbo';

            const charList = graphChars.map(c => `- ${c.name}: ${c.desc || '暂无描述'}`).join('\n');
            
            const systemPrompt = `你是一个专业的关系网分析助手。根据提供的角色列表，分析他们之间的关系，生成关系描述。

规则：
1. 分析每对角色之间的关系，用简短词语描述（最多4个字）
2. 区分方向：
   - 双向关系：两人互相认识/互相有感情（如：盟友、夫妻、挚友）
   - 单向关系：A认识B但B不认识A，或A喜欢B但B不喜欢A（如：单恋、暗恋、崇拜、敬畏）
   - 无关系：没有连线
3. 输出格式为JSON，格式如下：
{
  "relationships": {
    "角色A": [{"name": "角色B", "relation": "盟友", "direction": "both"}],
    "角色B": [{"name": "角色A", "relation": "盟友", "direction": "both"}],
    "角色C": [{"name": "角色D", "relation": "暗恋", "direction": "to"}]
  },
  "details": "详细关系描述文本..."
}
4. direction: "to" 表示指向对方（单向），"both" 表示双向`;
            
            const userPrompt = `请分析以下角色之间的关系：\n${charList}`;
            
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.innerHTML = '<span style="display: inline-block; animation: ai-spin 0.8s linear infinite;">⏳</span> 生成中...';
            }
            
            try {
                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelToUse,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        temperature: 0.7,
                        max_tokens: 2000
                    })
                });

                if (!response.ok) {
                    toastr.error(`API调用失败: ${response.status}`);
                    return null;
                }

                const data = await response.json();
                let content = data.choices[0].message.content;
                content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                
                try {
                    const parsed = JSON.parse(content);
                    config.relationshipData = parsed;
                    saveConfig();
                    addToHistory('关系图谱', `角色数: ${graphChars.length}`, parsed.details || content);
                    refreshGraphCanvas();
                    toastr.success('关系图谱生成成功！');
                    return parsed;
                } catch (e) {
                    toastr.success('关系图谱生成成功（文本格式）');
                    return content;
                }
            } catch (err) {
                toastr.error(`生成失败: ${err.message}`);
                return null;
            } finally {
                if (buttonElement) {
                    buttonElement.disabled = false;
                    buttonElement.innerHTML = '🔗 生成关系图谱';
                }
            }
        }// 生成角色卡
        async function generateCharacter(userInput, cardType, buttonElement, resultArea) {
            if (!config.apiKey) {
                toastr.error('请先设置 API Key');
                return null;
            }
            
            const fullUrl = getFullApiUrl();
            const modelToUse = config.model || 'gpt-3.5-turbo';
            const template = cardType === 'character' ? FULL_TEMPLATE : USER_TEMPLATE;
            const typeName = cardType === 'character' ? '角色卡' : '用户人设';

            const systemPrompt = `你是一个专业的${typeName}生成助手。

【重要】你必须严格按照下面的模板格式输出，不要添加任何额外解释、不要添加\`\`\`yaml标记、不要输出模板以外的内容。
模板如下，请填充所有字段，即使没有提供的信息也要根据上下文合理推断：

${template}

规则：
1. 用户输入可能很少，你需要根据这个线索合理推断所有字段
2. 所有字段都不能留空，必须填满
3. 保持YAML格式正确
4. 不要输出任何解释文字，只输出填充好的YAML内容`;
            
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.innerHTML = '<span style="display: inline-block; animation: ai-spin 0.8s linear infinite;">⏳</span> 生成中...';
            }
            
            try {
                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelToUse,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userInput }
                        ],
                        temperature: 0.8,
                        max_tokens: 3000
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
                    // 启用复制和导入按钮
                    const copyBtn = resultArea.parentElement?.querySelector('.ai-copy-btn');
                    const importBtn = resultArea.parentElement?.querySelector('.ai-import-btn');
                    if (copyBtn) copyBtn.disabled = false;
                    if (importBtn) importBtn.disabled = false;
                }
                
                toastr.success('生成成功！');
                return content;
            } catch (err) {
                toastr.error(`生成失败: ${err.message}`);
                return null;
            } finally {
                if (buttonElement) {
                    buttonElement.disabled = false;
                    buttonElement.innerHTML = cardType === 'character' ? '✨ 生成角色卡' : '✨ 生成用户人设';
                }
            }
        }

        // 生成世界书
        async function generateWorldbook(userInput, buttonElement, resultArea) {
            if (!config.apiKey) {
                toastr.error('请先设置 API Key');
                return null;
            }
            
            const fullUrl = getFullApiUrl();
            const modelToUse = config.model || 'gpt-3.5-turbo';

            const systemPrompt = `你是一个专业的世界书/设定集生成助手。用户会告诉你他们想要什么类型的设定，你需要根据要求生成详细、丰富、有深度的世界设定内容。

规则：
1. 根据用户的要求自由创作，没有固定格式
2. 内容可以包括：世界观、地理、历史、文化、种族、科技、魔法、政治、经济、人物、组织、事件等
3. 语言生动详细，保持逻辑自洽
4. 直接输出内容，不要添加额外解释`;
            
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.innerHTML = '<span style="display: inline-block; animation: ai-spin 0.8s linear infinite;">⏳</span> 生成中...';
            }
            
            try {
                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelToUse,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userInput }
                        ],
                        temperature: 0.9,
                        max_tokens: 3000
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
                    const copyBtn = resultArea.parentElement?.querySelector('.ai-copy-btn');
                    if (copyBtn) copyBtn.disabled = false;
                }
                
                toastr.success('生成成功！');
                return content;
            } catch (err) {
                toastr.error(`生成失败: ${err.message}`);
                return null;
            } finally {
                if (buttonElement) {
                    buttonElement.disabled = false;
                    buttonElement.innerHTML = '✨ 生成世界书';
                }
            }
        }

        // 直接导入角色卡
        async function importCharacterCard(yamlContent) {
            try {
                const nameMatch = yamlContent.match(/chinese_name:\s*(.+)/m);
                const name = nameMatch ? nameMatch[1].trim() : '新角色';
                
                const description = extractField(yamlContent, 'appearance', 'personality');
                const personality = extractField(yamlContent, 'personality', 'core_traits');
                const scenario = extractField(yamlContent, 'background_story', 'current_situation');
                const first_mes = extractField(yamlContent, 'first_message') || `你好，我是${name}`;
                const mes_example = extractField(yamlContent, 'example_messages') || '';
                
                const characterCard = {
                    name: name,
                    description: description,
                    personality: personality,
                    scenario: scenario,
                    first_mes: first_mes,
                    mes_example: mes_example
                };
                
                if (window.SillyTavern && window.SillyTavern.getContext) {
                    const context = window.SillyTavern.getContext();
                    if (context && context.createCharacter) {
                        await context.createCharacter(characterCard);
                        toastr.success(`角色卡 "${name}" 已创建！`);
                        return;
                    }
                }
                
                copyToClipboard(yamlContent);
                toastr.info('自动创建失败，已复制到剪贴板，请手动创建');
            } catch (err) {
                console.error('创建角色卡失败:', err);
                copyToClipboard(yamlContent);
                toastr.error('自动创建失败，已复制到剪贴板');
            }
        }

        // 直接导入用户人设
        async function importUserPersona(yamlContent) {
            try {
                const nameMatch = yamlContent.match(/chinese_name:\s*(.+)/m);
                const name = nameMatch ? nameMatch[1].trim() : '新用户';
                
                const description = extractField(yamlContent, 'appearance', 'personality');
                const personality = extractField(yamlContent, 'personality', 'core_traits');
                
                const personaData = {
                    name: name,
                    description: description,
                    personality: personality
                };
                
                if (window.SillyTavern && window.SillyTavern.getContext) {
                    const context = window.SillyTavern.getContext();
                    if (context && context.createPersona) {
                        await context.createPersona(personaData);
                        toastr.success(`用户人设 "${name}" 已创建！`);
                        return;
                    }
                }
                
                copyToClipboard(yamlContent);
                toastr.info('自动创建失败，已复制到剪贴板，请手动创建');
            } catch (err) {
                console.error('创建用户人设失败:', err);
                copyToClipboard(yamlContent);
                toastr.error('自动创建失败，已复制到剪贴板');
            }
        }

        function extractField(content, ...fields) {
            for (const field of fields) {
                const regex = new RegExp(`${field}:\\s*(.+?)(?=\\n\\w|$)`, 'ms');
                const match = content.match(regex);
                if (match && match[1].trim()) return match[1].trim();
            }
            return '';
        }

        function copyToClipboard(text) {
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => {
                toastr.success('已复制到剪贴板');
            }).catch(() => {
                toastr.error('复制失败');
            });
        }// ========== 创建面板 ==========
function createPanel() {
    if (document.getElementById(PANEL_ID)) return;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'ai-char-panel';
    panel.style.position = 'fixed';
    panel.style.left = `${config.panelLeft}px`;
    panel.style.top = `${config.panelTop}px`;
    panel.style.width = `${config.panelWidth}px`;
    panel.style.height = `${config.panelHeight}px`;
    
    const modelOptions = (config.availableModels || ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'])
        .map(m => `<option value="${m}" ${m === config.model ? 'selected' : ''}>${m}</option>`).join('');
    
    panel.innerHTML = `
        <div class="ai-panel-header">
            <span>🤖 AI人设生成器</span>
            <div class="ai-panel-controls">
                <span class="ai-panel-close" title="关闭">✕</span>
            </div>
        </div>
        
        <div class="ai-tab-bar">
            <button class="ai-tab-btn active" data-tab="api">🔑 API</button>
            <button class="ai-tab-btn" data-tab="char">👤 角色卡</button>
            <button class="ai-tab-btn" data-tab="user">👾 用户人设</button>
            <button class="ai-tab-btn" data-tab="world">📖 世界书</button>
            <button class="ai-tab-btn" data-tab="relation-text">📝 关系网</button>
            <button class="ai-tab-btn" data-tab="relation-graph">🔗 关系图谱</button>
            <button class="ai-tab-btn" data-tab="history">📜 历史</button>
            <button class="ai-tab-btn" data-tab="templates">📚 模板</button>
            <button class="ai-tab-btn" data-tab="theme">🎨 主题</button>
            <button class="ai-tab-btn" data-tab="size">📐 大小</button>
        </div>
        
        <!-- API页 -->
        <div class="ai-tab-content active" id="tab-api">
            <div class="ai-setting-group">
                <label>API地址 (基础地址即可)</label>
                <input type="text" id="ai-api-url" placeholder="https://key.laopobao.online/v1" value="${config.apiBaseUrl}">
            </div>
            <div class="ai-setting-group">
                <label>API Key</label>
                <input type="password" id="ai-api-key" placeholder="sk-..." value="${config.apiKey}">
            </div>
            <div class="ai-setting-group">
                <label>选择模型</label>
                <select id="ai-model-select">${modelOptions}</select>
            </div>
            <div class="ai-button-group">
                <button id="ai-test-connection" class="ai-btn">🔌 测试连接</button>
                <button id="ai-save-api" class="ai-btn ai-btn-primary">💾 保存设置</button>
            </div>
        </div>
        
        <!-- 角色卡页 -->
        <div class="ai-tab-content" id="tab-char">
            <div class="ai-setting-group">
                <label>简单设定</label>
                <textarea id="ai-char-input" rows="3" placeholder="例如：前锋，是所有屠孝子心里最柔软的地方"></textarea>
            </div>
            <div class="ai-button-group">
                <button id="ai-char-generate" class="ai-btn ai-btn-primary">✨ 生成角色卡</button>
            </div>
            <div class="ai-setting-group">
                <label>生成结果 (可直接编辑)</label>
                <textarea id="ai-char-result" class="editable-result" rows="12" placeholder="生成结果会显示在这里..."></textarea>
            </div>
            <div class="ai-button-group">
                <button id="ai-char-copy" class="ai-btn ai-copy-btn" disabled>📋 复制</button>
                <button id="ai-char-import" class="ai-btn ai-import-btn" disabled>📥 直接导入角色卡</button>
                <button id="ai-char-clear" class="ai-btn">🗑️ 清空</button>
            </div>
            <div class="ai-setting-group">
                <label>💾 保存为模板</label>
                <div style="display: flex; gap: 6px;">
                    <input type="text" id="ai-char-template-name" placeholder="模板名称" style="flex: 2;">
                    <button id="ai-char-save-template" class="ai-btn">保存</button>
                </div>
            </div>
        </div>
        
        <!-- 用户人设页 -->
        <div class="ai-tab-content" id="tab-user">
            <div class="ai-setting-group">
                <label>简单设定</label>
                <textarea id="ai-user-input" rows="3" placeholder="例如：菲利普，锋儿最爱的老公"></textarea>
            </div>
            <div class="ai-button-group">
                <button id="ai-user-generate" class="ai-btn ai-btn-primary">✨ 生成用户人设</button>
            </div>
            <div class="ai-setting-group">
                <label>生成结果 (可直接编辑)</label>
                <textarea id="ai-user-result" class="editable-result" rows="12" placeholder="生成结果会显示在这里..."></textarea>
            </div>
            <div class="ai-button-group">
                <button id="ai-user-copy" class="ai-btn ai-copy-btn" disabled>📋 复制</button>
                <button id="ai-user-import" class="ai-btn ai-import-btn" disabled>📥 直接导入用户人设</button>
                <button id="ai-user-clear" class="ai-btn">🗑️ 清空</button>
            </div>
            <div class="ai-setting-group">
                <label>💾 保存为模板</label>
                <div style="display: flex; gap: 6px;">
                    <input type="text" id="ai-user-template-name" placeholder="模板名称" style="flex: 2;">
                    <button id="ai-user-save-template" class="ai-btn">保存</button>
                </div>
            </div>
        </div>
        
        <!-- 世界书页 -->
        <div class="ai-tab-content" id="tab-world">
            <div class="ai-setting-group">
                <label>📖 世界书设定要求</label>
                <textarea id="ai-world-input" rows="5" placeholder="例如：帮我生成一个赛博朋克风格的都市世界观，有大型企业控制、义体改造、地下黑客文化，时间设定在2087年。需要包含世界名称、核心设定、三大势力、科技水平、社会阶层、主要地点、冲突事件"></textarea>
            </div>
            <div class="ai-button-group">
                <button id="ai-world-generate" class="ai-btn ai-btn-primary">✨ 生成世界书</button>
            </div>
            <div class="ai-setting-group">
                <label>生成结果 (可直接编辑)</label>
                <textarea id="ai-world-result" class="editable-result" rows="12" placeholder="生成结果会显示在这里..."></textarea>
            </div>
            <div class="ai-button-group">
                <button id="ai-world-copy" class="ai-btn ai-copy-btn" disabled>📋 复制</button>
                <button id="ai-world-clear" class="ai-btn">🗑️ 清空</button>
            </div>
            <div class="ai-setting-group">
                <label>💾 保存为模板</label>
                <div style="display: flex; gap: 6px;">
                    <input type="text" id="ai-world-template-name" placeholder="模板名称" style="flex: 2;">
                    <button id="ai-world-save-template" class="ai-btn">保存</button>
                </div>
            </div>
        </div>
        
        <!-- 关系网文字生成页 -->
        <div class="ai-tab-content" id="tab-relation-text">
            <div class="ai-setting-group">
                <label>👥 角色列表</label>
                <div id="ai-relation-char-list" style="max-height: 150px; overflow-y: auto; border: 1px solid var(--ai-border); border-radius: 8px; margin-bottom: 8px;"></div>
                <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                    <input type="text" id="ai-relation-char-name" placeholder="角色名称" style="flex: 1;">
                    <button id="ai-relation-add-char" class="ai-btn">➕ 添加</button>
                </div>
                <div style="margin-bottom: 8px;">
                    <textarea id="ai-relation-char-desc" rows="2" placeholder="角色描述（可选）" style="width: 100%;"></textarea>
                </div>
            </div>
            <div class="ai-button-group">
                <button id="ai-relation-generate" class="ai-btn ai-btn-primary">📝 生成关系描述</button>
            </div>
            <div class="ai-setting-group">
                <label>关系描述结果</label>
                <textarea id="ai-relation-result" class="editable-result" rows="10" placeholder="生成的关系描述会显示在这里..."></textarea>
            </div>
            <div class="ai-button-group">
                <button id="ai-relation-copy" class="ai-btn ai-copy-btn" disabled>📋 复制</button>
                <button id="ai-relation-clear" class="ai-btn">🗑️ 清空</button>
            </div>
            <div class="ai-setting-group">
                <label>💾 保存为模板</label>
                <div style="display: flex; gap: 6px;">
                    <input type="text" id="ai-relation-template-name" placeholder="模板名称" style="flex: 2;">
                    <button id="ai-relation-save-template" class="ai-btn">保存</button>
                </div>
            </div>
        </div>
        
        <!-- 关系图谱可视化页（箭头版） -->
        <div class="ai-tab-content" id="tab-relation-graph">
            <div class="ai-setting-group">
                <label>👥 角色列表</label>
                <div id="ai-graph-char-list" style="max-height: 150px; overflow-y: auto; border: 1px solid var(--ai-border); border-radius: 8px; margin-bottom: 8px;"></div>
                <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                    <input type="text" id="ai-graph-char-name" placeholder="角色名称" style="flex: 1;">
                    <button id="ai-graph-add-char" class="ai-btn">➕ 添加</button>
                </div>
                <div style="margin-bottom: 8px;">
                    <textarea id="ai-graph-char-desc" rows="2" placeholder="角色描述（可选）" style="width: 100%;"></textarea>
                </div>
            </div>
            <div class="ai-button-group">
                <button id="ai-graph-generate" class="ai-btn ai-btn-primary">🔗 生成关系图谱</button>
            </div>
            <div class="ai-setting-group">
                <label>🔗 关系图谱 (点击头像查看关系，Ctrl+点击多选)</label>
                <div id="ai-graph-canvas" style="min-height: 320px; border: 1px solid var(--ai-border); border-radius: 8px; background: var(--ai-bg);"></div>
            </div>
            <div id="ai-graph-detail" style="margin-top: 8px; padding: 8px; background: rgba(74,111,165,0.05); border-radius: 8px; min-height: 80px;"></div>
            <div class="ai-button-group">
                <button id="ai-graph-copy" class="ai-btn ai-copy-btn" disabled>📋 复制详情</button>
                <button id="ai-graph-clear" class="ai-btn">🗑️ 清空</button>
            </div>
            <div class="ai-setting-group">
                <label>💾 保存为模板</label>
                <div style="display: flex; gap: 6px;">
                    <input type="text" id="ai-graph-template-name" placeholder="模板名称" style="flex: 2;">
                    <button id="ai-graph-save-template" class="ai-btn">保存</button>
                </div>
            </div>
        </div>
        
        <!-- 历史记录页 -->
        <div class="ai-tab-content" id="tab-history">
            <div class="ai-setting-group">
                <label>📜 生成历史 (最近20条)</label>
                <div id="ai-history-list" style="max-height: 350px; overflow-y: auto;"></div>
                <button id="ai-history-clear" class="ai-btn" style="margin-top: 8px;">🗑️ 清空历史</button>
            </div>
        </div>
        
        <!-- 模板库页 -->
        <div class="ai-tab-content" id="tab-templates">
            <div class="ai-setting-group">
                <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                    <button id="ai-templates-export" class="ai-btn">📤 导出模板</button>
                    <button id="ai-templates-import" class="ai-btn">📥 导入模板</button>
                    <input type="file" id="ai-templates-import-file" accept=".json" style="display: none;">
                </div>
                <label>📚 已保存的模板</label>
                <div id="ai-template-list" style="max-height: 300px; overflow-y: auto;"></div>
            </div>
        </div>
        
        <!-- 主题页 -->
        <div class="ai-tab-content" id="tab-theme">
            <div class="ai-setting-group">
                <label>界面主题</label>
                <div class="ai-radio-group">
                    <label><input type="radio" name="theme-mode" value="auto" ${config.themeMode === 'auto' ? 'checked' : ''}> 适配酒馆美化</label>
                    <label><input type="radio" name="theme-mode" value="fixed" ${config.themeMode === 'fixed' ? 'checked' : ''}> 纯净白底黑字</label>
                </div>
            </div>
        </div>
        
        <!-- 大小页 -->
        <div class="ai-tab-content" id="tab-size">
            <div class="ai-setting-group">
                <label>面板宽度 <span id="width-value">${config.panelWidth}</span> px</label>
                <input type="range" id="panel-width-slider" min="300" max="700" step="10" value="${config.panelWidth}">
            </div>
            <div class="ai-setting-group">
                <label>面板高度 <span id="height-value">${config.panelHeight}</span> px</label>
                <input type="range" id="panel-height-slider" min="400" max="800" step="10" value="${config.panelHeight}">
            </div>
            <div class="ai-setting-group">
                <label>面板左边距 <span id="left-value">${config.panelLeft}</span> px</label>
                <input type="range" id="panel-left-slider" min="0" max="${window.innerWidth - 50}" step="10" value="${config.panelLeft}">
            </div>
            <div class="ai-setting-group">
                <label>面板上边距 <span id="top-value">${config.panelTop}</span> px</label>
                <input type="range" id="panel-top-slider" min="0" max="500" step="10" value="${config.panelTop}">
            </div>
            <div class="ai-setting-group">
                <label>字体大小 <span id="font-value">13</span> px</label>
                <input type="range" id="font-size-slider" min="10" max="18" step="1" value="13">
            </div>
        </div>
    `;
    document.body.appendChild(panel);// 选项卡切换
const tabBtns = panel.querySelectorAll('.ai-tab-btn');
const tabContents = panel.querySelectorAll('.ai-tab-content');
tabBtns.forEach(btn => {
    btn.onclick = () => {
        const tabId = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.add('active');
        const resultArea = document.getElementById(`ai-${tabId}-result`);
        if (resultArea && resultArea.classList.contains('editable-result')) {
            const draft = loadDraft(tabId);
            if (draft && !resultArea.value) {
                resultArea.value = draft;
            }
        }
        if (tabId === 'relation-text') {
            setTimeout(() => refreshRelationCharList(), 50);
        }
        if (tabId === 'relation-graph') {
            setTimeout(() => {
                refreshGraphCharList();
                refreshGraphCanvas();
            }, 50);
        }
    };
});

// 关闭按钮
const closeBtn = panel.querySelector('.ai-panel-close');
if (closeBtn) {
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        panel.style.display = 'none';
    };
}

// API 操作
const apiUrlInput = document.getElementById('ai-api-url');
const apiKeyInput = document.getElementById('ai-api-key');
const modelSelect = document.getElementById('ai-model-select');

document.getElementById('ai-save-api').onclick = () => {
    config.apiBaseUrl = apiUrlInput.value;
    config.apiKey = apiKeyInput.value;
    config.model = modelSelect.value;
    saveConfig();
    toastr.success('API配置已保存');
};
document.getElementById('ai-test-connection').onclick = async () => {
    config.apiBaseUrl = apiUrlInput.value;
    config.apiKey = apiKeyInput.value;
    saveConfig();
    await testAPIConnection();
};
modelSelect.onchange = () => {
    config.model = modelSelect.value;
    saveConfig();
};

// ========== 主题应用 ==========
const themeRadios = document.querySelectorAll('input[name="theme-mode"]');

function getCurrentThemeColors() {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    return {
        bg: computed.getPropertyValue('--SmartThemeBlurTintColor') || '#f5f5f5',
        text: computed.getPropertyValue('--SmartThemeBodyColor') || '#333333',
        border: computed.getPropertyValue('--SmartThemeBorderColor') || '#dddddd',
        inputBg: computed.getPropertyValue('--SmartThemeBlurTintColor') || '#ffffff',
    };
}

const fixedModeStyle = `
    .ai-char-panel.fixed-mode {
        background: #ffffff !important;
        color: #000000 !important;
        border: 1px solid #cccccc !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    }
    .ai-char-panel.fixed-mode .ai-panel-header {
        background: #f5f5f5 !important;
        border-bottom: 1px solid #cccccc !important;
    }
    .ai-char-panel.fixed-mode .ai-tab-bar {
        background: #f5f5f5 !important;
        border-bottom: 1px solid #cccccc !important;
    }
    .ai-char-panel.fixed-mode .ai-tab-btn {
        color: #666666 !important;
    }
    .ai-char-panel.fixed-mode .ai-tab-btn.active {
        color: #000000 !important;
        border-bottom: 2px solid #000000 !important;
    }
    .ai-char-panel.fixed-mode input,
    .ai-char-panel.fixed-mode textarea,
    .ai-char-panel.fixed-mode select {
        background: #ffffff !important;
        border: 1px solid #cccccc !important;
        color: #000000 !important;
    }
    .ai-char-panel.fixed-mode button {
        background: #e0e0e0 !important;
        border: 1px solid #cccccc !important;
        color: #000000 !important;
    }
    .ai-char-panel.fixed-mode button:hover {
        background: #d0d0d0 !important;
    }
    .ai-char-panel.fixed-mode .ai-btn-primary {
        background: #4A6FA5 !important;
        color: white !important;
    }
    .ai-char-panel.fixed-mode input[type="range"] {
        -webkit-appearance: none;
        background: #cccccc !important;
        height: 4px !important;
        border-radius: 2px !important;
    }
    .ai-char-panel.fixed-mode input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px !important;
        height: 16px !important;
        background: #666666 !important;
        border-radius: 50% !important;
        cursor: pointer !important;
    }
`;

let fixedStyleElement = null;

function applyTheme() {
    const panelEl = document.getElementById(PANEL_ID);
    if (!panelEl) return;
    
    if (config.themeMode === 'fixed') {
        panelEl.classList.add('fixed-mode');
        if (!fixedStyleElement) {
            fixedStyleElement = document.createElement('style');
            fixedStyleElement.id = 'ai-fixed-mode-style';
            fixedStyleElement.textContent = fixedModeStyle;
            document.head.appendChild(fixedStyleElement);
        }
        panelEl.style.backgroundColor = '';
        panelEl.style.color = '';
        panelEl.style.border = '';
    } else {
        panelEl.classList.remove('fixed-mode');
        if (fixedStyleElement) {
            fixedStyleElement.remove();
            fixedStyleElement = null;
        }
        const colors = getCurrentThemeColors();
        panelEl.style.backgroundColor = colors.bg;
        panelEl.style.color = colors.text;
        panelEl.style.border = `1px solid ${colors.border}`;
        panelEl.style.setProperty('--ai-bg', colors.bg);
        panelEl.style.setProperty('--ai-text', colors.text);
        panelEl.style.setProperty('--ai-border', colors.border);
        panelEl.style.setProperty('--ai-input-bg', colors.inputBg);
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

// 位置和大小滑块
const widthSlider = document.getElementById('panel-width-slider');
const heightSlider = document.getElementById('panel-height-slider');
const leftSlider = document.getElementById('panel-left-slider');
const topSlider = document.getElementById('panel-top-slider');
const fontSlider = document.getElementById('font-size-slider');
const widthVal = document.getElementById('width-value');
const heightVal = document.getElementById('height-value');
const leftVal = document.getElementById('left-value');
const topVal = document.getElementById('top-value');
const fontVal = document.getElementById('font-value');

widthSlider.oninput = () => {
    const val = parseInt(widthSlider.value);
    widthVal.textContent = val;
    config.panelWidth = val;
    saveConfig();
    panel.style.width = `${val}px`;
    applyTheme();
};
heightSlider.oninput = () => {
    const val = parseInt(heightSlider.value);
    heightVal.textContent = val;
    config.panelHeight = val;
    saveConfig();
    panel.style.height = `${val}px`;
    applyTheme();
};
leftSlider.oninput = () => {
    const val = parseInt(leftSlider.value);
    leftVal.textContent = val;
    config.panelLeft = val;
    saveConfig();
    panel.style.left = `${val}px`;
};
topSlider.oninput = () => {
    const val = parseInt(topSlider.value);
    topVal.textContent = val;
    config.panelTop = val;
    saveConfig();
    panel.style.top = `${val}px`;
};
fontSlider.oninput = () => {
    const val = fontSlider.value;
    fontVal.textContent = val;
    panel.style.fontSize = `${val}px`;
};// 角色卡逻辑
            const charInput = document.getElementById('ai-char-input');
            const charGenerate = document.getElementById('ai-char-generate');
            const charResult = document.getElementById('ai-char-result');
            const charCopy = document.getElementById('ai-char-copy');
            const charImport = document.getElementById('ai-char-import');
            const charClear = document.getElementById('ai-char-clear');
            const charTemplateName = document.getElementById('ai-char-template-name');
            const charSaveTemplate = document.getElementById('ai-char-save-template');

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
                charImport.textContent = '⏳ 导入中...';
                try {
                    await importCharacterCard(charResult.value);
                } finally {
                    charImport.disabled = false;
                    charImport.textContent = '📥 直接导入角色卡';
                }
            };
            charClear.onclick = () => { 
                charResult.value = ''; 
                charCopy.disabled = true; 
                charImport.disabled = true; 
            };
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
                const hasContent = !!charResult.value;
                charCopy.disabled = !hasContent;
                charImport.disabled = !hasContent;
                saveDraft('char', charResult.value);
            });
            charResult.value = loadDraft('char');

            // 用户人设逻辑
            const userInput = document.getElementById('ai-user-input');
            const userGenerate = document.getElementById('ai-user-generate');
            const userResult = document.getElementById('ai-user-result');
            const userCopy = document.getElementById('ai-user-copy');
            const userImport = document.getElementById('ai-user-import');
            const userClear = document.getElementById('ai-user-clear');
            const userTemplateName = document.getElementById('ai-user-template-name');
            const userSaveTemplate = document.getElementById('ai-user-save-template');

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
                userImport.textContent = '⏳ 导入中...';
                try {
                    await importUserPersona(userResult.value);
                } finally {
                    userImport.disabled = false;
                    userImport.textContent = '📥 直接导入用户人设';
                }
            };
            userClear.onclick = () => { 
                userResult.value = ''; 
                userCopy.disabled = true; 
                userImport.disabled = true; 
            };
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
                const hasContent = !!userResult.value;
                userCopy.disabled = !hasContent;
                userImport.disabled = !hasContent;
                saveDraft('user', userResult.value);
            });
            userResult.value = loadDraft('user');

            // 世界书逻辑
            const worldInput = document.getElementById('ai-world-input');
            const worldGenerate = document.getElementById('ai-world-generate');
            const worldResult = document.getElementById('ai-world-result');
            const worldCopy = document.getElementById('ai-world-copy');
            const worldClear = document.getElementById('ai-world-clear');
            const worldTemplateName = document.getElementById('ai-world-template-name');
            const worldSaveTemplate = document.getElementById('ai-world-save-template');

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

            // 关系网文字生成逻辑
            const relationCharName = document.getElementById('ai-relation-char-name');
            const relationCharDesc = document.getElementById('ai-relation-char-desc');
            const relationAddChar = document.getElementById('ai-relation-add-char');
            const relationGenerate = document.getElementById('ai-relation-generate');
            const relationResult = document.getElementById('ai-relation-result');
            const relationCopy = document.getElementById('ai-relation-copy');
            const relationClear = document.getElementById('ai-relation-clear');
            const relationTemplateName = document.getElementById('ai-relation-template-name');
            const relationSaveTemplate = document.getElementById('ai-relation-save-template');

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
                saveDraft('relation-text', relationResult.value);
            });
            relationResult.value = loadDraft('relation-text');
            
            // 关系图谱逻辑
            const graphCharName = document.getElementById('ai-graph-char-name');
            const graphCharDesc = document.getElementById('ai-graph-char-desc');
            const graphAddChar = document.getElementById('ai-graph-add-char');
            const graphGenerate = document.getElementById('ai-graph-generate');
            const graphCopy = document.getElementById('ai-graph-copy');
            const graphClear = document.getElementById('ai-graph-clear');
            const graphTemplateName = document.getElementById('ai-graph-template-name');
            const graphSaveTemplate = document.getElementById('ai-graph-save-template');

            graphAddChar.onclick = () => {
                const name = graphCharName.value.trim();
                if (!name) { toastr.warning('请输入角色名称'); return; }
                addGraphChar(name, graphCharDesc.value.trim());
                graphCharName.value = '';
                graphCharDesc.value = '';
            };
            graphGenerate.onclick = async () => {
                await generateGraphData(graphGenerate);
            };
            graphCopy.onclick = () => { 
                const detail = document.getElementById('ai-graph-detail')?.innerText;
                if (detail && detail !== '点击角色头像查看关系') copyToClipboard(detail);
            };
            graphClear.onclick = () => {
                graphChars = [];
                saveGraphChars();
                refreshGraphCharList();
                refreshGraphCanvas();
                selectedCharIndices = [];
                updateGraphDetail();
                toastr.success('已清空');
            };
            graphSaveTemplate.onclick = () => {
                const name = graphTemplateName.value.trim();
                if (!name) { toastr.warning('请输入模板名称'); return; }
                const detail = document.getElementById('ai-graph-detail')?.innerText;
                if (!detail || detail === '点击角色头像查看关系') { toastr.warning('没有可保存的内容'); return; }
                config.savedTemplates.push({ name, content: detail });
                saveConfig();
                refreshTemplateList();
                toastr.success(`模板 "${name}" 已保存`);
                graphTemplateName.value = '';
            };
            
            // 模板库逻辑
            const templatesExport = document.getElementById('ai-templates-export');
            const templatesImport = document.getElementById('ai-templates-import');
            const templatesImportFile = document.getElementById('ai-templates-import-file');
            templatesExport.onclick = () => exportTemplates();
            templatesImport.onclick = () => templatesImportFile.click();
            templatesImportFile.onchange = (e) => {
                if (e.target.files.length) importTemplates(e.target.files[0]);
                templatesImportFile.value = '';
            };
            
            // 历史记录逻辑（带确认框）
            const historyClear = document.getElementById('ai-history-clear');
            historyClear.onclick = () => {
                if (confirm('确定要清空所有历史记录吗？')) {
                    config.generationHistory = [];
                    saveConfig();
                    refreshHistoryList();
                    toastr.success('历史记录已清空');
                }
            };
            
            refreshHistoryList();
            refreshTemplateList();
            refreshRelationCharList();
            refreshGraphCharList();
            refreshGraphCanvas();

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
                    menuItem.innerHTML = '<i class="fa-solid fa-robot"></i> AI人设生成器';
                    menuItem.onclick = (e) => {
                        e.stopPropagation();
                        const panel = document.getElementById(PANEL_ID);
                        if (panel) {
                            panel.style.display = 'flex';
                        }
                    };
                    menu.appendChild(menuItem);
                }
            }, 500);
        }

        // 基础样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes ai-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .ai-char-panel {
                position: fixed;
                z-index: 100000;
                display: none;
                flex-direction: column;
                overflow: hidden;
                border-radius: 12px;
            }
            .ai-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 14px;
                cursor: default;
            }
            .ai-panel-close { cursor: pointer; font-size: 18px; opacity: 0.7; }
            .ai-panel-close:hover { opacity: 1; }
            .ai-tab-bar {
                display: flex;
            }
            .ai-tab-btn {
                flex: 1;
                padding: 8px 0;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 12px;
            }
            .ai-tab-btn.active {
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
            .ai-setting-group input, .ai-setting-group textarea, .ai-setting-group select {
                width: 100%;
                padding: 8px 10px;
                border-radius: 8px;
                font-size: 13px;
                box-sizing: border-box;
            }
            .ai-setting-group textarea.editable-result {
                font-family: monospace;
                font-size: 12px;
                resize: vertical;
            }
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
            .ai-btn:disabled { opacity: 0.7; cursor: not-allowed; }
            .ai-radio-group { display: flex; gap: 16px; }
            .ai-radio-group label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-weight: normal; }
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
            .graph-node {
                transition: transform 0.1s;
            }
            .graph-node:hover {
                transform: scale(1.05);
            }
        `;
        document.head.appendChild(style);

        // 先创建菜单，再创建面板
        addMenuItem();
        createPanel();
    }
})();
