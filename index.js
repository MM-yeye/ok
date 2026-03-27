// AI Character Generator - 终极版（批量生成 + 可视化关系网 + 世界书扩展 + 快捷主题）
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
            themeMode: 'default',
            panelWidth: 520,
            panelHeight: 680,
            panelLeft: 20,
            panelTop: 50,
            availableModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
            savedTemplates: [],
            generationHistory: [],
            draftContent: {},
            relationChars: [],
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
                    toastr.success('连接成功');
                    const models = await fetchModels();
                    if (models && models.length > 0) {
                        config.availableModels = models;
                        saveConfig();
                        updateModelSelect(models);
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
            const select = document.getElementById('model-select');
            if (!select) return;
            const current = config.model || 'gpt-3.5-turbo';
            select.innerHTML = '';
            models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                if (m === current) opt.selected = true;
                select.appendChild(opt);
            });
        }

        function addToHistory(type, input, output) {
            config.generationHistory.unshift({
                type, input: input.substring(0, 80), output,
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
            toastr.success('已导出');
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
                container.innerHTML = '<div class="empty-state">暂无历史</div>';
                return;
            }
            container.innerHTML = config.generationHistory.map((h, i) => `
                <div class="history-item" data-index="${i}">
                    <div class="history-type">${h.type}</div>
                    <div class="history-time">${h.timestamp}</div>
                    <div class="history-preview">${h.input}</div>
                </div>
            `).join('');
            container.querySelectorAll('.history-item').forEach(item => {
                item.onclick = () => {
                    const h = config.generationHistory[parseInt(item.dataset.index)];
                    if (h) {
                        if (h.type === '角色卡') document.getElementById('char-result').value = h.output;
                        else if (h.type === '用户人设') document.getElementById('user-result').value = h.output;
                        else if (h.type === '世界书') document.getElementById('world-result').value = h.output;
                        else if (h.type === '世界书扩展') document.getElementById('world-extend-result').value = h.output;
                        else if (h.type === '关系描述') document.getElementById('relation-result').value = h.output;
                        else if (h.type === '魔法衣橱') document.getElementById('wardrobe-result').value = h.output;
                        toastr.success(`已加载: ${h.type}`);
                    }
                };
            });
        }

        function refreshTemplateList() {
            const container = document.getElementById('template-list');
            if (!container) return;
            if (config.savedTemplates.length === 0) {
                container.innerHTML = '<div class="empty-state">暂无模板</div>';
                return;
            }
            container.innerHTML = config.savedTemplates.map((t, i) => `
                <div class="template-item">
                    <span>${t.name}</span>
                    <div class="template-actions">
                        <button class="load-template" data-index="${i}">加载</button>
                        <button class="delete-template" data-index="${i}">删除</button>
                    </div>
                </div>
            `).join('');
            container.querySelectorAll('.load-template').forEach(btn => {
                btn.onclick = () => {
                    const t = config.savedTemplates[parseInt(btn.dataset.index)];
                    const active = document.querySelector('.tab-content.active');
                    const result = active?.querySelector('.result-text');
                    if (result) result.value = t.content;
                    toastr.success(`已加载: ${t.name}`);
                };
            });
            container.querySelectorAll('.delete-template').forEach(btn => {
                btn.onclick = () => {
                    config.savedTemplates.splice(parseInt(btn.dataset.index), 1);
                    saveConfig();
                    refreshTemplateList();
                    toastr.success('已删除');
                };
            });
        }// ========== 批量生成角色卡 ==========
async function batchGenerateCharacters(userInput, btn, resultArea) {
    if (!config.apiKey) { toastr.error('请先设置 API Key'); return null; }
    const lines = userInput.split('\n').filter(l => l.trim());
    if (lines.length === 0) { toastr.warning('请输入角色设定，每行一个'); return null; }
    
    const fullUrl = getFullApiUrl();
    const systemPrompt = `根据用户输入，为每个角色生成完整的角色卡。严格按照YAML格式输出，每个角色用 "---" 分隔。所有字段都要填满。`;
    
    if (btn) { btn.disabled = true; btn.textContent = '批量生成中...'; }
    
    let results = [];
    for (let i = 0; i < lines.length; i++) {
        const input = lines[i];
        try {
            const res = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: input }
                    ],
                    temperature: 0.8,
                    max_tokens: 1500
                })
            });
            if (!res.ok) { results.push(`[失败] ${input}: API错误`); continue; }
            const data = await res.json();
            let content = data.choices[0].message.content;
            content = content.replace(/```yaml\n?/g, '').replace(/```\n?/g, '').trim();
            results.push(`--- ${input} ---\n${content}`);
        } catch (err) {
            results.push(`[失败] ${input}: ${err.message}`);
        }
    }
    
    const finalResult = results.join('\n\n');
    if (resultArea) {
        resultArea.value = finalResult;
        addToHistory('批量角色卡', `${lines.length}个角色`, finalResult);
        const copyBtn = resultArea.parentElement?.querySelector('.copy-btn');
        if (copyBtn) copyBtn.disabled = false;
    }
    toastr.success(`生成完成，共 ${lines.length} 个角色`);
    if (btn) { btn.disabled = false; btn.textContent = '批量生成'; }
}

// ========== 角色关系可视化（Canvas 网状图）==========
let selectedNodes = [];
let relationGraphData = null;

function renderRelationGraph() {
    const canvas = document.getElementById('relation-canvas');
    if (!canvas) return;
    if (!relationGraphData || relationGraphData.nodes.length === 0) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#999';
        ctx.font = '12px sans-serif';
        ctx.fillText('暂无关系数据，请先生成关系网', canvas.width/2 - 100, canvas.height/2);
        return;
    }
    
    const w = canvas.width, h = canvas.height;
    const centerX = w/2, centerY = h/2;
    const radius = Math.min(w, h) * 0.35;
    const nodes = relationGraphData.nodes;
    const edges = relationGraphData.edges;
    
    // 计算节点位置（圆形布局）
    const angles = nodes.map((_, i) => (i * 2 * Math.PI / nodes.length) - Math.PI/2);
    const positions = nodes.map((_, i) => ({
        x: centerX + radius * Math.cos(angles[i]),
        y: centerY + radius * Math.sin(angles[i])
    }));
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    
    // 绘制连线
    edges.forEach(edge => {
        const from = positions[edge.from];
        const to = positions[edge.to];
        const isHighlighted = selectedNodes.includes(edge.from) || selectedNodes.includes(edge.to);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = isHighlighted ? '#4A6FA5' : '#aaa';
        ctx.lineWidth = isHighlighted ? 3 : 1.5;
        ctx.stroke();
        
        // 绘制箭头
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const arrowX = to.x - 12 * Math.cos(angle);
        const arrowY = to.y - 12 * Math.sin(angle);
        const arrowSize = 8;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - arrowSize/2, arrowY - arrowSize/2);
        ctx.lineTo(arrowX - arrowSize/2, arrowY + arrowSize/2);
        ctx.fillStyle = isHighlighted ? '#4A6FA5' : '#aaa';
        ctx.fill();
        
        // 绘制关系文字
        const midX = (from.x + to.x)/2;
        const midY = (from.y + to.y)/2;
        ctx.fillStyle = '#666';
        ctx.font = '10px sans-serif';
        ctx.fillText(edge.relation.substring(0, 4), midX, midY - 5);
    });
    
    // 绘制节点
    nodes.forEach((node, i) => {
        const pos = positions[i];
        const isSelected = selectedNodes.includes(i);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 24, 0, Math.PI*2);
        ctx.fillStyle = isSelected ? '#4A6FA5' : '#e0e0e0';
        ctx.fill();
        ctx.fillStyle = isSelected ? '#fff' : '#333';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(node.name.charAt(0), pos.x - 8, pos.y + 6);
        ctx.fillStyle = '#666';
        ctx.font = '11px sans-serif';
        ctx.fillText(node.name, pos.x - 20, pos.y + 32);
    });
    
    // 绑定点击事件
    canvas.onclick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
        for (let i = 0; i < nodes.length; i++) {
            const pos = positions[i];
            const dx = mouseX - pos.x;
            const dy = mouseY - pos.y;
            if (dx*dx + dy*dy < 400) {
                if (e.ctrlKey || e.metaKey) {
                    if (selectedNodes.includes(i)) selectedNodes = selectedNodes.filter(n => n !== i);
                    else selectedNodes.push(i);
                } else {
                    if (selectedNodes.length === 1 && selectedNodes[0] === i) {
                        alert(`📌 ${nodes[i].name}\n\n${nodes[i].desc || '暂无描述'}`);
                    } else {
                        selectedNodes = [i];
                    }
                }
                renderRelationGraph();
                updateGraphDetail();
                break;
            }
        }
    };
}

function updateGraphDetail() {
    const detailArea = document.getElementById('graph-detail');
    if (!detailArea) return;
    if (!relationGraphData || selectedNodes.length === 0) {
        detailArea.innerHTML = '<div class="empty-state">点击节点查看关系</div>';
        return;
    }
    const details = selectedNodes.map(idx => {
        const node = relationGraphData.nodes[idx];
        const edgesTo = relationGraphData.edges.filter(e => e.from === idx || e.to === idx);
        let html = `<div class="graph-detail-item"><strong>${node.name}</strong>`;
        if (edgesTo.length) {
            edgesTo.forEach(e => {
                const other = e.from === idx ? relationGraphData.nodes[e.to] : relationGraphData.nodes[e.from];
                html += `<div>→ ${other.name}: ${e.relation}</div>`;
            });
        } else {
            html += '<div>暂无关系</div>';
        }
        html += `</div>`;
        return html;
    }).join('');
    detailArea.innerHTML = details;
}

async function generateRelationGraph(btn) {
    if (!config.apiKey) { toastr.error('请先设置 API Key'); return; }
    if (config.relationChars.length < 2) { toastr.warning('至少需要2个角色'); return; }
    
    const fullUrl = getFullApiUrl();
    const charList = config.relationChars.map(c => `- ${c.name}: ${c.desc || '暂无描述'}`).join('\n');
    const systemPrompt = `分析以下角色之间的关系，输出JSON格式。每条关系包含 from, to, relation（最多4个字）。格式：{"nodes":[{"name":"角色名","desc":"描述"}],"edges":[{"from":0,"to":1,"relation":"盟友"}]}`;
    
    if (btn) { btn.disabled = true; btn.textContent = '生成图谱中...'; }
    try {
        const res = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: charList }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        if (!res.ok) { toastr.error(`API错误: ${res.status}`); return; }
        const data = await res.json();
        let content = data.choices[0].message.content;
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(content);
        relationGraphData = { nodes: config.relationChars.map(c => ({ name: c.name, desc: c.desc })), edges: parsed.edges };
        saveConfig();
        renderRelationGraph();
        toastr.success('关系图谱生成成功');
    } catch (err) { toastr.error(`生成失败: ${err.message}`); }
    finally { if (btn) { btn.disabled = false; btn.textContent = '生成关系图谱'; } }
}

// ========== 世界书扩展 ==========
async function generateWorldExtend(worldContent, extendType, btn, resultArea) {
    if (!config.apiKey) { toastr.error('请先设置 API Key'); return null; }
    if (!worldContent.trim()) { toastr.warning('请先生成世界书'); return null; }
    
    const fullUrl = getFullApiUrl();
    const prompts = {
        location: '根据以下世界观，生成3-5个详细的地点描述（名称、特征、氛围）',
        faction: '根据以下世界观，生成3-5个势力组织（名称、理念、实力）',
        event: '根据以下世界观，生成3-5个重要历史事件或当前冲突'
    };
    const prompt = prompts[extendType] || prompts.location;
    
    if (btn) { btn.disabled = true; btn.textContent = '生成中...'; }
    try {
        const res = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: worldContent }
                ],
                temperature: 0.8,
                max_tokens: 1500
            })
        });
        if (!res.ok) { toastr.error(`API错误: ${res.status}`); return null; }
        const data = await res.json();
        const content = data.choices[0].message.content;
        if (resultArea) {
            resultArea.value = content;
            addToHistory('世界书扩展', extendType, content);
            const copyBtn = resultArea.parentElement?.querySelector('.copy-btn');
            if (copyBtn) copyBtn.disabled = false;
        }
        toastr.success('生成成功');
        return content;
    } catch (err) { toastr.error(`失败: ${err.message}`); return null; }
    finally { if (btn) { btn.disabled = false; btn.textContent = '生成地点'; } }
}// ========== 角色卡 ==========
        async function generateCharacter(userInput, cardType, btn, resultArea) {
            if (!config.apiKey) { toastr.error('请先设置 API Key'); return null; }
            const fullUrl = getFullApiUrl();
            const template = cardType === 'character' ? CHAR_TEMPLATE : USER_TEMPLATE;
            const typeName = cardType === 'character' ? '角色卡' : '用户人设';

            const systemPrompt = `根据用户输入，生成完整的${typeName}。严格按照以下YAML格式输出，所有字段都要填满，不要添加额外解释：

${template}`;
            
            if (btn) { btn.disabled = true; btn.textContent = '生成中...'; }
            
            try {
                const res = await fetch(fullUrl, {
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
                if (!res.ok) { toastr.error(`API错误: ${res.status}`); return null; }
                const data = await res.json();
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
            } catch (err) { toastr.error(`失败: ${err.message}`); return null; }
            finally { if (btn) { btn.disabled = false; btn.textContent = cardType === 'character' ? '生成角色卡' : '生成用户人设'; } }
        }

        // ========== 世界书 ==========
        async function generateWorldbook(userInput, btn, resultArea) {
            if (!config.apiKey) { toastr.error('请先设置 API Key'); return null; }
            if (!userInput.trim()) { toastr.warning('请输入设定要求'); return null; }
            const fullUrl = getFullApiUrl();
            const systemPrompt = `根据要求，生成详细的世界设定。自由创作，语言生动，逻辑自洽。直接输出内容。`;
            if (btn) { btn.disabled = true; btn.textContent = '生成中...'; }
            try {
                const res = await fetch(fullUrl, {
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
                if (!res.ok) { toastr.error(`API错误: ${res.status}`); return null; }
                const data = await res.json();
                const content = data.choices[0].message.content;
                if (resultArea) {
                    resultArea.value = content;
                    addToHistory('世界书', userInput, content);
                    const copyBtn = resultArea.parentElement?.querySelector('.copy-btn');
                    if (copyBtn) copyBtn.disabled = false;
                }
                toastr.success('生成成功');
                return content;
            } catch (err) { toastr.error(`失败: ${err.message}`); return null; }
            finally { if (btn) { btn.disabled = false; btn.textContent = '生成世界书'; } }
        }

        // ========== 关系网（文字） ==========
        let relationChars = [];
        function addRelationChar(name, desc) {
            if (!name) return;
            relationChars.push({ name, desc: desc || '' });
            config.relationChars = relationChars;
            saveConfig();
            refreshRelationList();
        }
        function removeRelationChar(index) {
            relationChars.splice(index, 1);
            config.relationChars = relationChars;
            saveConfig();
            refreshRelationList();
        }
        function refreshRelationList() {
            const container = document.getElementById('relation-list');
            if (!container) return;
            if (relationChars.length === 0) {
                container.innerHTML = '<div class="empty-state">暂无角色</div>';
                return;
            }
            container.innerHTML = relationChars.map((c, i) => `
                <div class="char-item">
                    <span><strong>${c.name}</strong>${c.desc ? ` - ${c.desc.substring(0, 40)}` : ''}</span>
                    <button class="delete-char" data-index="${i}">删除</button>
                </div>
            `).join('');
            container.querySelectorAll('.delete-char').forEach(btn => {
                btn.onclick = () => removeRelationChar(parseInt(btn.dataset.index));
            });
        }
        relationChars = config.relationChars || [];
        refreshRelationList();

        async function generateRelationText(btn, resultArea) {
            if (!config.apiKey) { toastr.error('请先设置 API Key'); return null; }
            if (relationChars.length < 2) { toastr.warning('至少需要2个角色'); return null; }
            const fullUrl = getFullApiUrl();
            const charList = relationChars.map(c => `- ${c.name}: ${c.desc || '暂无描述'}`).join('\n');
            const systemPrompt = `分析以下角色之间的关系，用生动语言描述每对角色。输出纯文本。`;
            if (btn) { btn.disabled = true; btn.textContent = '生成中...'; }
            try {
                const res = await fetch(fullUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: config.model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: charList }
                        ],
                        temperature: 0.7,
                        max_tokens: 1500
                    })
                });
                if (!res.ok) { toastr.error(`API错误: ${res.status}`); return null; }
                const data = await res.json();
                const content = data.choices[0].message.content;
                if (resultArea) {
                    resultArea.value = content;
                    addToHistory('关系描述', `角色数:${relationChars.length}`, content);
                    const copyBtn = resultArea.parentElement?.querySelector('.copy-btn');
                    if (copyBtn) copyBtn.disabled = false;
                }
                toastr.success('生成成功');
                return content;
            } catch (err) { toastr.error(`失败: ${err.message}`); return null; }
            finally { if (btn) { btn.disabled = false; btn.textContent = '生成关系描述'; } }
        }

        // ========== 魔法衣橱 ==========
        async function generateWardrobe(userInput, btn, resultArea) {
            if (!config.apiKey) { toastr.error('请先设置 API Key'); return null; }
            if (!userInput.trim()) { toastr.warning('请输入服装描述'); return null; }
            const fullUrl = getFullApiUrl();
            const systemPrompt = `根据用户输入，生成详细的服装、饰品、造型描写。只描写用户提到的内容，语言优美细腻，输出纯文本。`;
            if (btn) { btn.disabled = true; btn.textContent = '生成中...'; }
            try {
                const res = await fetch(fullUrl, {
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
                        max_tokens: 800
                    })
                });
                if (!res.ok) { toastr.error(`API错误: ${res.status}`); return null; }
                const data = await res.json();
                const content = data.choices[0].message.content;
                if (resultArea) {
                    resultArea.value = content;
                    addToHistory('魔法衣橱', userInput, content);
                    const copyBtn = resultArea.parentElement?.querySelector('.copy-btn');
                    if (copyBtn) copyBtn.disabled = false;
                }
                toastr.success('生成成功');
                return content;
            } catch (err) { toastr.error(`失败: ${err.message}`); return null; }
            finally { if (btn) { btn.disabled = false; btn.textContent = '生成衣橱'; } }
        }

        // ========== 导入功能 ==========
        async function importCharacterCard(yamlContent) {
            try {
                const nameMatch = yamlContent.match(/chinese_name:\s*(.+)/m);
                const name = nameMatch ? nameMatch[1].trim() : '新角色';
                const desc = extractField(yamlContent, 'appearance');
                const personality = extractField(yamlContent, 'personality');
                const scenario = extractField(yamlContent, 'background');
                const first_mes = extractField(yamlContent, 'first_message') || `你好，我是${name}`;
                const mes_example = extractField(yamlContent, 'example_messages') || '';
                
                if (window.SillyTavern && window.SillyTavern.getContext) {
                    const ctx = window.SillyTavern.getContext();
                    if (ctx && ctx.createCharacter) {
                        await ctx.createCharacter({ name, description: desc, personality, scenario, first_mes, mes_example });
                        toastr.success(`角色卡 "${name}" 已创建`);
                        return;
                    }
                }
                copyToClipboard(yamlContent);
                toastr.info('已复制到剪贴板');
            } catch (err) { copyToClipboard(yamlContent); toastr.error('创建失败，已复制'); }
        }

        async function importUserPersona(yamlContent) {
            try {
                const nameMatch = yamlContent.match(/chinese_name:\s*(.+)/m);
                const name = nameMatch ? nameMatch[1].trim() : '新用户';
                const desc = extractField(yamlContent, 'appearance');
                const personality = extractField(yamlContent, 'personality');
                if (window.SillyTavern && window.SillyTavern.getContext) {
                    const ctx = window.SillyTavern.getContext();
                    if (ctx && ctx.createPersona) {
                        await ctx.createPersona({ name, description: desc, personality });
                        toastr.success(`用户人设 "${name}" 已创建`);
                        return;
                    }
                }
                copyToClipboard(yamlContent);
                toastr.info('已复制到剪贴板');
            } catch (err) { copyToClipboard(yamlContent); toastr.error('创建失败，已复制'); }
        }

        function extractField(content, field) {
            const match = content.match(new RegExp(`${field}:\\s*(.+?)(?=\\n\\w|$)`, 'ms'));
            return match ? match[1].trim() : '';
        }

        function copyToClipboard(text) {
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => toastr.success('已复制')).catch(() => toastr.error('复制失败'));
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
    
    const modelOpts = (config.availableModels || ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'])
        .map(m => `<option value="${m}" ${m === config.model ? 'selected' : ''}>${m}</option>`).join('');
    
    panel.innerHTML = `
        <div class="panel-header">
            <span>AI 人设生成器</span>
            <div class="header-actions">
                <button id="quick-theme-btn" class="quick-theme-btn">🌓 切换主题</button>
                <span class="panel-close">✕</span>
            </div>
        </div>
        <div class="tab-bar">
            <button class="tab-btn active" data-tab="api">API</button>
            <button class="tab-btn" data-tab="char">角色卡</button>
            <button class="tab-btn" data-tab="batch">批量生成</button>
            <button class="tab-btn" data-tab="user">用户人设</button>
            <button class="tab-btn" data-tab="world">世界书</button>
            <button class="tab-btn" data-tab="world-extend">世界扩展</button>
            <button class="tab-btn" data-tab="relation">关系网</button>
            <button class="tab-btn" data-tab="graph">关系图谱</button>
            <button class="tab-btn" data-tab="wardrobe">衣橱</button>
            <button class="tab-btn" data-tab="history">历史</button>
            <button class="tab-btn" data-tab="templates">模板</button>
            <button class="tab-btn" data-tab="theme">主题</button>
            <button class="tab-btn" data-tab="size">大小</button>
        </div>
        
        <!-- API -->
        <div class="tab-content active" id="tab-api">
            <div class="field"><label>API地址</label><input type="text" id="api-url" placeholder="https://key.laopobao.online/v1" value="${config.apiBaseUrl}"></div>
            <div class="field"><label>API Key</label><input type="password" id="api-key" placeholder="sk-..." value="${config.apiKey}"></div>
            <div class="field"><label>模型</label><select id="model-select">${modelOpts}</select></div>
            <div class="button-group"><button id="test-conn">测试连接</button><button id="save-api">保存</button></div>
        </div>
        
        <!-- 角色卡 -->
        <div class="tab-content" id="tab-char">
            <div class="field"><label>简单设定</label><textarea id="char-input" rows="3" placeholder="例如：前锋，是所有屠孝子心里最柔软的地方"></textarea></div>
            <button id="char-gen" class="primary-btn">生成角色卡</button>
            <div class="field"><label>生成结果</label><textarea id="char-result" class="result-text" rows="10"></textarea></div>
            <div class="button-group"><button id="char-copy" class="copy-btn" disabled>复制</button><button id="char-import" class="import-btn" disabled>导入酒馆</button><button id="char-clear">清空</button></div>
            <div class="field"><label>保存模板</label><div class="flex-row"><input type="text" id="char-template-name" placeholder="模板名称"><button id="char-save-tpl">保存</button></div></div>
        </div>
        
        <!-- 批量生成 -->
        <div class="tab-content" id="tab-batch">
            <div class="field"><label>批量设定（每行一个角色）</label><textarea id="batch-input" rows="5" placeholder="例如：&#10;前锋，屠孝子心中最柔软的地方&#10;医生，温柔冷静的急救专家&#10;黑客，沉默寡言的代码天才"></textarea></div>
            <button id="batch-gen" class="primary-btn">批量生成</button>
            <div class="field"><label>生成结果</label><textarea id="batch-result" class="result-text" rows="10"></textarea></div>
            <div class="button-group"><button id="batch-copy" class="copy-btn" disabled>复制</button><button id="batch-clear">清空</button></div>
        </div>
        
        <!-- 用户人设 -->
        <div class="tab-content" id="tab-user">
            <div class="field"><label>简单设定</label><textarea id="user-input" rows="3" placeholder="例如：菲利普，锋儿最爱的老公"></textarea></div>
            <button id="user-gen" class="primary-btn">生成用户人设</button>
            <div class="field"><label>生成结果</label><textarea id="user-result" class="result-text" rows="10"></textarea></div>
            <div class="button-group"><button id="user-copy" class="copy-btn" disabled>复制</button><button id="user-import" class="import-btn" disabled>导入酒馆</button><button id="user-clear">清空</button></div>
            <div class="field"><label>保存模板</label><div class="flex-row"><input type="text" id="user-template-name" placeholder="模板名称"><button id="user-save-tpl">保存</button></div></div>
        </div>
        
        <!-- 世界书 -->
        <div class="tab-content" id="tab-world">
            <div class="field"><label>设定要求</label><textarea id="world-input" rows="4" placeholder="例如：赛博朋克都市，企业控制，义体改造..."></textarea></div>
            <button id="world-gen" class="primary-btn">生成世界书</button>
            <div class="field"><label>生成结果</label><textarea id="world-result" class="result-text" rows="8"></textarea></div>
            <div class="button-group"><button id="world-copy" class="copy-btn" disabled>复制</button><button id="world-clear">清空</button></div>
            <div class="field"><label>保存模板</label><div class="flex-row"><input type="text" id="world-template-name" placeholder="模板名称"><button id="world-save-tpl">保存</button></div></div>
        </div>
        
        <!-- 世界书扩展 -->
        <div class="tab-content" id="tab-world-extend">
            <div class="field"><label>选择扩展类型</label>
                <div class="flex-row" style="gap: 10px;">
                    <button id="extend-location" class="extend-btn">地点生成</button>
                    <button id="extend-faction" class="extend-btn">势力生成</button>
                    <button id="extend-event" class="extend-btn">事件生成</button>
                </div>
            </div>
            <div class="field"><label>扩展结果</label><textarea id="world-extend-result" class="result-text" rows="10" placeholder="点击上方按钮生成..."></textarea></div>
            <div class="button-group"><button id="world-extend-copy" class="copy-btn" disabled>复制</button><button id="world-extend-clear">清空</button></div>
        </div>
        
        <!-- 关系网文字 -->
        <div class="tab-content" id="tab-relation">
            <div class="field"><label>角色列表</label><div id="relation-list" class="list-container"></div></div>
            <div class="flex-row"><input type="text" id="relation-name" placeholder="角色名称"><button id="relation-add">添加</button></div>
            <textarea id="relation-desc" rows="2" placeholder="角色描述（可选）"></textarea>
            <button id="relation-gen" class="primary-btn">生成关系描述</button>
            <div class="field"><label>关系描述</label><textarea id="relation-result" class="result-text" rows="8"></textarea></div>
            <div class="button-group"><button id="relation-copy" class="copy-btn" disabled>复制</button><button id="relation-clear">清空</button></div>
            <div class="field"><label>保存模板</label><div class="flex-row"><input type="text" id="relation-template-name" placeholder="模板名称"><button id="relation-save-tpl">保存</button></div></div>
        </div>
        
        <!-- 关系图谱可视化 -->
        <div class="tab-content" id="tab-graph">
            <div class="field"><label>角色列表</label><div id="graph-relation-list" class="list-container"></div></div>
            <div class="flex-row"><input type="text" id="graph-name" placeholder="角色名称"><button id="graph-add">添加</button></div>
            <textarea id="graph-desc" rows="2" placeholder="角色描述（可选）"></textarea>
            <button id="graph-gen" class="primary-btn">生成关系图谱</button>
            <div class="field"><label>关系图谱（点击节点查看详情，Ctrl多选）</label>
                <canvas id="relation-canvas" width="460" height="320" style="width:100%; height:auto; border:1px solid #e0e0e0; border-radius:8px; background:#fff;"></canvas>
            </div>
            <div id="graph-detail" class="graph-detail-container"></div>
            <div class="button-group"><button id="graph-clear">清空图谱</button></div>
        </div>
        
        <!-- 魔法衣橱 -->
        <div class="tab-content" id="tab-wardrobe">
            <div class="field"><label>服装描述</label><textarea id="wardrobe-input" rows="3" placeholder="例如：黑色的哥特服装"></textarea></div>
            <button id="wardrobe-gen" class="primary-btn">生成衣橱</button>
            <div class="field"><label>生成结果</label><textarea id="wardrobe-result" class="result-text" rows="10"></textarea></div>
            <div class="button-group"><button id="wardrobe-copy" class="copy-btn" disabled>复制</button><button id="wardrobe-clear">清空</button></div>
            <div class="field"><label>保存模板</label><div class="flex-row"><input type="text" id="wardrobe-template-name" placeholder="模板名称"><button id="wardrobe-save-tpl">保存</button></div></div>
        </div>
        
        <!-- 历史 -->
        <div class="tab-content" id="tab-history">
            <div id="history-list" class="list-container"></div>
            <button id="history-clear">清空历史</button>
        </div>
        
        <!-- 模板库 -->
        <div class="tab-content" id="tab-templates">
            <div class="button-group"><button id="tpl-export">导出模板</button><button id="tpl-import">导入模板</button><input type="file" id="tpl-import-file" accept=".json" style="display:none"></div>
            <div id="template-list" class="list-container"></div>
        </div>
        
        <!-- 主题 -->
        <div class="tab-content" id="tab-theme">
            <div class="radio-group"><label><input type="radio" name="theme-mode" value="default" ${config.themeMode === 'default' ? 'checked' : ''}> 默认美化</label><label><input type="radio" name="theme-mode" value="auto" ${config.themeMode === 'auto' ? 'checked' : ''}> 跟随酒馆主题</label></div>
        </div>
        
        <!-- 大小 -->
        <div class="tab-content" id="tab-size">
            <div class="field"><label>宽度 <span id="width-val">${config.panelWidth}</span> px</label><input type="range" id="width-slider" min="300" max="700" step="10" value="${config.panelWidth}"></div>
            <div class="field"><label>高度 <span id="height-val">${config.panelHeight}</span> px</label><input type="range" id="height-slider" min="400" max="800" step="10" value="${config.panelHeight}"></div>
            <div class="field"><label>左边距 <span id="left-val">${config.panelLeft}</span> px</label><input type="range" id="left-slider" min="0" max="${window.innerWidth - 50}" step="10" value="${config.panelLeft}"></div>
            <div class="field"><label>上边距 <span id="top-val">${config.panelTop}</span> px</label><input type="range" id="top-slider" min="0" max="500" step="10" value="${config.panelTop}"></div>
            <div class="field"><label>字体大小 <span id="font-val">13</span> px</label><input type="range" id="font-slider" min="10" max="18" step="1" value="13"></div>
        </div>
    `;
    document.body.appendChild(panel);// 选项卡切换
const tabs = document.querySelectorAll('.tab-btn');
const contents = document.querySelectorAll('.tab-content');
tabs.forEach(t => {
    t.onclick = () => {
        const id = t.dataset.tab;
        tabs.forEach(tab => tab.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        t.classList.add('active');
        document.getElementById(`tab-${id}`).classList.add('active');
        const result = document.getElementById(`${id}-result`);
        if (result?.classList.contains('result-text')) {
            const draft = loadDraft(id);
            if (draft && !result.value) result.value = draft;
        }
        if (id === 'relation') refreshRelationList();
        if (id === 'graph') {
            const canvas = document.getElementById('relation-canvas');
            if (canvas && relationGraphData) renderRelationGraph();
        }
    };
});

// 关闭按钮
panel.querySelector('.panel-close').onclick = () => panel.style.display = 'none';

// 快捷主题切换
const quickThemeBtn = document.getElementById('quick-theme-btn');
let themeSwitchCount = 0;
quickThemeBtn.onclick = () => {
    themeSwitchCount++;
    const newMode = config.themeMode === 'default' ? 'auto' : 'default';
    config.themeMode = newMode;
    saveConfig();
    document.querySelector(`input[name="theme-mode"][value="${newMode}"]`).checked = true;
    applyTheme();
    toastr.success(`已切换至${newMode === 'default' ? '默认美化' : '跟随酒馆主题'}`);
};

// API
document.getElementById('save-api').onclick = () => {
    config.apiBaseUrl = document.getElementById('api-url').value;
    config.apiKey = document.getElementById('api-key').value;
    config.model = document.getElementById('model-select').value;
    saveConfig();
    toastr.success('已保存');
};
document.getElementById('test-conn').onclick = async () => {
    config.apiBaseUrl = document.getElementById('api-url').value;
    config.apiKey = document.getElementById('api-key').value;
    saveConfig();
    await testAPIConnection();
};
document.getElementById('model-select').onchange = () => {
    config.model = document.getElementById('model-select').value;
    saveConfig();
};

// 主题
const themeRadios = document.querySelectorAll('input[name="theme-mode"]');
function applyTheme() {
    const p = document.getElementById(PANEL_ID);
    if (config.themeMode === 'default') {
        p.classList.add('default-mode');
        p.classList.remove('auto-mode');
        p.style.backgroundColor = '#ffffff';
        p.style.color = '#1a1a1a';
    } else {
        p.classList.remove('default-mode');
        p.classList.add('auto-mode');
        const root = getComputedStyle(document.documentElement);
        p.style.backgroundColor = root.getPropertyValue('--SmartThemeBlurTintColor') || '#f5f5f5';
        p.style.color = root.getPropertyValue('--SmartThemeBodyColor') || '#333';
    }
}
themeRadios.forEach(r => {
    r.onchange = () => {
        if (r.checked) {
            config.themeMode = r.value;
            saveConfig();
            applyTheme();
        }
    };
});

// 大小
const ws = document.getElementById('width-slider');
const hs = document.getElementById('height-slider');
const ls = document.getElementById('left-slider');
const ts = document.getElementById('top-slider');
const fs = document.getElementById('font-slider');
ws.oninput = () => { const v = ws.value; document.getElementById('width-val').textContent = v; config.panelWidth = parseInt(v); saveConfig(); panel.style.width = `${v}px`; applyTheme(); };
hs.oninput = () => { const v = hs.value; document.getElementById('height-val').textContent = v; config.panelHeight = parseInt(v); saveConfig(); panel.style.height = `${v}px`; applyTheme(); };
ls.oninput = () => { const v = ls.value; document.getElementById('left-val').textContent = v; config.panelLeft = parseInt(v); saveConfig(); panel.style.left = `${v}px`; };
ts.oninput = () => { const v = ts.value; document.getElementById('top-val').textContent = v; config.panelTop = parseInt(v); saveConfig(); panel.style.top = `${v}px`; };
fs.oninput = () => { const v = fs.value; document.getElementById('font-val').textContent = v; panel.style.fontSize = `${v}px`; };// 角色卡
    const charInput = document.getElementById('char-input');
    const charGen = document.getElementById('char-gen');
    const charResult = document.getElementById('char-result');
    const charCopy = document.getElementById('char-copy');
    const charImport = document.getElementById('char-import');
    const charClear = document.getElementById('char-clear');
    const charTplName = document.getElementById('char-template-name');
    const charSaveTpl = document.getElementById('char-save-tpl');
    charGen.onclick = async () => { if (!charInput.value.trim()) { toastr.warning('请输入设定'); return; } await generateCharacter(charInput.value.trim(), 'character', charGen, charResult); };
    charCopy.onclick = () => copyToClipboard(charResult.value);
    charImport.onclick = async () => { if (!charResult.value) return; charImport.disabled = true; charImport.textContent = '导入中...'; await importCharacterCard(charResult.value); charImport.disabled = false; charImport.textContent = '导入酒馆'; };
    charClear.onclick = () => { charResult.value = ''; charCopy.disabled = true; charImport.disabled = true; };
    charSaveTpl.onclick = () => { const n = charTplName.value.trim(); if (!n) { toastr.warning('请输入模板名称'); return; } if (!charResult.value) { toastr.warning('没有内容'); return; } config.savedTemplates.push({ name: n, content: charResult.value }); saveConfig(); refreshTemplateList(); toastr.success(`已保存: ${n}`); charTplName.value = ''; };
    charResult.addEventListener('input', () => { const has = !!charResult.value; charCopy.disabled = !has; charImport.disabled = !has; saveDraft('char', charResult.value); });
    charResult.value = loadDraft('char');
    
    // 批量生成
    const batchInput = document.getElementById('batch-input');
    const batchGen = document.getElementById('batch-gen');
    const batchResult = document.getElementById('batch-result');
    const batchCopy = document.getElementById('batch-copy');
    const batchClear = document.getElementById('batch-clear');
    batchGen.onclick = async () => { if (!batchInput.value.trim()) { toastr.warning('请输入设定'); return; } await batchGenerateCharacters(batchInput.value.trim(), batchGen, batchResult); };
    batchCopy.onclick = () => copyToClipboard(batchResult.value);
    batchClear.onclick = () => { batchResult.value = ''; batchCopy.disabled = true; };
    batchResult.addEventListener('input', () => { batchCopy.disabled = !batchResult.value; saveDraft('batch', batchResult.value); });
    batchResult.value = loadDraft('batch');
    
    // 用户人设
    const userInput = document.getElementById('user-input');
    const userGen = document.getElementById('user-gen');
    const userResult = document.getElementById('user-result');
    const userCopy = document.getElementById('user-copy');
    const userImport = document.getElementById('user-import');
    const userClear = document.getElementById('user-clear');
    const userTplName = document.getElementById('user-template-name');
    const userSaveTpl = document.getElementById('user-save-tpl');
    userGen.onclick = async () => { if (!userInput.value.trim()) { toastr.warning('请输入设定'); return; } await generateCharacter(userInput.value.trim(), 'user', userGen, userResult); };
    userCopy.onclick = () => copyToClipboard(userResult.value);
    userImport.onclick = async () => { if (!userResult.value) return; userImport.disabled = true; userImport.textContent = '导入中...'; await importUserPersona(userResult.value); userImport.disabled = false; userImport.textContent = '导入酒馆'; };
    userClear.onclick = () => { userResult.value = ''; userCopy.disabled = true; userImport.disabled = true; };
    userSaveTpl.onclick = () => { const n = userTplName.value.trim(); if (!n) { toastr.warning('请输入模板名称'); return; } if (!userResult.value) { toastr.warning('没有内容'); return; } config.savedTemplates.push({ name: n, content: userResult.value }); saveConfig(); refreshTemplateList(); toastr.success(`已保存: ${n}`); userTplName.value = ''; };
    userResult.addEventListener('input', () => { const has = !!userResult.value; userCopy.disabled = !has; userImport.disabled = !has; saveDraft('user', userResult.value); });
    userResult.value = loadDraft('user');
    
    // 世界书
    const worldInput = document.getElementById('world-input');
    const worldGen = document.getElementById('world-gen');
    const worldResult = document.getElementById('world-result');
    const worldCopy = document.getElementById('world-copy');
    const worldClear = document.getElementById('world-clear');
    const worldTplName = document.getElementById('world-template-name');
    const worldSaveTpl = document.getElementById('world-save-tpl');
    worldGen.onclick = async () => { if (!worldInput.value.trim()) { toastr.warning('请输入设定'); return; } await generateWorldbook(worldInput.value.trim(), worldGen, worldResult); };
    worldCopy.onclick = () => copyToClipboard(worldResult.value);
    worldClear.onclick = () => { worldResult.value = ''; worldCopy.disabled = true; };
    worldSaveTpl.onclick = () => { const n = worldTplName.value.trim(); if (!n) { toastr.warning('请输入模板名称'); return; } if (!worldResult.value) { toastr.warning('没有内容'); return; } config.savedTemplates.push({ name: n, content: worldResult.value }); saveConfig(); refreshTemplateList(); toastr.success(`已保存: ${n}`); worldTplName.value = ''; };
    worldResult.addEventListener('input', () => { worldCopy.disabled = !worldResult.value; saveDraft('world', worldResult.value); });
    worldResult.value = loadDraft('world');
    
    // 世界书扩展
    const worldExtendResult = document.getElementById('world-extend-result');
    const worldExtendCopy = document.getElementById('world-extend-copy');
    const worldExtendClear = document.getElementById('world-extend-clear');
    const extendLocation = document.getElementById('extend-location');
    const extendFaction = document.getElementById('extend-faction');
    const extendEvent = document.getElementById('extend-event');
    let currentWorldContent = '';
    worldResult.addEventListener('input', () => { currentWorldContent = worldResult.value; });
    worldResult.value = loadDraft('world');
    currentWorldContent = worldResult.value;
    extendLocation.onclick = async () => { if (!currentWorldContent) { toastr.warning('请先生成世界书'); return; } await generateWorldExtend(currentWorldContent, 'location', extendLocation, worldExtendResult); };
    extendFaction.onclick = async () => { if (!currentWorldContent) { toastr.warning('请先生成世界书'); return; } await generateWorldExtend(currentWorldContent, 'faction', extendFaction, worldExtendResult); };
    extendEvent.onclick = async () => { if (!currentWorldContent) { toastr.warning('请先生成世界书'); return; } await generateWorldExtend(currentWorldContent, 'event', extendEvent, worldExtendResult); };
    worldExtendCopy.onclick = () => copyToClipboard(worldExtendResult.value);
    worldExtendClear.onclick = () => { worldExtendResult.value = ''; worldExtendCopy.disabled = true; };
    worldExtendResult.addEventListener('input', () => { worldExtendCopy.disabled = !worldExtendResult.value; saveDraft('world-extend', worldExtendResult.value); });
    worldExtendResult.value = loadDraft('world-extend');
    
    // 关系网文字
    const relationName = document.getElementById('relation-name');
    const relationDesc = document.getElementById('relation-desc');
    const relationAdd = document.getElementById('relation-add');
    const relationGen = document.getElementById('relation-gen');
    const relationResult = document.getElementById('relation-result');
    const relationCopy = document.getElementById('relation-copy');
    const relationClear = document.getElementById('relation-clear');
    const relationTplName = document.getElementById('relation-template-name');
    const relationSaveTpl = document.getElementById('relation-save-tpl');
    relationAdd.onclick = () => { const n = relationName.value.trim(); if (!n) { toastr.warning('请输入角色名称'); return; } addRelationChar(n, relationDesc.value.trim()); relationName.value = ''; relationDesc.value = ''; };
    relationGen.onclick = async () => { await generateRelationText(relationGen, relationResult); };
    relationCopy.onclick = () => copyToClipboard(relationResult.value);
    relationClear.onclick = () => { relationResult.value = ''; relationCopy.disabled = true; };
    relationSaveTpl.onclick = () => { const n = relationTplName.value.trim(); if (!n) { toastr.warning('请输入模板名称'); return; } if (!relationResult.value) { toastr.warning('没有内容'); return; } config.savedTemplates.push({ name: n, content: relationResult.value }); saveConfig(); refreshTemplateList(); toastr.success(`已保存: ${n}`); relationTplName.value = ''; };
    relationResult.addEventListener('input', () => { relationCopy.disabled = !relationResult.value; saveDraft('relation', relationResult.value); });
    relationResult.value = loadDraft('relation');
    
    // 关系图谱
    const graphName = document.getElementById('graph-name');
    const graphDesc = document.getElementById('graph-desc');
    const graphAdd = document.getElementById('graph-add');
    const graphGen = document.getElementById('graph-gen');
    const graphClearBtn = document.getElementById('graph-clear');
    function refreshGraphList() {
        const container = document.getElementById('graph-relation-list');
        if (!container) return;
        if (config.relationChars.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无角色，点击添加</div>';
            return;
        }
        container.innerHTML = config.relationChars.map((c, i) => `
            <div class="char-item">
                <span><strong>${c.name}</strong>${c.desc ? ` - ${c.desc.substring(0, 40)}` : ''}</span>
                <button class="delete-graph-char" data-index="${i}">删除</button>
            </div>
        `).join('');
        container.querySelectorAll('.delete-graph-char').forEach(btn => {
            btn.onclick = () => {
                config.relationChars.splice(parseInt(btn.dataset.index), 1);
                saveConfig();
                refreshGraphList();
                if (relationGraphData) renderRelationGraph();
            };
        });
    }
    graphAdd.onclick = () => { const n = graphName.value.trim(); if (!n) { toastr.warning('请输入角色名称'); return; } config.relationChars.push({ name: n, desc: graphDesc.value.trim() }); saveConfig(); refreshGraphList(); graphName.value = ''; graphDesc.value = ''; };
    graphGen.onclick = async () => { await generateRelationGraph(graphGen); };
    graphClearBtn.onclick = () => { config.relationChars = []; saveConfig(); refreshGraphList(); relationGraphData = null; renderRelationGraph(); updateGraphDetail(); toastr.success('已清空'); };
    refreshGraphList();
    
    // 魔法衣橱
    const wardrobeInput = document.getElementById('wardrobe-input');
    const wardrobeGen = document.getElementById('wardrobe-gen');
    const wardrobeResult = document.getElementById('wardrobe-result');
    const wardrobeCopy = document.getElementById('wardrobe-copy');
    const wardrobeClear = document.getElementById('wardrobe-clear');
    const wardrobeTplName = document.getElementById('wardrobe-template-name');
    const wardrobeSaveTpl = document.getElementById('wardrobe-save-tpl');
    wardrobeGen.onclick = async () => { if (!wardrobeInput.value.trim()) { toastr.warning('请输入服装描述'); return; } await generateWardrobe(wardrobeInput.value.trim(), wardrobeGen, wardrobeResult); };
    wardrobeCopy.onclick = () => copyToClipboard(wardrobeResult.value);
    wardrobeClear.onclick = () => { wardrobeResult.value = ''; wardrobeCopy.disabled = true; };
    wardrobeSaveTpl.onclick = () => { const n = wardrobeTplName.value.trim(); if (!n) { toastr.warning('请输入模板名称'); return; } if (!wardrobeResult.value) { toastr.warning('没有内容'); return; } config.savedTemplates.push({ name: n, content: wardrobeResult.value }); saveConfig(); refreshTemplateList(); toastr.success(`已保存: ${n}`); wardrobeTplName.value = ''; };
    wardrobeResult.addEventListener('input', () => { wardrobeCopy.disabled = !wardrobeResult.value; saveDraft('wardrobe', wardrobeResult.value); });
    wardrobeResult.value = loadDraft('wardrobe');
    
    // 模板库
    const tplExport = document.getElementById('tpl-export');
    const tplImport = document.getElementById('tpl-import');
    const tplImportFile = document.getElementById('tpl-import-file');
    tplExport.onclick = () => exportTemplates();
    tplImport.onclick = () => tplImportFile.click();
    tplImportFile.onchange = (e) => { if (e.target.files.length) importTemplates(e.target.files[0]); tplImportFile.value = ''; };
    
    // 历史
    const historyClear = document.getElementById('history-clear');
    historyClear.onclick = () => { if (confirm('清空所有历史？')) { config.generationHistory = []; saveConfig(); refreshHistoryList(); toastr.success('已清空'); } };
    
    refreshHistoryList();
    refreshTemplateList();
    refreshRelationList();
    applyTheme();
}// 添加菜单项
        function addMenuItem() {
            const check = setInterval(() => {
                const menu = document.querySelector('#options .options-content');
                if (menu) {
                    clearInterval(check);
                    if (document.querySelector('.ai-menu-item')) return;
                    const item = document.createElement('div');
                    item.className = 'ai-menu-item';
                    item.innerHTML = '<i class="fa-regular fa-robot"></i> AI人设生成器';
                    item.onclick = () => document.getElementById(PANEL_ID).style.display = 'flex';
                    menu.appendChild(item);
                }
            }, 500);
        }

        // 样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .ai-panel {
                position: fixed; background: #fff; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                z-index: 100000; display: none; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .panel-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8f8f8; border-bottom: 1px solid #e8e8e8; font-weight: 500; }
            .header-actions { display: flex; align-items: center; gap: 12px; }
            .quick-theme-btn { background: #e0e0e0; border: none; border-radius: 16px; padding: 4px 12px; font-size: 12px; cursor: pointer; }
            .quick-theme-btn:hover { background: #d0d0d0; }
            .panel-close { cursor: pointer; font-size: 18px; opacity: 0.6; }
            .panel-close:hover { opacity: 1; }
            .tab-bar { display: flex; flex-wrap: wrap; gap: 2px; padding: 8px 12px 0 12px; background: #fafafa; border-bottom: 1px solid #e8e8e8; }
            .tab-btn { padding: 6px 12px; background: none; border: none; cursor: pointer; font-size: 12px; color: #666; border-radius: 8px 8px 0 0; }
            .tab-btn.active { background: #fff; color: #1a1a1a; font-weight: 500; border: 1px solid #e8e8e8; border-bottom-color: #fff; margin-bottom: -1px; }
            .tab-content { flex: 1; padding: 16px; overflow-y: auto; display: none; }
            .tab-content.active { display: block; }
            .field { margin-bottom: 14px; }
            .field label { display: block; margin-bottom: 5px; font-size: 12px; font-weight: 500; color: #666; }
            .field input, .field textarea, .field select { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 13px; box-sizing: border-box; background: #fff; color: #1a1a1a; }
            .field textarea { resize: vertical; font-family: monospace; }
            .result-text { background: #fafafa; font-family: monospace; font-size: 12px; line-height: 1.5; }
            button { padding: 6px 12px; background: #e8e8e8; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
            button:hover { background: #ddd; }
            .primary-btn { background: #4A6FA5; color: white; width: 100%; margin-bottom: 14px; }
            .primary-btn:hover { background: #3a5a8a; }
            .extend-btn { background: #4A6FA5; color: white; flex: 1; }
            .extend-btn:hover { background: #3a5a8a; }
            .button-group { display: flex; gap: 8px; margin: 10px 0; }
            button:disabled { opacity: 0.5; cursor: not-allowed; }
            .flex-row { display: flex; gap: 8px; }
            .flex-row input { flex: 1; }
            .radio-group { display: flex; gap: 20px; }
            .radio-group label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: normal; }
            .list-container { max-height: 150px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; margin-bottom: 10px; }
            .char-item, .history-item, .template-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-bottom: 1px solid #eee; cursor: pointer; }
            .char-item:hover, .history-item:hover { background: #f5f5f5; }
            .history-type { font-weight: 500; font-size: 12px; }
            .history-time { font-size: 10px; color: #999; }
            .history-preview { font-size: 11px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 4px; }
            .template-actions { display: flex; gap: 8px; }
            .empty-state { text-align: center; padding: 20px; color: #999; font-size: 13px; }
            .graph-detail-container { margin-top: 12px; max-height: 100px; overflow-y: auto; }
            .graph-detail-item { padding: 6px 10px; background: #f5f5f5; border-radius: 6px; margin-bottom: 6px; }
            .ai-menu-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; border-radius: 6px; transition: background 0.2s; }
            .ai-menu-item:hover { background: rgba(0,0,0,0.05); }
            .default-mode .panel-header { background: #f5f5f5; border-bottom-color: #e0e0e0; }
            .default-mode .tab-bar { background: #f5f5f5; }
            .default-mode input, .default-mode textarea, .default-mode select { background: #fff; border-color: #e0e0e0; }
            .auto-mode .panel-header { background: var(--SmartThemeBlurTintColor, #f5f5f5); border-bottom-color: var(--SmartThemeBorderColor, #e0e0e0); }
            .auto-mode .tab-bar { background: var(--SmartThemeBlurTintColor, #f5f5f5); }
        `;
        document.head.appendChild(style);

        addMenuItem();
        createPanel();
    }
})();
