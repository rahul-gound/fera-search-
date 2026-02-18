
(function () {
  "use strict";

  /* ===== Config ===== */
  var PROXY_BASE = "https://himanshu-711-fera-search-proxy.hf.space";
  var VALID_CATEGORIES = ["all", "video", "photo", "news"];

  // UI -> BACKEND categories (EXACT strings your proxy expects)
  // /search?q=hi&safesearch=1&categories=general|images|videos|news
  var CATEGORY_API_MAP = {
    all: "general",
    photo: "images",
    video: "videos",
    news: "news",
  };

  var API_CATEGORY_UI_MAP = {
    general: "all",
    images: "photo",
    videos: "video",
    news: "news",
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
    var theme =
      saved ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
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
    syncToggleStates();
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
    // ✅ EXACT format your proxy expects:
    // https://.../search?q=hi&safesearch=1&categories=videos
    var apiCategory = CATEGORY_API_MAP[category] || "general";

    var url =
      PROXY_BASE +
      "/search" +
      "?q=" + encodeURIComponent(query) +
      "&safesearch=" + (safeSearch ? "1" : "0") +
      "&categories=" + encodeURIComponent(apiCategory);

    return fetch(url, { signal: signal }).then(function (res) {
      if (!res.ok) throw new Error("Search failed (" + res.status + ")");
      return res.json();
    });
  }

  function fetchSummarize(query, signal) {
    var url =
      PROXY_BASE +
      "/summarize" +
      "?q=" + encodeURIComponent(query) +
      "&safesearch=" + (safeSearch ? "1" : "0") +
      "&categories=general";

    return fetch(url, {
      signal: signal,
      mode: "cors",
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (body) {
          throw new Error(
            "Summarize failed (HTTP " + res.status + "): " + body.slice(0, 200)
          );
        });
      }
      return res.text().then(function (text) {
        try {
          return JSON.parse(text);
        } catch (_) {
          if (!text || !text.trim()) {
            throw new Error("Summarize returned empty response");
          }
          return { summary: text.trim() };
        }
      });
    }).catch(function (err) {
      if (err.name === "AbortError") throw err;
      if (err.message && err.message.indexOf("Summarize") === 0) throw err;
      throw new Error("Summarize request failed: " + (err.message || "Network error"));
    });
  }

  /* ===== Search ===== */
  function doSearch(query) {
    var trimmed = query.trim();
    if (!trimmed) return;

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
    state.aiLoading = state.category === "all";
    state.aiError = null;

    $searchInput.value = trimmed;

    // Update URL (store API categories param too)
    var url = new URL(window.location.href);
    url.searchParams.set("q", trimmed);
    url.searchParams.set("safesearch", safeSearch ? "1" : "0");
    url.searchParams.set("categories", CATEGORY_API_MAP[state.category] || "general");
    url.searchParams.delete("category");
    window.history.pushState({}, "", url.toString());

    renderResults();
    renderAI();

    fetchSearch(trimmed, state.category, sCtrl.signal)
      .then(function (data) {
        state.searchData = normalizeSearchResponse(data);
        state.searchLoading = false;
        renderResults();

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
            if (window.innerWidth < 768) openAiDrawer();
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
    // Clear dynamic content (keep welcome)
    var children = Array.from($resultsPanel.children);
    children.forEach(function (c) {
      if (c.id !== "welcome") $resultsPanel.removeChild(c);
    });

    var hasQuery = state.query.length > 0;
    $welcome.style.display = hasQuery ? "none" : "";
    $mobileAiToggle.style.display = hasQuery ? "" : "none";
    $aiPulse.style.display = state.aiLoading ? "" : "none";

    if (!hasQuery) return;

    var results =
      (state.searchData && state.searchData.data && state.searchData.data.results) || [];
    var infoboxes =
      (state.searchData && state.searchData.data && state.searchData.data.infoboxes) || [];
    var suggestions =
      (state.searchData && state.searchData.data && state.searchData.data.suggestions) || [];

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
      for (var i = 0; i < 5; i++) skList.appendChild(createSkeletonCard());
      $resultsPanel.appendChild(skList);
      return;
    }

    // Error
    if (state.searchError) {
      var errDiv = document.createElement("div");
      errDiv.className = "error-card";
      errDiv.innerHTML = "<p>Something went wrong. Please try again.</p>";
      var retryBtn = document.createElement("button");
      retryBtn.className = "retry-link";
      retryBtn.textContent = "Retry";
      retryBtn.addEventListener("click", function () {
        doSearch(state.query);
      });
      errDiv.appendChild(retryBtn);
      $resultsPanel.appendChild(errDiv);
      return;
    }

    // PHOTO grid
    if (state.category === "photo" && results.length > 0) {
      var grid = document.createElement("div");
      grid.className = "image-grid";
      results.forEach(function (r) {
        grid.appendChild(createImageTile(r));
      });
      $resultsPanel.appendChild(grid);
      return;
    }

    // VIDEO cards
    if (state.category === "video" && results.length > 0) {
      var vlist = document.createElement("div");
      vlist.className = "video-grid";
      results.forEach(function (r) {
        vlist.appendChild(createVideoCard(r));
      });
      $resultsPanel.appendChild(vlist);
      return;
    }

    // NEWS cards
    if (state.category === "news" && results.length > 0) {
      var nlist = document.createElement("div");
      nlist.className = "news-list";
      results.forEach(function (r) {
        nlist.appendChild(createNewsCard(r));
      });
      $resultsPanel.appendChild(nlist);
      return;
    }

    // Default (All/general): normal cards
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

  /* ===== Cards ===== */
  function createResultCard(r) {
    var card = document.createElement("article");
    card.className = "result-card";

    var inner = document.createElement("div");
    inner.className = "result-inner";

    var body = document.createElement("div");
    body.className = "result-body";

    var domain = document.createElement("p");
    domain.className = "result-domain";
    domain.textContent = getDomain(r.url || "");
    body.appendChild(domain);

    var title = document.createElement("a");
    title.className = "result-title";
    title.href = r.url || "#";
    title.target = "_blank";
    title.rel = "noopener noreferrer";
    title.textContent = r.title || "Untitled";
    body.appendChild(title);

    if (r.content) {
      var snippet = document.createElement("p");
      snippet.className = "result-snippet";
      snippet.textContent = r.content;
      body.appendChild(snippet);
    }

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

    var thumbUrl =
      r.thumbnail ||
      r.thumbnail_src ||
      r.img_src ||
      r.image ||
      (r.thumbnail_url ? r.thumbnail_url : null);

    thumbUrl = normalizeMediaUrl(thumbUrl);

    if (thumbUrl) {
      var img = document.createElement("img");
      img.className = "result-thumb";
      img.src = thumbUrl;
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.onerror = function () {
        img.style.display = "none";
      };
      inner.appendChild(img);
    }

    card.appendChild(inner);
    return card;
  }

  function createVideoCard(r) {
    var link = r.url || r.video_url || "#";
    var card = document.createElement("a");
    card.className = "video-tile";
    card.href = link;
    card.target = "_blank";
    card.rel = "noopener noreferrer";

    // Thumbnail
    var thumb =
      r.thumbnail ||
      r.thumbnail_src ||
      r.img_src ||
      r.image ||
      r.preview ||
      null;

    thumb = normalizeMediaUrl(thumb);

    if (thumb) {
      var thumbWrap = document.createElement("div");
      thumbWrap.style.position = "relative";

      var img = document.createElement("img");
      img.className = "video-thumb";
      img.src = thumb;
      img.alt = r.title || "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.onerror = function () {
        thumbWrap.style.display = "none";
      };
      thumbWrap.appendChild(img);

      // Duration badge on thumbnail
      var dur = r.duration || "";
      if (dur) {
        var durBadge = document.createElement("span");
        durBadge.className = "video-duration-badge";
        durBadge.textContent = dur;
        thumbWrap.appendChild(durBadge);
      }

      card.appendChild(thumbWrap);
    }

    // Meta section
    var meta = document.createElement("div");
    meta.className = "video-meta";

    var domain = document.createElement("p");
    domain.className = "video-domain";
    domain.textContent = r.source || getDomain(link);
    meta.appendChild(domain);

    var title = document.createElement("p");
    title.className = "video-title";
    title.textContent = r.title || "Video";
    meta.appendChild(title);

    // Info line (author/channel/date)
    var infoBits = [];
    if (r.author) infoBits.push(r.author);
    if (r.channel) infoBits.push(r.channel);
    if (r.publishedDate || r.published_date || r.published || r.date)
      infoBits.push(String(r.publishedDate || r.published_date || r.published || r.date));

    if (infoBits.length) {
      var info = document.createElement("p");
      info.className = "video-domain";
      info.textContent = infoBits.join(" • ");
      meta.appendChild(info);
    }

    card.appendChild(meta);
    return card;
  }

  function createNewsCard(r) {
    var card = document.createElement("article");
    card.className = "news-card";

    var body = document.createElement("div");
    body.className = "news-body";

    var link = r.url || "#";
    var source = r.source || getDomain(link);
    var date = r.publishedDate || r.published_date || r.published || r.date || "";

    var topLine = document.createElement("p");
    topLine.className = "news-source";
    topLine.textContent = date ? source + " • " + String(date) : source;
    body.appendChild(topLine);

    var title = document.createElement("a");
    title.className = "news-title";
    title.href = link;
    title.target = "_blank";
    title.rel = "noopener noreferrer";
    title.textContent = r.title || "News";
    body.appendChild(title);

    var snippetText = r.content || r.snippet || r.description || "";
    if (snippetText) {
      var snippet = document.createElement("p");
      snippet.className = "news-snippet";
      snippet.textContent = snippetText;
      body.appendChild(snippet);
    }

    card.appendChild(body);

    // optional image
    var imgUrl =
      r.thumbnail ||
      r.thumbnail_src ||
      r.img_src ||
      r.image ||
      r.media ||
      null;

    imgUrl = normalizeMediaUrl(imgUrl);

    if (imgUrl) {
      var img = document.createElement("img");
      img.className = "news-thumb";
      img.src = imgUrl;
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.onerror = function () {
        img.style.display = "none";
      };
      card.appendChild(img);
    }

    return card;
  }

  function createImageTile(r) {
    var a = document.createElement("a");
    a.className = "image-tile";

    // Many engines use img_src for full image, url sometimes is page url
    var full = normalizeMediaUrl(r.img_src || r.image || r.url);
    var thumb = normalizeMediaUrl(r.thumbnail_src || r.thumbnail || r.img_src || r.image);

    a.href = full || r.url || "#";
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    var img = document.createElement("img");
    img.src = thumb || full || "";
    img.loading = "lazy";
    img.alt = r.title || "";
    img.referrerPolicy = "no-referrer";
    img.onerror = function () {
      a.style.display = "none";
    };

    a.appendChild(img);
    return a;
  }

  function createInfobox(ib) {
    var card = document.createElement("div");
    card.className = "infobox-card";

    var inner = document.createElement("div");
    inner.className = "infobox-inner";

    if (ib.img_src) {
      var img = document.createElement("img");
      img.className = "infobox-img";
      img.src = normalizeMediaUrl(ib.img_src);
      img.alt = ib.infobox || "";
      img.referrerPolicy = "no-referrer";
      img.onerror = function () {
        img.style.display = "none";
      };
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
      btn.addEventListener("click", function () {
        doSearch(s);
      });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function createSkeletonCard() {
    var card = document.createElement("div");
    card.className = "skeleton-card";
    var line1 = document.createElement("div");
    line1.className = "skeleton sk";
    line1.style.height = "12px";
    line1.style.width = "30%";
    var line2 = document.createElement("div");
    line2.className = "skeleton sk";
    line2.style.height = "18px";
    line2.style.width = "70%";
    var line3 = document.createElement("div");
    line3.className = "skeleton sk";
    line3.style.height = "14px";
    line3.style.width = "100%";
    var line4 = document.createElement("div");
    line4.className = "skeleton sk";
    line4.style.height = "14px";
    line4.style.width = "90%";
    card.appendChild(line1);
    card.appendChild(line2);
    card.appendChild(line3);
    card.appendChild(line4);
    return card;
  }

  /* ===== Render: AI ===== */
  function renderAI() {
    var targets = [$aiDesktop, $aiMobile];
    targets.forEach(function ($target) {
      if (!$target) return;
      $target.innerHTML = "";

      if (!state.query) {
        $target.innerHTML = '<p class="ai-idle">Search to see an AI summary</p>';
        return;
      }

      if (state.category !== "all") {
        $target.innerHTML = '<p class="ai-idle">AI summary available only for All category</p>';
        return;
      }

      if (state.aiLoading) {
        $target.innerHTML =
          '<div class="ai-thinking"><div class="dot"></div><span>Thinking...</span></div>';
        return;
      }

      if (state.aiError) {
        var err = document.createElement("div");
        err.innerHTML = '<p class="ai-error">' + escapeHtml(state.aiError) + "</p>";
        var retry = document.createElement("button");
        retry.className = "retry-link";
        retry.textContent = "Retry";
        retry.addEventListener("click", retryAI);
        err.appendChild(retry);
        $target.appendChild(err);
        return;
      }

      // Resolve the AI data from multiple possible response shapes:
      // { ai: { summary, key_points, best_sources, follow_up_queries } }
      // { data: { summary } }
      // { summary }
      var top = state.aiData || {};
      var ai = top.ai || {};
      var nested = top.data || {};
      var summary =
        ai.summary || ai.answer || ai.text || ai.response || ai.content ||
        nested.summary || nested.answer || nested.text || nested.response || nested.content ||
        top.summary || top.answer || top.text || top.response || top.content || "";
      if (typeof summary !== "string") summary = String(summary);
      summary = summary.trim();
      if (!summary) {
        $target.innerHTML = '<p class="ai-idle">No AI summary available.</p>';
        return;
      }

      var keyPoints = ai.key_points || nested.key_points || top.key_points || [];
      var bestSources = ai.best_sources || nested.best_sources || top.best_sources || [];
      var followUp = ai.follow_up_queries || nested.follow_up_queries || top.follow_up_queries || [];
      if (!Array.isArray(keyPoints)) keyPoints = [];
      if (!Array.isArray(bestSources)) bestSources = [];
      if (!Array.isArray(followUp)) followUp = [];

      var summaryEl = document.createElement("p");
      summaryEl.className = "ai-summary-text";
      summaryEl.textContent = summary;
      $target.appendChild(summaryEl);

      // Key points
      if (keyPoints.length > 0) {
        var kpLabel = document.createElement("p");
        kpLabel.className = "ai-section-label";
        kpLabel.textContent = "Key Points";
        $target.appendChild(kpLabel);
        var kpContainer = document.createElement("div");
        kpContainer.className = "ai-chips";
        keyPoints.forEach(function (point) {
          var chip = document.createElement("span");
          chip.className = "ai-chip";
          chip.textContent = typeof point === "string" ? point : String(point);
          kpContainer.appendChild(chip);
        });
        $target.appendChild(kpContainer);
      }

      // Best sources
      if (bestSources.length > 0) {
        var srcLabel = document.createElement("p");
        srcLabel.className = "ai-section-label";
        srcLabel.textContent = "Sources";
        $target.appendChild(srcLabel);
        var srcList = document.createElement("ul");
        srcList.className = "ai-sources";
        bestSources.forEach(function (src) {
          var isObj = typeof src === "object" && src !== null;
          var li = document.createElement("li");
          var a = document.createElement("a");
          a.href = (isObj ? src.url : src) || "#";
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = (isObj ? (src.title || src.url || src.name) : src) || "Source";
          li.appendChild(a);
          srcList.appendChild(li);
        });
        $target.appendChild(srcList);
      }

      // Follow-up queries
      if (followUp.length > 0) {
        var fuLabel = document.createElement("p");
        fuLabel.className = "ai-section-label";
        fuLabel.textContent = "Related Searches";
        $target.appendChild(fuLabel);
        var fuContainer = document.createElement("div");
        fuContainer.className = "ai-chips";
        followUp.forEach(function (q) {
          var text = typeof q === "string" ? q : String(q);
          var chip = document.createElement("button");
          chip.className = "ai-followup-chip";
          chip.textContent = text;
          chip.addEventListener("click", function () {
            $searchInput.value = text;
            doSearch(text);
          });
          fuContainer.appendChild(chip);
        });
        $target.appendChild(fuContainer);
      }
    });
  }

  /* ===== Drawers ===== */
  function openAiDrawer() {
    if (!$aiDrawer || !$aiDrawerBackdrop) return;
    aiDrawerOpen = true;
    $aiDrawer.classList.add("open");
    $aiDrawerBackdrop.style.display = "";
  }
  function closeAiDrawer() {
    if (!$aiDrawer || !$aiDrawerBackdrop) return;
    aiDrawerOpen = false;
    $aiDrawer.classList.remove("open");
    $aiDrawerBackdrop.style.display = "none";
  }
  function openHistoryDrawer() {
    $historyDrawer.classList.add("open");
    $historyBackdrop.style.display = "";
  }
  function closeHistoryDrawer() {
    $historyDrawer.classList.remove("open");
    $historyBackdrop.style.display = "none";
  }
  function openSettingsDrawer() {
    $settingsDrawer.classList.add("open");
    $settingsBackdrop.style.display = "";
  }
  function closeSettingsDrawer() {
    $settingsDrawer.classList.remove("open");
    $settingsBackdrop.style.display = "none";
  }

  /* ===== History ===== */
  function getHistoryItems() {
    try {
      var raw = localStorage.getItem("fera-history-items");
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }
  function setHistoryItems(items) {
    localStorage.setItem("fera-history-items", JSON.stringify(items));
  }
  function addHistoryItem(item) {
    if (!historyEnabled) return;
    var items = getHistoryItems().filter(function (x) {
      return x.query !== item.query;
    });
    items.unshift(item);
    setHistoryItems(items.slice(0, 50));
    renderHistory();
  }
  function renderHistory() {
    if (!historyEnabled) {
      $historyContent.innerHTML =
        '<p class="text-muted text-xs">History is off. No searches are stored locally.</p>';
      return;
    }
    var items = getHistoryItems();
    if (!items.length) {
      $historyContent.innerHTML = '<p class="text-muted text-xs">No history yet.</p>';
      return;
    }

    $historyContent.innerHTML = "";
    var clearBtn = document.createElement("button");
    clearBtn.className = "history-clear";
    clearBtn.textContent = "Clear history";
    clearBtn.addEventListener("click", function () {
      setHistoryItems([]);
      renderHistory();
    });
    $historyContent.appendChild(clearBtn);

    var list = document.createElement("div");
    list.className = "history-list";
    items.forEach(function (item) {
      var btn = document.createElement("button");
      btn.className = "history-item";
      btn.innerHTML =
        '<span class="hq">' +
        escapeHtml(item.query) +
        '</span><span class="ht">' +
        new Date(item.time).toLocaleString() +
        "</span>";
      btn.addEventListener("click", function () {
        closeHistoryDrawer();
        doSearch(item.query);
      });
      list.appendChild(btn);
    });
    $historyContent.appendChild(list);
  }

  /* ===== Helpers ===== */
  function setToggleState(el, on) {
    if (!el) return;
    el.classList.toggle("on", !!on);
    el.setAttribute("aria-checked", on ? "true" : "false");
  }
  function syncToggleStates() {
    setToggleState($safeSearchToggle, safeSearch);
    setToggleState($settingsSafeSearchToggle, safeSearch);
    setToggleState($historyToggleBtn, historyEnabled);
    setToggleState($settingsHistoryToggle, historyEnabled);
    setToggleState($settingsThemeToggle, document.body.classList.contains("dark"));
  }
  function normalizeSearchResponse(payload) {
    if (Array.isArray(payload)) return { data: { results: payload } };
    if (!payload || typeof payload !== "object") return { data: { results: [] } };
    if (Array.isArray(payload.data)) return { data: { results: payload.data } };
    if (Array.isArray(payload.results)) return { data: { results: payload.results } };
    if (payload.data && typeof payload.data === "object" && Array.isArray(payload.data.results))
      return payload;
    if (payload.data && typeof payload.data === "object") {
      var arr =
        payload.data.items ||
        payload.data.news ||
        payload.data.videos ||
        payload.data.images ||
        [];
      if (Array.isArray(arr)) {
        payload.data.results = arr;
        return payload;
      }
    }
    payload.data = payload.data || {};
    payload.data.results = [];
    return payload;
  }
  function setCategory(category) {
    var nextCategory = VALID_CATEGORIES.indexOf(category) >= 0 ? category : "all";
    state.category = nextCategory;
    var buttons = document.querySelectorAll(".category-btn");
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.classList.toggle("active", btn.dataset.category === state.category);
    });
  }
  function getDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (_) {
      return "";
    }
  }
  function normalizeMediaUrl(url) {
    if (!url || typeof url !== "string") return null;
    if (/^\/\//.test(url)) return "https:" + url;
    if (/^https?:\/\//i.test(url) || /^data:/i.test(url)) return url;
    return null;
  }
  function engineBadgeClass(name) {
    var key = String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
    return (
      {
        google: "badge-google",
        brave: "badge-brave",
        duckduckgo: "badge-duckduckgo",
        startpage: "badge-startpage",
        bing: "badge-bing",
        wikipedia: "badge-wikipedia",
      }[key] || "badge-default"
    );
  }
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ===== Events ===== */
  $searchForm.addEventListener("submit", function (e) {
    e.preventDefault();
    doSearch($searchInput.value);
  });

  Array.prototype.forEach.call(document.querySelectorAll(".category-btn"), function (btn) {
    btn.addEventListener("click", function () {
      setCategory(btn.dataset.category);
      if (state.query) doSearch(state.query);
      else {
        var u = new URL(window.location.href);
        u.searchParams.set("categories", CATEGORY_API_MAP[state.category] || "general");
        u.searchParams.delete("category");
        window.history.replaceState({}, "", u.toString());
      }
    });
  });

  function toggleSafeSearch() {
    safeSearch = !safeSearch;
    localStorage.setItem("fera-safesearch", safeSearch ? "on" : "off");
    syncToggleStates();
    if (state.query) doSearch(state.query);
  }
  function toggleHistoryEnabled() {
    historyEnabled = !historyEnabled;
    localStorage.setItem("fera-history", historyEnabled ? "on" : "off");
    if (!historyEnabled) setHistoryItems([]);
    syncToggleStates();
    renderHistory();
  }
  function toggleTheme() {
    applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
  }

  $safeSearchToggle.addEventListener("click", toggleSafeSearch);
  $settingsSafeSearchToggle.addEventListener("click", toggleSafeSearch);
  $historyToggleBtn.addEventListener("click", toggleHistoryEnabled);
  $settingsHistoryToggle.addEventListener("click", toggleHistoryEnabled);
  $settingsThemeToggle.addEventListener("click", toggleTheme);

  document.getElementById("btn-history").addEventListener("click", openHistoryDrawer);
  document.getElementById("btn-history-close").addEventListener("click", closeHistoryDrawer);
  $historyBackdrop.addEventListener("click", closeHistoryDrawer);

  document.getElementById("btn-settings").addEventListener("click", openSettingsDrawer);
  document.getElementById("btn-settings-close").addEventListener("click", closeSettingsDrawer);
  $settingsBackdrop.addEventListener("click", closeSettingsDrawer);

  document.getElementById("btn-mobile-ai").addEventListener("click", function () {
    if (aiDrawerOpen) closeAiDrawer();
    else openAiDrawer();
  });
  $aiDrawerBackdrop.addEventListener("click", closeAiDrawer);

  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeAiDrawer();
      closeHistoryDrawer();
      closeSettingsDrawer();
    }
  });

  /* ===== Init from URL ===== */
  function initFromURL() {
    var params = new URLSearchParams(window.location.search);
    var q = (params.get("q") || "").trim();
    var safe = params.get("safesearch");
    var apiCategory = params.get("categories");
    var uiCategory = params.get("category");

    if (safe === "0" || safe === "1") {
      safeSearch = safe === "1";
      localStorage.setItem("fera-safesearch", safeSearch ? "on" : "off");
    }

    var resolvedCategory = "all";
    if (apiCategory && API_CATEGORY_UI_MAP[apiCategory]) resolvedCategory = API_CATEGORY_UI_MAP[apiCategory];
    else if (uiCategory && VALID_CATEGORIES.indexOf(uiCategory) >= 0) resolvedCategory = uiCategory;

    setCategory(resolvedCategory);
    renderHistory();
    syncToggleStates();

    if (q) {
      $searchInput.value = q;
      doSearch(q);
    } else {
      renderResults();
      renderAI();
    }
  }

  window.addEventListener("popstate", initFromURL);
  initFromURL();
})();
