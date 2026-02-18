(function () {
  "use strict";

  /* ===== Config ===== */
  var PROXY_BASE = "https://himanshu-711-fera-search-proxy.hf.space";
  var VALID_CATEGORIES = ["all", "video", "photo", "news"];
  var CATEGORY_API_MAP = {
    "all": "general",
    "video": "videos",
    "photo": "images",
    "news": "news"
  };
  var API_CATEGORY_UI_MAP = {
    "general": "all",
    "videos": "video",
    "images": "photo",
    "news": "news"
  };

  /* ===== State ===== */
  var state = {
    query: "",
    category: "all",
    searchData: null,
    searchLoading: false,
    searchError: null,
    aiData: null,
    aiLoading: false,
    aiError: null,
  };
  var searchAbort = null;
  var aiAbort = null;
  var historyEnabled = localStorage.getItem("fera-history") === "on";
  var safeSearch = (localStorage.getItem("fera-safesearch") || "on") === "on"; // default ON
  var aiDrawerOpen = false;

  /* ===== DOM refs ===== */
  var $searchInput = document.getElementById("search-input");
  var $searchForm = document.getElementById("search-form");
  var $resultsPanel = document.getElementById("results-panel");
  var $welcome = document.getElementById("welcome");
  var $aiDesktop = document.getElementById("ai-content-desktop");
  var $aiMobile = document.getElementById("ai-content-mobile");
  var $mobileAiToggle = document.getElementById("mobile-ai-toggle");
  var $aiPulse = document.getElementById("ai-pulse");
  var $aiDrawer = document.getElementById("ai-drawer");
  var $aiDrawerBackdrop = document.getElementById("ai-drawer-backdrop");
  var $historyDrawer = document.getElementById("history-drawer");
  var $historyBackdrop = document.getElementById("history-backdrop");
  var $historyContent = document.getElementById("history-content");
  var $historyToggleBtn = document.getElementById("btn-history-toggle");
  var $safeSearchToggle = document.getElementById("safesearch-toggle");
  var $settingsDrawer = document.getElementById("settings-drawer");
  var $settingsBackdrop = document.getElementById("settings-backdrop");
  var $settingsSafeSearchToggle = document.getElementById("settings-safesearch-toggle");
  var $settingsThemeToggle = document.getElementById("settings-theme-toggle");
  var $settingsHistoryToggle = document.getElementById("settings-history-toggle");

  /* ===== Theme ===== */
  function initTheme() {
    var saved = localStorage.getItem("fera-theme");
    var theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(theme);
  }
  function applyTheme(theme) {
    if (theme === "dark") {
      document.body.classList.add("dark");
      document.getElementById("icon-moon").style.display = "none";
      document.getElementById("icon-sun").style.display = "";
    } else {
      document.body.classList.remove("dark");
      document.getElementById("icon-moon").style.display = "";
      document.getElementById("icon-sun").style.display = "none";
    }
    localStorage.setItem("fera-theme", theme);
  }
  document.getElementById("btn-theme").addEventListener("click", function () {
    var isDark = document.body.classList.contains("dark");
    applyTheme(isDark ? "light" : "dark");
  });
  initTheme();

  /* ===== Keyboard shortcut: "/" focuses search ===== */
  document.addEventListener("keydown", function (e) {
    if (
      e.key === "/" &&
      document.activeElement !== $searchInput &&
      document.activeElement.tagName !== "INPUT" &&
      document.activeElement.tagName !== "TEXTAREA"
    ) {
      e.preventDefault();
      $searchInput.focus();
    }
  });

  /* ===== API ===== */
  function fetchSearch(query, category, signal) {
    var url = PROXY_BASE + "/search?q=" + encodeURIComponent(query);
    url += "&format=json&safesearch=" + (safeSearch ? "1" : "0");
    var apiCategory = CATEGORY_API_MAP[category] || "general";
    url += "&categories=" + encodeURIComponent(apiCategory);
    
    return fetch(url, { signal: signal })
      .then(function (res) {
        if (!res.ok) throw new Error("Search failed (" + res.status + ")");
        return res.json();
      });
  }
  function fetchSummarize(query, signal) {
    return fetch(PROXY_BASE + "/summarize?q=" + encodeURIComponent(query), { signal: signal })
      .then(function (res) {
        if (!res.ok) throw new Error("Summarize failed (" + res.status + ")");
        return res.json();
      });
  }

  /* ===== Search ===== */
  function doSearch(query) {
    var trimmed = query.trim();
    if (!trimmed) return;

    // Abort previous
    if (searchAbort) searchAbort.abort();
    if (aiAbort) aiAbort.abort();

    var sCtrl = new AbortController();
    var aCtrl = new AbortController();
    searchAbort = sCtrl;
    aiAbort = aCtrl;

    state.query = trimmed;
    state.searchData = null;
    state.searchLoading = true;
    state.searchError = null;
    state.aiData = null;
    // Only enable AI loading for "all" category
    state.aiLoading = (state.category === "all");
    state.aiError = null;

    $searchInput.value = trimmed;

    // Update URL
    var url = new URL(window.location.href);
    url.searchParams.set("q", trimmed);
    var currentApiCategory = CATEGORY_API_MAP[state.category] || "general";
    url.searchParams.set("safesearch", safeSearch ? "1" : "0");
    url.searchParams.set("categories", currentApiCategory);
    url.searchParams.delete("category");
    window.history.pushState({}, "", url.toString());

    renderResults();
    renderAI();

    // 1) Search results first
    fetchSearch(trimmed, state.category, sCtrl.signal)
      .then(function (data) {
        state.searchData = data;
        state.searchLoading = false;
        renderResults();

        // Save history
        if (historyEnabled && data && data.data && data.data.results) {
          var top3 = data.data.results.slice(0, 3).map(function (r) {
            return { title: r.title, url: r.url };
          });
          addHistoryItem({ query: trimmed, time: Date.now(), top3: top3 });
        }
      })
      .catch(function (err) {
        if (err.name === "AbortError") return;
        state.searchLoading = false;
        state.searchError = err.message || "Search failed";
        state.aiLoading = false;
        renderResults();
        renderAI();
        return;
      })
      .then(function () {
        if (state.searchError) return;
        // 2) AI summary (non-blocking) - ONLY for "all" category
        if (state.category !== "all") {
          state.aiLoading = false;
          renderAI();
          return;
        }
        return fetchSummarize(trimmed, aCtrl.signal)
          .then(function (ai) {
            state.aiData = ai;
            state.aiLoading = false;
            renderAI();
            // Auto-open mobile AI drawer
            if (window.innerWidth < 768) {
              openAiDrawer();
            }
          })
          .catch(function (err) {
            if (err.name === "AbortError") return;
            state.aiLoading = false;
            state.aiError = err.message || "AI summary failed";
            renderAI();
          });
      });
  }

  function retryAI() {
    if (!state.query) return;
    if (aiAbort) aiAbort.abort();
    var ctrl = new AbortController();
    aiAbort = ctrl;
    state.aiLoading = true;
    state.aiError = null;
    state.aiData = null;
    renderAI();
    fetchSummarize(state.query, ctrl.signal)
      .then(function (ai) {
        state.aiData = ai;
        state.aiLoading = false;
        renderAI();
      })
      .catch(function (err) {
        if (err.name === "AbortError") return;
        state.aiLoading = false;
        state.aiError = err.message || "AI summary failed";
        renderAI();
      });
  }

  /* ===== Render: Results ===== */
  function renderResults() {
    // Clear dynamic content (keep welcome hidden/shown)
    var children = Array.from($resultsPanel.children);
    children.forEach(function (c) {
      if (c.id !== "welcome") $resultsPanel.removeChild(c);
    });

    var hasQuery = state.query.length > 0;
    $welcome.style.display = hasQuery ? "none" : "";
    $mobileAiToggle.style.display = hasQuery ? "" : "none";
    $aiPulse.style.display = state.aiLoading ? "" : "none";

    if (!hasQuery) return;

    var results = (state.searchData && state.searchData.data && state.searchData.data.results) || [];
    var infoboxes = (state.searchData && state.searchData.data && state.searchData.data.infoboxes) || [];
    var suggestions = (state.searchData && state.searchData.data && state.searchData.data.suggestions) || [];

    // Infoboxes
    infoboxes.forEach(function (ib) {
      $resultsPanel.appendChild(createInfobox(ib));
    });

    // Suggestions
    if (suggestions.length > 0) {
      $resultsPanel.appendChild(createSuggestions(suggestions));
    }

    // Loading skeletons
    if (state.searchLoading) {
      var skList = document.createElement("div");
      skList.className = "skeleton-list";
      for (var i = 0; i < 5; i++) {
        skList.appendChild(createSkeletonCard());
      }
      $resultsPanel.appendChild(skList);
      return;
    }

    // Error
    if (state.searchError) {
      var errDiv = document.createElement("div");
      errDiv.className = "error-card";
      errDiv.innerHTML = '<p>Something went wrong. Please try again.</p>';
      var retryBtn = document.createElement("button");
      retryBtn.className = "retry-link";
      retryBtn.textContent = "Retry";
      retryBtn.addEventListener("click", function () { doSearch(state.query); });
      errDiv.appendChild(retryBtn);
      $resultsPanel.appendChild(errDiv);
      return;
    }

    // Results
    if (results.length > 0) {
      var list = document.createElement("div");
      list.className = "results-list";
      results.forEach(function (r) {
        list.appendChild(createResultCard(r));
      });
      $resultsPanel.appendChild(list);
      return;
    }

    // Empty
    if (state.searchData) {
      var empty = document.createElement("div");
      empty.className = "empty-card";
      empty.innerHTML = '<p>No results found for "' + escapeHtml(state.query) + '"</p>';
      $resultsPanel.appendChild(empty);
    }
  }

  function createResultCard(r) {
    var card = document.createElement("article");
    card.className = "result-card";

    var inner = document.createElement("div");
    inner.className = "result-inner";

    var body = document.createElement("div");
    body.className = "result-body";

    // Domain
    var domain = document.createElement("p");
    domain.className = "result-domain";
    domain.textContent = getDomain(r.url);
    body.appendChild(domain);

    // Title
    var title = document.createElement("a");
    title.className = "result-title";
    title.href = r.url;
    title.target = "_blank";
    title.rel = "noopener noreferrer";
    title.textContent = r.title || "Untitled";
    body.appendChild(title);

    // Snippet
    if (r.content) {
      var snippet = document.createElement("p");
      snippet.className = "result-snippet";
      snippet.textContent = r.content;
      body.appendChild(snippet);
    }

    // Engine badges
    var engines = r.engines || (r.engine ? [r.engine] : []);
    if (engines.length > 0) {
      var badges = document.createElement("div");
      badges.className = "result-engines";
      engines.forEach(function (eng) {
        var badge = document.createElement("span");
        badge.className = "engine-badge " + engineBadgeClass(eng);
        badge.textContent = eng;
        badges.appendChild(badge);
      });
      body.appendChild(badges);
    }

    inner.appendChild(body);

    // Thumbnail
    var thumbUrl = r.thumbnail || r.img_src;
    if (thumbUrl) {
      var img = document.createElement("img");
      img.className = "result-thumb";
      img.src = thumbUrl;
      img.alt = "";
      img.loading = "lazy";
      img.onerror = function () { img.style.display = "none"; };
      inner.appendChild(img);
    }

    card.appendChild(inner);
    return card;
  }

  function createInfobox(ib) {
    var card = document.createElement("div");
    card.className = "infobox-card";

    var inner = document.createElement("div");
    inner.className = "infobox-inner";

    if (ib.img_src) {
      var img = document.createElement("img");
      img.className = "infobox-img";
      img.src = ib.img_src;
      img.alt = ib.infobox || "";
      img.onerror = function () { img.style.display = "none"; };
      inner.appendChild(img);
    }

    var body = document.createElement("div");
    body.className = "infobox-body";
    var h3 = document.createElement("h3");
    h3.textContent = ib.infobox || "";
    body.appendChild(h3);
    if (ib.content) {
      var p = document.createElement("p");
      p.textContent = ib.content;
      body.appendChild(p);
    }
    inner.appendChild(body);
    card.appendChild(inner);

    if (ib.urls && ib.urls.length > 0) {
      var links = document.createElement("div");
      links.className = "infobox-links";
      ib.urls.slice(0, 4).forEach(function (link) {
        var a = document.createElement("a");
        a.href = link.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = link.title;
        links.appendChild(a);
      });
      card.appendChild(links);
    }

    return card;
  }

  function createSuggestions(suggestions) {
    var wrap = document.createElement("div");
    wrap.className = "suggestions";
    var label = document.createElement("span");
    label.className = "label";
    label.textContent = "Related:";
    wrap.appendChild(label);
    suggestions.forEach(function (s) {
      var btn = document.createElement("button");
      btn.className = "suggestion-chip";
      btn.textContent = s;
      btn.addEventListener("click", function () { doSearch(s); });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function createSkeletonCard() {
    var card = document.createElement("div");
    card.className = "skeleton-card";
    card.innerHTML =
      '<div class="skeleton sk" style="height:12px;width:128px"></div>' +
      '<div class="skeleton sk" style="height:20px;width:75%"></div>' +
      '<div class="skeleton sk" style="height:12px;width:100%"></div>' +
      '<div class="skeleton sk" style="height:12px;width:83%"></div>' +
      '<div class="sk-row"><div class="skeleton" style="height:20px;width:64px"></div><div class="skeleton" style="height:20px;width:56px"></div></div>';
    return card;
  }

  /* ===== Render: AI ===== */
  function renderAI() {
    var html = buildAIHTML();
    $aiDesktop.innerHTML = html;
    $aiMobile.innerHTML = html;

    // Wire up event listeners for dynamic buttons
    wireAIButtons($aiDesktop);
    wireAIButtons($aiMobile);

    $aiPulse.style.display = state.aiLoading ? "" : "none";
  }

  function buildAIHTML() {
    var hasQuery = state.query.length > 0;

    if (!hasQuery) {
      return '<p class="ai-idle">Search to see an AI summary</p>';
    }

    // Show message if category is not "all"
    if (state.category !== "all") {
      return '<p class="ai-idle">AI summaries are only available for "All" category searches</p>';
    }

    if (state.aiLoading) {
      return '<div class="ai-thinking"><div class="dot"></div><span>Thinking…</span></div>' +
        '<div class="skeleton" style="height:16px;width:100%;margin-bottom:12px"></div>' +
        '<div class="skeleton" style="height:16px;width:83%;margin-bottom:12px"></div>' +
        '<div class="skeleton" style="height:16px;width:66%;margin-bottom:12px"></div>' +
        '<div class="skeleton" style="height:16px;width:100%;margin-bottom:12px"></div>' +
        '<div class="skeleton" style="height:16px;width:75%;margin-bottom:16px"></div>' +
        '<div style="display:flex;gap:8px">' +
        '<div class="skeleton" style="height:28px;width:80px;border-radius:9999px"></div>' +
        '<div class="skeleton" style="height:28px;width:96px;border-radius:9999px"></div>' +
        '<div class="skeleton" style="height:28px;width:64px;border-radius:9999px"></div>' +
        '</div>';
    }

    if (state.aiError) {
      return '<p class="ai-error">AI not available</p>' +
        '<button class="retry-link" data-ai-retry>Retry</button>';
    }

    if (state.aiData && state.aiData.ai) {
      var ai = state.aiData.ai;
      var h = '';

      // Summary
      h += '<div class="ai-summary-text">' + escapeHtml(ai.summary || "") + '</div>';

      // Key points
      if (ai.key_points && ai.key_points.length > 0) {
        h += '<p class="ai-section-label">Key Points</p><div class="ai-chips">';
        ai.key_points.forEach(function (kp) {
          h += '<span class="ai-chip">' + escapeHtml(kp) + '</span>';
        });
        h += '</div>';
      }

      // Best sources
      if (ai.best_sources && ai.best_sources.length > 0) {
        h += '<p class="ai-section-label">Best Sources</p><ul class="ai-sources">';
        ai.best_sources.forEach(function (src) {
          h += '<li><a href="' + escapeAttr(src.url) + '" target="_blank" rel="noopener noreferrer">' +
            escapeHtml(src.title || src.url) + '</a></li>';
        });
        h += '</ul>';
      }

      // Follow-up queries
      if (ai.follow_up_queries && ai.follow_up_queries.length > 0) {
        h += '<p class="ai-section-label">Related Searches</p><div class="ai-chips">';
        ai.follow_up_queries.forEach(function (q) {
          h += '<button class="ai-followup-chip" data-followup="' + escapeAttr(q) + '">' + escapeHtml(q) + '</button>';
        });
        h += '</div>';
      }

      h += '<p class="ai-privacy">Generated from top results (no personal tracking)</p>';
      return h;
    }

    return '<p class="ai-idle">Search to see an AI summary</p>';
  }

  function wireAIButtons(container) {
    // Retry button
    var retryBtn = container.querySelector("[data-ai-retry]");
    if (retryBtn) {
      retryBtn.addEventListener("click", retryAI);
    }
    // Follow-up chips
    var followups = container.querySelectorAll("[data-followup]");
    followups.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var q = btn.getAttribute("data-followup");
        closeAiDrawer();
        doSearch(q);
      });
    });
  }

  /* ===== Mobile AI drawer ===== */
  function openAiDrawer() {
    aiDrawerOpen = true;
    $aiDrawerBackdrop.style.display = "";
    $aiDrawer.classList.add("open");
  }
  function closeAiDrawer() {
    aiDrawerOpen = false;
    $aiDrawerBackdrop.style.display = "none";
    $aiDrawer.classList.remove("open");
  }
  document.getElementById("btn-mobile-ai").addEventListener("click", function () {
    if (aiDrawerOpen) closeAiDrawer();
    else openAiDrawer();
  });
  $aiDrawerBackdrop.addEventListener("click", closeAiDrawer);

  /* ===== History (IndexedDB) ===== */
  var DB_NAME = "fera-search";
  var STORE = "history";
  var DB_VERSION = 1;
  var MAX_ITEMS = 20;

  function openHistoryDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
          store.createIndex("time", "time");
        }
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  }

  function addHistoryItem(item) {
    return openHistoryDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        var store = tx.objectStore(STORE);
        store.add(item);
        tx.oncomplete = function () {
          // Prune old items
          var tx2 = db.transaction(STORE, "readwrite");
          var store2 = tx2.objectStore(STORE);
          var idx = store2.index("time");
          var all = [];
          idx.openCursor().onsuccess = function (e) {
            var cursor = e.target.result;
            if (cursor) {
              all.push(cursor.value);
              cursor.continue();
            } else {
              if (all.length > MAX_ITEMS) {
                var toDelete = all.slice(0, all.length - MAX_ITEMS);
                var tx3 = db.transaction(STORE, "readwrite");
                var store3 = tx3.objectStore(STORE);
                toDelete.forEach(function (old) { store3.delete(old.id); });
                tx3.oncomplete = resolve;
                tx3.onerror = reject;
              } else {
                resolve();
              }
            }
          };
        };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function getHistory() {
    return openHistoryDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly");
        var idx = tx.objectStore(STORE).index("time");
        var all = [];
        idx.openCursor().onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor) {
            all.push(cursor.value);
            cursor.continue();
          } else {
            resolve(all.reverse());
          }
        };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function clearHistory() {
    return openHistoryDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).clear();
        tx.oncomplete = resolve;
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  /* ===== History drawer UI ===== */
  function openHistoryDrawer() {
    $historyBackdrop.style.display = "";
    $historyDrawer.classList.add("open");
    renderHistoryContent();
  }
  function closeHistoryDrawer() {
    $historyBackdrop.style.display = "none";
    $historyDrawer.classList.remove("open");
  }
  function renderHistoryContent() {
    if (!historyEnabled) {
      $historyContent.innerHTML = '<p class="text-muted text-xs">History is off. No searches are stored locally.</p>';
      return;
    }
    getHistory().then(function (items) {
      if (items.length === 0) {
        $historyContent.innerHTML = '<p class="text-muted text-sm">No history yet.</p>';
        return;
      }
      var h = '<button class="history-clear" id="btn-clear-history">Clear all</button><ul class="history-list">';
      items.forEach(function (item) {
        h += '<li><button class="history-item" data-hquery="' + escapeAttr(item.query) + '">' +
          '<span class="hq">' + escapeHtml(item.query) + '</span>' +
          '<span class="ht">' + new Date(item.time).toLocaleString() + '</span>' +
          '</button></li>';
      });
      h += '</ul>';
      $historyContent.innerHTML = h;

      // Wire events
      document.getElementById("btn-clear-history").addEventListener("click", function () {
        clearHistory().then(function () { renderHistoryContent(); });
      });
      $historyContent.querySelectorAll("[data-hquery]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          doSearch(btn.getAttribute("data-hquery"));
          closeHistoryDrawer();
        });
      });
    });
  }

  // History toggle
  function updateHistoryToggle() {
    if (historyEnabled) {
      $historyToggleBtn.classList.add("on");
      $historyToggleBtn.setAttribute("aria-checked", "true");
    } else {
      $historyToggleBtn.classList.remove("on");
      $historyToggleBtn.setAttribute("aria-checked", "false");
    }
  }
  updateHistoryToggle();

  $historyToggleBtn.addEventListener("click", function () {
    historyEnabled = !historyEnabled;
    localStorage.setItem("fera-history", historyEnabled ? "on" : "off");
    updateHistoryToggle();
    renderHistoryContent();
  });

  document.getElementById("btn-history").addEventListener("click", openHistoryDrawer);
  document.getElementById("btn-history-close").addEventListener("click", closeHistoryDrawer);
  $historyBackdrop.addEventListener("click", closeHistoryDrawer);

  /* ===== SafeSearch toggle ===== */
  function updateSafeSearchToggle() {
    if (safeSearch) {
      $safeSearchToggle.classList.add("on");
      $safeSearchToggle.setAttribute("aria-checked", "true");
    } else {
      $safeSearchToggle.classList.remove("on");
      $safeSearchToggle.setAttribute("aria-checked", "false");
    }
  }
  updateSafeSearchToggle();

  $safeSearchToggle.addEventListener("click", function () {
    safeSearch = !safeSearch;
    localStorage.setItem("fera-safesearch", safeSearch ? "on" : "off");
    updateSafeSearchToggle();
    updateSettingsToggles();

    // Re-run search if there's a current query
    if (state.query) {
      doSearch(state.query);
    }
  });

  /* ===== Settings drawer ===== */
  function openSettingsDrawer() {
    $settingsBackdrop.style.display = "";
    $settingsDrawer.classList.add("open");
    updateSettingsToggles();
  }
  function closeSettingsDrawer() {
    $settingsBackdrop.style.display = "none";
    $settingsDrawer.classList.remove("open");
  }
  function updateSettingsToggles() {
    // SafeSearch
    if (safeSearch) {
      $settingsSafeSearchToggle.classList.add("on");
      $settingsSafeSearchToggle.setAttribute("aria-checked", "true");
    } else {
      $settingsSafeSearchToggle.classList.remove("on");
      $settingsSafeSearchToggle.setAttribute("aria-checked", "false");
    }
    // Theme
    var isDark = document.body.classList.contains("dark");
    if (isDark) {
      $settingsThemeToggle.classList.add("on");
      $settingsThemeToggle.setAttribute("aria-checked", "true");
    } else {
      $settingsThemeToggle.classList.remove("on");
      $settingsThemeToggle.setAttribute("aria-checked", "false");
    }
    // History
    if (historyEnabled) {
      $settingsHistoryToggle.classList.add("on");
      $settingsHistoryToggle.setAttribute("aria-checked", "true");
    } else {
      $settingsHistoryToggle.classList.remove("on");
      $settingsHistoryToggle.setAttribute("aria-checked", "false");
    }
  }

  document.getElementById("btn-settings").addEventListener("click", openSettingsDrawer);
  document.getElementById("btn-settings-close").addEventListener("click", closeSettingsDrawer);
  $settingsBackdrop.addEventListener("click", closeSettingsDrawer);

  $settingsSafeSearchToggle.addEventListener("click", function () {
    safeSearch = !safeSearch;
    localStorage.setItem("fera-safesearch", safeSearch ? "on" : "off");
    updateSafeSearchToggle();
    updateSettingsToggles();
    if (state.query) {
      doSearch(state.query);
    }
  });

  $settingsThemeToggle.addEventListener("click", function () {
    var isDark = document.body.classList.contains("dark");
    applyTheme(isDark ? "light" : "dark");
    updateSettingsToggles();
  });

  $settingsHistoryToggle.addEventListener("click", function () {
    historyEnabled = !historyEnabled;
    localStorage.setItem("fera-history", historyEnabled ? "on" : "off");
    updateHistoryToggle();
    updateSettingsToggles();
    renderHistoryContent();
  });

  /* ===== Category filters ===== */
  var categoryBtns = document.querySelectorAll(".category-btn");
  categoryBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      var category = btn.getAttribute("data-category");
      
      // Update active state
      categoryBtns.forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
      
      // Update state
      state.category = category;

      // Update URL with category
      var url = new URL(window.location.href);
      var apiCategory = CATEGORY_API_MAP[category] || "general";
      url.searchParams.set("categories", apiCategory);
      url.searchParams.set("safesearch", safeSearch ? "1" : "0");
      url.searchParams.delete("category");
      window.history.replaceState({}, "", url.toString());
      
      // If there's a current search, re-run it with the new category
      if (state.query) {
        doSearch(state.query);
      }
    });
  });

  /* ===== Search form ===== */
  $searchForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = $searchInput.value.trim();
    if (q) doSearch(q);
  });

  /* ===== URL query param on load ===== */
  var params = new URLSearchParams(window.location.search);
  var initialQ = params.get("q");
  var initialCategory = params.get("category");
  var initialApiCategory = params.get("categories");
  var initialSafeSearch = params.get("safesearch");
  if (initialSafeSearch === "1" || initialSafeSearch === "0") {
    safeSearch = initialSafeSearch === "1";
    localStorage.setItem("fera-safesearch", safeSearch ? "on" : "off");
    updateSafeSearchToggle();
  }
  if (!initialCategory && initialApiCategory && API_CATEGORY_UI_MAP[initialApiCategory]) {
    initialCategory = API_CATEGORY_UI_MAP[initialApiCategory];
  }
  if (initialCategory && VALID_CATEGORIES.indexOf(initialCategory) !== -1) {
    state.category = initialCategory;
    // Update category button active state
    categoryBtns.forEach(function(b) {
      b.classList.toggle("active", b.getAttribute("data-category") === initialCategory);
    });
  }
  if (initialQ) {
    doSearch(initialQ);
  }

  /* ===== Helpers ===== */
  function getDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (e) {
      return url;
    }
  }

  function engineBadgeClass(engine) {
    var map = {
      google: "badge-google",
      brave: "badge-brave",
      duckduckgo: "badge-duckduckgo",
      startpage: "badge-startpage",
      bing: "badge-bing",
      wikipedia: "badge-wikipedia",
    };
    return map[engine.toLowerCase()] || "badge-default";
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
})();
