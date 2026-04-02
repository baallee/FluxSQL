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
```bash
# 1. 编辑 src/ 中的源文件
vim src/js/ai.js
vim src/css/style.css
vim src/index.html

# 2. 运行构建脚本
./build.sh

# 3. 测试构建产物
open dist/index.html
```

#### 3️⃣ 构建发布版
```bash
# 使用构建脚本
./build.sh

# 输出：dist/index.html (~175KB)
```

## 📊 模块文件说明

| 文件 | 说明 | 主要内容 |
|------|------|---------|
| config.js | 方言配置 | Oracle/MySQL/PostgreSQL/SQL Server 配置 |
| ai.js | AI 功能 | LLM 调用、对话管理、计划执行 |
| sql.js | SQL 处理 | SQL 解析、生成、校验、高亮 |
| history.js | 变更历史 | 快照管理、Diff 对比、版本历史 |
| editor.js | 编辑器UI | 表列表渲染、字段编辑、拖拽排序 |
| app.js | 应用主控 | 全局变量、初始化、事件绑定 |
| dialect.js | 方言切换 | `switchDialect()` 等函数 |
| utils.js | 工具函数 | `uid()`, `escHtml()`, `showToast()` 等 |

## 🔍 查找功能位置

| 想要修改... | 查看文件 |
|------------|---------|
| AI 对话功能 | `src/js/ai.js` |
| SQL 生成逻辑 | `src/js/sql.js` |
| 数据库方言 | `src/js/config.js` |
| 界面样式 | `src/css/style.css` |
| 表结构编辑 | `src/js/editor.js` |
| 版本历史 | `src/js/history.js` |
| 全局变量 | `src/js/app.js` |

## 💡 开发技巧

### 快速定位函数
```bash
# 在模块文件中查找
grep -n "function handleAiSend" src/js/ai.js

# 查找变量使用
grep -n "currentDialect" src/js/
```

### 测试修改
```bash
# 1. 修改代码
vim src/js/ai.js

# 2. 重新构建
./build.sh

# 3. 在浏览器中测试
open dist/index.html
```

### 回滚修改
```bash
# 如果出错了，可以从 git 恢复
git checkout src/js/ai.js
./build.sh
```

## 📝 注意事项

1. **始终测试 dist/index.html** - 确保发布版本正常工作
2. **备份重要修改** - 使用 git 管理代码变更
3. **浏览器测试** - 在不同浏览器中测试兼容性

## 🆘 常见问题

**Q: 修改了 src/ 中的文件，dist 没有变化？**
A: 需要运行 `./build.sh` 重新构建。

**Q: 如何快速找到某个功能在哪？**
A: 使用 `grep` 在 `src/js/` 目录中搜索函数名或关键词。

**Q: 构建脚本报错？**
A: 确保有执行权限：`chmod +x build.sh`

**Q: 可以删除 src/ 目录吗？**
A: 不建议，它是源代码目录，用于开发。

## 🎯 下一步

- 查看 [REFACTOR.md](./REFACTOR.md) 了解重构详情
- 查看 [README.md](./README.md) 了解项目功能
- 查看 [docs/user-guide.md](./docs/user-guide.md) 了解使用方法

---

**Happy Coding! 🚀**
