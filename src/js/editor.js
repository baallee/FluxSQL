// FluxSQL - 编辑器UI模块
// ══════════════════════════════════════════
// UI 渲染
// ══════════════════════════════════════════
function renderTableList() {
  const list = document.getElementById('tableList');
  document.getElementById('tableCount').textContent = tables.length;
  if (!tables.length) {
    list.innerHTML = '<div class="empty-state" style="margin-top:30px"><div class="icon">📁</div><p>打开 SQL 文件</p></div>';
    return;
  }
  list.innerHTML = tables.map((t, i) => `
    <div class="table-item ${i === activeIdx ? 'active' : ''}" draggable="true" data-idx="${i}" onclick="selectTable(${i})">
      <span class="drag-handle">⠿</span>
      <span class="table-icon">🗃️</span>
      <div class="table-item-inner">
        <div class="table-name-text">${t.name}</div>
        ${t.comment ? `<div class="table-comment">${t.comment}</div>` : ''}
      </div>
    </div>
  `).join('');

  // 绑定拖拽事件
  bindTableDragEvents(list);
}

// 表列表拖拽排序
function bindTableDragEvents(list) {
  let dragIdx = null;

  list.querySelectorAll('.table-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragIdx = parseInt(item.dataset.idx);
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      // 防止 click 事件触发
      item._isDragging = true;
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      // 延迟清除标记，避免触发 click
      setTimeout(() => { item._isDragging = false; }, 50);
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });
    item.addEventListener('drop', e => {
      e.preventDefault();
      const dropIdx = parseInt(item.dataset.idx);
      if (dragIdx !== null && dragIdx !== dropIdx) {
        const [moved] = tables.splice(dragIdx, 1);
        tables.splice(dropIdx, 0, moved);
        // 保持 activeIdx 指向同一张表
        if (activeIdx === dragIdx) activeIdx = dropIdx;
        else if (dragIdx < activeIdx && dropIdx >= activeIdx) activeIdx--;
        else if (dragIdx > activeIdx && dropIdx <= activeIdx) activeIdx++;
        logAction('reorder', `表排序调整`);
        renderTableList(); updatePreview();
      }
      dragIdx = null;
    });
  });
}

function selectTable(idx) { activeIdx = idx; renderTableList(); renderEditor(); updatePreview(); }

function renderEditor() {
  const panel = document.getElementById('editorPanel');
  if (activeIdx < 0 || !tables[activeIdx]) {
    panel.innerHTML = '<div class="empty-state"><div class="icon">🗃️</div><p>选择左侧的表开始编辑</p></div>';
    return;
  }
  const t = tables[activeIdx];
  const idx = activeIdx;
  const cfg = loadApiConfig();
  const aiConfigured = cfg && cfg.key;
  const hist = aiHistories[idx] || [];
  const d = getDialect();

  panel.innerHTML = `
    <div class="editor-header">
      <span class="editor-label">表名</span>
      <input class="table-name-input" id="inp-tname" value="${escHtml(t.name)}" oninput="updateTableName(this.value)" spellcheck="false">
      <span class="editor-label">注释</span>
      <input class="table-comment-input" id="inp-tcmt" value="${escHtml(t.comment || '')}" placeholder="表说明..." oninput="updateTableComment(this.value)" spellcheck="false">
      <button class="btn btn-danger" style="margin-left:8px;font-size:12px;padding:5px 10px" onclick="deleteTable(${idx})">🗑 删除表</button>
    </div>
    <div class="editor-body">
      <div class="fields-wrap">
        <table class="fields-table" id="fieldsTable">
          <colgroup>
            <col style="width:28px"><col style="width:26px">
            <col style="min-width:140px;width:22%"><col style="min-width:150px;width:24%">
            <col style="width:50px"><col style="width:72px"><col><col style="width:32px">
          </colgroup>
          <thead>
            <tr>
              <th></th><th>PK</th><th>字段名</th><th>类型</th>
              <th title="允许NULL">NULL</th><th>默认值</th><th>注释</th><th></th>
            </tr>
          </thead>
          <tbody id="fieldRows">
            ${t.fields.map((f, fi) => fieldRowHTML(f, fi)).join('')}
          </tbody>
        </table>
        <div class="add-field-row">
          <button class="add-field-btn" onclick="addField()">＋ 添加字段</button>
          <button class="add-field-btn" style="margin-left:8px" onclick="addSystemFields()">＋ 系统字段</button>
        </div>
      </div>

      <div class="ai-panel" id="ai-panel-${idx}">
        <div class="ai-panel-header" onclick="toggleAiPanel(${idx})">
          <span class="ai-icon">✨</span>
          <span class="ai-title">AI 助手</span>
          ${aiConfigured
            ? `<span class="ai-status">${cfg.model}</span>`
            : `<span class="ai-status" style="color:var(--yellow)">⚠ 未配置 — <a href="#" onclick="event.stopPropagation();openApiModal()" style="color:var(--accent);text-decoration:none">点击设置</a></span>`
          }
          ${hist.length > 0 ? `<button class="btn btn-ghost" style="padding:2px 8px;font-size:11px;margin-left:8px" onclick="event.stopPropagation();clearAiHistory(${idx})" title="清空对话">🗑 清空</button>` : ''}
          <span class="ai-chevron ${aiPanelOpen ? 'open' : ''}" id="ai-chevron-${idx}">▼</span>
        </div>
        <div id="ai-body-${idx}" style="display:${aiPanelOpen ? 'flex' : 'none'};flex-direction:column;flex:1;overflow:hidden;">
          <div class="ai-body">
            ${hist.length > 0 ? `
            <div class="ai-history" id="ai-history-${idx}">
              ${hist.filter(m => m.role === 'user' || m.role === 'assistant').map(m => `
                <div class="ai-msg ${m.role}">
                  <span class="role">${m.role === 'user' ? '你' : 'AI'}</span>
                  <span class="content">${m.role === 'assistant' ? renderAiContent(m.content) : escHtml(m.content).replace(/\n/g,'<br>')}</span>
                </div>
              `).join('')}
            </div>` : `<div class="ai-history" id="ai-history-${idx}"></div>`}

            <div class="ai-chips">
              ${d.aiChips.map(s => `<span class="ai-chip" onclick="fillAiChip(${idx}, '${s.replace(/'/g,"\\'")}')">
                ${s}
              </span>`).join('')}
            </div>

            <div class="ai-input-row">
              <select class="ai-mode-select" id="ai-mode-${idx}" onchange="setAiMode(${idx},this.value)">
                <option value="plan" ${getAiMode(idx)==='plan'?'selected':''}>📋 Plan</option>
                <option value="act" ${getAiMode(idx)==='act'?'selected':''}>⚡ Act</option>
              </select>
              <textarea
                class="ai-textarea" id="ai-input-${idx}" rows="1"
                placeholder="${getAiMode(idx)==='plan' ? '描述修改需求，Plan 模式先看计划再决定是否执行' : '描述修改需求，Act 模式将直接执行修改'}"
                onkeydown="handleAiKey(event, ${idx})"
                oninput="autoResize(this)"
              ></textarea>
              <button class="ai-send-btn" id="ai-send-${idx}" onclick="handleAiSend(${idx})" title="发送 (Ctrl+Enter)">↑</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;
  setupDrag();
  setupColResize();
  setTimeout(() => scrollAiHistory(idx), 50);
}

function toggleAiPanel(idx) {
  aiPanelOpen = !aiPanelOpen;
  const body = document.getElementById(`ai-body-${idx}`);
  const chevron = document.getElementById(`ai-chevron-${idx}`);
  if (body) body.style.display = aiPanelOpen ? 'flex' : 'none';
  if (chevron) chevron.classList.toggle('open', aiPanelOpen);
}

function clearAiHistory(idx) {
  if (!confirm('确认清空该表的 AI 对话记录？')) return;
  aiHistories[idx] = []; renderEditor(); showToast('对话已清空');
}

function fillAiChip(idx, text) {
  const el = document.getElementById(`ai-input-${idx}`);
  if (el) { el.value = text; el.focus(); autoResize(el); }
}

function handleAiKey(e, idx) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleAiSend(idx); }
}

function autoResize(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px'; }

function fieldRowHTML(f, fi) {
  return `
    <tr class="field-row" data-fi="${fi}" draggable="true">
      <td><span class="drag-handle" title="拖拽排序">⠿</span></td>
      <td><div class="checkbox-wrap"><input type="checkbox" class="field-checkbox" ${f.pk ? 'checked' : ''} onchange="updateField(${fi},'pk',this.checked)" title="主键"></div></td>
      <td><input class="field-input name-input" value="${escHtml(f.name)}" oninput="updateField(${fi},'name',this.value)" spellcheck="false"></td>
      <td><input list="type-list" class="field-input type-input" value="${escHtml(f.type)}" oninput="updateField(${fi},'type',this.value)" spellcheck="false"></td>
      <td><div class="checkbox-wrap"><input type="checkbox" class="field-checkbox" ${f.nullable ? 'checked' : ''} onchange="updateField(${fi},'nullable',this.checked)" title="允许NULL"></div></td>
      <td><input class="field-input mono" value="${escHtml(f.defaultVal||'')}" oninput="updateField(${fi},'defaultVal',this.value)" placeholder="—" spellcheck="false"></td>
      <td><input class="field-input" value="${escHtml(f.comment||'')}" oninput="updateField(${fi},'comment',this.value)" placeholder="注释..." spellcheck="false"></td>
      <td><button class="del-btn" onclick="deleteField(${fi})" title="删除字段">✕</button></td>
    </tr>
  `;
}

// ══════════════════════════════════════════
// 数据操作（方言感知）
// ══════════════════════════════════════════
function updateTableName(v) {
  const old = tables[activeIdx].name;
  tables[activeIdx].name = v;
  if (old !== v) logAction('mod-table', `表名：<span class="diff-del">${escHtml(old)}</span> → <span class="diff-add">${escHtml(v)}</span>`);
  renderTableList(); updatePreview();
}
function updateTableComment(v) {
  const old = tables[activeIdx].comment;
  tables[activeIdx].comment = v;
  if (old !== v) logAction('mod-table', `表 <span class="highlight">${escHtml(tables[activeIdx].name)}</span> 注释变更`);
  renderTableList(); updatePreview();
}
function updateField(fi, key, val) {
  const f = tables[activeIdx].fields[fi];
  const oldVal = f[key];
  f[key] = val;
  if (key === 'pk' && val) f.nullable = false;
  if (oldVal !== val) {
    const keyLabel = { name:'字段名', type:'类型', nullable:'NULL', pk:'主键', defaultVal:'默认值', comment:'注释' }[key] || key;
    logAction('mod-field', `表 <span class="highlight">${escHtml(tables[activeIdx].name)}</span> 字段 <span class="highlight">${escHtml(f.name)}</span> ${keyLabel} 变更`);
  }
  updatePreview();
}
function deleteField(fi) {
  const f = tables[activeIdx].fields[fi];
  tables[activeIdx].fields.splice(fi, 1);
  logAction('del-field', `表 <span class="highlight">${escHtml(tables[activeIdx].name)}</span> 删除字段 <span class="diff-del">${escHtml(f.name)}</span>`);
  renderEditor(); updatePreview();
}
function addField() {
  const d = getDialect();
  tables[activeIdx].fields.push({ id: uid(), name: 'NEW_FIELD', type: d.defaultFieldType, nullable: true, pk: false, defaultVal: '', comment: '' });
  logAction('add-field', `表 <span class="highlight">${escHtml(tables[activeIdx].name)}</span> 新增字段 <span class="diff-add">NEW_FIELD</span>`);
  renderEditor(); updatePreview();
  setTimeout(() => {
    const rows = document.querySelectorAll('.field-row');
    const last = rows[rows.length - 1];
    if (last) { last.scrollIntoView({ behavior: 'smooth' }); last.querySelector('.name-input').select(); }
  }, 50);
}
function addSystemFields() {
  const d = getDialect();
  const existing = tables[activeIdx].fields.map(f => f.name.toUpperCase());
  const toAdd = d.systemFields.filter(f => !existing.includes(f.name.toUpperCase())).map(f => ({ ...f, id: uid() }));
  tables[activeIdx].fields.push(...toAdd);
  if (toAdd.length) logAction('system-fields', `表 <span class="highlight">${escHtml(tables[activeIdx].name)}</span> 添加了 ${toAdd.length} 个系统字段`);
  renderEditor(); updatePreview();
  showToast(`已添加 ${toAdd.length} 个系统字段`);
}
function deleteTable(idx) {
  if (!confirm(`确认删除表 ${tables[idx].name}？`)) return;
  const name = tables[idx].name;
  tables.splice(idx, 1);
  const newHistories = {};
  Object.keys(aiHistories).forEach(k => {
    const ki = parseInt(k, 10);
    if (ki === idx) return;
    const nk = ki > idx ? ki - 1 : ki;
    newHistories[nk] = aiHistories[k];
  });
  aiHistories = newHistories;
  activeIdx = tables.length > 0 ? Math.min(idx, tables.length - 1) : -1;
  logAction('del-table', `删除表 <span class="diff-del">${escHtml(name)}</span>`);
  renderTableList(); renderEditor(); updatePreview();
}
function addNewTable() {
  const d = getDialect();
  const t = { name: 'NEW_TABLE', comment: '', fields: [{ id: uid(), name: 'ID', type: d.defaultIdType, nullable: false, pk: true, defaultVal: '', comment: '主键唯一标识' }] };
  tables.push(t);
  activeIdx = tables.length - 1;
  logAction('add-table', `新建表 <span class="diff-add">NEW_TABLE</span>`);
  renderTableList(); renderEditor(); updatePreview();
  setTimeout(() => { const inp = document.getElementById('inp-tname'); if (inp) { inp.focus(); inp.select(); } }, 50);
}

// ══════════════════════════════════════════
// 预览
