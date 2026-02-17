# Fera Search

A premium, privacy-first metasearch web app with AI-powered summaries.

## Features

- **Privacy-first** — No personal tracking, all history stored locally (opt-in)
- **AI Summaries** — Get AI-generated summaries alongside search results
- **Dark mode** — System default with manual toggle
- **Keyboard shortcuts** — Press `/` to focus search
- **Responsive** — Desktop two-panel layout, mobile with collapsible AI drawer
- **Fast** — Search results load first, AI follows asynchronously

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- IndexedDB (via `idb`) for local history

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/       # UI components
│   ├── AIPanel.tsx       # AI summary panel
│   ├── Header.tsx        # App header with navigation
│   ├── HistoryDrawer.tsx # Search history sidebar
│   ├── Infobox.tsx       # Knowledge panel cards
│   ├── ResultCard.tsx    # Individual search result
│   ├── SearchBar.tsx     # Search input with keyboard support
│   ├── SignInModal.tsx   # Sign-in UI (placeholder)
│   ├── Skeletons.tsx     # Loading skeleton components
│   └── Suggestions.tsx   # Related search chips
├── hooks/
│   ├── useSearch.ts      # Search + AI state management
│   └── useTheme.ts       # Dark mode hook
├── lib/
│   ├── api.ts            # API fetch functions
│   ├── auth.ts           # Auth placeholders (Supabase-ready)
│   ├── config.ts         # App configuration
│   ├── history.ts        # IndexedDB history storage
│   ├── sync.ts           # Cloud sync placeholders
│   └── types.ts          # TypeScript type definitions
├── App.tsx               # Main application component
├── index.css             # Global styles + Tailwind
└── main.tsx              # Entry point
```

## API

Uses the Fera Search proxy backend:

- `GET /search?q=QUERY` — Search results (fast)
- `GET /summarize?q=QUERY` — AI summary (slower, non-blocking)

## Deploy to GitHub Pages

1. Update `vite.config.ts` with your base path:
   ```ts
   export default defineConfig({
     base: '/fera-search-/',
     plugins: [react(), tailwindcss()],
   })
   ```
2. Build: `npm run build`
3. Deploy the `dist/` folder to GitHub Pages
