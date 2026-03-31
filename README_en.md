<div align="center">

<h1>⚡ FluxSQL</h1>

<p><strong>AI-Powered Database Table Designer</strong></p>

<p>
  <a href="./README.md">中文</a> · 
  <a href="#quick-start">Quick Start</a> · 
  <a href="#features">Features</a> · 
  <a href="./docs/user-guide_en.md">User Guide</a> · 
  <a href="./docs/api-config.md">API Setup</a>
</p>

<p>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/version-1.0.0-green.svg" alt="Version">
  <img src="https://img.shields.io/badge/built%20with-HTML%2FCSS%2FJS-orange.svg" alt="Built with">
  <img src="https://img.shields.io/badge/dependencies-none-brightgreen.svg" alt="No Dependencies">
  <img src="https://img.shields.io/badge/local--first-yes-purple.svg" alt="Local First">
</p>

<br/>

> Describe your database tables in plain language. FluxSQL generates clean, dialect-aware SQL instantly. Supports Oracle, MySQL, PostgreSQL, and SQL Server. Download and run — no server needed.

<br/>

<!-- Main interface screenshot -->
![FluxSQL Main Interface](./assets/screenshots/main-interface.png)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Table Generation** | Describe in natural language, get complete DDL with proper field types |
| 🗄️ **Multi-Database Support** | Switch between Oracle / MySQL / PostgreSQL / SQL Server with one click |
| ⚡ **Zero Setup** | Single HTML file — download and open in any browser, no installation |
| 🔒 **100% Local** | Data stored in browser localStorage. No server, no uploads, fully private |
| 🎨 **Visual Editor** | Intuitive table editor with drag-and-drop field ordering |
| 📤 **Import / Export** | Import existing SQL schemas, export as SQL DDL or JSON |
| 💡 **Smart Templates** | Built-in prompt chips for common tables (users, orders, products) |
| 🔄 **Multi-Table Workspace** | Manage multiple tables in one workspace, switch instantly |

---

## 🚀 Quick Start

**3 steps to get started:**

```
1. Download  index.html
2. Open it in your browser (Chrome, Firefox, Safari, Edge)
3. Start designing your database ✓
```

**That's it. No npm install. No docker. No config files.**

> 💡 To use AI features, you'll need an AI API key (OpenAI / DeepSeek / Kimi, etc.). See [API Setup Guide](./docs/api-config.md)

---

## 🎬 Demo

### AI Natural Language Table Creation

<!-- GIF: AI table creation demo -->
![AI Table Creation](./assets/gifs/ai-table-creation.gif)

Input: `"Create a users table with ID, username, email, phone number, and created_at"`  
Output: Complete field definitions with appropriate data types — automatically.

---

### Database Dialect Switching

<!-- GIF: Database switching demo -->
![Database Switch](./assets/gifs/dialect-switch.gif)

Same table design, instant SQL conversion across four database dialects.

---

### Visual Field Editing

<!-- GIF: Field editing demo -->
![Field Editing](./assets/gifs/field-editing.gif)

Drag to reorder, set primary keys, nullable, default values, and comments visually.

---

### Import & Export

<!-- GIF: Import/Export demo -->
![Import Export](./assets/gifs/import-export.gif)

Import existing SQL or JSON schemas. Export production-ready DDL statements.

---

## 📸 Screenshots

<table>
  <tr>
    <td><img src="./assets/screenshots/main-interface.png" alt="Main Interface" /></td>
    <td><img src="./assets/screenshots/ai-dialog.png" alt="AI Dialog" /></td>
  </tr>
  <tr>
    <td align="center">Main Interface</td>
    <td align="center">AI Chat Panel</td>
  </tr>
  <tr>
    <td><img src="./assets/screenshots/sql-preview.png" alt="SQL Preview" /></td>
    <td><img src="./assets/screenshots/database-switch.png" alt="Database Switch" /></td>
  </tr>
  <tr>
    <td align="center">SQL Preview</td>
    <td align="center">Database Dialect Selector</td>
  </tr>
</table>

---

## 🗄️ Supported Databases

| Database | Version | Notable Types |
|----------|---------|---------------|
| **MySQL** | 5.7+ / 8.0+ | AUTO_INCREMENT, ENUM, JSON |
| **PostgreSQL** | 10+ | SERIAL, TEXT, JSONB |
| **Oracle** | 11g+ | NUMBER, VARCHAR2, SEQUENCE |
| **SQL Server** | 2016+ | IDENTITY, NVARCHAR, BIT |

---

## 🤖 AI Integration

FluxSQL works with any OpenAI-compatible API. Bring your own key:

| Provider | Recommended Model | Notes |
|----------|-------------------|-------|
| **DeepSeek** | deepseek-chat | Great for Chinese, very affordable |
| **OpenAI** | gpt-4o-mini | Reliable, strong English output |
| **Kimi (Moonshot)** | moonshot-v1-8k | Long context, good Chinese support |
| **Zhipu AI** | glm-4-flash | Chinese-made, free tier available |

> See full setup instructions in [docs/api-config.md](./docs/api-config.md)

---

## 📋 Use Cases

- **Database Design** — Turn requirement documents into schemas in minutes
- **Multi-DB Projects** — Design once, export to any SQL dialect
- **SQL Learning** — Visualize type differences across database engines
- **Team Reviews** — Present DB design visually to non-technical stakeholders
- **Legacy Refactoring** — Import old SQL, reorganize and modernize visually

---

## 📂 Project Structure

```
FluxSQL/
├── index.html          # 🚀 The entire app (this is all you need)
├── README.md           # 项目说明 (Chinese)
├── README_en.md        # Project README (English)
├── LICENSE             # MIT License
├── CHANGELOG.md        # Version history
├── CONTRIBUTING.md     # Contribution guide
├── assets/
│   ├── screenshots/    # Interface screenshots
│   └── gifs/           # Feature demo GIFs
└── docs/
    ├── user-guide.md   # Detailed guide (Chinese)
    ├── user-guide_en.md # Detailed guide (English)
    └── api-config.md   # AI API configuration
```

---

## 🛠️ Tech Stack

- **Pure Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Zero Dependencies**: No frameworks, no npm, no build tools
- **Local Storage**: Browser localStorage for persistence
- **AI Integration**: Standard REST API (OpenAI-compatible format)

---

## 🗺️ Roadmap

- [ ] ER diagram visualization
- [ ] More databases (SQLite, TiDB, etc.)
- [ ] Batch table creation mode
- [ ] Light / dark theme toggle
- [ ] i18n support
- [ ] Export as Markdown documentation

---

## 🤝 Contributing

Issues and pull requests are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the [MIT License](./LICENSE).

---

## 🙏 Acknowledgements

Thanks to everyone who uses and supports FluxSQL! If this tool helps you, please consider giving it a ⭐ Star!

---

<div align="center">
  <sub>Made with ❤️ | <a href="./README.md">中文版本 →</a></sub>
</div>
