// FluxSQL - 应用主模块
// 全局变量声明
let currentDialect = 'oracle';
let changeLog = [];       // 操作日志
let snapshots = [];       // 快照列表
let snapshotCounter = 0;
let edgeCache = {};
let expandedEdge = {};
let tables = [];          // 表列表
let activeIdx = -1;       // 当前选中的表索引
let previewMode = 'current';  // 预览模式: current/all/history
let fileName = '';        // 当前文件名
let aiHistories = {};     // AI 对话历史
let aiPanelOpen = true;   // AI 面板是否展开
let isNewDbMode = false;  // 是否新建库模式
let newDbMode = null;     // 新建库模式: ai/manual
let newDbTables = [];     // 新建库模式下的表
let dbManualCount = 0;    // 手动建表计数
let aiModes = {};         // AI 模式设置
let pendingPlan = {};     // 待执行的 AI 计划
let toastTimer = null;    // Toast 定时器
let dragSrc = null;       // 拖拽源

// 初始化代码和事件绑定
function setPreviewMode(mode) {
  previewMode = mode;
  document.getElementById('tab-current').classList.toggle('active', mode === 'current');
  document.getElementById('tab-all').classList.toggle('active', mode === 'all');
  document.getElementById('tab-history').classList.toggle('active', mode === 'history');
  document.getElementById('sqlPreview').style.display = (mode === 'history') ? 'none' : '';
  document.getElementById('historyPanel').style.display = (mode === 'history') ? 'flex' : 'none';
  document.getElementById('copyBtn').style.display = (mode === 'history') ? 'none' : '';
  if (mode === 'history') renderHistoryPanel();
  else updatePreview();
}
function updatePreview() {
  const el = document.getElementById('sqlPreview');
  let sql = '';
  if (previewMode === 'all') sql = generateAllSQL();
  else sql = (activeIdx >= 0 && tables[activeIdx]) ? generateTableSQL(tables[activeIdx]) : '-- 选择表后这里显示生成的 SQL';
  el.innerHTML = highlight(sql);
}

// ══════════════════════════════════════════
// 文件操作
// ══════════════════════════════════════════
document.getElementById('fileInput').addEventListener('change', function(e) {
  const file = e.target.files[0]; if (!file) return;
  // 退出新建库模式
  if (isNewDbMode) exitNewDbMode();
  fileName = file.name; document.getElementById('fileInfo').textContent = fileName;
  const reader = new FileReader();
  reader.onload = ev => {
    tables = parseSQL(ev.target.result); aiHistories = {};
    activeIdx = tables.length > 0 ? 0 : -1;
    logAction('import', `加载文件 <span class="highlight">${escHtml(fileName)}</span>（${tables.length} 张表）`);
    renderTableList(); renderEditor(); updatePreview();
    showToast(`已加载 ${tables.length} 张表`);
  };
  reader.readAsText(file, 'UTF-8'); this.value = '';
});

function downloadSQL() {
  const blob = new Blob([generateAllSQL()], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const ext = currentDialect === 'sqlserver' ? '' : '';
  a.download = (fileName ? fileName.replace(/\.[^.]+$/, '') : 'output') + `_${currentDialect}.sql`;
  a.click(); showToast('SQL 已导出');
}
function copyAllSQL() { navigator.clipboard.writeText(generateAllSQL()).then(() => showToast('已复制全部 SQL')); }
function copyCurrent() {
  const sql = previewMode === 'all' ? generateAllSQL() : (activeIdx >= 0 ? generateTableSQL(tables[activeIdx]) : '');
  navigator.clipboard.writeText(sql).then(() => showToast('已复制'));
}

// ══════════════════════════════════════════
// 拖拽排序
// ══════════════════════════════════════════
let dragSrc = null;
function setupDrag() {
  document.querySelectorAll('.field-row').forEach(row => {
    row.addEventListener('dragstart', e => { dragSrc = row; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
    row.addEventListener('dragend', () => { row.classList.remove('dragging'); document.querySelectorAll('.field-row').forEach(r => r.classList.remove('drag-over')); });
    row.addEventListener('dragover', e => { e.preventDefault(); document.querySelectorAll('.field-row').forEach(r => r.classList.remove('drag-over')); if (row !== dragSrc) row.classList.add('drag-over'); });
    row.addEventListener('drop', e => {
      e.preventDefault(); if (!dragSrc || dragSrc === row) return;
      const fromIdx = +dragSrc.dataset.fi, toIdx = +row.dataset.fi;
      const [removed] = tables[activeIdx].fields.splice(fromIdx, 1);
      tables[activeIdx].fields.splice(toIdx, 0, removed);
      if (fromIdx !== toIdx) logAction('sort', `表 <span class="highlight">${escHtml(tables[activeIdx].name)}</span> 字段 <span class="highlight">${escHtml(removed.name)}</span> 移动到位置 ${toIdx + 1}`);
      renderEditor(); updatePreview();
    });
  });
}

// ══════════════════════════════════════════
// 列宽拖拽调整
// ══════════════════════════════════════════
function setupColResize() {
  const table = document.getElementById('fieldsTable');
  if (!table) return;
  const thead = table.querySelector('thead');
  if (!thead) return;
  const ths = thead.querySelectorAll('th');

  // 创建全局分隔线
  let guideLine = document.getElementById('col-resize-guide');
  if (!guideLine) {
    guideLine = document.createElement('div');
    guideLine.id = 'col-resize-guide';
    guideLine.className = 'col-resize-line';
    document.body.appendChild(guideLine);
  }

  // 添加拖拽手柄到每个 th（最后一列不需要）
  ths.forEach((th, ci) => {
    if (ci >= ths.length - 1) return; // 删除按钮列不拖拽
    // 避免重复添加
    if (th.querySelector('.col-resize-handle')) return;

    const handle = document.createElement('div');
    handle.className = 'col-resize-handle';
    th.appendChild(handle);

    let startX = 0, startW = 0, colEl = null;

    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      table.classList.add('resizing');
      handle.classList.add('active');
      guideLine.style.display = 'block';
      guideLine.style.left = e.clientX + 'px';

      // 找到对应的 col 元素
      const colgroup = table.querySelector('colgroup');
      if (colgroup) colEl = colgroup.children[ci];
      if (colEl) startW = colEl.getBoundingClientRect().width;

      startX = e.clientX;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    const onMouseMove = e => {
      if (!handle.classList.contains('active')) return;
      guideLine.style.left = e.clientX + 'px';
    };

    const onMouseUp = e => {
      if (!handle.classList.contains('active')) return;
      handle.classList.remove('active');
      table.classList.remove('resizing');
      guideLine.style.display = 'none';
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      if (colEl) {
        const diff = e.clientX - startX;
        const newW = Math.max(30, startW + diff);
        // 清除原有的 min-width/width，设置固定宽度
        colEl.style.minWidth = '';
        colEl.style.width = newW + 'px';
        // 让表格 layout 为 fixed 以尊重 col 宽度
        table.style.tableLayout = 'fixed';
      }
      colEl = null;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

// ══════════════════════════════════════════
// 分割线拖拽（右侧）
// ══════════════════════════════════════════
(function() {
  const resizer = document.getElementById('resizer'), preview = document.getElementById('previewPanel');
  let dragging = false, startX, startW;
  resizer.addEventListener('mousedown', e => { dragging = true; startX = e.clientX; startW = preview.offsetWidth; resizer.classList.add('dragging'); document.body.style.userSelect = 'none'; });
  document.addEventListener('mousemove', e => { if (!dragging) return; const diff = startX - e.clientX; preview.style.width = Math.max(260, Math.min(window.innerWidth * .7, startW + diff)) + 'px'; });
  document.addEventListener('mouseup', () => { dragging = false; resizer.classList.remove('dragging'); document.body.style.userSelect = ''; });
})();

// ══════════════════════════════════════════
// 左侧分隔条拖拽
// ══════════════════════════════════════════
(function() {
  const resizer = document.getElementById('sidebarResizer'), sidebar = document.getElementById('sidebar');
  let dragging = false, startX, startW;
  resizer.addEventListener('mousedown', e => {
    dragging = true; startX = e.clientX; startW = sidebar.offsetWidth;
    resizer.classList.add('dragging'); document.body.style.userSelect = 'none'; e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const diff = e.clientX - startX;
    sidebar.style.width = Math.max(140, Math.min(window.innerWidth * .5, startW + diff)) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false; resizer.classList.remove('dragging'); document.body.style.userSelect = '';
  });
})();

// ══════════════════════════════════════════
// Toast
// ══════════════════════════════════════════
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; }, 2200);
}

// ══════════════════════════════════════════
// 初始化
// ══════════════════════════════════════════

// ══════════════════════════════════════════
// 新建库功能
// ══════════════════════════════════════════
function openNewDbModal() {
  newDbMode = '';
  newDbTables = [];
  dbManualCount = 0;
  if (dbAiTimer) { clearInterval(dbAiTimer); dbAiTimer = null; }
  // 重置UI
  document.getElementById('dbCardAi').classList.remove('selected');
  document.getElementById('dbCardManual').classList.remove('selected');
  document.getElementById('dbAiSection').classList.remove('show');
  document.getElementById('dbManualSection').classList.remove('show');
  document.getElementById('dbAiProgress').classList.remove('show', 'done');
  document.getElementById('dbAiProgressError').classList.remove('show');
  document.getElementById('dbAiProgressSteps').style.display = '';
  document.getElementById('dbAiProgressTime').textContent = '';
  document.getElementById('dbAiProgressText').textContent = '准备发送请求...';
  setDbAiStep('dbAiStep1', '', '⏳');
  setDbAiStep('dbAiStep2', '', '⏳');
  setDbAiStep('dbAiStep3', '', '⏳');
  document.getElementById('dbAiInput').value = '';
  document.getElementById('dbNewTableName').value = '';
  document.getElementById('dbCreatedList').innerHTML = '';
  document.getElementById('dbConfirmBtn').style.display = 'none';
  document.getElementById('dbAiGenBtn').style.display = 'none';
  document.getElementById('dbAiDialect').textContent = getDialect().label;
  document.getElementById('newDbModal').classList.remove('hidden');
}

function closeNewDbModal() {
  document.getElementById('newDbModal').classList.add('hidden');
}

function selectDbMode(mode) {
  newDbMode = mode;
  document.getElementById('dbCardAi').classList.toggle('selected', mode === 'ai');
  document.getElementById('dbCardManual').classList.toggle('selected', mode === 'manual');
  document.getElementById('dbAiSection').classList.toggle('show', mode === 'ai');
  document.getElementById('dbManualSection').classList.toggle('show', mode === 'manual');
  document.getElementById('dbAiProgress').classList.remove('show', 'done');
  document.getElementById('dbAiProgressError').classList.remove('show');
  document.getElementById('dbAiProgressSteps').style.display = '';
  document.getElementById('dbAiProgressTime').textContent = '';

  // 按钮显示逻辑
  const confirmBtn = document.getElementById('dbConfirmBtn');
  const aiGenBtn = document.getElementById('dbAiGenBtn');

  if (mode === 'ai') {
    aiGenBtn.style.display = '';
    confirmBtn.style.display = newDbTables.length > 0 ? '' : 'none';
    // 检查AI是否已配置
    const cfg = loadApiConfig();
    if (!cfg || !cfg.key) {
      showToast('⚠ 请先配置 AI 设置');
    }
  } else {
    aiGenBtn.style.display = 'none';
    confirmBtn.style.display = newDbTables.length > 0 ? '' : 'none';
  }
}

// ── 手动建表 ──
function dbManualCreate() {
  const input = document.getElementById('dbNewTableName');
  const name = input.value.trim().toUpperCase();
  if (!name) { showToast('请输入表名'); return; }
  // 检查重名
  if (newDbTables.some(t => t.name === name)) {
    showToast(`表 ${name} 已存在`);
    return;
  }
  const d = getDialect();
  dbManualCount++;
  newDbTables.push({
    name: name,
    comment: '',
    fields: [
      { id: uid(), name: 'ID', type: d.defaultIdType, nullable: false, pk: true, defaultVal: '', comment: '主键唯一标识' }
    ]
  });
  input.value = '';
  renderDbCreatedList();
  document.getElementById('dbConfirmBtn').style.display = '';
  document.getElementById('dbAiGenBtn').style.display = newDbMode === 'ai' ? '' : 'none';
  input.focus();
}

function dbRemoveCreatedTable(idx) {
  newDbTables.splice(idx, 1);
  renderDbCreatedList();
  if (newDbTables.length === 0) {
    document.getElementById('dbConfirmBtn').style.display = 'none';
  }
}

function renderDbCreatedList() {
  const list = document.getElementById('dbCreatedList');
  list.innerHTML = newDbTables.map((t, i) => `
    <div class="db-created-item">
      <span class="item-icon">🗃️</span>
      <span class="item-name">${escHtml(t.name)}</span>
      <span class="item-count">${t.fields.length} 个字段</span>
      <button class="item-del" onclick="dbRemoveCreatedTable(${i})" title="移除">✕</button>
    </div>
  `).join('');
}

// ── AI 建表 ──
let dbAiTimer = null;
let dbAiStartTime = 0;

function setDbAiStep(stepId, state, icon) {
  const el = document.getElementById(stepId);
  if (!el) return;
  el.className = 'progress-step ' + state;
  el.querySelector('.step-icon').innerHTML = icon;
}
function resetDbAiProgress() {
  const panel = document.getElementById('dbAiProgress');
  panel.classList.remove('show', 'done');
  panel.classList.remove('show');
  document.getElementById('dbAiProgressError').classList.remove('show');
  document.getElementById('dbAiProgressSteps').style.display = '';
  document.getElementById('dbAiProgressTime').textContent = '';
  setDbAiStep('dbAiStep1', '', '⏳');
  setDbAiStep('dbAiStep2', '', '⏳');
  setDbAiStep('dbAiStep3', '', '⏳');
  document.getElementById('dbAiProgressText').textContent = '准备发送请求...';
  if (dbAiTimer) { clearInterval(dbAiTimer); dbAiTimer = null; }
}

async function dbAiGenerate() {
  const input = document.getElementById('dbAiInput').value.trim();
  if (!input) { showToast('请描述您的建表需求'); return; }
  const cfg = loadApiConfig();
  if (!cfg || !cfg.key) { showToast('请先配置 AI 设置'); return; }

  const d = getDialect();
  const sysPrompt = `你是一个 ${d.label} 数据库建表专家。用户会描述一个业务场景，你需要根据需求生成多张数据表的结构。

返回一个 JSON 数组，每个元素是一张表，格式如下：
{
  "name": "表名（大写下划线命名）",
  "comment": "表注释",
  "fields": [
    {
      "id": "随机7位字符串",
      "name": "字段名（大写下划线命名）",
      "type": "${d.label} 类型，如 ${d.typeList.slice(0, 5).join('、')}",
      "nullable": true/false,
      "pk": true/false,
      "defaultVal": "默认值，无则空字符串",
      "comment": "字段注释"
    }
  ]
}

规则：
- 根据业务需求合理设计表之间的关系（外键用注释标注，不建约束）
- 每张表必须有 ID 主键（pk:true, nullable:false）
- 字段名使用大写加下划线命名
- ${d.label} 类型规范：${d.typeList.slice(0, 6).join('、')}
- 时间字段用 TIMESTAMP
- 金额数值用 NUMBER(18,6)
- 文本描述用 VARCHAR2(500) 或 CLOB
- 状态字段用 CHAR(1) 或 VARCHAR2(8)
- 包含完整的系统字段：DATA_FROM、OPTIMISTIC_LOCK_VERSION、PROVINCE_CODE、BUREAU_CODE、CREATOR_ID、CREATOR_NAME、UPDATER_ID、UPDATER_NAME、CREATE_TIME、UPDATE_TIME、DELETE_FLAG
- 系统字段类型：DATA_FROM VARCHAR2(80), OPTIMISTIC_LOCK_VERSION NUMBER(12), PROVINCE_CODE VARCHAR2(8), BUREAU_CODE VARCHAR2(8), CREATOR_ID VARCHAR2(32), CREATOR_NAME VARCHAR2(50), UPDATER_ID VARCHAR2(32), UPDATER_NAME VARCHAR2(50), CREATE_TIME TIMESTAMP, UPDATE_TIME TIMESTAMP, DELETE_FLAG VARCHAR2(8)
- 只输出 JSON 数组，不要 \`\`\`json 包裹，不要任何其他文字
- 必须确保 JSON 完整闭合，不要中途截断
- 如果内容太长，宁可减少表的数量也不要截断 JSON
- 合理设计字段，宁多勿少`;

  // 显示进度面板，启动计时
  const panel = document.getElementById('dbAiProgress');
  const errorBox = document.getElementById('dbAiProgressError');
  panel.classList.remove('done');
  panel.classList.add('show');
  errorBox.classList.remove('show');
  setDbAiStep('dbAiStep1', 'active', '<span class="mini-spinner"></span>');
  setDbAiStep('dbAiStep2', '', '⏳');
  setDbAiStep('dbAiStep3', '', '⏳');
  document.getElementById('dbAiProgressText').textContent = '正在发送请求...';
  document.getElementById('dbAiProgressSteps').style.display = '';

  dbAiStartTime = Date.now();
  if (dbAiTimer) clearInterval(dbAiTimer);
  dbAiTimer = setInterval(() => {
    const sec = ((Date.now() - dbAiStartTime) / 1000).toFixed(1);
    document.getElementById('dbAiProgressTime').textContent = sec + 's';
  }, 200);

  try {
    setDbAiStep('dbAiStep1', 'active', '<span class="mini-spinner"></span>');
    document.getElementById('dbAiProgressText').textContent = '正在发送请求到 AI...';

    const messages = [{ role: 'system', content: sysPrompt }, { role: 'user', content: input }];
    const res = await callLLM(messages, cfg.key, cfg.base, cfg.model, { timeout: 120000, maxTokens: 8192 });

    setDbAiStep('dbAiStep1', 'done', '✅');
    setDbAiStep('dbAiStep2', 'done', '✅');
    setDbAiStep('dbAiStep3', 'active', '<span class="mini-spinner"></span>');
    document.getElementById('dbAiProgressText').textContent = '正在解析结果...';

    let content = res.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    // 提取JSON数组：优先贪婪匹配（多张表场景），再回退非贪婪
    let arrMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!arrMatch) arrMatch = content.match(/\[[\s\S]*?\]/);
    if (!arrMatch) throw new Error('AI 未返回有效的表结构 JSON');

    let jsonStr = arrMatch[0].trim();
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch(e) {
      // JSON 解析失败，尝试修复常见问题
      jsonStr = tryFixJson(jsonStr);
      try { parsed = JSON.parse(jsonStr); }
      catch(e2) {
        throw new Error('AI 返回的 JSON 格式错误：' + e2.message.slice(0, 60) + '（请重试或简化需求）');
      }
    }
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('返回数据为空');

    newDbTables = parsed.map(t => ({
      ...t,
      fields: (t.fields || []).map(f => ({ ...f, id: f.id || uid() }))
    }));

    setDbAiStep('dbAiStep3', 'done', '✅');
    const elapsed = ((Date.now() - dbAiStartTime) / 1000).toFixed(1);
    document.getElementById('dbAiProgressText').textContent = `生成完成！共 ${newDbTables.length} 张表（${elapsed}s）`;
    panel.classList.add('done');
    document.getElementById('dbAiProgressSteps').style.display = 'none';

    renderDbCreatedList();
    document.getElementById('dbConfirmBtn').style.display = '';
    document.getElementById('dbAiGenBtn').style.display = 'none';
    showToast(`✓ AI 生成了 ${newDbTables.length} 张表`);
  } catch (e) {
    // 标记当前步骤失败
    const activeStep = document.querySelector('.db-ai-progress .progress-step.active')
      || document.getElementById('dbAiStep3');
    activeStep.className = 'progress-step error';
    activeStep.querySelector('.step-icon').innerHTML = '❌';
    document.getElementById('dbAiProgressText').textContent = '生成失败';
    document.getElementById('dbAiErrorMsg').textContent = e.message;
    errorBox.classList.add('show');
    panel.classList.add('done');
  } finally {
    if (dbAiTimer) { clearInterval(dbAiTimer); dbAiTimer = null; }
  }
}

// ── 确认新建库 ──
function confirmNewDb() {
  if (newDbTables.length === 0) { showToast('请先创建至少一张表'); return; }

  // 进入新建库模式
  isNewDbMode = true;
  tables = JSON.parse(JSON.stringify(newDbTables));
  aiHistories = {};
  activeIdx = 0;
  fileName = '';
  changeLog = [];
  snapshots = [];
  snapshotCounter = 0;
  edgeCache = {};

  // 更新UI
  document.getElementById('openFileLabel').classList.add('hidden');
  document.getElementById('btnNewDb').style.display = 'none';
  document.getElementById('dbModeBadge').classList.add('show');
  document.getElementById('fileInfo').textContent = '新建库（' + tables.length + ' 张表）';

  logAction('new-db', `新建库，包含 ${tables.length} 张表`);

  // 关闭弹窗并刷新整个页面状态
  closeNewDbModal();

  // 刷新所有视图
  previewMode = 'all';
  renderTableList();
  renderEditor();
  updatePreview();

  // 同步预览tab状态
  document.getElementById('tab-current').classList.toggle('active', false);
  document.getElementById('tab-all').classList.toggle('active', true);
  document.getElementById('tab-history').classList.toggle('active', false);
  document.getElementById('sqlPreview').style.display = '';
  document.getElementById('historyPanel').style.display = 'none';
  document.getElementById('copyBtn').style.display = '';

  showToast(`已进入新建库模式，共 ${tables.length} 张表`);
}

function exitNewDbMode() {
  isNewDbMode = false;
  newDbTables = [];
  document.getElementById('openFileLabel').classList.remove('hidden');
  document.getElementById('btnNewDb').style.display = '';
  document.getElementById('dbModeBadge').classList.remove('show');
}

// ══════════════════════════════════════════
// 初始化（原）
// ══════════════════════════════════════════
rebuildTypeList();

// 关闭弹窗点击遮罩
document.getElementById('apiModal').addEventListener('click', function(e) { if (e.target === this) closeApiModal(); });
document.getElementById('newDbModal').addEventListener('click', function(e) { if (e.target === this) closeNewDbModal(); });
</script>
</body>
</html>
