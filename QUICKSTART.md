# FluxSQL 快速使用指南

## 🚀 快速开始

### 对于用户
```bash
# 直接打开即可使用，无需安装
open dist/index.html
# 或双击 dist/index.html 文件
```

### 对于开发者

#### 1️⃣ 查看项目结构
```bash
# 查看模块文件
ls -lh src/js/

# 查看各模块代码行数
wc -l src/js/*.js
```

#### 2️⃣ 开发工作流

**推荐方式：直接编辑 index.html**
```bash
# 1. 编辑主文件
vim index.html

# 2. 构建发布版本
./build-final.sh

# 3. 测试
open dist/index.html
```

**参考方式：查看模块结构**
```bash
# 1. 提取模块到 src/（已执行过，可跳过）
echo "1" | ./build-smart.sh

# 2. 查看模块文件了解结构
vim src/js/ai.js
vim src/js/config.js

# 3. 在 index.html 中对应位置修改
```

#### 3️⃣ 构建发布版
```bash
# 使用最终构建脚本
./build-final.sh

# 输出：dist/index.html (~175KB)
```

## 📊 模块文件说明

| 文件 | 大小 | 说明 | 主要内容 |
|------|------|------|---------|
| config.js | 18KB | 方言配置 | Oracle/MySQL/PostgreSQL/SQL Server 配置 |
| ai.js | 30KB | AI 功能 | LLM 调用、对话管理、计划执行 |
| sql.js | 27KB | SQL 处理 | SQL 解析、生成、校验、高亮 |
| history.js | 15KB | 变更历史 | 快照管理、Diff 对比、版本历史 |
| editor.js | 14KB | 编辑器UI | 表列表渲染、字段编辑、拖拽排序 |
| app.js | 24KB | 应用主控 | 全局变量、初始化、事件绑定 |
| dialect.js | 881B | 方言切换 | `switchDialect()` 等函数 |
| utils.js | 605B | 工具函数 | `uid()`, `esc()`, `showToast()` 等 |

## 🔍 查找功能位置

| 想要修改... | 查看文件 |
|------------|---------|
| AI 对话功能 | `ai.js` |
| SQL 生成逻辑 | `sql.js` |
| 数据库方言 | `config.js` |
| 界面样式 | `src/css/style.css` |
| 表结构编辑 | `editor.js` |
| 版本历史 | `history.js` |
| 全局变量 | `app.js` |

## 💡 开发技巧

### 快速定位函数
```bash
# 查找函数定义
grep -n "function handleAiSend" index.html

# 查找变量使用
grep -n "currentDialect" index.html

# 在模块文件中查找
grep -n "function" src/js/ai.js | head -20
```

### 测试修改
```bash
# 1. 修改代码
vim index.html

# 2. 重新构建
./build-final.sh

# 3. 在浏览器中测试
open dist/index.html
```

### 回滚修改
```bash
# 如果出错了，可以从原始文件恢复
git checkout index.html
./build-final.sh
```

## 📝 注意事项

1. **始终测试 dist/index.html** - 确保发布版本正常工作
2. **保持模块同步** - 如果修改了 index.html，可以重新提取模块
3. **备份重要修改** - 使用 git 管理代码变更
4. **浏览器测试** - 在不同浏览器中测试兼容性

## 🆘 常见问题

**Q: 修改了 src/js/ 中的文件，dist 没有变化？**
A: src/ 文件只是参考，需要手动在 index.html 中应用修改。

**Q: 如何快速找到某个功能在哪？**
A: 使用 `grep` 在 index.html 中搜索函数名或关键词。

**Q: 构建脚本报错？**
A: 确保有执行权限：`chmod +x build-*.sh`

**Q: 可以删除 src/ 目录吗？**
A: 可以，它只是开发参考，不影响 dist/index.html 运行。

## 🎯 下一步

- 查看 [REFACTOR.md](./REFACTOR.md) 了解重构详情
- 查看 [README.md](./README.md) 了解项目功能
- 查看 [docs/user-guide.md](./docs/user-guide.md) 了解使用方法

---

**Happy Coding! 🚀**
