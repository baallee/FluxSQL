# FluxSQL 项目重构说明

## 📁 项目结构

```
FluxSQL/
├── index.html              # 原始单文件（主入口，可直接使用）
├── src/                    # 开发源码目录
│   ├── index.html          # HTML 模板（开发版本）
│   ├── css/
│   │   └── style.css       # 样式文件
│   ├── js/                 # JavaScript 模块
│   │   ├── config.js       # 方言配置（18KB）
│   │   ├── dialect.js      # 方言切换（881B）
│   │   ├── history.js      # 变更历史（15KB）
│   │   ├── ai.js           # AI 功能（30KB）
│   │   ├── sql.js          # SQL 生成解析（27KB）
│   │   ├── editor.js       # 编辑器UI（14KB）
│   │   ├── utils.js        # 工具函数（605B）
│   │   └── app.js          # 应用主模块（23KB）
│   └── body.html           # HTML body 内容
├── dist/                   # 发布目录
│   └── index.html          # 发布版本（单文件，~175KB）
├── build-smart.sh          # 智能构建脚本（提取模块）
├── build-final.sh          # 最终构建脚本（生成发布版）
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

#### 方式一：直接编辑 index.html（推荐）
```bash
# 编辑主文件
vim index.html

# 构建发布版
./build-final.sh

# 测试
open dist/index.html
```

#### 方式二：编辑模块文件
```bash
# 1. 从 index.html 提取模块到 src/
echo "1" | ./build-smart.sh

# 2. 编辑 src/ 中的模块文件
vim src/js/ai.js

# 3. 注意：当前不支持从模块合并回 index.html
#    需要手动在 index.html 中应用修改
```

## 📦 模块说明

| 模块 | 大小 | 功能 | 主要函数 |
|------|------|------|---------|
| **config.js** | 18KB | 方言配置 | `DIALECTS` 对象 |
| **dialect.js** | 881B | 方言切换 | `getDialect()`, `switchDialect()` |
| **history.js** | 15KB | 变更历史 | `saveSnapshot()`, `renderHistoryPanel()` |
| **ai.js** | 30KB | AI 功能 | `handleAiSend()`, `callLLM()` |
| **sql.js** | 27KB | SQL 处理 | `parseSQL()`, `generateTableSQL()` |
| **editor.js** | 14KB | 编辑器UI | `renderEditor()`, `renderTableList()` |
| **utils.js** | 605B | 工具函数 | `uid()`, `esc()`, `showToast()` |
| **app.js** | 23KB | 应用主控 | 全局变量、初始化、事件绑定 |

## 🔧 构建脚本

### build-smart.sh
智能构建脚本，支持两种模式：

**模式1：开发模式**
- 从 `index.html` 提取各模块到 `src/` 目录
- 用于理解代码结构或作为模块化参考

**模式2：生产模式**
- 从 `src/` 合并各模块为 `dist/index.html`
- 注意：当前模块化不完整，此模式仅供参考

### build-final.sh
最终构建脚本（推荐使用）：

```bash
./build-final.sh
```

功能：
- 复制 `index.html` 到 `dist/index.html`
- 快速生成发布版本

## 📊 文件大小对比

| 文件 | 大小 | 说明 |
|------|------|------|
| index.html | ~175KB | 原始单文件 |
| dist/index.html | ~175KB | 发布版本（与原始相同） |
| src/js/*.js (总计) | ~128KB | 拆分后的模块（开发参考） |

## ✨ 特点

✅ **零编译** - 纯文本文件，无需构建工具
✅ **零服务器** - 本地双击即可运行
✅ **零依赖** - 不需要任何第三方库
✅ **易于维护** - 模块化文件便于代码阅读
✅ **向后兼容** - 保持原始单文件可用

## 📝 重构原则

1. **保持零依赖** - 不引入打包工具
2. **保持单文件发布** - `dist/index.html` 可直接运行
3. **渐进式模块化** - `src/` 目录供开发参考
4. **不破坏现有功能** - `index.html` 始终可用

## 🎯 后续优化方向

1. 完善模块化，支持从 `src/` 合并回 `index.html`
2. 添加代码分割注释标记，便于定位
3. 创建开发文档，说明各模块依赖关系
4. 添加单元测试框架
5. 考虑引入 TypeScript（可选）

## 🆘 常见问题

**Q: 为什么要保持单文件？**
A: 单文件可直接运行，无需服务器，符合项目"即开即用"的定位。

**Q: src/ 目录有什么用？**
A: 供开发者理解代码结构，方便查找和修改特定功能。

**Q: 如何从模块合并回单文件？**
A: 当前需要手动操作，或在编辑器中同时查看模块和 index.html。

**Q: 开发时应该编辑哪个文件？**
A: 建议直接编辑 `index.html`，然后运行 `./build-final.sh` 生成发布版。

## 📄 许可证

MIT License - 与原项目保持一致
