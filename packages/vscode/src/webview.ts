import { Page } from "./parser";
import { escapeHtml } from "@mdxg/parser";

export type Mode = "preview" | "both" | "markdown";

export interface SidebarState {
  leftHidden: boolean;
  rightHidden: boolean;
}

export function getWebviewContent(
  pages: Page[],
  activePageIndex: number,
  rawMarkdown: string,
  mode: Mode,
  sidebar: SidebarState,
  searchQuery: string,
  cspSource: string,
  nonce: string,
  katexCss: string,
  mermaidUri: string,
  baseUri: string
): string {
  const tocItems = pages
    .map(
      (p, i) => {
        const isActive = i === activePageIndex;
        const isH1 = p.depth === 1;
        const hasChildren = isH1 && i + 1 < pages.length && pages[i + 1].depth === 2;
        const chevron = hasChildren
          ? `<span class="toc-chevron" data-group="${i}"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`
          : `<span class="toc-chevron-spacer"></span>`;
        return `<li class="toc-item toc-depth-${p.depth} ${isActive ? "active" : ""}" data-index="${i}" data-depth="${p.depth}" tabindex="0">
          ${isH1 ? chevron : ""}
          <span class="toc-label">${escapeHtml(p.title)}</span>
        </li>`;
      }
    )
    .join("\n");

  const activePage = pages[activePageIndex] ?? pages[0];

  const onThisPage = activePage.headings
    .map(
      (h) =>
        `<li class="otp-item otp-level-${h.level}" data-id="${h.id}">
          <a href="#${h.id}">${escapeHtml(h.text)}</a>
        </li>`
    )
    .join("\n");

  const showPreview = mode === "preview" || mode === "both";
  const showEditor = mode === "markdown" || mode === "both";
  const isBoth = mode === "both";
  const hasLeftToc = pages.length > 1;
  const hasRightToc = activePage.headings.length > 1;
  const leftHidden = !hasLeftToc || sidebar.leftHidden;
  const rightHidden = !hasRightToc || sidebar.rightHidden;
  const layoutClasses = [
    !showPreview ? "hidden" : "",
    leftHidden ? "hide-left" : "",
    rightHidden ? "hide-right" : "",
  ].filter(Boolean).join(" ");

  const prevPage = activePageIndex > 0 ? pages[activePageIndex - 1] : null;
  const nextPage = activePageIndex < pages.length - 1 ? pages[activePageIndex + 1] : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src ${cspSource} 'nonce-${nonce}'; img-src ${cspSource} https: data:; font-src ${cspSource};" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MDXG Preview</title>
  <style nonce="${nonce}">
    ${getStyles()}
  </style>
  ${katexCss ? `<style nonce="${nonce}">${katexCss}</style>` : ""}
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-left">
      ${pages.length > 1 ? `
        ${prevPage ? `<button class="bar-btn" data-index="${activePageIndex - 1}" title="${escapeHtml(prevPage.title)}" aria-label="Previous page: ${escapeHtml(prevPage.title)}">&lsaquo;</button>` : `<button class="bar-btn" disabled aria-label="Previous page">&lsaquo;</button>`}
        <span class="page-indicator">${activePageIndex + 1} / ${pages.length}</span>
        ${nextPage ? `<button class="bar-btn" data-index="${activePageIndex + 1}" title="${escapeHtml(nextPage.title)}" aria-label="Next page: ${escapeHtml(nextPage.title)}">&rsaquo;</button>` : `<button class="bar-btn" disabled aria-label="Next page">&rsaquo;</button>`}
      ` : `<span></span>`}
    </div>
    <div class="mode-toggle">
      <button class="mode-btn ${mode === "preview" ? "active" : ""}" data-mode="preview">Preview</button>
      <button class="mode-btn ${mode === "markdown" ? "active" : ""}" data-mode="markdown">Markdown</button>
      <button class="mode-btn ${mode === "both" ? "active" : ""}" data-mode="both">Both</button>
    </div>
    <div class="toolbar-icons">
      <button class="bar-btn sidebar-icon ${!hasLeftToc ? "bar-btn-disabled" : ""} ${leftHidden && hasLeftToc ? "bar-btn-off" : ""}" id="toggleLeftToc" title="Toggle pages sidebar" ${!hasLeftToc ? "disabled" : ""}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1" y="2" width="14" height="12" rx="1.5"/><rect x="1" y="2" width="4.5" height="12" fill="currentColor" opacity="0.35" stroke="none"/><line x1="5.5" y1="2" x2="5.5" y2="14"/></svg></button>
      <button class="bar-btn sidebar-icon ${!hasRightToc ? "bar-btn-disabled" : ""} ${rightHidden && hasRightToc ? "bar-btn-off" : ""}" id="toggleRightToc" title="Toggle outline sidebar" ${!hasRightToc ? "disabled" : ""}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1" y="2" width="14" height="12" rx="1.5"/><rect x="10.5" y="2" width="4.5" height="12" fill="currentColor" opacity="0.35" stroke="none"/><line x1="10.5" y1="2" x2="10.5" y2="14"/></svg></button>
    </div>
  </div>

  <div class="search-bar hidden" id="searchBar">
    <input type="text" class="search-input" id="searchInput" placeholder="Find..." />
    <span class="search-count" id="searchCount"></span>
    <button class="search-nav-btn" id="searchPrev" title="Previous match">&lsaquo;</button>
    <button class="search-nav-btn" id="searchNext" title="Next match">&rsaquo;</button>
    <button class="search-close-btn" id="searchClose" title="Close">&times;</button>
  </div>

  <div class="split-container ${isBoth ? "split-mode" : ""}">
    <!-- Preview -->
    <div class="layout ${layoutClasses}">
      <nav class="sidebar-left">
        <div class="sidebar-header">Pages</div>
        <ul class="toc-list">${tocItems}</ul>
      </nav>

      <main class="content">
        <div class="page-title">
          <h1>${escapeHtml(activePage.title)}</h1>
        </div>
        <article class="prose">${rewriteImageSrc(activePage.html, baseUri)}</article>
        <nav class="page-footer">
          ${prevPage ? `<button type="button" class="page-link prev-link" data-index="${activePageIndex - 1}" aria-label="Previous page: ${escapeHtml(prevPage.title)}">
            <span class="page-link-label">Previous</span>
            <span class="page-link-title">&lsaquo; ${escapeHtml(prevPage.title)}</span>
          </button>` : `<span></span>`}
          ${nextPage ? `<button type="button" class="page-link next-link" data-index="${activePageIndex + 1}" aria-label="Next page: ${escapeHtml(nextPage.title)}">
            <span class="page-link-label">Next</span>
            <span class="page-link-title">${escapeHtml(nextPage.title)} &rsaquo;</span>
          </button>` : `<span></span>`}
        </nav>
      </main>

      <aside class="sidebar-right">
        ${
          activePage.headings.length > 0
            ? `<div class="sidebar-header">On this page</div>
               <ul class="otp-list">${onThisPage}</ul>`
            : ""
        }
      </aside>
    </div>

    ${isBoth ? `<div class="resize-handle" id="resizeHandle"></div>` : ""}

    <!-- Editor -->
    <div class="editor-wrap ${!showEditor ? "hidden" : ""}">
      <div class="editor-container">
        <pre class="highlight-layer" aria-hidden="true"><code></code></pre>
        <textarea class="md-editor" spellcheck="false">${escapeHtml(rawMarkdown)}</textarea>
      </div>
    </div>
  </div>

  ${activePage.html.includes('class="mermaid"') ? `<script src="${mermaidUri}" nonce="${nonce}"></script>` : ""}
  <script nonce="${nonce}">
    var __pages = ${JSON.stringify(pages.map((p, i) => ({ index: i, title: p.title, text: p.title + "\n" + p.markdown })))};
    var __activePageIndex = ${activePageIndex};
    var __searchQuery = ${JSON.stringify(searchQuery)};
    ${getScript()}
  </script>
</body>
</html>`;
}


function rewriteImageSrc(html: string, baseUri: string): string {
  return html.replace(
    /(<img\s[^>]*?\bsrc=["'])(?!https?:\/\/|data:)([^"']+)(["'])/gi,
    (_, prefix, src, suffix) => `${prefix}${baseUri}/${src}${suffix}`
  );
}

function getScript(): string {
  const lines = [
    "const vscode = acquireVsCodeApi();",
    "let debounceTimer;",
    "",
    "document.querySelectorAll('.mode-btn').forEach(function(btn) {",
    "  btn.addEventListener('click', function() {",
    "    vscode.postMessage({ type: 'setMode', mode: btn.dataset.mode });",
    "  });",
    "});",
    "",
    "document.querySelectorAll('.toc-item').forEach(function(item) {",
    "  item.addEventListener('click', function(e) {",
    "    if (e.target.closest('.toc-chevron')) return;",
    "    vscode.postMessage({ type: 'navigate', index: parseInt(item.dataset.index, 10) });",
    "  });",
    "});",
    "",
    "var activeTocItem = document.querySelector('.toc-item.active');",
    "if (activeTocItem) activeTocItem.focus();",
    "",
    "var collapsedGroups = {};",
    "",
    "function toggleGroup(groupIdx) {",
    "  collapsedGroups[groupIdx] = !collapsedGroups[groupIdx];",
    "  var items = document.querySelectorAll('.toc-item');",
    "  var inGroup = false;",
    "  items.forEach(function(item) {",
    "    var idx = parseInt(item.dataset.index, 10);",
    "    if (idx === groupIdx) {",
    "      inGroup = true;",
    "      var chev = item.querySelector('.toc-chevron');",
    "      if (chev) chev.classList.toggle('collapsed', !!collapsedGroups[groupIdx]);",
    "      return;",
    "    }",
    "    if (inGroup && item.dataset.depth === '2') {",
    "      item.style.display = collapsedGroups[groupIdx] ? 'none' : '';",
    "    } else {",
    "      inGroup = false;",
    "    }",
    "  });",
    "}",
    "",
    "document.querySelectorAll('.toc-chevron').forEach(function(chev) {",
    "  chev.addEventListener('click', function(e) {",
    "    e.stopPropagation();",
    "    toggleGroup(parseInt(chev.dataset.group, 10));",
    "  });",
    "});",
    "",
    "var tocList = document.querySelector('.toc-list');",
    "if (tocList) {",
    "  tocList.addEventListener('keydown', function(e) {",
    "    var current = document.activeElement;",
    "    if (!current || !current.classList.contains('toc-item')) return;",
    "    var items = Array.from(tocList.querySelectorAll('.toc-item')).filter(function(i) { return i.style.display !== 'none'; });",
    "    var pos = items.indexOf(current);",
    "    if (pos === -1) return;",
    "",
    "    if (e.key === 'ArrowDown') {",
    "      e.preventDefault();",
    "      if (pos < items.length - 1) items[pos + 1].focus();",
    "    } else if (e.key === 'ArrowUp') {",
    "      e.preventDefault();",
    "      if (pos > 0) items[pos - 1].focus();",
    "    } else if (e.key === 'ArrowRight') {",
    "      e.preventDefault();",
    "      var idx = parseInt(current.dataset.index, 10);",
    "      if (current.dataset.depth === '1' && collapsedGroups[idx]) toggleGroup(idx);",
    "    } else if (e.key === 'ArrowLeft') {",
    "      e.preventDefault();",
    "      var idx2 = parseInt(current.dataset.index, 10);",
    "      if (current.dataset.depth === '1' && !collapsedGroups[idx2]) {",
    "        toggleGroup(idx2);",
    "      } else if (current.dataset.depth === '2') {",
    "        var prev = items.filter(function(i) { return parseInt(i.dataset.index,10) < idx2 && i.dataset.depth === '1'; });",
    "        if (prev.length) prev[prev.length - 1].focus();",
    "      }",
    "    } else if (e.key === 'Enter') {",
    "      e.preventDefault();",
    "      vscode.postMessage({ type: 'navigate', index: parseInt(current.dataset.index, 10) });",
    "    }",
    "  });",
    "}",
    "",
    "// Toolbar prev/next navigation",
    "document.querySelectorAll('.bar-btn[data-index]:not([disabled])').forEach(function(btn) {",
    "  btn.addEventListener('click', function() {",
    "    var idx = parseInt(btn.dataset.index, 10);",
    "    if (!isNaN(idx)) vscode.postMessage({ type: 'navigate', index: idx });",
    "  });",
    "});",
    "",
    "document.querySelectorAll('.page-link').forEach(function(link) {",
    "  link.addEventListener('click', function() {",
    "    var idx = parseInt(link.dataset.index, 10);",
    "    if (!isNaN(idx)) vscode.postMessage({ type: 'navigate', index: idx });",
    "  });",
    "});",
    "",
    "// Copy-to-clipboard buttons on code blocks",
    "document.querySelectorAll('.prose pre').forEach(function(pre) {",
    "  if (pre.classList.contains('mermaid')) return;",
    "  var btn = document.createElement('button');",
    "  btn.className = 'copy-btn';",
    "  btn.textContent = 'Copy';",
    "  btn.addEventListener('click', function() {",
    "    var code = pre.querySelector('code');",
    "    var text = code ? code.textContent : pre.textContent;",
    "    navigator.clipboard.writeText(text || '').then(function() {",
    "      btn.textContent = 'Copied!';",
    "      setTimeout(function() { btn.textContent = 'Copy'; }, 1500);",
    "    });",
    "  });",
    "  pre.style.position = 'relative';",
    "  pre.appendChild(btn);",
    "});",
    "",
    "var BT = String.fromCharCode(96);",
    "var FENCE = BT + BT + BT;",
    "var NL = String.fromCharCode(10);",
    "",
    "function highlightMarkdown(text) {",
    "  var html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');",
    "  var lines = html.split(NL);",
    "  var inCode = false;",
    "  var out = [];",
    "  for (var i = 0; i < lines.length; i++) {",
    "    var ln = lines[i];",
    "    if (ln.indexOf(FENCE) === 0) {",
    "      inCode = !inCode;",
    "      out.push('<span class=\"hl-code-block\">' + ln + '</span>');",
    "      continue;",
    "    }",
    "    if (inCode) { out.push('<span class=\"hl-code-block\">' + ln + '</span>'); continue; }",
    "    if (/^#{1,6}\\s/.test(ln)) { out.push('<span class=\"hl-heading\">' + ln + '</span>'); continue; }",
    "    if (/^&gt;\\s/.test(ln)) { out.push('<span class=\"hl-blockquote\">' + ln + '</span>'); continue; }",
    "    if (/^(---|\\*\\*\\*|___)\\s*$/.test(ln)) { out.push('<span class=\"hl-hr\">' + ln + '</span>'); continue; }",
    "    ln = ln.replace(/^(\\s*)([-*+]|\\d+\\.)\\s/, '$1<span class=\"hl-list-marker\">$2</span> ');",
    "    var codeRe = new RegExp(BT + '([^' + BT + ']+)' + BT, 'g');",
    "    ln = ln.replace(codeRe, function(m) { return '<span class=\"hl-inline-code\">' + m + '</span>'; });",
    "    ln = ln.replace(/\\*\\*(.+?)\\*\\*/g, '<span class=\"hl-bold\">**$1**</span>');",
    "    ln = ln.replace(/__(.+?)__/g, '<span class=\"hl-bold\">__$1__</span>');",
    "    ln = ln.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<span class=\"hl-link\">[<span class=\"hl-link-text\">$1</span>](<span class=\"hl-link-url\">$2</span>)</span>');",
    "    out.push(ln);",
    "  }",
    "  return out.join(NL) + NL;",
    "}",
    "",
    "var editor = document.querySelector('.md-editor');",
    "var hlCode = document.querySelector('.highlight-layer code');",
    "",
    "function syncHighlight() {",
    "  if (editor && hlCode) hlCode.innerHTML = highlightMarkdown(editor.value);",
    "}",
    "",
    "if (editor) {",
    "  syncHighlight();",
    "  editor.addEventListener('input', function() {",
    "    syncHighlight();",
    "    clearTimeout(debounceTimer);",
    "    debounceTimer = setTimeout(function() {",
    "      vscode.postMessage({ type: 'edit', text: editor.value });",
    "    }, 300);",
    "  });",
    "  editor.addEventListener('scroll', function() {",
    "    if (hlCode && hlCode.parentElement) {",
    "      hlCode.parentElement.scrollTop = editor.scrollTop;",
    "      hlCode.parentElement.scrollLeft = editor.scrollLeft;",
    "    }",
    "  });",
    "}",
    "",
    "document.querySelectorAll('.otp-item a').forEach(function(link) {",
    "  link.addEventListener('click', function(e) {",
    "    e.preventDefault();",
    "    var id = link.closest('.otp-item').dataset.id;",
    "    var el = document.getElementById(id);",
    "    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });",
    "  });",
    "});",
    "",
    "var observer = new IntersectionObserver(function(entries) {",
    "  entries.forEach(function(entry) {",
    "    if (entry.isIntersecting) {",
    "      document.querySelectorAll('.otp-item').forEach(function(i) { i.classList.remove('active'); });",
    "      var match = document.querySelector('.otp-item[data-id=\"' + entry.target.id + '\"]');",
    "      if (match) match.classList.add('active');",
    "    }",
    "  });",
    "}, { rootMargin: '0px 0px -60% 0px', threshold: 0.1 });",
    "",
    "document.querySelectorAll('.prose h2, .prose h3, .prose h4, .prose h5, .prose h6').forEach(function(h) {",
    "  if (h.id) observer.observe(h);",
    "});",
    "",
    "document.querySelector('.prose')?.addEventListener('click', function(e) {",
    "  var a = e.target.closest('a');",
    "  if (!a) return;",
    "  var href = a.getAttribute('href');",
    "  if (!href) return;",
    "  if (href.match(/\\.md(#.*)?$/) || href.match(/\\.markdown(#.*)?$/)) {",
    "    e.preventDefault();",
    "    vscode.postMessage({ type: 'openLink', href: href });",
    "  }",
    "});",
    "",
    "var leftBtn = document.getElementById('toggleLeftToc');",
    "var rightBtn = document.getElementById('toggleRightToc');",
    "",
    "if (leftBtn && !leftBtn.disabled) {",
    "  leftBtn.addEventListener('click', function() {",
    "    vscode.postMessage({ type: 'toggleSidebar', side: 'left' });",
    "  });",
    "}",
    "",
    "if (rightBtn && !rightBtn.disabled) {",
    "  rightBtn.addEventListener('click', function() {",
    "    vscode.postMessage({ type: 'toggleSidebar', side: 'right' });",
    "  });",
    "}",
    "",
    "var handle = document.getElementById('resizeHandle');",
    "if (handle) {",
    "  var container = handle.parentElement;",
    "  var layoutPanel = container.querySelector('.layout');",
    "  var dragging = false;",
    "",
    "  handle.addEventListener('mousedown', function(e) {",
    "    e.preventDefault();",
    "    dragging = true;",
    "    handle.classList.add('dragging');",
    "    document.body.style.cursor = 'col-resize';",
    "    document.body.style.userSelect = 'none';",
    "  });",
    "",
    "  document.addEventListener('mousemove', function(e) {",
    "    if (!dragging || !container || !layoutPanel) return;",
    "    var rect = container.getBoundingClientRect();",
    "    var pct = ((e.clientX - rect.left) / rect.width) * 100;",
    "    pct = Math.max(20, Math.min(80, pct));",
    "    layoutPanel.style.width = pct + '%';",
    "  });",
    "",
    "  document.addEventListener('mouseup', function() {",
    "    if (!dragging) return;",
    "    dragging = false;",
    "    handle.classList.remove('dragging');",
    "    document.body.style.cursor = '';",
    "    document.body.style.userSelect = '';",
    "  });",
    "}",
    "",
    "// Mermaid diagrams are rendered if a mermaid script was included",
    "if (typeof mermaid !== 'undefined') {",
    "  var mermaidEls = document.querySelectorAll('pre.mermaid');",
    "  if (mermaidEls.length > 0) {",
    "    var bg = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background').trim();",
    "    var isDark = false;",
    "    if (bg) {",
    "      var c = bg.replace('#','');",
    "      if (c.length === 6) {",
    "        var r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);",
    "        isDark = (r*0.299 + g*0.587 + b*0.114) < 128;",
    "      }",
    "    }",
    "    mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default', fontFamily: 'inherit' });",
    "    mermaid.run({ nodes: mermaidEls });",
    "  }",
    "}",
    "",
    "// Cross-page search",
    "var searchBar = document.getElementById('searchBar');",
    "var searchInput = document.getElementById('searchInput');",
    "var searchCount = document.getElementById('searchCount');",
    "var proseEl = document.querySelector('.prose');",
    "var originalProseHTML = proseEl ? proseEl.innerHTML : '';",
    "var globalMatches = [];",
    "var globalIdx = -1;",
    "var localMarks = [];",
    "",
    "function buildGlobalMatches(query) {",
    "  globalMatches = [];",
    "  if (!query) return;",
    "  var lq = query.toLowerCase();",
    "  __pages.forEach(function(p) {",
    "    var text = p.text.toLowerCase();",
    "    var idx = text.indexOf(lq);",
    "    while (idx !== -1) {",
    "      globalMatches.push({ pageIndex: p.index });",
    "      idx = text.indexOf(lq, idx + 1);",
    "    }",
    "  });",
    "}",
    "",
    "function highlightCurrentPage(query) {",
    "  if (proseEl) proseEl.innerHTML = originalProseHTML;",
    "  localMarks = [];",
    "  if (!query || !proseEl) return;",
    "  var walker = document.createTreeWalker(proseEl, NodeFilter.SHOW_TEXT, null);",
    "  var nodes = [];",
    "  while (walker.nextNode()) nodes.push(walker.currentNode);",
    "  var lq = query.toLowerCase();",
    "  nodes.forEach(function(node) {",
    "    var text = node.textContent;",
    "    var lower = text.toLowerCase();",
    "    if (lower.indexOf(lq) === -1) return;",
    "    var frag = document.createDocumentFragment();",
    "    var last = 0;",
    "    var i = lower.indexOf(lq, 0);",
    "    while (i !== -1) {",
    "      frag.appendChild(document.createTextNode(text.slice(last, i)));",
    "      var mark = document.createElement('mark');",
    "      mark.className = 'search-highlight';",
    "      mark.textContent = text.slice(i, i + query.length);",
    "      frag.appendChild(mark);",
    "      last = i + query.length;",
    "      i = lower.indexOf(lq, last);",
    "    }",
    "    frag.appendChild(document.createTextNode(text.slice(last)));",
    "    node.parentNode.replaceChild(frag, node);",
    "  });",
    "  localMarks = Array.from(proseEl.querySelectorAll('mark.search-highlight'));",
    "}",
    "",
    "function localIndexForGlobal(gIdx) {",
    "  var count = 0;",
    "  for (var i = 0; i < gIdx; i++) {",
    "    if (globalMatches[i].pageIndex === __activePageIndex) count++;",
    "  }",
    "  return count;",
    "}",
    "",
    "function showCurrentMatch() {",
    "  localMarks.forEach(function(m) { m.classList.remove('current'); });",
    "  if (globalIdx < 0 || globalIdx >= globalMatches.length) return;",
    "  var match = globalMatches[globalIdx];",
    "  if (match.pageIndex !== __activePageIndex) {",
    "    vscode.postMessage({ type: 'searchNavigate', index: match.pageIndex, query: searchInput.value, globalIdx: globalIdx });",
    "    return;",
    "  }",
    "  var localIdx = localIndexForGlobal(globalIdx);",
    "  if (localMarks[localIdx]) {",
    "    localMarks[localIdx].classList.add('current');",
    "    localMarks[localIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });",
    "  }",
    "  updateCount();",
    "}",
    "",
    "function updateCount() {",
    "  if (searchCount) {",
    "    searchCount.textContent = globalMatches.length > 0 ? (globalIdx + 1) + ' of ' + globalMatches.length : 'No results';",
    "  }",
    "}",
    "",
    "function doSearch(query) {",
    "  buildGlobalMatches(query);",
    "  highlightCurrentPage(query);",
    "  if (globalMatches.length > 0) {",
    "    var first = globalMatches.findIndex(function(m) { return m.pageIndex === __activePageIndex; });",
    "    globalIdx = first >= 0 ? first : 0;",
    "  } else {",
    "    globalIdx = -1;",
    "  }",
    "  showCurrentMatch();",
    "  updateCount();",
    "}",
    "",
    "function stepSearch(dir) {",
    "  if (globalMatches.length === 0) return;",
    "  globalIdx = (globalIdx + dir + globalMatches.length) % globalMatches.length;",
    "  showCurrentMatch();",
    "}",
    "",
    "document.addEventListener('keydown', function(e) {",
    "  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {",
    "    e.preventDefault();",
    "    if (searchBar) { searchBar.classList.remove('hidden'); searchInput.focus(); searchInput.select(); }",
    "  }",
    "  if (e.key === 'Escape' && searchBar && !searchBar.classList.contains('hidden')) {",
    "    searchBar.classList.add('hidden');",
    "    if (proseEl) proseEl.innerHTML = originalProseHTML;",
    "    localMarks = []; globalMatches = []; globalIdx = -1;",
    "    if (searchCount) searchCount.textContent = '';",
    "    vscode.postMessage({ type: 'clearSearch' });",
    "  }",
    "});",
    "",
    "if (searchInput) {",
    "  searchInput.addEventListener('input', function() {",
    "    doSearch(searchInput.value);",
    "    vscode.postMessage({ type: 'updateSearch', query: searchInput.value });",
    "  });",
    "  searchInput.addEventListener('keydown', function(e) {",
    "    if (e.key === 'Enter') { e.preventDefault(); stepSearch(e.shiftKey ? -1 : 1); }",
    "  });",
    "}",
    "",
    "document.getElementById('searchNext')?.addEventListener('click', function() { stepSearch(1); });",
    "document.getElementById('searchPrev')?.addEventListener('click', function() { stepSearch(-1); });",
    "document.getElementById('searchClose')?.addEventListener('click', function() {",
    "  searchBar.classList.add('hidden');",
    "  if (proseEl) proseEl.innerHTML = originalProseHTML;",
    "  localMarks = []; globalMatches = []; globalIdx = -1;",
    "  if (searchCount) searchCount.textContent = '';",
    "  vscode.postMessage({ type: 'clearSearch' });",
    "});",
    "",
    "if (__searchQuery) {",
    "  searchBar.classList.remove('hidden');",
    "  searchInput.value = __searchQuery;",
    "  doSearch(__searchQuery);",
    "}",
  ];
  return lines.join("\n");
}

function getStyles(): string {
  return `
    :root {
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --sidebar-bg: var(--vscode-sideBar-background, var(--bg));
      --sidebar-fg: var(--vscode-sideBar-foreground, var(--fg));
      --border: var(--vscode-panel-border, rgba(128,128,128,0.2));
      --accent: var(--vscode-textLink-foreground, #4e94f8);
      --hover-bg: var(--vscode-list-hoverBackground, rgba(128,128,128,0.1));
      --active-bg: var(--vscode-list-activeSelectionBackground, rgba(78,148,248,0.15));
      --active-fg: var(--vscode-list-activeSelectionForeground, var(--accent));
      --muted: var(--vscode-descriptionForeground, rgba(128,128,128,0.8));
      --toolbar-bg: var(--vscode-editorGroupHeader-tabsBackground, var(--sidebar-bg));
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      font-size: var(--vscode-font-size, 14px);
      color: var(--fg);
      background: var(--bg);
      line-height: 1.6;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .hidden { display: none !important; }

    .split-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .split-container.split-mode {
      flex-direction: row;
    }

    .split-container.split-mode .layout {
      flex: none;
      width: 50%;
      border-right: none;
      border-top: none;
    }

    .split-container.split-mode .editor-wrap {
      flex: 1;
      border-top: none;
    }

    .split-container:not(.split-mode) {
      flex: 1;
    }

    .resize-handle {
      width: 5px;
      cursor: col-resize;
      background: var(--border);
      flex-shrink: 0;
      transition: background 0.1s ease;
    }

    .resize-handle:hover, .resize-handle.dragging {
      background: var(--accent);
    }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: var(--toolbar-bg);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .search-input {
      flex: 1;
      max-width: 280px;
      background: var(--bg);
      color: var(--fg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 3px 8px;
      font-family: inherit;
      font-size: 12px;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--accent);
    }

    .search-count {
      font-size: 11px;
      color: var(--muted);
      min-width: 50px;
    }

    .search-nav-btn, .search-close-btn {
      background: none;
      border: none;
      color: var(--muted);
      cursor: pointer;
      font-size: 14px;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: inherit;
    }

    .search-nav-btn:hover, .search-close-btn:hover {
      color: var(--fg);
      background: var(--hover-bg);
    }

    mark.search-highlight {
      background: rgba(255, 200, 0, 0.3);
      color: inherit;
      border-radius: 2px;
    }

    mark.search-highlight.current {
      background: rgba(255, 200, 0, 0.6);
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 32px;
      min-height: 32px;
      padding: 0 8px;
      background: var(--toolbar-bg);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
    }

    .toolbar-icons {
      display: flex;
      align-items: center;
      gap: 2px;
      flex: 1;
      justify-content: flex-end;
    }

    .page-indicator {
      font-size: 12px;
      color: var(--muted);
      min-width: 36px;
      text-align: center;
    }

    .bar-btn {
      background: none;
      border: none;
      color: var(--muted);
      cursor: pointer;
      font-size: 14px;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: inherit;
      line-height: 1;
      transition: all 0.12s ease;
    }

    .bar-btn:hover {
      color: var(--fg);
      background: var(--hover-bg);
    }

    .bar-btn[disabled] {
      opacity: 0.3;
      cursor: default;
    }

    .bar-btn[disabled]:hover {
      background: none;
      color: var(--muted);
    }

    .bar-btn-off svg rect:nth-child(2) {
      opacity: 0;
    }

    .bar-btn-disabled {
      opacity: 0.25;
      cursor: default;
    }

    .bar-btn-disabled:hover {
      background: none;
      color: var(--muted);
    }

    .mode-toggle {
      display: flex;
      align-items: center;
      background: var(--hover-bg);
      border-radius: 6px;
      padding: 2px;
      gap: 1px;
    }

    .mode-btn {
      background: none;
      border: none;
      color: var(--muted);
      font-family: inherit;
      font-size: 12px;
      padding: 3px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .mode-btn:hover {
      color: var(--fg);
    }

    .mode-btn.active {
      background: var(--bg);
      color: var(--fg);
      font-weight: 500;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .layout {
      display: grid;
      grid-template-columns: 220px 1fr 200px;
      flex: 1;
      overflow: hidden;
      transition: grid-template-columns 0.15s ease;
    }

    .layout.hide-left { grid-template-columns: 0px 1fr 200px; }
    .layout.hide-right { grid-template-columns: 220px 1fr 0px; }
    .layout.hide-left.hide-right { grid-template-columns: 0px 1fr 0px; }

    .layout.hide-left .sidebar-left { overflow: hidden; padding: 0; border: none; }
    .layout.hide-right .sidebar-right { overflow: hidden; padding: 0; border: none; }

    .sidebar-left {
      background: var(--sidebar-bg);
      border-right: 1px solid var(--border);
      overflow-y: auto;
      padding: 16px 0;
    }

    .sidebar-header {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      padding: 0 16px 8px;
    }

    .toc-list, .otp-list {
      list-style: none;
    }

    .toc-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      cursor: pointer;
      font-size: 13px;
      color: var(--sidebar-fg);
      border-left: 3px solid transparent;
      transition: all 0.15s ease;
    }

    .toc-item:hover {
      background: var(--hover-bg);
    }

    .toc-item.active {
      background: var(--active-bg);
      border-left-color: var(--accent);
      color: var(--active-fg);
      font-weight: 500;
    }

    .toc-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .toc-depth-1 { font-weight: 500; }
    .toc-depth-2 { padding-left: 56px; font-size: 12px; }

    .toc-chevron-spacer {
      width: 16px;
      flex-shrink: 0;
    }

    .toc-chevron {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--muted);
      transition: transform 0.15s ease;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      user-select: none;
    }

    .toc-chevron svg {
      display: block;
    }

    .toc-chevron.collapsed {
      transform: rotate(-90deg);
    }

    .toc-item:focus {
      outline: none;
    }

    .toc-item:focus:not(.active) {
      background: var(--hover-bg);
    }

    .content {
      overflow-y: auto;
      padding: 32px 48px;
    }

    .page-title {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }

    .page-title h1 {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.3;
    }

    .page-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
    }

    .page-link {
      cursor: pointer;
      text-decoration: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: color 0.15s ease;
      background: none;
      border: none;
      font: inherit;
      color: inherit;
      padding: 0;
    }

    .page-link:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      border-radius: 4px;
    }

    .page-link:hover .page-link-title {
      color: var(--accent);
    }

    .next-link {
      align-items: flex-end;
      margin-left: auto;
    }

    .page-link-label {
      font-size: 12px;
      color: var(--muted);
    }

    .page-link-title {
      font-size: 15px;
      font-weight: 500;
      color: var(--fg);
      transition: color 0.15s ease;
    }

    /* Prose styles */
    .prose h2 { font-size: 22px; font-weight: 600; margin: 32px 0 12px; padding-top: 16px; border-top: 1px solid var(--border); }
    .prose h3 { font-size: 18px; font-weight: 600; margin: 24px 0 8px; }
    .prose h4 { font-size: 16px; font-weight: 600; margin: 20px 0 8px; }
    .prose h5 { font-size: 14px; font-weight: 600; margin: 16px 0 6px; }
    .prose h6 { font-size: 13px; font-weight: 600; margin: 16px 0 6px; color: var(--muted); }

    .prose p { margin: 0 0 16px; }

    .prose ul, .prose ol { margin: 0 0 16px; padding-left: 24px; }
    .prose li { margin-bottom: 4px; }

    .prose code {
      font-family: var(--vscode-editor-font-family, 'Fira Code', monospace);
      font-size: 0.9em;
      background: var(--hover-bg);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .prose pre {
      background: var(--hover-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      margin: 0 0 16px;
      position: relative;
    }

    .prose pre code {
      background: none;
      padding: 0;
      border-radius: 0;
    }

    .prose blockquote {
      border-left: 3px solid var(--accent);
      padding: 4px 16px;
      margin: 0 0 16px;
      color: var(--muted);
    }

    .prose table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 16px;
    }

    .prose th, .prose td {
      border: 1px solid var(--border);
      padding: 8px 12px;
      text-align: left;
    }

    .prose th {
      background: var(--hover-bg);
      font-weight: 600;
    }

    .prose img {
      max-width: 100%;
      border-radius: 8px;
      margin: 8px 0;
    }

    .prose a {
      color: var(--accent);
      text-decoration: none;
    }

    .prose a:hover {
      text-decoration: underline;
    }

    .prose hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 24px 0;
    }

    /* Task list checkboxes */
    .prose ul:has(> li > input[type="checkbox"]) {
      list-style: none;
      padding-left: 0;
    }

    .prose li > input[type="checkbox"] {
      margin-right: 0.5em;
    }

    /* Copy button on code blocks */
    .copy-btn {
      position: absolute;
      top: 6px;
      right: 6px;
      padding: 2px 10px;
      font-size: 11px;
      font-family: inherit;
      border-radius: 4px;
      background: var(--bg);
      color: var(--muted);
      border: 1px solid var(--border);
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s;
    }

    pre:hover .copy-btn,
    .copy-btn:focus-visible {
      opacity: 1;
    }

    .copy-btn:hover,
    .copy-btn:focus-visible {
      color: var(--fg);
      background: var(--hover-bg);
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }

    /* highlight.js token colors mapped to VS Code theme */
    .hljs { background: transparent; }
    .hljs-keyword,
    .hljs-selector-tag,
    .hljs-built_in,
    .hljs-name { color: var(--vscode-debugTokenExpression-name, #569cd6); }
    .hljs-string,
    .hljs-attr,
    .hljs-template-tag { color: var(--vscode-debugTokenExpression-string, #ce9178); }
    .hljs-number,
    .hljs-literal { color: var(--vscode-debugTokenExpression-number, #b5cea8); }
    .hljs-comment,
    .hljs-doctag { color: var(--vscode-editorLineNumber-foreground, #6a9955); font-style: italic; }
    .hljs-function .hljs-title,
    .hljs-title.function_ { color: var(--vscode-symbolIcon-functionForeground, #dcdcaa); }
    .hljs-type,
    .hljs-title.class_ { color: var(--vscode-symbolIcon-classForeground, #4ec9b0); }
    .hljs-variable,
    .hljs-params { color: var(--vscode-symbolIcon-variableForeground, #9cdcfe); }
    .hljs-meta { color: var(--vscode-editorLineNumber-foreground, #6a9955); }
    .hljs-regexp { color: var(--vscode-debugTokenExpression-string, #d16969); }
    .hljs-addition { color: #b5cea8; background: rgba(155,185,85,0.1); }
    .hljs-deletion { color: #ce9178; background: rgba(206,145,120,0.1); }
    .hljs-symbol,
    .hljs-bullet { color: var(--vscode-debugTokenExpression-name, #569cd6); }
    .hljs-link { color: var(--accent); text-decoration: underline; }
    .hljs-emphasis { font-style: italic; }
    .hljs-strong { font-weight: bold; }

    /* Math display blocks */
    .math-display {
      overflow-x: auto;
      padding: 0.5rem 0;
      text-align: center;
    }

    /* Footnotes */
    .prose section.footnotes {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      font-size: 0.875em;
      color: var(--muted);
    }

    .prose section.footnotes ol {
      padding-left: 1.5rem;
    }

    .prose sup a[href^="#fn"] {
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
    }

    .prose a.footnote-backref {
      color: var(--accent);
      text-decoration: none;
    }

    /* Mermaid diagram blocks */
    .mermaid-block {
      margin: 1rem 0;
      display: flex;
      justify-content: center;
    }

    .mermaid-block pre.mermaid {
      background: transparent;
      border: none;
      padding: 0;
    }

    .mermaid-block svg {
      max-width: 100%;
      height: auto;
    }

    .sidebar-right {
      background: var(--sidebar-bg);
      border-left: 1px solid var(--border);
      overflow-y: auto;
      padding: 16px 0;
    }

    .otp-item {
      padding: 3px 16px;
      font-size: 12px;
      line-height: 1.5;
      transition: all 0.15s ease;
    }

    .otp-item a {
      color: var(--muted);
      text-decoration: none;
      display: block;
      transition: color 0.15s ease;
    }

    .otp-item:hover a {
      color: var(--fg);
    }

    .otp-item.active a {
      color: var(--accent);
      font-weight: 500;
    }

    .otp-level-2 { padding-left: 16px; }
    .otp-level-3 { padding-left: 28px; }
    .otp-level-4 { padding-left: 40px; }
    .otp-level-5 { padding-left: 52px; }
    .otp-level-6 { padding-left: 64px; }

    .editor-wrap {
      flex: 1;
      overflow: hidden;
    }

    .editor-container {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .highlight-layer, .md-editor {
      font-family: var(--vscode-editor-font-family, 'Fira Code', 'Consolas', monospace);
      font-size: var(--vscode-editor-font-size, 13px);
      line-height: 1.6;
      tab-size: 2;
      white-space: pre-wrap;
      word-wrap: break-word;
      padding: 24px 32px;
      margin: 0;
      border: none;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
    }

    .highlight-layer {
      background: var(--bg);
      color: var(--fg);
      pointer-events: none;
      z-index: 1;
    }

    .highlight-layer code {
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      color: inherit;
    }

    .md-editor {
      background: transparent;
      color: transparent;
      caret-color: var(--fg);
      resize: none;
      outline: none;
      z-index: 2;
      -webkit-text-fill-color: transparent;
    }

    .hl-heading { color: var(--vscode-symbolIcon-classForeground, #d19a66); font-weight: 600; }
    .hl-bold { color: var(--fg); font-weight: 700; }
    .hl-italic { color: var(--fg); font-style: italic; }
    .hl-inline-code { color: var(--vscode-textPreformat-foreground, #ce9178); }
    .hl-code-block { color: var(--vscode-textPreformat-foreground, #ce9178); }
    .hl-link { color: var(--muted); }
    .hl-link-text { color: var(--accent); }
    .hl-link-url { color: var(--vscode-textPreformat-foreground, #ce9178); }
    .hl-blockquote { color: var(--muted); font-style: italic; }
    .hl-list-marker { color: var(--accent); font-weight: 600; }
    .hl-hr { color: var(--muted); }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.5); }
  `;
}
