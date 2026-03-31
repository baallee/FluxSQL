# FluxSQL User Guide

> Version: v1.0.0 | [中文版](./user-guide.md)

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Interface Overview](#interface-overview)
3. [Creating Tables](#creating-tables)
4. [AI Table Generation](#ai-table-generation)
5. [Editing Fields](#editing-fields)
6. [Switching Database Dialects](#switching-database-dialects)
7. [Importing SQL](#importing-sql)
8. [Exporting SQL / JSON](#exporting-sql--json)
9. [FAQ](#faq)

---

## Getting Started

1. Download `index.html`
2. Double-click the file, or drag it into any browser window
3. Start designing — no installation, no configuration needed

**Supported browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

> **Note:** Your work is automatically saved in browser localStorage. It persists across sessions unless you clear browser data.

---

## Interface Overview

FluxSQL has three main areas:

```
┌───────────────────────────────────────────────────────┐
│  Top Bar: Dialect Selector | Import | Export | New | AI │
├──────────┬────────────────────────────────────────────┤
│          │  Field Editor                               │
│  Table   │  - Field Name                               │
│  List    │  - Data Type                                │
│ (sidebar)│  - Constraints                              │
│          │  - Comment                                  │
│          ├────────────────────────────────────────────┤
│          │  AI Chat Panel (collapsible)                │
└──────────┴────────────────────────────────────────────┘
```

### Top Bar Buttons

| Button | Function |
|--------|----------|
| **Oracle/MySQL/PostgreSQL/SQL Server** | Switch SQL dialect |
| **+ New Table** | Create a new table manually |
| **Import** | Import SQL or JSON file |
| **Export SQL** | Export DDL for all tables |
| **Export JSON** | Export table structure as JSON |
| **✨ AI** | Open AI chat panel |

---

## Creating Tables

### Option 1: Manual Creation

1. Click **「+ New Table」** in the top bar
2. Enter a table name and optional comment
3. Click confirm to enter the field editor
4. Click **「+ Add Field」** to add fields

### Option 2: AI Generation (Recommended)

See [AI Table Generation](#ai-table-generation) below.

---

## AI Table Generation

### Setting Up Your API Key

1. Click **「⚙ Settings」** or the AI config button
2. Select your AI provider (DeepSeek recommended — affordable and good)
3. Enter your API Key and model name
4. Save

> Your API key is stored locally in the browser and never sent anywhere else.

See full instructions in [api-config.md](./api-config.md)

### Using AI to Build Tables

1. Click **「✨ AI」** at the bottom to expand the AI panel
2. Describe your table in natural language:
   ```
   Create a users table with ID, username, email, phone number, password, 
   avatar URL, created_at, and last_login. Email and phone should be unique.
   ```
3. Press the send button (or `Ctrl+Enter`)
4. AI analyzes your description and generates a field plan
5. Review the plan and click **「Execute」** to apply

### Quick Prompt Templates

Click the template chips above the input for common tables:
- 👤 Users
- 📦 Orders
- 🛍️ Products
- 📝 Articles
- 📁 Files

### AI Modes

| Mode | When to Use |
|------|-------------|
| **Create Mode** | Building a new table from scratch |
| **Modify Mode** | Adding/changing fields on existing table |
| **Analyze Mode** | Getting suggestions and optimization advice |

---

## Editing Fields

### Adding Fields

Click **「+ Add Field」** at the bottom of the field list.

### Field Properties

| Property | Description |
|----------|-------------|
| **Field Name** | Column name, follows selected database conventions |
| **Data Type** | Dropdown filtered to current dialect |
| **Length/Precision** | For VARCHAR, DECIMAL, etc. |
| **PK** | Primary key (auto-adds NOT NULL) |
| **NN** | NOT NULL constraint |
| **UQ** | UNIQUE constraint |
| **AI** | Auto-increment (AUTO_INCREMENT / SERIAL / IDENTITY) |
| **Default** | Default value, supports functions (e.g., CURRENT_TIMESTAMP) |
| **Comment** | Field description, generates COMMENT clause |

### Drag to Reorder

Hold the drag handle (⠿) on the left of any field row and drag to reorder.

### Deleting Fields

Click the **「×」** button on the right of any field row.

---

## Switching Database Dialects

Click a dialect button in the top selector:

- **Oracle** — NUMBER, VARCHAR2, SEQUENCE, etc.
- **MySQL** — AUTO_INCREMENT, ENGINE=InnoDB, etc.
- **PostgreSQL** — SERIAL, TEXT, JSONB, etc.
- **SQL Server** — IDENTITY, NVARCHAR, etc.

The SQL preview updates instantly. Incompatible field types will show a yellow warning.

---

## Importing SQL

1. Click **「Import」** in the top bar
2. Choose how to import:
   - Paste SQL text
   - Upload a `.sql` file
   - Upload a `.json` file (FluxSQL format)
3. Click confirm — FluxSQL parses and imports the structure

> **Supported format:** Standard `CREATE TABLE` statements from most major databases.

---

## Exporting SQL / JSON

### Export SQL

1. Click **「Export SQL」**
2. Copy to clipboard or download as `.sql`
3. Output is clean DDL ready to run in your database

### Export JSON

1. Click **「Export JSON」**
2. Saves in FluxSQL's internal format
3. Use for backup or migrating work between devices

---

## FAQ

**Q: AI isn't responding — what's wrong?**  
A: Check your API key configuration and ensure you have a network connection. The AI feature requires access to the API server you configured.

**Q: Will my data persist after closing the browser?**  
A: Yes! Data is saved in browser localStorage and persists until you clear browser data. Export JSON regularly as a backup.

**Q: Can I use it on mobile?**  
A: The interface has basic responsive design, but a desktop browser is strongly recommended for the best experience.

**Q: My imported SQL shows errors — how do I fix it?**  
A: Ensure your SQL is standard `CREATE TABLE` syntax. Highly custom stored procedures or database-specific extensions may not parse correctly.

**Q: Which AI providers are supported?**  
A: Any provider with an OpenAI-compatible API, including OpenAI, DeepSeek, Kimi, Zhipu AI, and more.

---

[← Back to Home](../README_en.md) | [API Configuration →](./api-config.md)
