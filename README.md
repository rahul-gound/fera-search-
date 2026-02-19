# 🚀 Fera-Search  
**Privacy-First AI Meta Search Engine**

🔎 Use Fera-Search online:  
👉 https://search.fera-search.tech/

---

## 🌿 What is Fera-Search?

Fera-Search is a privacy-focused meta search engine that combines results from multiple upstream engines and adds AI summaries, without requiring user accounts or building tracking profiles.

Built for:
- ⚡ Speed
- 🔒 Privacy
- 🧠 Useful AI summaries
- 🧩 Simple, modular architecture

---

## ✨ Features

- Meta search (aggregates results from multiple engines)
- Categories: **General / Images / Videos / News**
- SafeSearch toggle
- AI summary panel (non-blocking)
- Mobile-friendly UI + dark mode
- Optional **local history** (stored only in your browser)

---

## 🔐 Privacy

Fera-Search is designed to reduce tracking:
- No login required
- No forced user identity
- Search history is **optional** and stored locally in your browser (if enabled)
- AI summary is generated only from top search results (no personal data)

---

## 🌍 How to Use (Online)

Open:
👉 https://search.fera-search.tech/

Search normally using the UI.

### Category behavior (what the backend expects)

Fera proxy endpoint format:

- **General**
  `.../search?q=hi&safesearch=1&categories=general`

- **Images**
  `.../search?q=hi&safesearch=1&categories=images`

- **Videos**
  `.../search?q=hi&safesearch=1&categories=videos`

- **News**
  `.../search?q=hi&safesearch=1&categories=news`

AI summary endpoint format:

- **AI Summary (General only)**
  `.../summarize?q=hi&safesearch=1&categories=general`

---

## 🧠 Frontend Logic (Important)

The UI works best when:
1. Call `/search` first to show results instantly  
2. Then call `/summarize` to fetch AI summary (without blocking the results)

This keeps the app fast and smooth.

---

## 🧩 Frontend Help Wanted (Contributions)

We are actively improving the frontend UI/UX.

If you can help with:
- fixing category rendering (news/video/image)
- better result cards
- performance improvements
- UI polish + responsiveness
- bug fixes

Please reach out or open a PR/issues. ❤️

---

## 💛 Support / Donation / Contact

If you want to support this project or help us improve it, contact:

📩 **singantima203@gmail.com**

(Help with frontend contributions is highly appreciated.)

---

## 📄 License

Open-source. Use, modify, and learn from it.
