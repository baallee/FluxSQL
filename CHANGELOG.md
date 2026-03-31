# Changelog

All notable changes to FluxSQL will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-31

### Added
- 🎉 Initial release of FluxSQL
- 🤖 AI-powered table generation from natural language
- 🗄️ Support for 4 database dialects: Oracle, MySQL, PostgreSQL, SQL Server
- 🎨 Visual table editor with drag-and-drop field ordering
- 📤 Import/Export functionality (SQL DDL and JSON formats)
- 💡 Quick prompt templates for common table patterns
- 🔄 Multi-table workspace with instant switching
- 🔒 Local storage support (browser localStorage)
- 🌓 Modern dark theme UI
- 📱 Responsive design for desktop and tablet
- 🧪 Field type validation and database-specific warnings
- 📋 Copy generated SQL to clipboard

### Features
- Natural language to table structure conversion
- Real-time SQL preview with syntax highlighting
- Database dialect switching (Oracle ↔ MySQL ↔ PostgreSQL ↔ SQL Server)
- Visual field editor with: primary key, nullable, default value, comment
- Built-in prompt chips for: users table, orders table, products table, etc.
- Save/load project state (localStorage)
- Import existing SQL files
- Export as SQL (DDL) or JSON
- Table metadata: table name, comment, engine/charset (MySQL-specific)

### AI Integration
- OpenAI-compatible API support
- Configurable AI providers (DeepSeek, OpenAI, Kimi, Zhipu AI)
- API key management in UI
- AI mode selection (create table / modify table / analyze schema)
- Streaming response support
- Error handling with retry option

### UI/UX
- Clean dark theme with purple/blue accents
- Collapsible AI panel
- Sidebar table list
- Dialect selector with visual feedback
- Action buttons: Create, Import, Export, Clear
- Loading states and animations
- Toast notifications

### Supported Field Types
- MySQL: INT, VARCHAR, TEXT, DECIMAL, DATETIME, TIMESTAMP, JSON, ENUM, etc.
- PostgreSQL: SERIAL, INTEGER, VARCHAR, TEXT, NUMERIC, TIMESTAMP, JSONB, etc.
- Oracle: NUMBER, VARCHAR2, CLOB, DATE, TIMESTAMP, etc.
- SQL Server: INT, NVARCHAR, VARCHAR, DECIMAL, DATETIME, BIT, etc.

### Documentation
- README.md (Chinese)
- README_en.md (English)
- User guide (Chinese & English)
- API configuration guide
- Contributing guide

### Technology
- Pure HTML/CSS/JavaScript
- Zero external dependencies
- CSS variables for theming
- Flexbox layout
- localStorage for persistence
- Fetch API for AI calls

---

## [1.0.0]: https://github.com/your-username/FluxSQL/releases/tag/v1.0.0
