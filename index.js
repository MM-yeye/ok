// AI Character Generator - 完整模板版
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
            cardType: 'character',
            themeMode: 'auto',
            panelWidth: 350,
            panelHeight: 550,
            availableModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
        };

        // 读取存储
        try {
            const saved = localStorage.getItem('ai_char_gen_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                config = { ...config, ...parsed };
                if (!config.model) config.model = 'gpt-3.5-turbo';
                if (!config.availableModels || config.availableModels.length === 0) {
                    config.availableModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
                }
            }
        } catch (err) {}

        function saveConfig() {
            localStorage.setItem('ai_char_gen_config', JSON.stringify(config));
        }

        // ========== 完整模板 ==========
        const FULL_TEMPLATE = `char_name:
  Chinese name: 
  Nickname: 
  age: 
  gender: 
  height: 
  identity:
    - 
  background_story:
    童年(0-12岁):
    少年(13-18岁):
    青年(19-35岁):
    中年(35-至今):
    现状:
  
  social_status: 
    - 

  appearance:
    hair: 
    eyes: 
    skin:
    face_style: 
    build: 
      - 
  attire:
    business_formal:
    business_casual:
    casual_wear:
    home_wear:

  archetype: 

  personality:
    core_traits: 
      - : ""
    romantic_traits: 
      - : ""
       

  lifestyle_behaviors:
    - 
    - 
  
  work_behaviors:
    - 
  
  emotional_behaviors:
    angry:
    happy: 

  goals:
    - 
  
  weakness:
    - 

  likes:
    - 

  dislikes:
    - 
  
  skills:
    - 工作: ["",""]
    - 生活: ["",""]
    - 爱好: ["",""]

  NSFW_information:
    Sex_related traits:
      experiences: 
      sexual_orientation: 
      sexual_role: 
      sexual_habits: 
        - 
    Kinks: 
    Limits:`;

        const USER_TEMPLATE = `user_name: 
nickname: 
age: 
gender: 
height: 
identity: 
background: 
appearance: 
personality: 
likes: 
dislikes:`;

        // 获取完整的 API 地址
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

        // 获取模型列表
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

        // 测试连接
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

        // 生成人设 - 强制使用完整模板
        async function generateCharacter(userInput, cardType, buttonElement) {
            if (!config.apiKey) {
                toastr.error('请先设置 API Key');
                return null;
            }
            
            const fullUrl = getFullApiUrl();
            const modelToUse = config.model || 'gpt-3.5-turbo';

            // 根据类型选择模板
            const template = cardType === 'character' ? FULL_TEMPLATE : USER_TEMPLATE;
            const typeName = cardType === 'character' ? '角色卡' : '用户人设';

            // 强制的系统提示词
            const systemPrompt = `你是一个专业的${typeName}生成助手。

【重要】你必须严格按照下面的模板格式输出，不要添加任何额外解释、不要添加```yaml标记、不要输出模板以外的内容。
模板如下，请填充所有字段，即使没有提供的信息也要根据上下文合理推断：

${template}

规则：
1. 用户输入可能很少，比如只说"她是个女人"，你需要根据这个线索合理推断所有字段
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
                
                // 清理可能的多余标记
                content = content.replace(/```yaml\n?/g, '').replace(/```\n?/g, '').trim();
                
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

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                toastr.success('已复制到剪贴板');
            }).catch(() => {
                toastr.error('复制失败');
            });
        }

        // 创建面板（代码太长，省略，和之前一样）
        // ...（保持之前的 createPanel 和 addMenuItem 不变）
        // 由于代码太长，我把完整版发在下面

        createPanel();
        addMenuItem();
    }
})();
