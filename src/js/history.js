// FluxSQL - 变更历史模块
// ══════════════════════════════════════════
// 变更追踪引擎
// 全局变量在 app.js 中声明
// ══════════════════════════════════════════

function now() {
  const d = new Date();
  return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0') + ':' + d.getSeconds().toString().padStart(2,'0');
}

function logAction(type, detail) {
  changeLog.push({ time: now(), type, detail, ts: Date.now() });
  if (previewMode === 'history') renderHistoryPanel();
}

// 深拷贝 tables 快照
function cloneTables() { return JSON.parse(JSON.stringify(tables)); }

function saveSnapshot() {
  snapshotCounter++;
  const snap = {
    id: snapshotCounter,
    label: `快照 #${snapshotCounter}`,
    time: now(),
    data: cloneTables(),
    tableCount: tables.length,
    logIndex: changeLog.length,  // 该快照对应的日志位置
  };
  snapshots.push(snap);
  logAction('snapshot', `保存 ${snap.label}（${snap.tableCount} 张表）`);
  renderHistoryPanel();
  showToast(`${snap.label} 已保存 ✓`);
}

function restoreSnapshot(snapId) {
  if (!confirm(`确认恢复到 ${snapshots.find(s=>s.id===snapId)?.label}？\n当前未保存的变更会丢失。`)) return;
  const snap = snapshots.find(s => s.id === snapId);
  if (!snap) return;
  tables = JSON.parse(JSON.stringify(snap.data));
  aiHistories = {};
  activeIdx = tables.length > 0 ? 0 : -1;
  renderTableList(); renderEditor(); updatePreview();
  logAction('restore', `恢复到 ${snap.label}`);
  edgeCache = {};
  expandedEdge = null;
  renderHistoryPanel();
  showToast(`已恢复到 ${snap.label}`);
}

function deleteSnapshot(snapId) {
  if (!confirm('确认删除该快照？')) return;
  snapshots = snapshots.filter(s => s.id !== snapId);
  // 清理关联缓存
  edgeCache = {};
  expandedEdge = null;
  renderHistoryPanel();
  showToast('快照已删除');
}

function clearAllHistory() {
  if (!confirm('确认清空所有操作日志和快照？此操作不可恢复。')) return;
  changeLog = []; snapshots = []; snapshotCounter = 0;
  expandedEdge = null;
  renderHistoryPanel();
  showToast('历史已清空');
}

// ── 边缘缓存：预计算相邻快照间的变更摘要 ──
// edgeCache 在 app.js 中声明

function getEdgeSummary(snapA, snapB) {
  const key = `${snapA.id}-${snapB.id}`;
  if (edgeCache[key]) return edgeCache[key];

  const diff = computeDiff(snapA.data, snapB.data);
  let added = 0, removed = 0, modified = 0;
  let fieldAdded = 0, fieldRemoved = 0, fieldModified = 0;

  diff.forEach(d => {
    if (d.status === 'added') { added++; fieldAdded += d.table.fields.length; }
    else if (d.status === 'removed') { removed++; fieldRemoved += d.table.fields.length; }
    else if (d.status === 'modified') {
      modified++;
      d.fieldChanges.forEach(fc => {
        if (fc.status === 'added') fieldAdded++;
        else if (fc.status === 'removed') fieldRemoved++;
        else fieldModified++;
      });
    }
  });

  const hasChanges = added + removed + modified > 0;
  const summary = { added, removed, modified, fieldAdded, fieldRemoved, fieldModified, hasChanges, diff };
  edgeCache[key] = summary;
  return summary;
}

// ── 展开的边 ──
// expandedEdge 在 app.js 中声明

function toggleEdge(snapAId, snapBId) {
  const key = `${snapAId}-${snapBId}`;
  if (expandedEdge === key) {
    expandedEdge = null;
  } else {
    expandedEdge = key;
  }
  renderHistoryPanel();
}

// ── 版本树渲染 ──
function renderHistoryPanel() {
  const tree = document.getElementById('historyTree');
  if (!changeLog.length && !snapshots.length) {
    tree.innerHTML = '<div style="color:var(--text3);font-size:12px;text-align:center;padding:30px 0">暂无变更记录</div>';
    return;
  }

  const iconMap = {
    'add-field': '➕', 'del-field': '➖', 'mod-field': '✏️',
    'add-table': '📋', 'del-table': '🗑️', 'mod-table': '✏️',
    'ai-modify': '🤖', 'snapshot': '📸', 'restore': '⏪',
    'import': '📂', 'sort': '↕️', 'system-fields': '⚙️',
  };

  let html = '';

  // 1. 根节点（文件导入/初始状态）
  const firstLog = changeLog[0];
  if (firstLog) {
    html += `<div class="tree-root">
      <div class="tree-root-dot"></div>
      <div class="tree-root-info">${firstLog.time} · ${snapshots.length ? snapshots[0].tableCount + ' 张表' : ''}</div>
    </div>`;
  } else if (snapshots.length) {
    html += `<div class="tree-root">
      <div class="tree-root-dot"></div>
      <div class="tree-root-info">${snapshots[0].time} · ${snapshots[0].tableCount} 张表</div>
    </div>`;
  }

  // 2. 将日志分配到各个快照段
  // 段0: 根→快照1, 段1: 快照1→快照2, ..., 段N: 最后快照→现在
  let segments = [];
  for (let i = 0; i <= snapshots.length; i++) {
    const startLogIdx = i === 0 ? 0 : snapshots[i - 1].logIndex;
    const endLogIdx = i < snapshots.length ? snapshots[i].logIndex : changeLog.length;
    const logs = changeLog.slice(startLogIdx, endLogIdx);
    segments.push({
      snapA: i > 0 ? snapshots[i - 1] : null,
      snapB: i < snapshots.length ? snapshots[i] : null,
      logs,
      isFirst: i === 0,
      isLast: i === snapshots.length,
    });
  }

  segments.forEach((seg, segIdx) => {
    const hasSnapB = !!seg.snapB;
    const isLastSegment = seg.isLast;

    // 渲染该段的日志（不包含 snapshot 和 restore 类型的）
    const filteredLogs = seg.logs.filter(l => l.type !== 'snapshot' && l.type !== 'restore');
    filteredLogs.forEach(log => {
      html += `<div class="tree-log">
        <div class="tree-log-dot"></div>
        <span class="tree-log-time">${log.time}</span>
        <span class="tree-log-icon">${iconMap[log.type] || '📝'}</span>
        <span class="tree-log-text">${log.detail}</span>
      </div>`;
    });

    // 如果不是最后一段，渲染快照节点 + 连线到下一段
    if (hasSnapB) {
      const snap = seg.snapB;
      const nextSeg = segments[segIdx + 1];
      const hasNext = nextSeg && nextSeg.snapB;

      // 连线到下一个快照（带变更摘要徽章）
      if (hasNext) {
        const summary = getEdgeSummary(snap, nextSeg.snapB);
        const edgeKey = `${snap.id}-${nextSeg.snapB.id}`;
        const isExpanded = expandedEdge === edgeKey;

        // 渲染连线 + 徽章
        const lineCls = summary.hasChanges ? 'has-changes' : 'no-changes';
        let badgeHtml = '';
        if (summary.hasChanges) {
          let parts = [];
          if (summary.added) parts.push(`<span class="tree-edge-count add">+${summary.added}表</span>`);
          if (summary.removed) parts.push(`<span class="tree-edge-count del">-${summary.removed}表</span>`);
          if (summary.modified) parts.push(`<span class="tree-edge-count mod">~${summary.modified}表</span>`);
          // 字段级摘要
          let fieldParts = [];
          if (summary.fieldAdded) fieldParts.push(`<span class="tree-edge-count field-add">+${summary.fieldAdded}字段</span>`);
          if (summary.fieldRemoved) fieldParts.push(`<span class="tree-edge-count field-del">-${summary.fieldRemoved}字段</span>`);
          if (summary.fieldModified) fieldParts.push(`<span class="tree-edge-count field-mod">~${summary.fieldModified}字段</span>`);
          if (fieldParts.length) parts.push(fieldParts.join(''));
          badgeHtml = parts.join(' ');
        } else {
          badgeHtml = '无变更';
        }

        html += `<div class="tree-edge" style="min-height:28px">
          <div class="tree-edge-line ${lineCls}"></div>
          <div class="tree-edge-badge ${summary.hasChanges ? 'has-changes' : 'no-changes'}"
               onclick="toggleEdge(${snap.id},${nextSeg.snapB.id})"
               title="${summary.hasChanges ? '点击查看差异详情' : '两次快照间无差异'}">
            ${isExpanded ? '▲' : '▼'} ${badgeHtml}
          </div>
        </div>`;
      }

      // 快照节点
      html += `<div class="tree-snap">
        ${!isLastSegment && segments[segIdx + 1] ? '' : ''}<!-- 节点竖线由上一个连线覆盖 -->
        <div class="tree-snap-dot"></div>
        <div class="tree-snap-content">
          <div class="tree-snap-header">
            <span class="tree-snap-label" onclick="restoreSnapshot(${snap.id})" title="点击恢复到此版本">${snap.label}</span>
            <span class="tree-snap-time">${snap.time}</span>
          </div>
          <div class="tree-snap-meta">📋 ${snap.tableCount} 张表</div>
          <div class="tree-snap-actions">
            <button class="snap-btn restore" onclick="restoreSnapshot(${snap.id})">⏪ 恢复</button>
            <button class="snap-btn del" onclick="deleteSnapshot(${snap.id})">🗑 删除</button>
          </div>
        </div>
      </div>`;

      // 如果这个边展开了，渲染 diff 详情
      if (hasNext && expandedEdge === `${snap.id}-${nextSeg.snapB.id}`) {
        const summary = getEdgeSummary(snap, nextSeg.snapB);
        if (summary.hasChanges) {
          html += renderDiffInline(snap, nextSeg.snapB, summary);
        }
      }
    }
  });

  tree.innerHTML = html;

  // 自动滚动到最新内容（如果是追加而非切换）
  if (tree.scrollTop + tree.clientHeight >= tree.scrollHeight - 60) {
    tree.scrollTop = tree.scrollHeight;
  }
}

// ── 内联 diff 渲染 ──
function renderDiffInline(snapA, snapB, summary) {
  const diff = summary.diff;
  let html = `<div style="margin:4px 0 8px 24px;border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--surface);animation:fadeIn .15s ease">`;

  diff.forEach(d => {
    const tagClass = d.status === 'added' ? 'added' : d.status === 'removed' ? 'removed' : d.status === 'modified' ? 'modified' : 'unchanged';
    const tagText = d.status === 'added' ? '新增' : d.status === 'removed' ? '删除' : d.status === 'modified' ? '修改' : '无变更';
    html += `<div class="diff-table-group"><div class="diff-table-header">`;
    html += `<span class="diff-tag ${tagClass}">${tagText}</span>`;
    if (d.nameChanged) html += `<span class="old-val">${escHtml(d.oldTable.name)}</span> → <span class="new-val">${escHtml(d.table.name)}</span>`;
    else html += escHtml(d.table.name);
    if (d.commentChanged) html += ` <span style="color:var(--text3);font-size:11px;font-weight:400">（注释变更）</span>`;
    html += `</div>`;

    if (d.status === 'unchanged') {
      html += `<div style="padding:6px 12px;font-size:11px;color:var(--text3)">无字段变更</div>`;
    } else {
      html += `<table class="diff-field-table"><thead><tr><th>字段名</th><th>类型</th><th>NULL</th><th>PK</th><th>默认值</th><th>注释</th></tr></thead><tbody>`;
      if (d.status === 'modified') {
        d.fieldChanges.forEach(fc => {
          if (fc.status === 'added') {
            html += `<tr class="row-add"><td>+ ${escHtml(fc.field.name)}</td><td>${escHtml(fc.field.type)}</td><td>${fc.field.nullable?'YES':'NO'}</td><td>${fc.field.pk?'✓':''}</td><td>${escHtml(fc.field.defaultVal)||'—'}</td><td>${escHtml(fc.field.comment)||'—'}</td></tr>`;
          } else if (fc.status === 'removed') {
            html += `<tr class="row-del"><td>- ${escHtml(fc.field.name)}</td><td>${escHtml(fc.field.type)}</td><td>${fc.field.nullable?'YES':'NO'}</td><td>${fc.field.pk?'✓':''}</td><td>${escHtml(fc.field.defaultVal)||'—'}</td><td>${escHtml(fc.field.comment)||'—'}</td></tr>`;
          } else {
            html += `<tr class="row-mod"><td>${escHtml(fc.field.name)}</td>`;
            ['type','nullable','pk','defaultVal','comment'].forEach(key => {
              const diffItem = fc.diffs.find(df => df.key === '类型' && key === 'type' || df.key === 'NULL' && key === 'nullable' || df.key === 'PK' && key === 'pk' || df.key === '默认值' && key === 'defaultVal' || df.key === '注释' && key === 'comment');
              if (diffItem) {
                html += `<td><span class="old-val">${escHtml(diffItem.old)}</span> → <span class="new-val">${escHtml(diffItem.new)}</span></td>`;
              } else {
                let display = key === 'nullable' ? (fc.field[key]?'YES':'NO') : key === 'pk' ? (fc.field[key]?'✓':'') : escHtml(fc.field[key]||'');
                html += `<td class="unchanged">${display||'—'}</td>`;
              }
            });
            html += `</tr>`;
          }
        });
      } else if (d.status === 'added') {
        d.table.fields.forEach(f => {
          html += `<tr class="row-add"><td>${escHtml(f.name)}</td><td>${escHtml(f.type)}</td><td>${f.nullable?'YES':'NO'}</td><td>${f.pk?'✓':''}</td><td>${escHtml(f.defaultVal)||'—'}</td><td>${escHtml(f.comment)||'—'}</td></tr>`;
        });
      } else if (d.status === 'removed') {
        d.table.fields.forEach(f => {
          html += `<tr class="row-del"><td>${escHtml(f.name)}</td><td>${escHtml(f.type)}</td><td>${f.nullable?'YES':'NO'}</td><td>${f.pk?'✓':''}</td><td>${escHtml(f.defaultVal)||'—'}</td><td>${escHtml(f.comment)||'—'}</td></tr>`;
        });
      }
      html += `</tbody></table>`;
    }
    html += `</div>`;
  });

  html += `</div>`;
  return html;
}
function computeDiff(oldTables, newTables) {
  const result = [];
  const oldMap = {};
  oldTables.forEach(t => { oldMap[t.name.toUpperCase()] = t; });
  const newMap = {};
  newTables.forEach(t => { newMap[t.name.toUpperCase()] = t; });

  const allNames = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
  allNames.forEach(name => {
    const oldT = oldMap[name];
    const newT = newMap[name];
    if (!oldT) {
      result.push({ table: newT, status: 'added' });
    } else if (!newT) {
      result.push({ table: oldT, status: 'removed' });
    } else {
      const fieldChanges = computeFieldDiff(oldT.fields, newT.fields);
      const nameChanged = oldT.name !== newT.name;
      const commentChanged = oldT.comment !== newT.comment;
      if (fieldChanges.length > 0 || nameChanged || commentChanged) {
        result.push({ table: newT, oldTable: oldT, status: 'modified', fieldChanges, nameChanged, commentChanged });
      } else {
        result.push({ table: newT, status: 'unchanged' });
      }
    }
  });
  return result;
}

function computeFieldDiff(oldFields, newFields) {
  const changes = [];
  const oldMap = {};
  oldFields.forEach(f => { oldMap[f.name.toUpperCase()] = f; });
  const newMap = {};
  newFields.forEach(f => { newMap[f.name.toUpperCase()] = f; });

  const allNames = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
  allNames.forEach(name => {
    const oldF = oldMap[name];
    const newF = newMap[name];
    if (!oldF) {
      changes.push({ field: newF, status: 'added' });
    } else if (!newF) {
      changes.push({ field: oldF, status: 'removed' });
    } else {
      const diffs = [];
      if (oldF.type !== newF.type) diffs.push({ key: '类型', old: oldF.type, new: newF.type });
      if (oldF.nullable !== newF.nullable) diffs.push({ key: 'NULL', old: oldF.nullable?'YES':'NO', new: newF.nullable?'YES':'NO' });
      if (oldF.pk !== newF.pk) diffs.push({ key: 'PK', old: oldF.pk?'✓':'', new: newF.pk?'✓':'' });
      if (oldF.defaultVal !== newF.defaultVal) diffs.push({ key: '默认值', old: oldF.defaultVal||'—', new: newF.defaultVal||'—' });
      if (oldF.comment !== newF.comment) diffs.push({ key: '注释', old: oldF.comment||'—', new: newF.comment||'—' });
      if (diffs.length > 0) changes.push({ field: newF, oldField: oldF, status: 'modified', diffs });
    }
  });
  return changes;
}

