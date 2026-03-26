// AI Character Generator - 一键生成人设
(function() {
    setTimeout(() => {
        try {
            initPlugin();
        } catch (e) {
            console.warn("AI人设生成器启动失败:", e);
        }
    }, 500);

    function initPlugin() {
        const MENU_ID = 'ai-char-generator';
        
        // 配置
        let config = {
            apiKey: '',
            apiUrl: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-3.5-turbo',
            cardType: 'character'  // 'character' 或 'user'
        };

        // 读取存储
        try {
            const saved = localStorage.getItem('ai_char_gen_config');
            if (saved) config = { ...config, ...JSON.parse(saved) };
        } catch (err) {}

        function saveConfig() {
            localStorage.setItem('ai_char_gen_config', JSON.stringify(config));
        }

        // 模板
        const TEMPLATE = `char_name:
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

        // 生成系统提示词
        function getSystemPrompt(cardType) {
            if (cardType === 'character') {
                return `你是一个专业的角色设定助手。根据用户输入的简单描述，生成一个完整的SillyTavern角色卡。
请严格按照以下YAML模板格式输出，不要添加任何额外解释，只输出YAML内容。
模板：
${TEMPLATE}

要求：
1. 所有字段都要填充，不能留空
2. 生成的内容要符合角色设定
3. 保持YAML格式正确
4. 中文内容使用中文，英文内容使用英文`;
            } else {
                return `你是一个专业的用户设定助手。根据用户输入的简单描述，生成一个完整的用户人设。
请严格按照以下YAML模板格式输出，不要添加任何额外解释，只输出YAML内容。
模板：
${TEMPLATE.replace('char_name', 'user_name')}

要求：
1. 所有字段都要填充，不能留空
2. 生成的内容要符合用户设定
3. 保持YAML格式正确`;
            }
        }

        // 调用 OpenAI API
        async function generateCharacter(userInput, cardType) {
            if (!config.apiKey) {
                toastr.error('请先设置 OpenAI API Key');
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
            const content = data.choices[0].message.content;
            
            // 提取 YAML 内容
            let yamlContent = content;
            const yamlMatch = content.match(/```(?:yaml)?\n([\s\S]*?)\n```/);
            if (yamlMatch) {
                yamlContent = yamlMatch[1];
            }
            
            return yamlContent;
        }

        // 导入角色卡
        async function importCharacter(yamlContent) {
            // 这里需要将 YAML 转换为 SillyTavern 角色卡 JSON
            // 简化版：直接弹出文本让用户复制
            const textarea = document.createElement('textarea');
            textarea.value = yamlContent;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            toastr.success('已复制到剪贴板，请手动创建角色卡并粘贴内容');
            
            // 高级版：可以自动创建角色卡
            // 需要调用酒馆的API
        }

        // 菜单注入
        function injectMenu() {
            const container = jQuery('#extensions_settings');
            if (!container.length || jQuery(`#${MENU_ID}`).length) return;

            const html = `
                <div id="${MENU_ID}" class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>🤖 AI人设生成器</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
                    </div>
                    <div class="inline-drawer-content ambient-settings-box" style="padding: 10px;">
                        <div class="ambient-control-row">
                            <label>OpenAI API Key</label>
                            <input type="password" id="ai-api-key" placeholder="sk-..." value="${config.apiKey}" style="flex: 2;">
                        </div>
                        
                        <div class="ambient-control-row">
                            <label>模型</label>
                            <select id="ai-model">
                                <option value="gpt-3.5-turbo" ${config.model === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo</option>
                                <option value="gpt-4" ${config.model === 'gpt-4' ? 'selected' : ''}>GPT-4</option>
                                <option value="gpt-4-turbo" ${config.model === 'gpt-4-turbo' ? 'selected' : ''}>GPT-4 Turbo</option>
                            </select>
                        </div>
                        
                        <div class="ambient-control-row">
                            <label>生成类型</label>
                            <div style="display: flex; gap: 10px;">
                                <label><input type="radio" name="card-type" value="character" ${config.cardType === 'character' ? 'checked' : ''}> 角色卡</label>
                                <label><input type="radio" name="card-type" value="user" ${config.cardType === 'user' ? 'checked' : ''}> 用户人设</label>
                            </div>
                        </div>
                        
                        <div style="margin: 10px 0;">
                            <label>简单设定（随便写几个字）</label>
                            <textarea id="ai-user-input" rows="3" style="width: 100%; margin-top: 5px;" placeholder="例如：温喻言，黑市大佬，冷傲，掌控欲强，28岁，银发红瞳"></textarea>
                        </div>
                        
                        <div style="display: flex; gap: 10px;">
                            <button id="ai-generate-btn" class="menu_button">✨ 生成人设</button>
                            <button id="ai-import-btn" class="menu_button" disabled>📥 导入酒馆</button>
                        </div>
                        
                        <div style="margin-top: 10px;">
                            <label>生成结果</label>
                            <textarea id="ai-result" rows="10" style="width: 100%; margin-top: 5px; font-family: monospace; font-size: 12px;" readonly placeholder="生成结果会显示在这里..."></textarea>
                        </div>
                    </div>
                </div>
            `;
            container.append(html);

            let generatedContent = '';

            // 绑定事件
            jQuery('#ai-api-key').on('change', function() {
                config.apiKey = jQuery(this).val();
                saveConfig();
            });
            
            jQuery('#ai-model').on('change', function() {
                config.model = jQuery(this).val();
                saveConfig();
            });
            
            jQuery('input[name="card-type"]').on('change', function() {
                config.cardType = jQuery(this).val();
                saveConfig();
            });
            
            jQuery('#ai-generate-btn').on('click', async function() {
                const userInput = jQuery('#ai-user-input').val().trim();
                if (!userInput) {
                    toastr.warning('请输入角色设定');
                    return;
                }
                if (!config.apiKey) {
                    toastr.warning('请先设置 API Key');
                    return;
                }
                
                jQuery('#ai-generate-btn').text('⏳ 生成中...').prop('disabled', true);
                
                try {
                    const result = await generateCharacter(userInput, config.cardType);
                    if (result) {
                        generatedContent = result;
                        jQuery('#ai-result').val(result);
                        jQuery('#ai-import-btn').prop('disabled', false);
                        toastr.success('生成成功！');
                    }
                } catch (err) {
                    toastr.error('生成失败: ' + err.message);
                } finally {
                    jQuery('#ai-generate-btn').text('✨ 生成人设').prop('disabled', false);
                }
            });
            
            jQuery('#ai-import-btn').on('click', async function() {
                if (generatedContent) {
                    await importCharacter(generatedContent);
                }
            });
        }

        // 注入菜单
        const interval = setInterval(() => {
            if (jQuery('#extensions_settings').length) {
                injectMenu();
                clearInterval(interval);
            }
        }, 1000);
    }
})();
