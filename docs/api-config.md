# AI API 配置指南 / API Configuration Guide

> [English version below](#english-guide)

---

## 中文配置指南

FluxSQL 的 AI 功能需要配置一个 AI API 密钥。以下是主流服务商的配置方法。

### 打开配置界面

1. 打开 FluxSQL（`index.html`）
2. 点击顶部右侧的 **「⚙ AI 设置」** 按钮（或类似按钮）
3. 在配置面板中填写以下信息：
   - **API 地址（Base URL）**
   - **API Key**
   - **模型名称**

---

### 支持的服务商

#### 🔵 DeepSeek（推荐，适合中文场景）

| 项目 | 值 |
|------|-----|
| API 地址 | `https://api.deepseek.com` |
| 模型 | `deepseek-chat` |
| 获取 Key | [platform.deepseek.com](https://platform.deepseek.com) |

**优点：** 价格便宜，中文理解能力强，建表效果好

---

#### 🟢 OpenAI

| 项目 | 值 |
|------|-----|
| API 地址 | `https://api.openai.com` |
| 模型 | `gpt-4o-mini`（推荐）或 `gpt-3.5-turbo` |
| 获取 Key | [platform.openai.com](https://platform.openai.com) |

**优点：** 效果稳定，英文建表优秀

---

#### 🟠 Kimi（Moonshot AI）

| 项目 | 值 |
|------|-----|
| API 地址 | `https://api.moonshot.cn/v1` |
| 模型 | `moonshot-v1-8k` |
| 获取 Key | [platform.moonshot.cn](https://platform.moonshot.cn) |

**优点：** 中文理解能力强，长文本支持好

---

#### 🔴 智谱 AI（GLM）

| 项目 | 值 |
|------|-----|
| API 地址 | `https://open.bigmodel.cn/api/paas/v4` |
| 模型 | `glm-4-flash`（有免费额度）|
| 获取 Key | [open.bigmodel.cn](https://open.bigmodel.cn) |

**优点：** 国产模型，有免费额度，适合测试

---

#### 🌐 其他 OpenAI 兼容服务

FluxSQL 支持所有兼容 OpenAI API 格式的服务，包括：
- 本地部署的 Ollama（`http://localhost:11434/v1`）
- 硅基流动（SiliconFlow）
- 字节跳动火山引擎
- 腾讯云 AI
- 阿里云百炼

只需填入对应的 Base URL、API Key 和模型名称即可。

---

### 安全说明

- API Key 仅保存在你的浏览器 localStorage 中
- 不会上传到任何第三方服务器
- 关闭私密窗口（隐身模式）后会清除
- 建议不要在公共电脑上保存 API Key

---

## English Guide

FluxSQL's AI features require an AI API key. Here's how to configure major providers.

### Opening the Config Panel

1. Open FluxSQL (`index.html`)
2. Click the **「⚙ AI Settings」** button in the top-right area
3. Fill in:
   - **Base URL**
   - **API Key**
   - **Model Name**

---

### Supported Providers

#### DeepSeek (Recommended)

| Field | Value |
|-------|-------|
| Base URL | `https://api.deepseek.com` |
| Model | `deepseek-chat` |
| Get Key | [platform.deepseek.com](https://platform.deepseek.com) |

Affordable, excellent for Chinese-language table descriptions.

---

#### OpenAI

| Field | Value |
|-------|-------|
| Base URL | `https://api.openai.com` |
| Model | `gpt-4o-mini` or `gpt-3.5-turbo` |
| Get Key | [platform.openai.com](https://platform.openai.com) |

Reliable, great English support.

---

#### Kimi (Moonshot AI)

| Field | Value |
|-------|-------|
| Base URL | `https://api.moonshot.cn/v1` |
| Model | `moonshot-v1-8k` |
| Get Key | [platform.moonshot.cn](https://platform.moonshot.cn) |

---

#### Other OpenAI-Compatible APIs

FluxSQL works with any OpenAI-compatible API:
- Local Ollama (`http://localhost:11434/v1`)
- Any cloud provider with OpenAI-format endpoints

Just enter the provider's Base URL, API Key, and model name.

---

### Security Note

- Your API key is stored only in browser localStorage
- It is never sent to any third-party server
- Clears when you close a private/incognito window
- Avoid saving API keys on shared computers

---

[← User Guide](./user-guide.md) | [← Back to Home](../README.md)
