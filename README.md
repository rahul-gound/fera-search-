# Fera Search

A premium, privacy-first metasearch web app with AI-powered summaries.
Built with plain **HTML, CSS, and JavaScript** — no build tools, no frameworks.

## Features

- **Privacy-first** — No personal tracking, all history stored locally (opt-in)
- **AI Summaries** — Get AI-generated summaries alongside search results
- **Dark mode** — System default with manual toggle
- **Keyboard shortcuts** — Press `/` to focus search
- **Responsive** — Desktop two-panel layout, mobile with collapsible AI drawer
- **Fast** — Search results load first, AI follows asynchronously
- **Static** — Just HTML, CSS, JS — open `index.html` in any browser

## Getting Started

No build step required. Just open `index.html` in your browser, or serve it with any static file server:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve .

# Or just double-click index.html
```

## Project Structure

```
├── index.html     # Main HTML with all markup
├── style.css      # All styles (dark mode, responsive, animations)
├── app.js         # All JavaScript logic (search, AI, history, theme)
└── README.md
```

## API

Uses the Fera Search proxy backend:

- `GET /search?q=QUERY` — Search results (fast)
- `GET /summarize?q=QUERY` — AI summary (slower, non-blocking)

## Deploy

Upload `index.html`, `style.css`, and `app.js` to any static hosting:
- GitHub Pages
- Netlify
- Vercel
- Any web server
