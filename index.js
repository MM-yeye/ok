// AI Character Generator - 完整版
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
themeMode: 'light',
panelWidth: 440,
panelHeight: 720,
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
if (h.type === '角色卡') {
document.getElementById('char-result').value = h.output;
updateCharButtonsState();
}
else if (h.type === '用户人设') {
document.getElementById('user-result').value = h.output;
updateUserButtonsState();
}
else if (h.type === '世界书') {
document.getElementById('world-result').value = h.output;
updateWorldButtonsState();
}
else if (h.type === '世界书扩展') {
document.getElementById('world-extend-result').value = h.output;
updateWorldExtendButtonsState();
}
else if (h.type === '关系描述') {
document.getElementById('relation-result').value = h.output;
updateRelationButtonsState();
}
else if (h.type === '魔法衣橱') {
document.getElementById('wardrobe-result').value = h.output;
updateWardrobeButtonsState();
}
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
}

function setButtonLoading(btn, isLoading, originalText) {
if (!btn) return;
if (isLoading) {
btn.disabled = true;
btn.classList.add('loading');
btn.innerHTML = '<span class="btn-spinner"></span> 生成中...';
} else {
btn.disabled = false;
btn.classList.remove('loading');
btn.innerHTML = originalText;
}
}// ========== 角色卡 ==========
async function generateCharacter(userInput, cardType, btn, resultArea) {
if (!config.apiKey) { toastr.error('请先设置 API Key'); return null; }
const fullUrl = getFullApiUrl();
const template = cardType === 'character' ? CHAR_TEMPLATE : USER_TEMPLATE;
const typeName = cardType === 'character' ? '角色卡' : '用户人设';
const originalText = btn ? btn.innerHTML : '';

const systemPrompt = `根据用户输入，生成完整的${typeName}。严格按照以下YAML格式输出，所有字段都要填满，不要添加额外解释：

${template}`;

if (btn) setButtonLoading(btn, true, originalText);

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
if (cardType === 'character') {
updateCharButtonsState();
} else {
updateUserButtonsState();
}
}
toastr.success('生成成功');
return content;
} catch (err) { toastr.error(`失败: ${err.message}`); return null; }
finally { if (btn) setButtonLoading(btn, false, originalText); }
}

function updateCharButtonsState() {
const copyBtn = document.getElementById('char-copy');
const importBtn = document.getElementById('char-import');
const resultArea = document.getElementById('char-result');
const hasContent = resultArea && resultArea.value && resultArea.value.trim().length > 0;
if (copyBtn) copyBtn.disabled = !hasContent;
if (importBtn) importBtn.disabled = !hasContent;
}

function updateUserButtonsState() {
const copyBtn = document.getElementById('user-copy');
const importBtn = document.getElementById('user-import');
const resultArea = document.getElementById('user-result');
const hasContent = resultArea && resultArea.value && resultArea.value.trim().length > 0;
if (copyBtn) copyBtn.disabled = !hasContent;
if (importBtn) importBtn.disabled = !hasContent;
}

function updateWorldButtonsState() {
const copyBtn = document.getElementById('world-copy');
const resultArea = document.getElementById('world-result');
const hasContent = resultArea && resultArea.value && resultArea.value.trim().length > 0;
if (copyBtn) copyBtn.disabled = !hasContent;
}

function updateWorldExtendButtonsState() {
const copyBtn = document.getElementById('world-extend-copy');
const resultArea = document.getElementById('world-extend-result');
const hasContent = resultArea && resultArea.value && resultArea.value.trim().length > 0;
if (copyBtn) copyBtn.disabled = !hasContent;
}

function updateRelationButtonsState() {
const copyBtn = document.getElementById('relation-copy');
const resultArea = document.getElementById('relation-result');
const hasContent = resultArea && resultArea.value && resultArea.value.trim().length > 0;
if (copyBtn) copyBtn.disabled = !hasContent;
}

function updateWardrobeButtonsState() {
const copyBtn = document.getElementById('wardrobe-copy');
const resultArea = document.getElementById('wardrobe-result');
const hasContent = resultArea && resultArea.value && resultArea.value.trim().length > 0;
if (copyBtn) copyBtn.disabled = !hasContent;
}

// ========== 世界书 ==========
async function generateWorldbook(userInput, btn, resultArea) {
if (!config.apiKey) { toastr.error('请先设置 API Key'); return null; }
if (!userInput.trim()) { toastr.warning('请输入设定要求'); return null; }
const fullUrl = getFullApiUrl();
const originalText = btn ? btn.innerHTML : '';
const systemPrompt = `根据要求，生成详细的世界设定。自由创作，语言生动，逻辑自洽。直接输出内容。`;
if (btn) setButtonLoading(btn, true, originalText);
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
updateWorldButtonsState();
}
toastr.success('生成成功');
return content;
} catch (err) { toastr.error(`失败: ${err.message}`); return null; }
finally { if (btn) setButtonLoading(btn, false, originalText); }
}

// ========== 批量生成角色卡 ==========
async function batchGenerateCharacters(userInput, btn, resultArea) {
if (!config.apiKey) { toastr.error('请先设置 API Key'); return null; }
const lines = userInput.split('\n').filter(l => l.trim());
if (lines.length === 0) { toastr.warning('请输入角色设定，每行一个'); return null; }

const fullUrl = getFullApiUrl();
const originalText = btn ? btn.innerHTML : '';
const systemPrompt = `根据用户输入，为每个角色生成完整的角色卡。严格按照YAML格式输出，每个角色用 "---" 分隔。所有字段都要填满。`;

if (btn) setButtonLoading(btn, true, originalText);

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
if (btn) setButtonLoading(btn, false, originalText);
}// ========== 关系网文字 ==========
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
const originalText = btn ? btn.innerHTML : '';
const charList = relationChars.map(c => `- ${c.name}: ${c.desc || '暂无描述'}`).join('\n');
const systemPrompt = `分析以下角色之间的关系，用生动语言描述每对角色。输出纯文本。`;
if (btn) setButtonLoading(btn, true, originalText);
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
updateRelationButtonsState();
}
toastr.success('生成成功');
return content;
} catch (err) { toastr.error(`失败: ${err.message}`); return null; }
finally { if (btn) setButtonLoading(btn, false, originalText); }
}

// ========== 角色关系可视化 ==========
let selectedNodes = [];
let relationGraphData = null;

function extractJSONFromResponse(content) {
content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
content = content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
content = content.replace(/```json\n?/g, '');
content = content.replace(/```\n?/g, '');
content = content.trim();
const jsonMatch = content.match(/\{[\s\S]*\}/);
if (jsonMatch) {
return jsonMatch[0];
}
return content;
}

function renderRelationGraph() {
const canvas = document.getElementById('relation-canvas');
if (!canvas) return;
if (!relationGraphData || relationGraphData.nodes.length === 0) {
const ctx = canvas.getContext('2d');
ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#999';
ctx.font = '14px sans-serif';
ctx.fillText('暂无关系数据，请先生成关系网', canvas.width/2 - 120, canvas.height/2);
return;
}

const w = canvas.width, h = canvas.height;
const centerX = w/2, centerY = h/2;
const radius = Math.min(w, h) * 0.4;
const nodes = relationGraphData.nodes;
const edges = relationGraphData.edges;

const angles = nodes.map((_, i) => (i * 2 * Math.PI / nodes.length) - Math.PI/2);
const positions = nodes.map((_, i) => ({
x: centerX + radius * Math.cos(angles[i]),
y: centerY + radius * Math.sin(angles[i])
}));

const ctx = canvas.getContext('2d');
ctx.clearRect(0, 0, w, h);
ctx.font = '13px sans-serif';
ctx.shadowBlur = 0;

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

const angle = Math.atan2(to.y - from.y, to.x - from.x);
const arrowX = to.x - 16 * Math.cos(angle);
const arrowY = to.y - 16 * Math.sin(angle);
ctx.beginPath();
ctx.moveTo(arrowX, arrowY);
ctx.lineTo(arrowX - 8 * Math.cos(angle - Math.PI/6), arrowY - 8 * Math.sin(angle - Math.PI/6));
ctx.lineTo(arrowX - 8 * Math.cos(angle + Math.PI/6), arrowY - 8 * Math.sin(angle + Math.PI/6));
ctx.fillStyle = isHighlighted ? '#4A6FA5' : '#aaa';
ctx.fill();

const midX = (from.x + to.x)/2;
const midY = (from.y + to.y)/2;
const perpAngle = angle + Math.PI/2;
const offset = 18;
const textX = midX + offset * Math.cos(perpAngle);
const textY = midY + offset * Math.sin(perpAngle);

ctx.fillStyle = isHighlighted ? '#e8f0fe' : '#f5f5f5';
ctx.fillRect(textX - 22, textY - 12, 44, 20);
ctx.fillStyle = isHighlighted ? '#4A6FA5' : '#666';
ctx.font = 'bold 12px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(edge.relation, textX, textY);
});

nodes.forEach((node, i) => {
const pos = positions[i];
const isSelected = selectedNodes.includes(i);
if (isSelected) {
ctx.beginPath();
ctx.arc(pos.x, pos.y, 32, 0, Math.PI*2);
ctx.fillStyle = 'rgba(74, 111, 165, 0.2)';
ctx.fill();
}
ctx.beginPath();
ctx.arc(pos.x, pos.y, 28, 0, Math.PI*2);
ctx.fillStyle = isSelected ? '#4A6FA5' : '#e0e0e0';
ctx.fill();
ctx.strokeStyle = '#fff';
ctx.lineWidth = 2;
ctx.stroke();
ctx.fillStyle = isSelected ? '#fff' : '#333';
ctx.font = 'bold 20px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(node.name.charAt(0).toUpperCase(), pos.x, pos.y);
ctx.fillStyle = '#333';
ctx.font = '12px sans-serif';
ctx.fillText(node.name.length > 10 ? node.name.substring(0, 8) + '..' : node.name, pos.x, pos.y + 42);
});

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
if (dx*dx + dy*dy < 800) {
if (e.ctrlKey || e.metaKey) {
if (selectedNodes.includes(i)) selectedNodes = selectedNodes.filter(n => n !== i);
else selectedNodes.push(i);
} else {
if (selectedNodes.length === 1 && selectedNodes[0] === i) {
alert(`【${nodes[i].name}】\n\n${nodes[i].desc || '暂无描述'}`);
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
const direction = e.from === idx ? '→' : '←';
html += `<div class="graph-detail-relation">${direction} ${other.name} : ${e.relation}</div>`;
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
const originalText = btn ? btn.innerHTML : '';
const charList = config.relationChars.map(c => `- ${c.name}: ${c.desc || '暂无描述'}`).join('\n');

const systemPrompt = `分析以下角色之间的关系，输出纯净的JSON格式，不要添加任何其他文字、解释、markdown标记或think标签。
每条关系包含 from, to, relation（最多6个字）。
格式示例：{"nodes":[{"name":"角色名","desc":"描述"}],"edges":[{"from":0,"to":1,"relation":"盟友"}]}
直接输出JSON，不要用任何符号包裹。`;

if (btn) setButtonLoading(btn, true, originalText);
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
temperature: 0.5,
max_tokens: 2000
})
});
if (!res.ok) { toastr.error(`API错误: ${res.status}`); return; }
const data = await res.json();
let content = data.choices[0].message.content;
content = extractJSONFromResponse(content);

let parsed;
try {
parsed = JSON.parse(content);
} catch (e) {
const edgesMatch = content.match(/"edges":\s*\[([\s\S]*?)\]/);
if (edgesMatch) {
const nodesMatch = content.match(/"nodes":\s*\[([\s\S]*?)\]/);
if (nodesMatch) {
try {
const nodes = JSON.parse('[' + nodesMatch[1] + ']');
const edges = JSON.parse('[' + edgesMatch[1] + ']');
parsed = { nodes, edges };
} catch (e2) {
toastr.error('JSON解析失败，请重试');
if (btn) setButtonLoading(btn, false, originalText);
return;
}
} else {
toastr.error('JSON解析失败，请重试');
if (btn) setButtonLoading(btn, false, originalText);
return;
}
} else {
toastr.error('JSON解析失败，请重试');
if (btn) setButtonLoading(btn, false, originalText);
return;
}
}

const nodesWithDesc = parsed.nodes.map((node, idx) => ({
name: node.name,
desc: node.desc || (config.relationChars[idx] ? config.relationChars[idx].desc : '暂无描述')
}));

relationGraphData = { nodes: nodesWithDesc, edges: parsed.edges };
saveConfig();
renderRelationGraph();
toastr.success('关系图谱生成成功');
} catch (err) { toastr.error(`生成失败: ${err.message}`); }
finally { if (btn) setButtonLoading(btn, false, originalText); }
}// ========== 魔法衣橱 ==========
async function generateWardrobeMulti(userInput, btn, resultArea, compareArea) {
if (!config.apiKey) { toastr.error('请先设置 API Key'); return null; }
if (!userInput.trim()) { toastr.warning('请输入服装描述'); return null; }
const fullUrl = getFullApiUrl();
const originalText = btn ? btn.innerHTML : '';
const systemPrompt = `根据用户输入，生成3套不同的服装、饰品、造型描写。每套用"【套装一】"、"【套装二】"、"【套装三】"标明。只描写用户提到的内容，语言优美细腻。`;

if (btn) setButtonLoading(btn, true, originalText);
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
max_tokens: 1500
})
});
if (!res.ok) { toastr.error(`API错误: ${res.status}`); return null; }
const data = await res.json();
const content = data.choices[0].message.content;
if (resultArea) {
resultArea.value = content;
addToHistory('魔法衣橱', userInput, content);
updateWardrobeButtonsState();

const sets = content.split(/【套装[一二三]】/).filter(s => s.trim());
if (compareArea && sets.length >= 2) {
compareArea.innerHTML = `
<div style="display:flex; gap:16px; flex-wrap:wrap;">
${sets.slice(0,3).map((set, idx) => `
<div style="flex:1; min-width:200px; padding:12px; background:#f5f5f5; border-radius:8px; border-left:3px solid #4A6FA5;">
<h4 style="margin:0 0 8px 0; color:#4A6FA5;">套装 ${idx+1}</h4>
<p style="white-space:pre-wrap; margin:0; font-size:12px;">${set.trim()}</p>
</div>
`).join('')}
</div>
`;
}
}
toastr.success('生成成功');
return content;
} catch (err) { toastr.error(`失败: ${err.message}`); return null; }
finally { if (btn) setButtonLoading(btn, false, originalText); }
}

// ========== 世界书扩展 ==========
let selectedExtendTypes = [];

function loadWorldbookList() {
const select = document.getElementById('worldbook-select');
if (!select) return;

const editorSelect = document.getElementById('world_editor_select');
const multiSelect = document.getElementById('world_info');

let worldbookOptions = [];

if (editorSelect) {
const options = editorSelect.querySelectorAll('option');
worldbookOptions = Array.from(options).filter(opt => opt.value && opt.value !== '');
}
if (worldbookOptions.length === 0 && multiSelect) {
const options = multiSelect.querySelectorAll('option');
worldbookOptions = Array.from(options).filter(opt => opt.value && opt.value !== '');
}

if (worldbookOptions.length === 0) {
select.innerHTML = '<option value="">-- 暂无可用世界书 --</option>';
return;
}

select.innerHTML = '<option value="">-- 选择已有世界书 --</option>' +
worldbookOptions.map(opt => `<option value="${opt.value}">${opt.textContent}</option>`).join('');
}

function getExtendSource() {
const sourceType = document.querySelector('input[name="extend-source"]:checked')?.value || 'world';
if (sourceType === 'character') {
const charResult = document.getElementById('char-result').value;
if (charResult.trim()) return { type: 'character', content: charResult };
toastr.warning('请先生成角色卡');
return null;
} else {
const worldResult = document.getElementById('world-result').value;
if (worldResult.trim()) return { type: 'world', content: worldResult };
toastr.warning('请先生成世界书');
return null;
}
}

async function getSelectedWorldbookContent() {
const worldbookId = document.getElementById('worldbook-select')?.value;
if (!worldbookId || worldbookId === '') return null;

try {
const worldInfoPanel = document.getElementById('WorldInfo');
if (worldInfoPanel && worldInfoPanel.style.display !== 'none') {
const activeWorldbook = document.getElementById('world_editor_select')?.value;
if (activeWorldbook === worldbookId) {
const contentArea = document.querySelector('#world_popup .world_entry_form textarea[name="content"]');
if (contentArea && contentArea.value) {
return contentArea.value;
}
}
}
} catch (err) {
console.warn('获取世界书内容失败:', err);
}

toastr.warning('无法自动获取世界书内容，请确保世界书已打开并选中');
return `【世界书: ${worldbookId}】\n(请手动复制世界书内容到此处)`;
}

function updateExtendTypes() {
const checkboxes = document.querySelectorAll('.extend-type-checkbox');
selectedExtendTypes = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
const btn = document.getElementById('world-extend-generate');
if (btn) btn.disabled = selectedExtendTypes.length === 0;
}

function updateSourcePreview() {
const sourceType = document.querySelector('input[name="extend-source"]:checked')?.value || 'world';
const previewDiv = document.getElementById('source-preview');
if (!previewDiv) return;
if (sourceType === 'character') {
const charResult = document.getElementById('char-result').value;
const preview = charResult.substring(0, 100);
previewDiv.innerHTML = `<div style="background:#f0f0f0; padding:8px; border-radius:6px; margin-top:8px; font-size:12px;">
<strong>当前角色卡预览:</strong><br>${preview || '暂无内容'}${charResult.length > 100 ? '...' : ''}
</div>`;
} else {
const worldResult = document.getElementById('world-result').value;
const preview = worldResult.substring(0, 100);
previewDiv.innerHTML = `<div style="background:#f0f0f0; padding:8px; border-radius:6px; margin-top:8px; font-size:12px;">
<strong>当前世界书预览:</strong><br>${preview || '暂无内容'}${worldResult.length > 100 ? '...' : ''}
</div>`;
}
}

async function generateWorldExtend(btn) {
if (!config.apiKey) { toastr.error('请先设置 API Key'); return; }
if (selectedExtendTypes.length === 0) { toastr.warning('请至少选择一种扩展类型'); return; }

let sourceContent = null;
const useWorldbook = document.getElementById('use-worldbook')?.checked;
const originalText = btn ? btn.innerHTML : '';

if (useWorldbook) {
sourceContent = await getSelectedWorldbookContent();
if (!sourceContent) { toastr.warning('请选择已有世界书'); return; }
} else {
const source = getExtendSource();
if (!source) return;
sourceContent = source.content;
}

const fullUrl = getFullApiUrl();
const typeNames = {
location: '地点（名称、特征、氛围）',
faction: '势力组织（名称、理念、实力、目标）',
event: '重要事件或冲突（时间、背景、影响）',
culture: '文化习俗（信仰、传统、节日、禁忌）',
technology: '科技水平（特色技术、限制、发展程度）',
character: '重要人物（名称、身份、特点、立场）'
};
const typeDesc = selectedExtendTypes.map(t => typeNames[t]).join('、');
const systemPrompt = `根据以下世界观设定，生成详细的${typeDesc}。每个类型独立成段，语言生动。`;

if (btn) setButtonLoading(btn, true, originalText);
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
{ role: 'user', content: sourceContent }
],
temperature: 0.8,
max_tokens: 2000
})
});
if (!res.ok) { toastr.error(`API错误: ${res.status}`); return; }
const data = await res.json();
const content = data.choices[0].message.content;
const resultArea = document.getElementById('world-extend-result');
if (resultArea) {
resultArea.value = content;
addToHistory('世界书扩展', `类型:${typeDesc}`, content);
updateWorldExtendButtonsState();
}
toastr.success('生成成功');
} catch (err) { toastr.error(`失败: ${err.message}`); }
finally { if (btn) setButtonLoading(btn, false, originalText); }
}

async function exportToWorldbook() {
const content = document.getElementById('world-extend-result').value;
if (!content.trim()) {
toastr.warning('没有内容可导出');
return;
}

try {
const worldIcon = document.getElementById('WIDrawerIcon');
if (worldIcon) {
worldIcon.click();
setTimeout(() => {
const createBtn = document.querySelector('#world_create_button');
if (createBtn) {
createBtn.click();
setTimeout(() => {
const contentArea = document.querySelector('#world_popup .world_entry_form textarea[name="content"]');
if (contentArea) {
contentArea.value = content;
toastr.success('内容已填充，请手动保存世界书');
} else {
copyToClipboard(content);
toastr.info('已复制到剪贴板，请手动创建世界书');
}
}, 500);
} else {
copyToClipboard(content);
toastr.info('已复制到剪贴板，请手动创建世界书');
}
}, 500);
} else {
copyToClipboard(content);
toastr.info('已复制到剪贴板，请手动创建世界书');
}
} catch (err) {
console.warn('创建世界书失败', err);
copyToClipboard(content);
toastr.info('已复制到剪贴板，请手动创建世界书');
}
}// ========== 导入功能 ==========
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

function importCharacterFromFile(file, resultArea) {
const reader = new FileReader();
reader.onload = (e) => {
try {
const imported = JSON.parse(e.target.result);
let content = '';
if (imported.content) content = imported.content;
else if (typeof imported === 'string') content = imported;
else content = JSON.stringify(imported, null, 2);
if (resultArea) {
resultArea.value = content;
toastr.success('已导入');
if (resultArea.id === 'char-result') updateCharButtonsState();
if (resultArea.id === 'user-result') updateUserButtonsState();
}
} catch (err) {
toastr.error('文件解析失败');
}
};
reader.readAsText(file);
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
<button id="quick-theme-btn" class="quick-theme-btn">日间/夜间</button>
<span class="panel-close">×</span>
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

<div class="tab-content active" id="tab-api">
<div class="field"><label>API地址</label><input type="text" id="api-url" placeholder="https://key.laopobao.online/v1" value="${config.apiBaseUrl}"></div>
<div class="field"><label>API Key</label><input type="password" id="api-key" placeholder="sk-..." value="${config.apiKey}"></div>
<div class="field"><label>模型</label><select id="model-select">${modelOpts}</select></div>
<div class="button-group"><button id="test-conn">测试连接</button><button id="save-api">保存</button></div>
</div>

<div class="tab-content" id="tab-char">
<div class="field"><label>简单设定</label><textarea id="char-input" rows="3" placeholder="例如：前锋，是所有屠孝子心里最柔软的地方"></textarea></div>
<button id="char-gen" class="primary-btn">生成角色卡</button>
<div class="field"><label>生成结果</label><textarea id="char-result" class="result-text" rows="10"></textarea></div>
<div class="button-group">
<button id="char-copy" class="copy-btn">复制</button>
<button id="char-import" class="import-btn">导入酒馆</button>
<button id="char-import-file-btn">从文件导入</button>
<input type="file" id="char-import-file" accept=".json" style="display:none">
<button id="char-clear">清空</button>
</div>
<div class="field"><label>保存模板</label><div class="flex-row"><input type="text" id="char-template-name" placeholder="模板名称"><button id="char-save-tpl">保存</button></div></div>
</div>

<div class="tab-content" id="tab-batch">
<div class="field"><label>批量设定（每行一个角色）</label><textarea id="batch-input" rows="5" placeholder="例如：&#10;前锋，屠孝子心中最柔软的地方&#10;医生，温柔冷静的急救专家"></textarea></div>
<button id="batch-gen" class="primary-btn">批量生成</button>
<div class="field"><label>生成结果</label><textarea id="batch-result" class="result-text" rows="10"></textarea></div>
<div class="button-group"><button id="batch-copy" class="copy-btn">复制</button><button id="batch-clear">清空</button></div>
</div>

<div class="tab-content" id="tab-user">
<div class="field"><label>简单设定</label><textarea id="user-input" rows="3" placeholder="例如：菲利普，锋儿最爱的老公"></textarea></div>
<button id="user-gen" class="primary-btn">生成用户人设</button>
<div class="field"><label>生成结果</label><textarea id="user-result" class="result-text" rows="10"></textarea></div>
<div class="button-group">
<button id="user-copy" class="copy-btn">复制</button>
<button id="user-import" class="import-btn">导入酒馆</button>
<button id="user-import-file-btn">从文件导入</button>
<input type="file" id="user-import-file" accept=".json" style="display:none">
<button id="user-clear">清空</button>
</div>
<div class="field"><label>保存模板</label><div class="flex-row"><input type="text" id="user-template-name" placeholder="模板名称"><button id="user-save-tpl">保存</button></div></div>
</div>

<div class="tab-content" id="tab-world">
<div class="field"><label>设定要求</label><textarea id="world-input" rows="4" placeholder="例如：赛博朋克都市，企业控制，义体改造..."></textarea></div>
<button id="world-gen" class="primary-btn">生成世界书</button>
<div class="field"><label>生成结果</label><textarea id="world-result" class="result-text" rows="8"></textarea></div>
<div class="button-group"><button id="world-copy" class="copy-btn">复制</button><button id="world-clear">清空</button></div>
<div class="field"><label>保存模板</label><div class="flex-row"><input type="text" id="world-template-name" placeholder="模板名称"><button id="world-save-tpl">保存</button></div></div>
</div>

<div class="tab-content" id="tab-world-extend">
<div class="field"><label>扩展来源</label>
<div class="radio-group" style="margin-bottom: 8px;">
<label><input type="radio" name="extend-source" value="world" checked> 当前世界书</label>
<label><input type="radio" name="extend-source" value="character"> 当前角色卡</label>
</div>
<div id="source-preview" style="margin-top: 8px;"></div>
<div class="checkbox-group" style="margin-top: 12px;">
<label><input type="checkbox" id="use-worldbook"> 使用酒馆已有世界书</label>
</div>
<div id="worldbook-select-container" style="display: none; margin-top: 8px;">
<select id="worldbook-select" class="worldbook-select" style="width:100%; padding:8px; border-radius:6px;"></select>
<div style="font-size:11px; color:#666; margin-top:4px;">提示：世界书列表来自酒馆，请确保世界书面板已打开</div>
</div>
</div>
<div class="field"><label>扩展内容（可多选）</label>
<div class="extend-checkboxes">
<label><input type="checkbox" class="extend-type-checkbox" value="location"> 地点</label>
<label><input type="checkbox" class="extend-type-checkbox" value="faction"> 势力</label>
<label><input type="checkbox" class="extend-type-checkbox" value="event"> 事件</label>
<label><input type="checkbox" class="extend-type-checkbox" value="culture"> 文化</label>
<label><input type="checkbox" class="extend-type-checkbox" value="technology"> 科技</label>
<label><input type="checkbox" class="extend-type-checkbox" value="character"> 重要人物</label>
</div>
</div>
<button id="world-extend-generate" class="primary-btn" disabled>生成扩展</button>
<div class="field"><label>扩展结果</label><textarea id="world-extend-result" class="result-text" rows="10"></textarea></div>
<div class="button-group">
<button id="world-extend-copy" class="copy-btn">复制</button>
<button id="world-extend-export-worldbook">导出为世界书</button>
<button id="world-extend-clear">清空</button>
</div>
</div>

<div class="tab-content" id="tab-relation">
<div class="field"><label>角色列表</label><div id="relation-list" class="list-container"></div></div>
<div class="flex-row"><input type="text" id="relation-name" placeholder="角色名称"><button id="relation-add">添加</button></div>
<textarea id="relation-desc" rows="2" placeholder="角色描述（可选）"></textarea>
<button id="relation-gen" class="primary-btn">生成关系描述</button>
<div class="field"><label>关系描述</label><textarea id="relation-result" class="result-text" rows="8"></textarea></div>
<div class="button-group"><button id="relation-copy" class="copy-btn">复制</button><button id="relation-clear">清空</button></div>
<div class="field"><label>保存模板</label><div class="flex-row"><input type="text" id="relation-template-name" placeholder="模板名称"><button id="relation-save-tpl">保存</button></div></div>
</div>

<div class="tab-content" id="tab-graph">
<div class="field"><label>角色列表</label><div id="graph-relation-list" class="list-container"></div></div>
<div class="flex-row"><input type="text" id="graph-name" placeholder="角色名称"><button id="graph-add">添加</button></div>
<textarea id="graph-desc" rows="2" placeholder="角色描述（可选）"></textarea>
<button id="graph-gen" class="primary-btn">生成关系图谱</button>
<div class="field"><label>关系图谱（点击节点查看详情，Ctrl多选）</label>
<canvas id="relation-canvas" width="550" height="360" style="width:100%; height:auto; border:1px solid #e0e0e0; border-radius:8px; background:#fff;"></canvas>
</div>
<div id="graph-detail" class="graph-detail-container"></div>
<div class="button-group"><button id="graph-clear">清空图谱</button></div>
</div>

<div class="tab-content" id="tab-wardrobe">
<div class="field"><label>服装描述</label><textarea id="wardrobe-input" rows="3" placeholder="例如：黑色的哥特服装"></textarea></div>
<button id="wardrobe-gen" class="primary-btn">生成多套衣橱</button>
<div class="field"><label>生成结果</label><textarea id="wardrobe-result" class="result-text" rows="8"></textarea></div>
<div id="wardrobe-compare" style="margin: 12px 0;"></div>
<div class="button-group"><button id="wardrobe-copy" class="copy-btn">复制</button><button id="wardrobe-clear">清空</button></div>
<div class="field"><label>保存模板</label><div class="flex-row"><input type="text" id="wardrobe-template-name" placeholder="模板名称"><button id="wardrobe-save-tpl">保存</button></div></div>
</div>

<div class="tab-content" id="tab-history">
<div id="history-list" class="list-container"></div>
<button id="history-clear">清空历史</button>
</div>

<div class="tab-content" id="tab-templates">
<div class="button-group"><button id="tpl-export">导出模板</button><button id="tpl-import">导入模板</button><input type="file" id="tpl-import-file" accept=".json" style="display:none"></div>
<div id="template-list" class="list-container"></div>
</div>

<div class="tab-content" id="tab-theme">
<div class="radio-group"><label><input type="radio" name="theme-mode" value="light" ${config.themeMode === 'light' ? 'checked' : ''}> 日间模式</label><label><input type="radio" name="theme-mode" value="dark" ${config.themeMode === 'dark' ? 'checked' : ''}> 夜间模式</label></div>
</div>

<div class="tab-content" id="tab-size">
<div class="field"><label>宽度 <span id="width-val">${config.panelWidth}</span> px</label><input type="range" id="width-slider" min="300" max="700" step="10" value="${config.panelWidth}"></div>
<div class="field"><label>高度 <span id="height-val">${config.panelHeight}</span> px</label><input type="range" id="height-slider" min="400" max="800" step="10" value="${config.panelHeight}"></div>
<div class="field"><label>左边距 <span id="left-val">${config.panelLeft}</span> px</label><input type="range" id="left-slider" min="0" max="${window.innerWidth - 50}" step="10" value="${config.panelLeft}"></div>
<div class="field"><label>上边距 <span id="top-val">${config.panelTop}</span> px</label><input type="range" id="top-slider" min="0" max="500" step="10" value="${config.panelTop}"></div>
<div class="field"><label>字体大小 <span id="font-val">13</span> px</label><input type="range" id="font-slider" min="10" max="18" step="1" value="13"></div>
</div>
`;
document.body.appendChild(panel);

// 选项卡切换
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
if (id === 'world-extend') {
loadWorldbookList();
updateSourcePreview();
const useWorldbookCheckbox = document.getElementById('use-worldbook');
const worldbookContainer = document.getElementById('worldbook-select-container');
if (useWorldbookCheckbox && worldbookContainer) {
useWorldbookCheckbox.onchange = () => {
worldbookContainer.style.display = useWorldbookCheckbox.checked ? 'block' : 'none';
if (useWorldbookCheckbox.checked) loadWorldbookList();
};
}
const checkboxes = document.querySelectorAll('.extend-type-checkbox');
checkboxes.forEach(cb => {
cb.onchange = () => updateExtendTypes();
});
updateExtendTypes();
}
};
});

panel.querySelector('.panel-close').onclick = () => panel.style.display = 'none';

const quickThemeBtn = document.getElementById('quick-theme-btn');
quickThemeBtn.onclick = () => {
const newMode = config.themeMode === 'light' ? 'dark' : 'light';
config.themeMode = newMode;
saveConfig();
document.querySelector(`input[name="theme-mode"][value="${newMode}"]`).checked = true;
applyTheme();
toastr.success(`已切换至${newMode === 'light' ? '日间模式' : '夜间模式'}`);
};

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

const themeRadios = document.querySelectorAll('input[name="theme-mode"]');
function applyTheme() {
const p = document.getElementById(PANEL_ID);
if (config.themeMode === 'light') {
p.classList.add('light-mode');
p.classList.remove('dark-mode');
p.style.backgroundColor = '#ffffff';
p.style.color = '#1a1a1a';
p.style.border = '1px solid #e0e0e0';
} else {
p.classList.remove('light-mode');
p.classList.add('dark-mode');
p.style.backgroundColor = '#1e1e1e';
p.style.color = '#e0e0e0';
p.style.border = '1px solid #333';
document.querySelectorAll('.field input, .field textarea, .field select').forEach(el => {
el.style.backgroundColor = '#2d2d2d';
el.style.borderColor = '#444';
el.style.color = '#e0e0e0';
});
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

const ws = document.getElementById('width-slider');
const hs = document.getElementById('height-slider');
const ls = document.getElementById('left-slider');
const ts = document.getElementById('top-slider');
const fs = document.getElementById('font-slider');
ws.oninput = () => { const v = ws.value; document.getElementById('width-val').textContent = v; config.panelWidth = parseInt(v); saveConfig(); panel.style.width = `${v}px`; applyTheme(); };
hs.oninput = () => { const v = hs.value; document.getElementById('height-val').textContent = v; config.panelHeight = parseInt(v); saveConfig(); panel.style.height = `${v}px`; applyTheme(); };
ls.oninput = () => { const v = ls.value; document.getElementById('left-val').textContent = v; config.panelLeft = parseInt(v); saveConfig(); panel.style.left = `${v}px`; };
ts.oninput = () => { const v = ts.value; document.getElementById('top-val').textContent = v; config.panelTop = parseInt(v); saveConfig(); panel.style.top = `${v}px`; };
fs.oninput = () => { const v = fs.value; document.getElementById('font-val').textContent = v; panel.style.fontSize = `${v}px`; };

// 角色卡
const charInput = document.getElementById('char-input');
const charGen = document.getElementById('char-gen');
const charResult = document.getElementById('char-result');
const charCopy = document.getElementById('char-copy');
const charImport = document.getElementById('char-import');
const charClear = document.getElementById('char-clear');
const charTplName = document.getElementById('char-template-name');
const charSaveTpl = document.getElementById('char-save-tpl');
const charImportFileBtn = document.getElementById('char-import-file-btn');
const charImportFile = document.getElementById('char-import-file');

charGen.onclick = async () => { if (!charInput.value.trim()) { toastr.warning('请输入设定'); return; } await generateCharacter(charInput.value.trim(), 'character', charGen, charResult); };
charCopy.onclick = () => copyToClipboard(charResult.value);
charImport.onclick = async () => { if (!charResult.value) return; charImport.disabled = true; charImport.textContent = '导入中...'; await importCharacterCard(charResult.value); charImport.disabled = false; charImport.textContent = '导入酒馆'; };
charClear.onclick = () => { charResult.value = ''; updateCharButtonsState(); };
charSaveTpl.onclick = () => { const n = charTplName.value.trim(); if (!n) { toastr.warning('请输入模板名称'); return; } if (!charResult.value) { toastr.warning('没有内容'); return; } config.savedTemplates.push({ name: n, content: charResult.value }); saveConfig(); refreshTemplateList(); toastr.success(`已保存: ${n}`); charTplName.value = ''; };
charResult.addEventListener('input', () => { saveDraft('char', charResult.value); updateCharButtonsState(); if (document.getElementById('tab-world-extend')?.classList.contains('active')) updateSourcePreview(); });
charImportFileBtn.onclick = () => charImportFile.click();
charImportFile.onchange = (e) => { if (e.target.files.length) importCharacterFromFile(e.target.files[0], charResult); charImportFile.value = ''; };
charResult.value = loadDraft('char');
updateCharButtonsState();

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
const userImportFileBtn = document.getElementById('user-import-file-btn');
const userImportFile = document.getElementById('user-import-file');

userGen.onclick = async () => { if (!userInput.value.trim()) { toastr.warning('请输入设定'); return; } await generateCharacter(userInput.value.trim(), 'user', userGen, userResult); };
userCopy.onclick = () => copyToClipboard(userResult.value);
userImport.onclick = async () => { if (!userResult.value) return; userImport.disabled = true; userImport.textContent = '导入中...'; await importUserPersona(userResult.value); userImport.disabled = false; userImport.textContent = '导入酒馆'; };
userClear.onclick = () => { userResult.value = ''; updateUserButtonsState(); };
userSaveTpl.onclick = () => { const n = userTplName.value.trim(); if (!n) { toastr.warning('请输入模板名称'); return; } if (!userResult.value) { toastr.warning('没有内容'); return; } config.savedTemplates.push({ name: n, content: userResult.value }); saveConfig(); refreshTemplateList(); toastr.success(`已保存: ${n}`); userTplName.value = ''; };
userResult.addEventListener('input', () => { saveDraft('user', userResult.value); updateUserButtonsState(); });
userImportFileBtn.onclick = () => userImportFile.click();
userImportFile.onchange = (e) => { if (e.target.files.length) importCharacterFromFile(e.target.files[0], userResult); userImportFile.value = ''; };
userResult.value = loadDraft('user');
updateUserButtonsState();

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
worldClear.onclick = () => { worldResult.value = ''; updateWorldButtonsState(); };
worldSaveTpl.onclick = () => { const n = worldTplName.value.trim(); if (!n) { toastr.warning('请输入模板名称'); return; } if (!worldResult.value) { toastr.warning('没有内容'); return; } config.savedTemplates.push({ name: n, content: worldResult.value }); saveConfig(); refreshTemplateList(); toastr.success(`已保存: ${n}`); worldTplName.value = ''; };
worldResult.addEventListener('input', () => { saveDraft('world', worldResult.value); updateWorldButtonsState(); if (document.getElementById('tab-world-extend')?.classList.contains('active')) updateSourcePreview(); });
worldResult.value = loadDraft('world');
updateWorldButtonsState();

// 世界书扩展
const worldExtendResult = document.getElementById('world-extend-result');
const worldExtendCopy = document.getElementById('world-extend-copy');
const worldExtendClear = document.getElementById('world-extend-clear');
const worldExtendGen = document.getElementById('world-extend-generate');
const worldExtendExport = document.getElementById('world-extend-export-worldbook');

worldExtendGen.onclick = async () => { await generateWorldExtend(worldExtendGen); };
worldExtendCopy.onclick = () => copyToClipboard(worldExtendResult.value);
worldExtendClear.onclick = () => { worldExtendResult.value = ''; updateWorldExtendButtonsState(); };
worldExtendExport.onclick = () => exportToWorldbook();
worldExtendResult.addEventListener('input', () => { saveDraft('world-extend', worldExtendResult.value); updateWorldExtendButtonsState(); });
worldExtendResult.value = loadDraft('world-extend');
updateWorldExtendButtonsState();

const sourceRadios = document.querySelectorAll('input[name="extend-source"]');
sourceRadios.forEach(radio => {
radio.onchange = () => updateSourcePreview();
});

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
relationClear.onclick = () => { relationResult.value = ''; updateRelationButtonsState(); };
relationSaveTpl.onclick = () => { const n = relationTplName.value.trim(); if (!n) { toastr.warning('请输入模板名称'); return; } if (!relationResult.value) { toastr.warning('没有内容'); return; } config.savedTemplates.push({ name: n, content: relationResult.value }); saveConfig(); refreshTemplateList(); toastr.success(`已保存: ${n}`); relationTplName.value = ''; };
relationResult.addEventListener('input', () => { saveDraft('relation', relationResult.value); updateRelationButtonsState(); });
relationResult.value = loadDraft('relation');
updateRelationButtonsState();

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
const wardrobeCompare = document.getElementById('wardrobe-compare');

wardrobeGen.onclick = async () => { if (!wardrobeInput.value.trim()) { toastr.warning('请输入服装描述'); return; } await generateWardrobeMulti(wardrobeInput.value.trim(), wardrobeGen, wardrobeResult, wardrobeCompare); };
wardrobeCopy.onclick = () => copyToClipboard(wardrobeResult.value);
wardrobeClear.onclick = () => { wardrobeResult.value = ''; updateWardrobeButtonsState(); wardrobeCompare.innerHTML = ''; };
wardrobeSaveTpl.onclick = () => { const n = wardrobeTplName.value.trim(); if (!n) { toastr.warning('请输入模板名称'); return; } if (!wardrobeResult.value) { toastr.warning('没有内容'); return; } config.savedTemplates.push({ name: n, content: wardrobeResult.value }); saveConfig(); refreshTemplateList(); toastr.success(`已保存: ${n}`); wardrobeTplName.value = ''; };
wardrobeResult.addEventListener('input', () => { saveDraft('wardrobe', wardrobeResult.value); updateWardrobeButtonsState(); });
wardrobeResult.value = loadDraft('wardrobe');
updateWardrobeButtonsState();

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
updateSourcePreview();
}

function addMenuItem() {
const check = setInterval(() => {
const menu = document.querySelector('#options .options-content');
if (menu) {
clearInterval(check);
if (document.querySelector('.ai-menu-item')) return;
const item = document.createElement('div');
item.className = 'ai-menu-item';
item.innerHTML = '<i class="fa-regular fa-robot"></i> 👾 AI人设生成器';
item.onclick = () => document.getElementById(PANEL_ID).style.display = 'flex';
menu.appendChild(item);
}
}, 500);
}

const style = document.createElement('style');
style.textContent = `
@keyframes spin {
from { transform: rotate(0deg); }
to { transform: rotate(360deg); }
}
.btn-spinner {
display: inline-block;
width: 14px;
height: 14px;
border: 2px solid rgba(255,255,255,0.3);
border-radius: 50%;
border-top-color: #fff;
animation: spin 0.8s linear infinite;
margin-right: 6px;
vertical-align: middle;
}
.ai-panel {
position: fixed; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.2);
z-index: 100000; display: none; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #e0e0e0; font-weight: 500; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.quick-theme-btn { background: #e0e0e0; border: none; border-radius: 16px; padding: 4px 12px; font-size: 12px; cursor: pointer; }
.quick-theme-btn:hover { background: #d0d0d0; }
.panel-close { cursor: pointer; font-size: 18px; opacity: 0.6; }
.panel-close:hover { opacity: 1; }
.tab-bar { display: flex; flex-wrap: wrap; gap: 2px; padding: 8px 12px 0 12px; border-bottom: 1px solid #e0e0e0; }
.tab-btn { padding: 6px 12px; background: none; border: none; cursor: pointer; font-size: 12px; color: #666; border-radius: 8px 8px 0 0; }
.tab-btn.active { font-weight: 500; border: 1px solid #e0e0e0; border-bottom-color: #fff; margin-bottom: -1px; }
.tab-content { flex: 1; padding: 16px; overflow-y: auto; display: none; }
.tab-content.active { display: block; }
.field { margin-bottom: 14px; }
.field label { display: block; margin-bottom: 5px; font-size: 12px;line-height: 1.5; background: #fafafa; }
button { padding: 6px 12px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
button:hover { filter: brightness(0.95); }
.primary-btn { background: #4A6FA5; color: white; width: 100%; margin-bottom: 14px; }
.primary-btn:hover { background: #3a5a8a; }
.primary-btn.loading { opacity: 0.7; cursor: wait; }
.button-group { display: flex; gap: 8px; margin: 10px 0; flex-wrap: wrap; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.flex-row { display: flex; gap: 8px; }
.flex-row input { flex: 1; }
.radio-group { display: flex; gap: 20px; }
.radio-group label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: normal; }
.checkbox-group { display: flex; gap: 16px; flex-wrap: wrap; }
.extend-checkboxes { display: flex; gap: 12px; flex-wrap: wrap; margin: 8px 0; }
.extend-checkboxes label { display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 13px; }
.list-container { max-height: 150px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; margin-bottom: 10px; }
.char-item, .history-item, .template-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-bottom: 1px solid #eee; cursor: pointer; }
.char-item:hover, .history-item:hover { background: #f5f5f5; }
.history-type { font-weight: 500; font-size: 12px; }
.history-time { font-size: 10px; color: #999; }
.history-preview { font-size: 11px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 4px; }
.template-actions { display: flex; gap: 8px; }
.empty-state { text-align: center; padding: 20px; color: #999; font-size: 13px; }
.graph-detail-container { margin-top: 12px; max-height: 100px; overflow-y: auto; }
.graph-detail-item { padding: 8px 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 6px; }
.graph-detail-relation { font-size: 12px; margin-top: 4px; color: #666; }
.worldbook-select { width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd; }
.ai-menu-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; border-radius: 6px; transition: background 0.2s; }
.ai-menu-item:hover { background: rgba(0,0,0,0.05); }

.light-mode { background: #ffffff; color: #1a1a1a; border: 1px solid #e0e0e0; }
.light-mode .panel-header { background: #f8f8f8; border-bottom-color: #e0e0e0; }
.light-mode .tab-bar { background: #fafafa; border-bottom-color: #e0e0e0; }
.light-mode .tab-btn.active { background: #fff; border-color: #e0e0e0; border-bottom-color: #fff; color: #1a1a1a; }
.light-mode .field input, .light-mode .field textarea, .light-mode .field select { background: #fff; border-color: #ddd; color: #1a1a1a; }
.light-mode .result-text { background: #fafafa; }

.dark-mode { background: #1e1e1e; color: #e0e0e0; border: 1px solid #333; }
.dark-mode .panel-header { background: #2d2d2d; border-bottom-color: #333; }
.dark-mode .tab-bar { background: #252525; border-bottom-color: #333; }
.dark-mode .tab-btn { color: #aaa; }
.dark-mode .tab-btn.active { background: #1e1e1e; border-color: #444; border-bottom-color: #1e1e1e; color: #e0e0e0; }
.dark-mode .field input, .dark-mode .field textarea, .dark-mode .field select { background: #2d2d2d; border-color: #444; color: #e0e0e0; }
.dark-mode .result-text { background: #252525; color: #e0e0e0; }
.dark-mode .char-item, .dark-mode .history-item, .dark-mode .template-item { border-bottom-color: #333; }
.dark-mode .char-item:hover, .dark-mode .history-item:hover { background: #2a2a2a; }
.dark-mode .graph-detail-item { background: #2a2a2a; }
.dark-mode .quick-theme-btn { background: #3a3a3a; color: #e0e0e0; }
.dark-mode .quick-theme-btn:hover { background: #4a4a4a; }
`;
document.head.appendChild(style);

addMenuItem();
createPanel();
}
})();
