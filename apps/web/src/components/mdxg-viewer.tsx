"use client";

import {
  useEffect,
  useCallback,
  useState,
  useRef,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { Page } from "@/lib/parser";

type Mode = "preview" | "markdown" | "both";

interface MdxgViewerProps {
  pages: Page[];
  rawMarkdown: string;
  activePageIndex: number;
  pageHrefs?: string[];
  onPageChange?: (index: number) => void;
}

export function MdxgViewer({
  pages,
  rawMarkdown,
  activePageIndex,
  pageHrefs,
  onPageChange,
}: MdxgViewerProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("preview");
  const [leftHidden, setLeftHidden] = useState(false);
  const [rightHidden, setRightHidden] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLPreElement>(null);
  const tocListRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showPreview = mode === "preview" || mode === "both";
  const showSource = mode === "markdown" || mode === "both";
  const isBoth = mode === "both";

  const activePage = pages[activePageIndex] ?? pages[0];
  const hasLeftToc = pages.length > 1;
  const hasRightToc = activePage ? activePage.headings.length > 1 : false;

  useEffect(() => {
    if (!tocListRef.current) return;
    const active = tocListRef.current.querySelector<HTMLElement>(
      `[data-index="${activePageIndex}"]`
    );
    if (active) active.focus();
  }, [activePageIndex]);

  const navigateTo = useCallback((pageIndex: number) => {
    if (onPageChange) {
      onPageChange(pageIndex);
    } else {
      router.push(pageHrefs?.[pageIndex] ?? "/");
    }
  }, [onPageChange, router, pageHrefs]);

  const htmlWithIds = useMemo(() => {
    if (!activePage) return "";
    return activePage.html;
  }, [activePage]);

  const globalMatches = useMemo(() => {
    if (!searchQuery) return [];
    const lq = searchQuery.toLowerCase();
    const matches: { pageIndex: number }[] = [];
    pages.forEach((p, i) => {
      const text = (p.title + "\n" + p.markdown).toLowerCase();
      let idx = text.indexOf(lq);
      while (idx !== -1) {
        matches.push({ pageIndex: i });
        idx = text.indexOf(lq, idx + 1);
      }
    });
    return matches;
  }, [searchQuery, pages]);

  const [globalMatchIdx, setGlobalMatchIdx] = useState(-1);

  useEffect(() => {
    if (globalMatches.length > 0) {
      const first = globalMatches.findIndex((m) => m.pageIndex === activePageIndex);
      setGlobalMatchIdx(first >= 0 ? first : 0);
    } else {
      setGlobalMatchIdx(-1);
    }
  }, [globalMatches, activePageIndex]);

  useEffect(() => {
    if (!contentRef.current || !searchQuery) return;
    const marks = contentRef.current.querySelectorAll("mark.search-hl");
    marks.forEach((m) => m.classList.remove("current"));

    if (globalMatchIdx < 0 || globalMatchIdx >= globalMatches.length) return;
    const match = globalMatches[globalMatchIdx];
    if (match.pageIndex !== activePageIndex) {
      navigateTo(match.pageIndex);
      return;
    }

    let localIdx = 0;
    for (let i = 0; i < globalMatchIdx; i++) {
      if (globalMatches[i].pageIndex === activePageIndex) localIdx++;
    }

    const allMarks = contentRef.current.querySelectorAll("mark.search-hl");
    if (allMarks[localIdx]) {
      allMarks[localIdx].classList.add("current");
      allMarks[localIdx].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [globalMatchIdx, globalMatches, activePageIndex, navigateTo, searchQuery]);

  const highlightedHtml = useMemo(() => {
    if (!searchQuery || !htmlWithIds) return htmlWithIds;
    const lq = searchQuery.toLowerCase();
    const div = typeof document !== "undefined" ? document.createElement("div") : null;
    if (!div) return htmlWithIds;
    div.innerHTML = htmlWithIds;
    highlightTextNodes(div, lq, searchQuery.length);
    return div.innerHTML;
  }, [htmlWithIds, searchQuery]);

  // Scroll-spy for the right outline
  useEffect(() => {
    if (!contentRef.current || !activePage) return;
    const headings = contentRef.current.querySelectorAll("h2, h3, h4, h5, h6");
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target.id) {
            setActiveHeadingId(entry.target.id);
          }
        }
      },
      { rootMargin: "0px 0px -60% 0px", threshold: 0.1 }
    );

    headings.forEach((h) => {
      if (h.id) observer.observe(h);
    });

    return () => observer.disconnect();
  }, [activePage, activePageIndex, highlightedHtml]);

  // Copy-to-clipboard buttons on code blocks
  useEffect(() => {
    if (!contentRef.current) return;
    const pres = contentRef.current.querySelectorAll("pre");
    const buttons: HTMLButtonElement[] = [];

    pres.forEach((pre) => {
      if (pre.querySelector(".copy-btn")) return;
      if (pre.classList.contains("mermaid")) return;

      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.textContent = "Copy";
      btn.addEventListener("click", () => {
        const code = pre.querySelector("code");
        const text = code?.textContent ?? pre.textContent ?? "";
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = "Copied!";
          setTimeout(() => { btn.textContent = "Copy"; }, 1500);
        });
      });

      pre.style.position = "relative";
      pre.appendChild(btn);
      buttons.push(btn);
    });

    return () => {
      buttons.forEach((btn) => btn.remove());
    };
  }, [highlightedHtml, activePageIndex]);

  // Mermaid diagram rendering
  useEffect(() => {
    if (!contentRef.current) return;
    const mermaidEls = contentRef.current.querySelectorAll<HTMLPreElement>("pre.mermaid");
    if (mermaidEls.length === 0) return;

    let cancelled = false;

    import("mermaid").then((mod) => {
      if (cancelled) return;
      const mermaid = mod.default;
      const isDark = document.documentElement.classList.contains("dark");
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        fontFamily: "inherit",
      });
      mermaid.run({ nodes: mermaidEls as unknown as ArrayLike<HTMLElement> });
    });

    return () => { cancelled = true; };
  }, [highlightedHtml, activePageIndex]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchVisible(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      if (e.key === "Escape" && searchVisible) {
        setSearchVisible(false);
        setSearchQuery("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchVisible]);

  const handleTocKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target.dataset.index) return;
      const items = tocListRef.current
        ? Array.from(tocListRef.current.querySelectorAll<HTMLElement>("[data-index]")).filter(
            (el) => el.style.display !== "none"
          )
        : [];
      const pos = items.indexOf(target);
      if (pos === -1) return;

      const idx = parseInt(target.dataset.index, 10);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (pos < items.length - 1) items[pos + 1].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (pos > 0) items[pos - 1].focus();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (target.dataset.depth === "1" && collapsedGroups[idx]) {
          toggleGroup(idx);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (target.dataset.depth === "1" && !collapsedGroups[idx]) {
          toggleGroup(idx);
        } else if (target.dataset.depth === "2") {
          const parent = items
            .filter((i) => parseInt(i.dataset.index!, 10) < idx && i.dataset.depth === "1")
            .pop();
          if (parent) parent.focus();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        navigateTo(idx);
      }
    },
    [collapsedGroups, navigateTo]
  );

  function toggleGroup(groupIdx: number) {
    setCollapsedGroups((prev) => ({ ...prev, [groupIdx]: !prev[groupIdx] }));
  }

  function stepSearch(dir: number) {
    if (globalMatches.length === 0) return;
    setGlobalMatchIdx((prev) => (prev + dir + globalMatches.length) % globalMatches.length);
  }

  if (!activePage) return null;

  const effectiveLeftHidden = !hasLeftToc || leftHidden;
  const effectiveRightHidden = !hasRightToc || rightHidden;
  const prevPage = activePageIndex > 0 ? pages[activePageIndex - 1] : null;
  const nextPage = activePageIndex < pages.length - 1 ? pages[activePageIndex + 1] : null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b px-2">
        <div className="flex flex-1 items-center gap-1">
          {pages.length > 1 ? (
            <>
              <button
                onClick={() => navigateTo(Math.max(0, activePageIndex - 1))}
                disabled={activePageIndex === 0}
                title={prevPage?.title}
                aria-label={prevPage ? `Previous page: ${prevPage.title}` : "Previous page"}
                className="rounded px-2 py-0.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                &lsaquo;
              </button>
              <span className="hidden min-w-12 text-center text-xs text-muted-foreground sm:inline">
                {activePageIndex + 1} / {pages.length}
              </span>
              <button
                onClick={() => navigateTo(Math.min(pages.length - 1, activePageIndex + 1))}
                disabled={activePageIndex === pages.length - 1}
                title={nextPage?.title}
                aria-label={nextPage ? `Next page: ${nextPage.title}` : "Next page"}
                className="rounded px-2 py-0.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                &rsaquo;
              </button>
            </>
          ) : (
            <span />
          )}
        </div>

        {/* Mode toggle — pill buttons on desktop, dropdown on mobile */}
        <div className="hidden items-center gap-0.5 rounded-md bg-muted p-0.5 sm:flex">
          {(["preview", "markdown", "both"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded px-3 py-0.5 text-xs transition-all",
                mode === m
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground outline-none">
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuRadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as Mode)}
              >
                <DropdownMenuRadioItem value="preview">Preview</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="markdown">Markdown</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="both">Both</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sidebar toggles */}
        <div className="flex flex-1 items-center justify-end gap-1">
          <button
            onClick={() => {
              if (window.innerWidth < 640) setLeftDrawerOpen(true);
              else setLeftHidden((h) => !h);
            }}
            disabled={!hasLeftToc}
            title="Toggle pages sidebar"
            className={cn(
              "rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-25",
              effectiveLeftHidden && hasLeftToc && "opacity-50 max-sm:opacity-100"
            )}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="1" y="2" width="14" height="12" rx="1.5" />
              <rect x="1" y="2" width="4.5" height="12" fill="currentColor" opacity={effectiveLeftHidden ? 0 : 0.35} stroke="none" />
              <line x1="5.5" y1="2" x2="5.5" y2="14" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (window.innerWidth < 640) setRightDrawerOpen(true);
              else setRightHidden((h) => !h);
            }}
            disabled={!hasRightToc}
            title="Toggle outline sidebar"
            className={cn(
              "rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-25",
              effectiveRightHidden && hasRightToc && "opacity-50 max-sm:opacity-100"
            )}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="1" y="2" width="14" height="12" rx="1.5" />
              <rect x="10.5" y="2" width="4.5" height="12" fill="currentColor" opacity={effectiveRightHidden ? 0 : 0.35} stroke="none" />
              <line x1="10.5" y1="2" x2="10.5" y2="14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchVisible && (
        <div className="flex shrink-0 items-center gap-1.5 border-b px-3 py-1">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                stepSearch(e.shiftKey ? -1 : 1);
              }
            }}
            placeholder="Find..."
            className="max-w-[280px] flex-1 rounded border border-border bg-background px-2 py-0.5 text-xs outline-none focus:border-primary"
          />
          <span className="min-w-[50px] text-[11px] text-muted-foreground">
            {globalMatches.length > 0
              ? `${globalMatchIdx + 1} of ${globalMatches.length}`
              : searchQuery
              ? "No results"
              : ""}
          </span>
          <button onClick={() => stepSearch(-1)} className="rounded px-1.5 py-0.5 text-sm text-muted-foreground hover:bg-muted">
            &lsaquo;
          </button>
          <button onClick={() => stepSearch(1)} className="rounded px-1.5 py-0.5 text-sm text-muted-foreground hover:bg-muted">
            &rsaquo;
          </button>
          <button
            onClick={() => {
              setSearchVisible(false);
              setSearchQuery("");
            }}
            className="rounded px-1.5 py-0.5 text-sm text-muted-foreground hover:bg-muted"
          >
            &times;
          </button>
        </div>
      )}

      {/* Split container */}
      <div
        className={cn("flex flex-1 overflow-hidden", isBoth ? "flex-col sm:flex-row" : "flex-col")}
      >
        {/* Preview layout */}
        {showPreview && (
        <div className={cn("flex overflow-hidden", isBoth ? "sm:w-1/2 max-sm:flex-1" : "flex-1")}>
        {/* Left sidebar - Pages TOC (desktop only) */}
        <nav
          className={cn(
            "hidden shrink-0 overflow-y-auto border-r transition-all duration-150 sm:block",
            effectiveLeftHidden ? "sm:!w-0 sm:overflow-hidden sm:border-none sm:p-0" : "w-[220px]"
          )}
        >
          <div className="p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Pages
            </p>
            <ul ref={tocListRef} className="space-y-0" onKeyDown={handleTocKeyDown}>
              {pages.map((page, i) => {
                const isH1 = page.depth === 1;
                const hasChildren =
                  isH1 && i + 1 < pages.length && pages[i + 1].depth === 2;
                const isChildHidden =
                  page.depth === 2 && isChildCollapsed(i, pages, collapsedGroups);

                return (
                  <li
                    key={page.id}
                    data-index={i}
                    data-depth={page.depth}
                    tabIndex={0}
                    style={{ display: isChildHidden ? "none" : undefined }}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest(".toc-chevron")) return;
                      navigateTo(i);
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 border-l-[3px] border-transparent px-3 py-1.5 text-[13px] outline-none transition-colors",
                      page.depth === 2 && "pl-14 text-xs",
                      i === activePageIndex
                        ? "border-l-primary bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted",
                      "focus:bg-muted"
                    )}
                  >
                    {isH1 && hasChildren ? (
                      <span
                        className="toc-chevron flex shrink-0 cursor-pointer items-center text-muted-foreground transition-transform"
                        style={{
                          transform: collapsedGroups[i] ? "rotate(-90deg)" : undefined,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroup(i);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16">
                          <path
                            d="M4 6l4 4 4-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    ) : isH1 ? (
                      <span className="w-4 shrink-0" />
                    ) : null}
                    <span className="truncate">{page.title}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-12 sm:py-8" ref={contentRef}>
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 border-b pb-4">
              <h1 className="text-[28px] font-bold leading-tight">{activePage.title}</h1>
            </div>

            <article
              className="prose prose-neutral dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />

            {/* Page footer */}
            <div className="mt-12 flex justify-between border-t pt-6 pb-12">
              {prevPage ? (
                <button
                  onClick={() => navigateTo(activePageIndex - 1)}
                  className="group flex flex-col gap-1 text-left outline-none"
                >
                  <span className="text-xs text-muted-foreground">Previous</span>
                  <span className="text-[15px] font-medium text-foreground transition-colors group-hover:text-primary">
                    &lsaquo; {prevPage.title}
                  </span>
                </button>
              ) : (
                <span />
              )}
              {nextPage ? (
                <button
                  onClick={() => navigateTo(activePageIndex + 1)}
                  className="group ml-auto flex flex-col items-end gap-1 text-right outline-none"
                >
                  <span className="text-xs text-muted-foreground">Next</span>
                  <span className="text-[15px] font-medium text-foreground transition-colors group-hover:text-primary">
                    {nextPage.title} &rsaquo;
                  </span>
                </button>
              ) : (
                <span />
              )}
            </div>
          </div>
        </main>

        {/* Right sidebar - On this page (desktop only) */}
        <aside
          className={cn(
            "hidden shrink-0 overflow-y-auto border-l transition-all duration-150 sm:block",
            effectiveRightHidden ? "sm:!w-0 sm:overflow-hidden sm:border-none sm:p-0" : "w-[200px]"
          )}
        >
          {activePage.headings.length > 0 && (
            <div className="p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                On this page
              </p>
              <ul className="space-y-0.5">
                {activePage.headings.map((h) => (
                  <li key={h.id} data-id={h.id} className="otp-item">
                    <a
                      href={`#${h.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById(h.id);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={cn(
                        "block py-0.5 text-xs transition-colors",
                        h.level === 3 && "pl-0",
                        h.level === 4 && "pl-3",
                        h.level === 5 && "pl-6",
                        h.level === 6 && "pl-9",
                        activeHeadingId === h.id
                          ? "font-medium text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
        </div>
        )}

        {/* Resize divider for split mode */}
        {isBoth && (
          <div className="shrink-0 bg-border max-sm:h-[5px] max-sm:w-full sm:w-[5px]" />
        )}

        {/* Read-only source view */}
        {showSource && (
          <div className="flex-1 overflow-hidden">
            <pre
              ref={sourceRef}
              className="h-full overflow-auto whitespace-pre-wrap break-words bg-background p-6 font-mono text-[13px] leading-relaxed"
            >
              <code
                dangerouslySetInnerHTML={{ __html: highlightMarkdown(rawMarkdown) }}
              />
            </pre>
          </div>
        )}
      </div>

      {/* Mobile left drawer - Pages TOC */}
      <Drawer open={leftDrawerOpen} onOpenChange={setLeftDrawerOpen} direction="left">
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Pages</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <ul className="space-y-0">
              {pages.map((page, i) => {
                const isH1 = page.depth === 1;
                const hasChildren =
                  isH1 && i + 1 < pages.length && pages[i + 1].depth === 2;
                const isChildHidden =
                  page.depth === 2 && isChildCollapsed(i, pages, collapsedGroups);

                return (
                  <li
                    key={page.id}
                    tabIndex={0}
                    style={{ display: isChildHidden ? "none" : undefined }}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest(".toc-chevron")) return;
                      navigateTo(i);
                      setLeftDrawerOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        navigateTo(i);
                        setLeftDrawerOpen(false);
                      }
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-[13px] transition-colors",
                      page.depth === 2 && "pl-14 text-xs",
                      i === activePageIndex
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {isH1 && hasChildren ? (
                      <span
                        className="toc-chevron flex shrink-0 cursor-pointer items-center text-muted-foreground transition-transform"
                        style={{
                          transform: collapsedGroups[i] ? "rotate(-90deg)" : undefined,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroup(i);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16">
                          <path
                            d="M4 6l4 4 4-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    ) : isH1 ? (
                      <span className="w-4 shrink-0" />
                    ) : null}
                    <span className="truncate">{page.title}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Mobile right drawer - On this page */}
      <Drawer open={rightDrawerOpen} onOpenChange={setRightDrawerOpen} direction="right">
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>On this page</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            {activePage.headings.length > 0 && (
              <ul className="space-y-0.5">
                {activePage.headings.map((h) => (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setRightDrawerOpen(false);
                        setTimeout(() => {
                          const el = document.getElementById(h.id);
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 300);
                      }}
                      className={cn(
                        "block rounded-md px-3 py-1.5 text-sm transition-colors",
                        h.level === 3 && "pl-3",
                        h.level === 4 && "pl-6",
                        h.level === 5 && "pl-9",
                        h.level === 6 && "pl-12",
                        activeHeadingId === h.id
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function isChildCollapsed(
  index: number,
  pages: Page[],
  collapsedGroups: Record<number, boolean>
): boolean {
  for (let i = index - 1; i >= 0; i--) {
    if (pages[i].depth === 1) {
      return !!collapsedGroups[i];
    }
    if (pages[i].depth !== 2) break;
  }
  return false;
}

function highlightMarkdown(text: string): string {
  let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = html.split("\n");
  let inCode = false;
  const out: string[] = [];

  for (const ln of lines) {
    if (ln.startsWith("```")) {
      inCode = !inCode;
      out.push(`<span class="hl-code-block">${ln}</span>`);
      continue;
    }
    if (inCode) {
      out.push(`<span class="hl-code-block">${ln}</span>`);
      continue;
    }
    if (/^#{1,6}\s/.test(ln)) {
      out.push(`<span class="hl-heading">${ln}</span>`);
      continue;
    }
    if (/^&gt;\s/.test(ln)) {
      out.push(`<span class="hl-blockquote">${ln}</span>`);
      continue;
    }
    if (/^(---|\*\*\*|___)\s*$/.test(ln)) {
      out.push(`<span class="hl-hr">${ln}</span>`);
      continue;
    }

    let line = ln.replace(/^(\s*)([-*+]|\d+\.)\s/, '$1<span class="hl-list-marker">$2</span> ');
    line = line.replace(/`([^`]+)`/g, '<span class="hl-inline-code">`$1`</span>');
    line = line.replace(/\*\*(.+?)\*\*/g, '<span class="hl-bold">**$1**</span>');
    line = line.replace(/__(.+?)__/g, '<span class="hl-bold">__$1__</span>');
    line = line.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<span class="hl-link">[<span class="hl-link-text">$1</span>](<span class="hl-link-url">$2</span>)</span>'
    );
    out.push(line);
  }

  return out.join("\n") + "\n";
}

function highlightTextNodes(el: Element, lowerQuery: string, queryLen: number) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const text = node.textContent ?? "";
    const lower = text.toLowerCase();
    if (!lower.includes(lowerQuery)) continue;

    const frag = document.createDocumentFragment();
    let last = 0;
    let idx = lower.indexOf(lowerQuery, 0);
    while (idx !== -1) {
      frag.appendChild(document.createTextNode(text.slice(last, idx)));
      const mark = document.createElement("mark");
      mark.className = "search-hl";
      mark.textContent = text.slice(idx, idx + queryLen);
      frag.appendChild(mark);
      last = idx + queryLen;
      idx = lower.indexOf(lowerQuery, last);
    }
    frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode?.replaceChild(frag, node);
  }
}
