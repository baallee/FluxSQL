# FluxSQL 项目重构说明

## 📁 项目结构

```
FluxSQL/
├── src/                    # 开发源码目录
│   ├── index.html          # HTML 模板（head 部分）
│   ├── css/
│   │   └── style.css       # 样式文件（纯 CSS）
│   └── js/                 # JavaScript 模块
│       ├── config.js       # 方言配置
│       ├── dialect.js      # 方言切换
│       ├── history.js      # 变更历史
│       ├── ai.js           # AI 功能
│       ├── sql.js          # SQL 生成解析
│       ├── editor.js       # 编辑器UI
│       ├── utils.js        # 工具函数
│       └── app.js          # 应用主模块
├── dist/                   # 发布目录
│   └── index.html          # 发布版本（单文件，~175KB）
├── build.sh                # 构建脚本
├── README.md               # 项目说明
└── REFACTOR.md             # 本文件
```

## 🚀 使用方法

### 普通用户
```bash
# 直接打开即可使用
open dist/index.html
# 或双击 dist/index.html
```

### 开发者

#### 编辑源码并构建
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

## 📦 模块说明

| 模块 | 功能 | 主要函数 |
|------|------|---------|
| **config.js** | 方言配置 | `DIALECTS` 对象 |
| **dialect.js** | 方言切换 | `getDialect()`, `switchDialect()` |
| **history.js** | 变更历史 | `saveSnapshot()`, `renderHistoryPanel()` |
| **ai.js** | AI 功能 | `handleAiSend()`, `callLLM()` |
| **sql.js** | SQL 处理 | `parseSQL()`, `generateTableSQL()` |
| **editor.js** | 编辑器UI | `renderEditor()`, `renderTableList()` |
| **utils.js** | 工具函数 | `uid()`, `escHtml()`, `showToast()` |
| **app.js** | 应用主控 | 全局变量、初始化、事件绑定 |

## 🔧 构建脚本

### build.sh
构建脚本，将 `src/` 目录中的文件合并为单文件：

```bash
./build.sh
```

功能：
- 读取 `src/index.html` 的 head 部分
- 读取 `src/css/style.css` 并包裹在 `<style>` 标签中
- 读取 `src/index.html` 的 body 部分
- 按顺序合并所有 JS 模块文件
- 输出到 `dist/index.html`

## 📊 文件说明

| 文件 | 说明 |
|------|------|
| dist/index.html | 发布版本（单文件，可直接运行） |
| src/ | 源代码目录，供开发使用 |

## ✨ 特点

✅ **零编译** - 纯文本文件，无需构建工具
✅ **零服务器** - 本地双击即可运行
✅ **零依赖** - 不需要任何第三方库
✅ **易于维护** - 模块化文件便于代码阅读
✅ **自动化构建** - 一条命令生成发布版本

## 📝 重构原则

1. **保持零依赖** - 不引入打包工具
2. **保持单文件发布** - `dist/index.html` 可直接运行
3. **模块化开发** - `src/` 目录作为开发源码
4. **自动化构建** - `build.sh` 脚本处理合并

## 🎯 后续优化方向

1. 添加代码分割注释标记，便于定位
2. 创建开发文档，说明各模块依赖关系
3. 添加单元测试框架
4. 考虑引入 TypeScript（可选）
5. 改进构建脚本，支持增量构建和文件监听

## 🆘 常见问题

**Q: 为什么要保持单文件？**
A: 单文件可直接运行，无需服务器，符合项目"即开即用"的定位。

**Q: src/ 目录有什么用？**
A: 源代码目录，开发者在此目录下编辑代码，然后运行构建脚本生成发布版。

**Q: 如何构建发布版本？**
A: 运行 `./build.sh` 即可。

**Q: 开发时应该编辑哪个文件？**
A: 编辑 `src/` 目录下的文件，然后运行 `./build.sh` 构建发布版。

## 📄 许可证

MIT License - 与原项目保持一致
