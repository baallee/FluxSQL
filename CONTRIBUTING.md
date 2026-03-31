# Contributing to FluxSQL

Thank you for your interest in contributing to FluxSQL! 🎉

Since FluxSQL is a single-file application, contributing is straightforward — you only need a text editor and a browser.

---

## Ways to Contribute

- 🐛 **Report bugs** — Open an Issue with a clear description and reproduction steps
- 💡 **Suggest features** — Share your ideas in Issues
- 🛠️ **Fix bugs** — Check existing Issues labeled `bug`, submit a PR
- ✨ **Add features** — Discuss in Issues first, then submit a PR
- 📝 **Improve docs** — Fix typos, add examples, improve clarity
- 🌍 **Translations** — Help translate the UI or documentation
- ⭐ **Star & Share** — Spread the word!

---

## Getting Started

1. **Fork** this repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/FluxSQL.git
   cd FluxSQL
   ```
3. **Open** `index.html` directly in your browser (no build step needed!)
4. **Make changes** in a text editor
5. **Refresh** the browser to test your changes

That's the entire dev setup.

---

## Submitting a Pull Request

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

2. Make your changes in `index.html`

3. Test your changes in at least Chrome/Firefox

4. Commit with a descriptive message:
   ```bash
   git commit -m "feat: add SQLite dialect support"
   # or
   git commit -m "fix: correct Oracle NUMBER type default precision"
   ```

5. Push and open a Pull Request

---

## Commit Message Format

We follow a simplified version of [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation only
- `style` — CSS/UI changes (no logic change)
- `refactor` — Code refactoring (no feature change)
- `chore` — Build process, dependencies, tooling

**Examples:**
```
feat: add SQLite dialect support
fix: correct field type mapping for PostgreSQL SERIAL
docs: add FAQ section to README
style: improve AI panel layout on narrow screens
```

---

## Code Guidelines

Since FluxSQL is a single-file app, keep these in mind:

- **No external libraries** — keep zero-dependency principle
- **CSS variables** — use existing `--variable` names for colors/sizes
- **Comment your code** — especially for complex logic
- **Test all 4 dialects** — changes to SQL generation must work for Oracle, MySQL, PostgreSQL, SQL Server
- **Browser compatibility** — target Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## Reporting Bugs

Please include:

1. Browser and version (e.g., Chrome 120)
2. Operating system
3. Steps to reproduce
4. What you expected vs. what actually happened
5. Screenshots if applicable

---

## Feature Requests

Open an Issue with:

1. A clear description of the feature
2. Why it would be useful
3. Any mockups or examples (optional)

---

## Questions?

Open an Issue with the `question` label. We're happy to help!

---

Thank you for making FluxSQL better! 💙
