// FluxSQL - AI 功能模块
// 数据模型
// ══════════════════════════════════════════
let tables = [];
let activeIdx = -1;
let previewMode = 'current';
let fileName = '';
let aiHistories = {};
let aiPanelOpen = true;

// 新建库模式状态
let isNewDbMode = false;       // 是否处于新建库模式
let newDbMode = '';            // 'ai' | 'manual'
let newDbTables = [];          // 新建库模式下暂存的表
let dbManualCount = 0;         // 手动建表计数器

// ══════════════════════════════════════════
// AI 配置
// ══════════════════════════════════════════
const PROVIDER_DEFAULTS = {
  openai:   { base: 'https://api.openai.com/v1',                 model: 'gpt-4o-mini' },
  deepseek: { base: 'https://api.deepseek.com/v1',               model: 'deepseek-chat' },
  zhipu:    { base: 'https://open.bigmodel.cn/api/paas/v4',      model: 'glm-4-flash' },
  qwen:     { base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  custom:   { base: '',                                           model: '' },
};

function loadApiConfig() { return JSON.parse(localStorage.getItem('sql_ai_config') || 'null'); }
function saveApiConfigToStorage(cfg) { localStorage.setItem('sql_ai_config', JSON.stringify(cfg)); }

function openApiModal() {
  const cfg = loadApiConfig();
  if (cfg) {
    document.getElementById('apiProvider').value = cfg.provider || 'openai';
    document.getElementById('apiKey').value = cfg.key || '';
    document.getElementById('apiBase').value = cfg.base || '';
    document.getElementById('apiModel').value = cfg.model || '';
  }
  onProviderChange();
  document.getElementById('apiModal').classList.remove('hidden');
}
function closeApiModal() { document.getElementById('apiModal').classList.add('hidden'); }
function onProviderChange() {
  const p = document.getElementById('apiProvider').value;
  const def = PROVIDER_DEFAULTS[p];
  const baseEl = document.getElementById('apiBase');
  const modelEl = document.getElementById('apiModel');
  if (!baseEl.value || Object.values(PROVIDER_DEFAULTS).some(d => d.base === baseEl.value)) baseEl.value = def.base;
  if (!modelEl.value || Object.values(PROVIDER_DEFAULTS).some(d => d.model === modelEl.value)) modelEl.value = def.model;
  baseEl.readOnly = (p !== 'custom');
  baseEl.style.opacity = p !== 'custom' ? '.5' : '1';
}
function saveApiConfig() {
  const cfg = {
    provider: document.getElementById('apiProvider').value,
    key: document.getElementById('apiKey').value.trim(),
    base: document.getElementById('apiBase').value.trim(),
    model: document.getElementById('apiModel').value.trim(),
  };
  if (!cfg.key) { showToast('请填写 API Key'); return; }
  saveApiConfigToStorage(cfg);
  closeApiModal();
  showToast('AI 配置已保存 ✓');
  if (activeIdx >= 0) renderEditor();
}
async function testApi() {
  const key = document.getElementById('apiKey').value.trim();
  const base = document.getElementById('apiBase').value.trim();
  const model = document.getElementById('apiModel').value.trim();
  if (!key) { showToast('请先填写 API Key'); return; }
  showToast('测试中...');
  try {
    const res = await callLLM([{ role: 'user', content: '回复"ok"' }], key, base, model);
    showToast('连接成功 ✓ 回复：' + res.slice(0, 30));
  } catch(e) { showToast('连接失败：' + e.message.slice(0, 40)); }
}

async function callLLM(messages, key, base, model, options = {}) {
  const { timeout = 60000, maxTokens = 4096 } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const url = base.replace(/\/$/, '') + '/chat/completions';
  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: maxTokens }),
      signal: controller.signal
    });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error('请求超时（60秒），请检查网络或重试');
    throw new Error('网络连接失败：' + (e.message || '请检查网络和 API 地址'));
  }
  clearTimeout(timer);
  if (!resp.ok) {
    let detail = '';
    try {
      const err = await resp.json();
      detail = (err.error && err.error.message) || '';
    } catch(_) {}
    if (resp.status === 401) throw new Error('API Key 无效或已过期（401），请检查 AI 设置');
    if (resp.status === 429) throw new Error('请求频率超限（429），请稍后重试');
    if (resp.status === 403) throw new Error('无权限访问该模型（403），请检查 API Key 权限');
    if (resp.status === 404) throw new Error('接口地址或模型名称错误（404），请检查 AI 设置');
    if (detail) throw new Error(detail.slice(0, 80));
    throw new Error(`服务返回 HTTP ${resp.status}`);
  }
  const data = await resp.json();
  if (!data.choices || !data.choices[0]) throw new Error('AI 返回了空结果，请重试');
  return data.choices[0].message.content;
}

// ══════════════════════════════════════════
// AI 处理表修改（方言感知）
// ══════════════════════════════════════════
// AI 模式状态（per-table）
// ══════════════════════════════════════════
let aiModes = {};        // { idx: 'plan' | 'act' }
let pendingPlan = {};    // { idx: { userMsg, planItems } }

function getAiMode(idx) { return aiModes[idx] || 'plan'; }
function setAiMode(idx, mode) {
  aiModes[idx] = mode;
  const inputEl = document.getElementById(`ai-input-${idx}`);
  if (inputEl) {
    inputEl.placeholder = mode === 'plan'
      ? '描述修改需求，Plan 模式先看计划再决定是否执行'
      : '描述修改需求，Act 模式将直接执行修改';
  }
}

// ══════════════════════════════════════════
// AI Plan/Act 核心
// ══════════════════════════════════════════
function getSystemPrompt() { return getDialect().aiSystemPrompt; }

function getPlanSystemPrompt() {
  const base = getSystemPrompt();
  return base + `

【重要】当前为 Plan（计划）模式，请按以下要求操作：

1. 不要返回修改后的完整表结构 JSON
2. 而是分析用户需求，列出你打算做的所有改动，每条一行，使用以下前缀标识类型：
   - [+ADD] 新增字段：xxx 类型 说明
   - [-DEL] 删除字段：xxx 原因
   - [*MOD] 修改字段：xxx 原值 → 新值
   - [INFO] 其他说明（不改结构，如命名规范化建议等）
3. 每条计划尽量简洁，一行一条，不要有多余解释
4. 如果用户需求不明确，列出你的理解并建议
5. 只输出计划列表，不要输出 JSON`;
}

async function handleAiSend(idx) {
  const cfg = loadApiConfig();
  if (!cfg || !cfg.key) {
    addAiMsg(idx, 'error', '未配置 API Key，请点击顶部「AI 设置」按钮配置。');
    return;
  }
  const inputEl = document.getElementById(`ai-input-${idx}`);
  const sendBtn = document.getElementById(`ai-send-${idx}`);
  const userMsg = inputEl.value.trim();
  if (!userMsg) return;
  inputEl.value = ''; inputEl.style.height = 'auto';
  addAiMsg(idx, 'user', userMsg);
  addAiMsg(idx, 'thinking', '思考中...');
  sendBtn.disabled = true; sendBtn.classList.add('loading');
  scrollAiHistory(idx);

  const t = tables[idx];
  const snapshot = JSON.stringify({
    name: t.name, comment: t.comment,
    fields: t.fields.map(f => ({ id: f.id, name: f.name, type: f.type, nullable: f.nullable, pk: f.pk, defaultVal: f.defaultVal, comment: f.comment }))
  }, null, 2);

  const hist = (aiHistories[idx] || []).filter(m => m.role === 'user' || m.role === 'assistant').slice(-10);
  const mode = getAiMode(idx);

  const systemPrompt = mode === 'plan' ? getPlanSystemPrompt() : getSystemPrompt();
  const finalMessages = [
    { role: 'system', content: systemPrompt },
    ...hist,
    { role: 'user', content: `当前表结构：\n${snapshot}\n\n修改要求：${userMsg}` }
  ];

  try {
    const raw = await callLLM(finalMessages, cfg.key, cfg.base, cfg.model);

    if (mode === 'plan') {
      // ── Plan 模式：解析计划，显示卡片 ──
      removeThinking(idx);
      const planItems = parsePlanItems(raw);
      pendingPlan[idx] = { userMsg, planItems, planRaw: raw };
      addPlanCard(idx, userMsg, planItems);
      if (!aiHistories[idx]) aiHistories[idx] = [];
      aiHistories[idx].push({ role: 'user', content: userMsg });
    } else {
      // ── Act 模式：直接执行 ──
      let jsonStr = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
      let newTable;
      try { newTable = JSON.parse(jsonStr); } catch(e) {
        const m = jsonStr.match(/\{[\s\S]*\}/);
        if (m) { try { newTable = JSON.parse(tryFixJson(m[0])); } catch(e2) { newTable = JSON.parse(m[0]); } }
        else throw new Error('返回内容无法解析为 JSON');
      }
      if (!newTable.name || !Array.isArray(newTable.fields)) throw new Error('返回结构不合法');
      newTable.fields = newTable.fields.map(f => ({ ...f, id: f.id || uid() }));

      // 执行前快照
      const preSnapId = saveAutoSnapshot('AI 改前');

      const oldFields = [...t.fields];
      const oldName = t.name;
      tables[idx].name = newTable.name;
      tables[idx].comment = newTable.comment || tables[idx].comment;
      // 字段保护：自动补回 AI 遗漏的原始字段
      const { fields: protectedFields, restored } = protectFields(oldFields, [...newTable.fields], userMsg);
      tables[idx].fields = protectedFields;
      newTable.fields = protectedFields;
      removeThinking(idx);

      // 执行后快照
      const postSnapId = saveAutoSnapshot('AI 改后');

      let summary = buildChangeSummary(oldFields, newTable.fields, oldName, newTable.name);
      if (restored.length) {
        summary += `\n\n⚠️ 自动补回了 ${restored.length} 个被遗漏的字段：**${restored.join('、')}**`;
        showToast(`⚠️ AI 遗漏了 ${restored.length} 个字段，已自动补回`);
      }
      addAiMsg(idx, 'assistant', summary);
      logAction('ai-modify', `AI 修改了表 <span class="highlight">${escHtml(newTable.name)}</span>：${escHtml(summary.replace(/\*\*/g,''))}`);
      if (!aiHistories[idx]) aiHistories[idx] = [];
      aiHistories[idx].push({ role: 'user', content: userMsg });
      aiHistories[idx].push({ role: 'assistant', content: summary });
      renderEditor(); updatePreview();
      showToast(`AI 已修改表结构 ✓（快照 #${preSnapId} → #${postSnapId}）`);
    }
  } catch(e) {
    removeThinking(idx);
    const errType = classifyError(e.message);
    const hint = errType === 'timeout'
      ? '建议：简化需求描述或分段修改'
      : errType === 'auth'
      ? '请点击顶部「AI 设置」检查 API Key'
      : errType === 'network'
      ? '请检查网络连接和 API 地址'
      : '';
    addAiError(idx, `出错：${e.message}${hint ? '\n' + hint : ''}`, () => handleAiSendRetry(idx, userMsg));
  } finally {
    sendBtn.disabled = false; sendBtn.classList.remove('loading');
  }
}

// 解析 AI 返回的计划文本为结构化列表
function parsePlanItems(raw) {
  const lines = raw.trim().split('\n').filter(l => l.trim());
  const items = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/\[?\+?ADD\]?/i)) {
      const text = trimmed.replace(/\[?\+?ADD\]?\s*/i, '').trim();
      items.push({ type: 'add', text });
    } else if (trimmed.match(/\[-?DEL(ETE)?\]?/i)) {
      const text = trimmed.replace(/\[-?DEL(ETE)?\]?\s*/i, '').trim();
      items.push({ type: 'del', text });
    } else if (trimmed.match(/\[\*?MOD(IF[YI]ED?)?\]?/i)) {
      const text = trimmed.replace(/\[\*?MOD(IF[YI]ED?)?\]?\s*/i, '').trim();
      items.push({ type: 'mod', text });
    } else if (trimmed.match(/\[INFO\]?/i)) {
      const text = trimmed.replace(/\[INFO\]?\s*/i, '').trim();
      items.push({ type: 'info', text });
    } else {
      // 无前缀的行作为 info
      items.push({ type: 'info', text: trimmed });
    }
  }
  return items;
}

// 渲染 Plan 卡片到 AI 对话历史
function addPlanCard(idx, userMsg, items) {
  const container = document.getElementById(`ai-history-${idx}`);
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'ai-msg assistant';
  div.dataset.msgType = 'plan';
  const iconMap = { add: '+', del: '−', mod: '~', info: 'i' };
  const labelMap = { add: '新增', del: '删除', mod: '修改', info: '说明' };
  div.innerHTML = `
    <span class="role">AI</span>
    <div class="content" style="flex:1">
      <div class="ai-plan-card">
        <div class="ai-plan-title">📋 执行计划（${items.length} 项）</div>
        <ul class="ai-plan-list">
          ${items.map(item => `
            <li>
              <span class="plan-icon ${item.type}">${iconMap[item.type]}</span>
              <span><strong>[${labelMap[item.type]}]</strong> ${escHtml(item.text)}</span>
            </li>
          `).join('')}
        </ul>
        <div class="ai-plan-actions">
          <button class="ai-plan-btn cancel" onclick="cancelPlan(${idx})">取消</button>
          <button class="ai-plan-btn execute" onclick="executePlan(${idx})">⚡ 执行</button>
        </div>
      </div>
    </div>
  `;
  container.appendChild(div);
  scrollAiHistory(idx);
}

// 取消 Plan
function cancelPlan(idx) {
  delete pendingPlan[idx];
  addAiMsg(idx, 'assistant', '已取消计划。');
}

// 确认执行 Plan → 自动切换到 Act 模式并发送
async function executePlan(idx) {
  const plan = pendingPlan[idx];
  if (!plan) return;

  // 禁用执行按钮防止重复点击
  const card = document.querySelector(`#ai-history-${idx} [data-msg-type="plan"] .ai-plan-btn.execute`);
  if (card) { card.disabled = true; card.textContent = '执行中...'; }

  const cfg = loadApiConfig();
  if (!cfg || !cfg.key) {
    addAiMsg(idx, 'error', '未配置 API Key');
    return;
  }

  const t = tables[idx];
  const snapshot = JSON.stringify({
    name: t.name, comment: t.comment,
    fields: t.fields.map(f => ({ id: f.id, name: f.name, type: f.type, nullable: f.nullable, pk: f.pk, defaultVal: f.defaultVal, comment: f.comment }))
  }, null, 2);

  const hist = (aiHistories[idx] || []).filter(m => m.role === 'user' || m.role === 'assistant').slice(-10);
  const finalMessages = [
    { role: 'system', content: getSystemPrompt() },
    ...hist,
    { role: 'user', content: `当前表结构：\n${snapshot}\n\n修改要求：${plan.userMsg}\n\n已确认的执行计划：\n${plan.planItems.map(i => `[${i.type.toUpperCase()}] ${i.text}`).join('\n')}\n\n请按照以上计划，返回修改后的完整表结构 JSON。` }
  ];

  try {
    const raw = await callLLM(finalMessages, cfg.key, cfg.base, cfg.model);
    let jsonStr = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    let newTable;
    try { newTable = JSON.parse(jsonStr); } catch(e) {
      const m = jsonStr.match(/\{[\s\S]*\}/);
      if (m) { try { newTable = JSON.parse(tryFixJson(m[0])); } catch(e2) { newTable = JSON.parse(m[0]); } }
      else throw new Error('返回内容无法解析为 JSON');
    }
    if (!newTable.name || !Array.isArray(newTable.fields)) throw new Error('返回结构不合法');
    newTable.fields = newTable.fields.map(f => ({ ...f, id: f.id || uid() }));

    // 执行前快照
    const preSnapId = saveAutoSnapshot('AI 改前');

    const oldFields = [...t.fields];
    const oldName = t.name;
    tables[idx].name = newTable.name;
    tables[idx].comment = newTable.comment || tables[idx].comment;
    // Plan 模式：根据计划中的删除列表判断，只补回不在删除列表中的遗漏字段
    const delFieldNames = (plan.planItems || []).filter(i => i.type === 'del').map(i => i.text);
    const { fields: protectedFields, restored } = protectFields(oldFields, [...newTable.fields], delFieldNames.length ? '删除 ' + delFieldNames.join(', ') : '');
    tables[idx].fields = protectedFields;
    newTable.fields = protectedFields;

    // 执行后快照
    const postSnapId = saveAutoSnapshot('AI 改后');

    let summary = buildChangeSummary(oldFields, newTable.fields, oldName, newTable.name);
    if (restored.length) {
      summary += `\n\n⚠️ 自动补回了 ${restored.length} 个被遗漏的字段：**${restored.join('、')}**`;
      showToast(`⚠️ AI 遗漏了 ${restored.length} 个字段，已自动补回`);
    }
    addAiMsg(idx, 'assistant', summary);
    // 标记 plan 卡片为已执行
    const planCard = document.querySelector(`#ai-history-${idx} [data-msg-type="plan"]`);
    if (planCard) {
      const actions = planCard.querySelector('.ai-plan-actions');
      if (actions) actions.innerHTML = '<span style="font-size:11px;color:var(--green);font-weight:600">✓ 已执行（快照 #' + preSnapId + ' → #' + postSnapId + '）</span>';
    }
    logAction('ai-modify', `AI 修改了表 <span class="highlight">${escHtml(newTable.name)}</span>：${escHtml(summary.replace(/\*\*/g,''))}`);
    if (!aiHistories[idx]) aiHistories[idx] = [];
    aiHistories[idx].push({ role: 'assistant', content: summary });
    renderEditor(); updatePreview();
    delete pendingPlan[idx];
    showToast(`AI 已修改表结构 ✓（快照 #${preSnapId} → #${postSnapId}）`);
  } catch(e) {
    addAiError(idx, '执行出错：' + e.message, () => executePlan(idx));
    // 恢复按钮
    if (card) { card.disabled = false; card.textContent = '⚡ 执行'; }
  }
}

// 保存自动快照（AI 执行时），返回快照 ID
function saveAutoSnapshot(label) {
  snapshotCounter++;
  const snap = {
    id: snapshotCounter,
    label: `${label} #${snapshotCounter}`,
    time: now(),
    data: cloneTables(),
    tableCount: tables.length,
    logIndex: changeLog.length,
  };
  snapshots.push(snap);
  logAction('auto-snapshot', `自动快照 ${snap.label}（${snap.tableCount} 张表）`);
  edgeCache = {};
  if (previewMode === 'history') renderHistoryPanel();
  return snap.id;
}

/**
 * 字段保护函数 —— 自动补回 AI 遗漏的原始字段
 * 原理：对比旧字段和新字段，将旧表中存在但新表中不存在的字段（视为意外遗漏）补回。
 * 仅在用户消息中未明确提到删除该字段时才补回。
 * @param {Array} oldFields - 修改前的字段列表
 * @param {Array} newFields - AI 返回的字段列表
 * @param {string} userMsg - 用户的修改要求（用于判断是否主动删除）
 * @returns {{ fields: Array, restored: string[] }} - 保护后的字段列表 + 被补回的字段名
 */
function protectFields(oldFields, newFields, userMsg) {
  const newNames = new Set(newFields.map(f => f.name.toUpperCase()));
  const restored = [];
  // 用户消息中是否有明确的删除意图
  const hasDelIntent = /删除|移除|去掉|DROP|REMOVE|DEL/i.test(userMsg || '');

  for (const oldField of oldFields) {
    const oldName = oldField.name.toUpperCase();
    // 如果新字段中不存在该字段
    if (!newNames.has(oldName)) {
      if (hasDelIntent) {
        // 用户提到了删除，检查是否是针对性的（提及了该字段名或"全部/所有"）
        const isSpecific = new RegExp(oldField.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(userMsg)
          || /全部|所有|系统字段/.test(userMsg);
        if (!isSpecific) {
          // 用户提到了删除但没指这个字段 → 补回
          newFields.push({ ...oldField });
          restored.push(oldField.name);
        }
      } else {
        // 用户没提到删除 → 直接补回（视为 AI 遗漏）
        newFields.push({ ...oldField });
        restored.push(oldField.name);
      }
    }
  }
  return { fields: newFields, restored };
}

function buildChangeSummary(oldFields, newFields, oldName, newName) {
  const parts = [];
  if (oldName !== newName) parts.push(`表名改为 **${newName}**`);
  const oldNames = oldFields.map(f => f.name);
  const newNames = newFields.map(f => f.name);
  const added = newNames.filter(n => !oldNames.includes(n));
  const removed = oldNames.filter(n => !newNames.includes(n));
  const modified = newFields.filter(f => {
    const old = oldFields.find(o => o.name === f.name);
    return old && (old.type !== f.type || old.comment !== f.comment || old.nullable !== f.nullable);
  }).map(f => f.name);
  if (added.length) parts.push(`新增字段：**${added.join('、')}**`);
  if (removed.length) parts.push(`删除字段：**${removed.join('、')}**`);
  if (modified.length) parts.push(`修改字段：**${modified.join('、')}**`);
  return parts.length ? '✓ ' + parts.join('；') : '✓ 表结构已更新';
}

// ══════════════════════════════════════════
// AI 面板消息 DOM 操作
// ══════════════════════════════════════════
function addAiMsg(idx, role, content) {
  const container = document.getElementById(`ai-history-${idx}`);
  if (!container) return;
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  const roleLabel = { user: '你', assistant: 'AI', error: 'AI', thinking: 'AI' }[role] || role;
  if (role === 'thinking') {
    div.innerHTML = `<span class="role">AI</span><span class="content">
      <span class="think-dots"><span></span><span></span><span></span></span>
      <span class="think-text">思考中</span>
      <span class="think-elapsed"></span>
    </span>`;
    // 启动计时
    const start = Date.now();
    const timer = setInterval(() => {
      const el = div.querySelector('.think-elapsed');
      if (!el) { clearInterval(timer); return; }
      el.textContent = ((Date.now() - start) / 1000).toFixed(1) + 's';
    }, 200);
    div._thinkTimer = timer;
  } else if (role === 'error') {
    div.innerHTML = `<span class="role">AI</span><span class="content">${escHtml(content)}</span>`;
  } else {
    const rendered = (role === 'assistant') ? renderAiContent(content) : escHtml(content).replace(/\n/g,'<br>');
    div.innerHTML = `<span class="role">${roleLabel}</span><span class="content">${rendered}</span>`;
  }
  div.dataset.msgType = role;
  container.appendChild(div);
  scrollAiHistory(idx);
}
function removeThinking(idx) {
  const container = document.getElementById(`ai-history-${idx}`);
  if (!container) return;
  container.querySelectorAll('[data-msg-type="thinking"]').forEach(el => {
    if (el._thinkTimer) clearInterval(el._thinkTimer);
    el.remove();
  });
}
function scrollAiHistory(idx) {
  const el = document.getElementById(`ai-history-${idx}`);
  if (el) el.scrollTop = el.scrollHeight;
}
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function renderAiContent(s) {
  return escHtml(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}
// 带重试按钮的错误消息
function addAiError(idx, msg, retryFn) {
  const container = document.getElementById(`ai-history-${idx}`);
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'ai-msg error';
  const retryId = retryFn ? `retry_${Date.now()}_${Math.random().toString(36).slice(2,6)}` : '';
  const retryBtn = retryFn
    ? `<span class="error-retry" id="${retryId}">🔄 重试</span>`
    : '';
  div.innerHTML = `<span class="role">AI</span><span class="content">${escHtml(msg)}${retryBtn}</span>`;
  div.dataset.msgType = 'error';
  container.appendChild(div);
  scrollAiHistory(idx);
  if (retryFn && retryId) {
    document.getElementById(retryId).addEventListener('click', () => {
      div.remove();
      retryFn();
    });
  }
}

// 尝试修复不完整的 JSON（AI 截断常见问题）
function tryFixJson(s) {
  s = s.trim();
  // 去除末尾的中文/英文说明文字（如 "...", "以上是" 等）
  s = s.replace(/[\u4e00-\u9fff。、，：；！？""''（）《》\w\s]*$/, (m) => {
    // 只保留以 } 或 ] 或 " 结尾的部分
    const trimmed = m.trimEnd();
    if (/[}\]"']/.test(trimmed[trimmed.length - 1])) return trimmed;
    return '';
  }).trim();
  // 统计未闭合的括号
  let stack = [];
  let inStr = false, strChar = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (inStr) {
      if (c === '\\') { i += 2; continue; }
      if (c === strChar) inStr = false;
    } else {
      if (c === '"' || c === "'") { inStr = true; strChar = c; }
      else if (c === '[' || c === '{') stack.push(c);
      else if (c === ']') { if (stack.length && stack[stack.length-1] === '[') stack.pop(); }
      else if (c === '}') { if (stack.length && stack[stack.length-1] === '{') stack.pop(); }
    }
    i++;
  }
  // 如果在字符串内被截断，先闭合字符串
  if (inStr) s += strChar;
  // 闭合未完成的键值对（如果最后一个非空白字符是冒号或逗号后面没值）
  s = s.replace(/([:]\s*["\[{][^}"\]]*)$/, (m) => {
    if (m.trimEnd().endsWith(':')) return m + '""';
    return m;
  });
  // 补全缺失的括号（反序）
  while (stack.length) {
    const c = stack.pop();
    if (c === '"') s += '"';
    else if (c === '{') s += '}';
    else if (c === '[') s += ']';
  }
  // 去除末尾多余逗号
  s = s.replace(/,\s*([}\]])/g, '$1');
  return s;
}

// 错误分类
function classifyError(msg) {
  if (/超时|timeout/i.test(msg)) return 'timeout';
  if (/401|403|API Key|权限|过期/i.test(msg)) return 'auth';
  if (/网络|network|fetch|连接/i.test(msg)) return 'network';
  return 'unknown';
}

// 重试 AI 发送（复用上次的 userMsg）
function handleAiSendRetry(idx, userMsg) {
  const cfg = loadApiConfig();
  if (!cfg || !cfg.key) {
    addAiMsg(idx, 'error', '未配置 API Key，请点击顶部「AI 设置」按钮配置。');
    return;
  }
  const sendBtn = document.getElementById(`ai-send-${idx}`);
  addAiMsg(idx, 'thinking', '重新思考中...');
  sendBtn.disabled = true; sendBtn.classList.add('loading');
  scrollAiHistory(idx);

  const t = tables[idx];
  const snapshot = JSON.stringify({
    name: t.name, comment: t.comment,
    fields: t.fields.map(f => ({ id: f.id, name: f.name, type: f.type, nullable: f.nullable, pk: f.pk, defaultVal: f.defaultVal, comment: f.comment }))
  }, null, 2);

  const hist = (aiHistories[idx] || []).filter(m => m.role === 'user' || m.role === 'assistant').slice(-10);
  const mode = getAiMode(idx);
  const systemPrompt = mode === 'plan' ? getPlanSystemPrompt() : getSystemPrompt();
  const finalMessages = [
    { role: 'system', content: systemPrompt },
    ...hist,
    { role: 'user', content: `当前表结构：\n${snapshot}\n\n修改要求：${userMsg}` }
  ];

  callLLM(finalMessages, cfg.key, cfg.base, cfg.model).then(raw => {
    if (mode === 'plan') {
      removeThinking(idx);
      const planItems = parsePlanItems(raw);
      pendingPlan[idx] = { userMsg, planItems, planRaw: raw };
      addPlanCard(idx, userMsg, planItems);
      if (!aiHistories[idx]) aiHistories[idx] = [];
      aiHistories[idx].push({ role: 'user', content: userMsg });
    } else {
      let jsonStr = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
      let newTable;
      try { newTable = JSON.parse(jsonStr); } catch(e) {
        const m = jsonStr.match(/\{[\s\S]*\}/);
        if (m) { try { newTable = JSON.parse(tryFixJson(m[0])); } catch(e2) { newTable = JSON.parse(m[0]); } }
        else throw new Error('返回内容无法解析为 JSON');
      }
      if (!newTable.name || !Array.isArray(newTable.fields)) throw new Error('返回结构不合法');
      newTable.fields = newTable.fields.map(f => ({ ...f, id: f.id || uid() }));

      const preSnapId = saveAutoSnapshot('AI 改前');
      const oldFields = [...t.fields];
      const oldName = t.name;
      tables[idx].name = newTable.name;
      tables[idx].comment = newTable.comment || tables[idx].comment;
      // 字段保护：自动补回 AI 遗漏的原始字段
      const { fields: protectedFields, restored } = protectFields(oldFields, [...newTable.fields], userMsg);
      tables[idx].fields = protectedFields;
      newTable.fields = protectedFields;
      removeThinking(idx);

      const postSnapId = saveAutoSnapshot('AI 改后');
      let summary = buildChangeSummary(oldFields, newTable.fields, oldName, newTable.name);
      if (restored.length) {
        summary += `\n\n⚠️ 自动补回了 ${restored.length} 个被遗漏的字段：**${restored.join('、')}**`;
        showToast(`⚠️ AI 遗漏了 ${restored.length} 个字段，已自动补回`);
      }
      addAiMsg(idx, 'assistant', summary);
      logAction('ai-modify', `AI 修改了表 <span class="highlight">${escHtml(newTable.name)}</span>：${escHtml(summary.replace(/\*\*/g,''))}`);
      if (!aiHistories[idx]) aiHistories[idx] = [];
      aiHistories[idx].push({ role: 'user', content: userMsg });
      aiHistories[idx].push({ role: 'assistant', content: summary });
      renderEditor(); updatePreview();
      showToast(`AI 已修改表结构 ✓（快照 #${preSnapId} → #${postSnapId}）`);
    }
  }).catch(e => {
    removeThinking(idx);
    addAiError(idx, `重试失败：${e.message}`, () => handleAiSendRetry(idx, userMsg));
  }).finally(() => {
    sendBtn.disabled = false; sendBtn.classList.remove('loading');
  });
}

// ══════════════════════════════════════════
// SQL 解析器（多方言支持）
