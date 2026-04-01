// FluxSQL - 方言切换模块
function getDialect() { return DIALECTS[currentDialect]; }

function switchDialect(dialect) {
  currentDialect = dialect;
  // 更新 UI
  document.querySelectorAll('.dialect-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.dialect === dialect);
  });
  document.getElementById('dialectBadge').textContent = getDialect().label;
  // 更新类型建议列表
  rebuildTypeList();
  // 刷新编辑器和预览
  renderEditor();
  updatePreview();
  showToast(`已切换为 ${getDialect().label} 方言`);
}

function rebuildTypeList() {
  let dl = document.getElementById('type-list');
  if (dl) dl.remove();
  dl = document.createElement('datalist');
  dl.id = 'type-list';
  getDialect().typeList.forEach(v => {
    const o = document.createElement('option'); o.value = v; dl.appendChild(o);
  });
  document.body.appendChild(dl);
}
