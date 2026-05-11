# Markdown Experience Guidelines

**Version 0.1.0 (Draft)**

> **This specification is a work in progress.** Section numbers, requirements, and conformance levels may change. Feedback, questions, and contributions are welcome. Open an issue or start a discussion on the [GitHub repository](https://github.com/vercel-labs/mdxg).

This document specifies the **Markdown Experience Guidelines (MDXG)**, a set of capabilities that interfaces SHOULD provide when presenting, navigating, and editing markdown documents.

MDXG is not a syntax specification. It does not replace CommonMark, GFM, or any other markdown flavor. It operates one layer above: given a parsed markdown document, MDXG defines what a user should be able to _do_ with it.

MDXG does not prescribe specific layouts, positions, or visual styles. How a tool surfaces these capabilities (sidebars, panels, dropdowns, gestures, menus, command palettes) is an implementation decision. The spec defines _what_, not _where_.

The key words "MUST", "MUST NOT", "SHOULD", "SHOULD NOT", and "MAY" in this document are to be interpreted as described in RFC 2119.

## Motivation

Markdown is the default format for communication between AI agents and humans. Every major LLM produces markdown natively. It is portable across platforms, readable as plain text, and supported by thousands of applications. For agents, it is ideal: low token cost, simple to generate, and trivial to parse.

For humans, the experience has not kept up. Most markdown interfaces treat documents as a flat stream of text with basic rendering. A 2,000-line markdown file is presented the same way as a 20-line one. Headings exist in the syntax but are ignored as a structural element. There is no navigation, no orientation, no sense of place within a document. This gap is driving people toward heavier formats when markdown should be enough.

MDXG closes this gap by defining a standard set of capabilities that any markdown interface can implement, in whatever form fits its platform. The goal is to make markdown work for both audiences: agents produce it, humans consume it, and the experience is good for everyone.

## Definitions

**Document**: A single markdown file.

**Page**: A virtual subdivision of a document, defined by heading boundaries.

**Page navigation**: Any mechanism that allows the user to move between pages.

**Page outline**: Any mechanism that shows the heading structure within the current page.

**Preview mode**: A rendered view of the markdown content.

**Source view**: A read-only view of the raw markdown text with syntax highlighting.

**Source edit**: An editable view of the raw markdown text with syntax highlighting, where changes are synced back to the underlying document.

# Rendering

## 1. Theming

A conforming tool MUST adapt its appearance to the host environment.

- Background, foreground, accent, and border colors SHOULD be derived from the host theme or operating system
- The tool MUST NOT require the user to configure colors to achieve a usable appearance
- Both light and dark host themes MUST be supported
- MDXG does not define a color scheme, font, or visual style

## 2. Code Block Rendering

A conforming tool MUST render fenced code blocks with syntax highlighting in preview mode.

### 2.1 Requirements

- Fenced code blocks with a language identifier (e.g., ` ```js `) MUST be rendered with language-appropriate syntax highlighting
- Code blocks without a language identifier MUST still render as monospaced preformatted text
- A copy-to-clipboard button MUST be provided on each code block, allowing the user to copy the block's content with a single action
- The syntax highlighting color scheme MUST adapt to the host's light/dark theme (Section 1)

### 2.2 Implementation Examples

- Shiki, Prism, or highlight.js for token-based highlighting
- A "Copy" button that appears on hover or is always visible in the top-right corner of the block
- Language label displayed alongside the copy button

## 3. Task Lists

A conforming tool MUST render task list syntax as checkboxes in preview mode.

### 3.1 Requirements

- `- [ ]` MUST render as an unchecked checkbox
- `- [x]` MUST render as a checked checkbox
- Checkboxes MAY be interactive (toggling updates the underlying source) or MAY be read-only. This is an implementation decision
- Task lists MUST retain their list structure and indentation

### 3.2 Implementation Examples

- Native HTML `<input type="checkbox">` elements (disabled or enabled)
- Custom checkbox components with click handlers that edit the source

## 4. Images

A conforming tool MUST render images in preview mode with sensible defaults.

### 4.1 Requirements

- Images MUST be rendered inline with the document content
- Relative image paths (e.g., `![](./images/diagram.png)`) MUST be resolved relative to the document's location
- Images MUST be constrained to the content width. They MUST NOT overflow the content area horizontally
- Alt text MUST be preserved and accessible to assistive technology
- If an image fails to load, the alt text SHOULD be displayed as a fallback

### 4.2 Implementation Examples

- `max-width: 100%` on `<img>` elements
- Lazy loading for images below the fold
- Click-to-zoom for large images

## 5. Tables

A conforming tool MUST render markdown tables in preview mode.

### 5.1 Requirements

- Tables MUST render with visible cell borders or equivalent visual separation
- Header rows MUST be visually distinguished from body rows (e.g., bold text, background color)
- Column alignment specified in the markdown (`---`, `:---`, `:---:`, `---:`) MUST be respected
- Tables wider than the content area MUST be horizontally scrollable. They MUST NOT break the page layout

### 5.2 Implementation Examples

- `overflow-x: auto` on a table wrapper
- Sticky header rows on long tables
- Responsive table layouts that stack columns on small screens

# Document Structure

## 6. Virtual Pages

### 6.1 Page Boundaries

A conforming tool MUST split the document into virtual pages at H1 (`#`) and H2 (`##`) heading boundaries. Both ATX-style (`# Heading`) and setext-style (underlined with `===` or `---`) headings MUST be recognized.

Headings inside fenced code blocks (`` ``` `` or `~~~`) MUST NOT be treated as page boundaries. The tool MUST track code fence open/close state when scanning for headings.

Each heading that triggers a page boundary starts a new page. The heading text becomes the page title. Content following the heading, up to the next page boundary, belongs to that page.

### 6.2 Pre-heading Content

Content appearing before the first H1 or H2 heading SHOULD be treated as an implicit page titled "Introduction." If the content before the first heading is empty or contains only whitespace, no Introduction page SHOULD be created. If an Introduction page is created, it MUST appear in page navigation alongside other pages.

### 6.3 Page Depth

Each page has a depth:

- H1 headings produce depth-1 pages
- H2 headings produce depth-2 pages

Depth SHOULD be used to convey hierarchy when listing pages (e.g., indentation, grouping, or visual weight).

### 6.4 Page Identifiers

Each page MUST have a unique, URL-safe identifier derived from its title (a "slug"). If multiple pages share the same slug, the tool MUST disambiguate them (e.g., by appending a numeric suffix).

## 7. Page Navigation

A conforming tool MUST provide a way for the user to:

- **See all pages** in the document, in document order, with depth hierarchy visible
- **Navigate to any page** by selecting it
- **Identify the current page**: the active page MUST be visually or contextually distinguished
- **Move sequentially**: the user MUST be able to advance to the next page or return to the previous page (see Section 9 for detailed requirements)

### 7.1 Implementation Examples

These are non-normative examples of how page navigation could be implemented:

- A sidebar with a clickable list of pages
- A dropdown/select menu in a toolbar
- A command palette with page search
- Swipe gestures on mobile
- Keyboard shortcuts (e.g., arrow keys)
- A collapsible tree view

## 8. Page Outline

A conforming tool MUST provide a way for the user to see and navigate to headings within the current page.

### 8.1 Requirements

- Only headings H3 through H6 within the active page MUST be included (H1 and H2 are page boundaries, not in-page headings)
- Each heading MUST be navigable. Selecting it scrolls or jumps to that heading
- Heading depth SHOULD be visually conveyed (e.g., indentation, font size)
- The currently visible heading SHOULD be indicated (scroll-spy or equivalent)
- If the active page has no H3–H6 headings, the outline MAY be hidden or empty

### 8.2 Implementation Examples

- A right sidebar with an "On this page" list
- A floating outline panel
- A table of contents dropdown
- Breadcrumb-style heading indicators

## 9. Sequential Navigation

This section elaborates the sequential movement requirement from Section 7. A conforming tool MUST provide a way to move to the previous and next pages from the current page.

### 9.1 Requirements

- The previous and next page titles SHOULD be visible to the user
- Controls that are not applicable (e.g., "previous" on the first page) MUST be hidden or disabled
- Sequential navigation MUST be accessible from at least one location in the interface (e.g., toolbar, footer, or keyboard shortcut) and MAY be accessible from multiple locations

### 9.2 Implementation Examples

- Previous/next buttons in a toolbar
- Footer links with page titles and directional indicators
- Keyboard shortcuts
- Swipe gestures

## 10. Search

A conforming tool MUST provide a way to search text across all pages in the document.

### 10.1 Requirements

- The user MUST be able to invoke search (e.g., Cmd/Ctrl+F or a search icon)
- Search MUST operate on the rendered text content visible to the user, not on the raw markdown source (e.g., a search for "bold" should not match `**bold**` via the asterisks)
- The current match MUST be highlighted and scrolled into view
- The user MUST be able to step through matches (next/previous)
- When stepping through matches, the current match position MUST be preserved across page boundaries. Navigating to a match on another page MUST land on that specific match, not the first match on the page
- Match count SHOULD be displayed (e.g., "3 of 12")
- Search that crosses page boundaries SHOULD navigate to the page containing the match automatically

### 10.2 Implementation Examples

- A search bar that appears at the top of the content area
- Highlighted `<mark>` elements in the rendered content
- Keyboard shortcuts for next/previous match (Enter / Shift+Enter)

# Editing

## 11. Mode Toggle

A conforming tool MUST support at least two modes and provide a way to switch between them:

### 11.1 Preview Mode

- The content area MUST display the rendered HTML of the active page only (not the full document)
- The page title MUST be displayed prominently
- Standard markdown elements MUST be rendered: paragraphs, headings, lists, code blocks, tables, blockquotes, images, links, horizontal rules
- In-page headings (H3–H6) MUST have stable, linkable identifiers

### 11.2 Source View

- The content area MUST display the raw markdown text of the **full document** (not just the active page)
- Syntax highlighting SHOULD be provided for markdown constructs: headings, bold, italic, inline code, fenced code blocks, links, blockquotes, and list markers
- The text MAY be read-only

### 11.3 Source Edit

A conforming MDXG Editor (see Conformance) MUST support editable source mode in addition to source view:

- The text MUST be editable
- Edits MUST be synced back to the underlying document

### 11.4 Toggle Behavior

- Switching modes MUST NOT open a new tab, window, or panel. The transition happens in place
- The active mode MUST be clearly indicated
- Page navigation and page outline MAY remain available in source mode, or MAY be hidden. This is an implementation decision

## 12. Document Links

When the user activates a link to another markdown file (e.g., `[see spec](SPEC.md)`), a conforming tool SHOULD open that file using the same MDXG-conforming viewer/editor, rather than falling back to a plain text view or external application.

### 12.1 Requirements

- If the link includes a fragment (e.g., `SPEC.md#virtual-pages`), the tool SHOULD navigate to the referenced heading or page within the target document
- If the target file does not exist or cannot be opened, the tool SHOULD indicate the error to the user. It MUST NOT crash or navigate to an empty state silently
- Links MUST be resolved relative to the current document's location
- Only links to local markdown files are in scope. External URLs (e.g., `https://...`) SHOULD be handled by the host environment's default behavior

# Accessibility

## 13. Keyboard Navigation

A conforming tool MUST support keyboard-based interaction for all core navigation features.

### 13.1 Requirements

- Page navigation controls (e.g., a page list) MUST be keyboard-navigable using arrow keys
- Selecting a page via keyboard (e.g., Enter) MUST navigate to that page
- The currently active page SHOULD receive focus when page navigation occurs
- Sequential navigation (previous/next) SHOULD be accessible via keyboard
- All interactive elements (buttons, links, controls) MUST have accessible names, using `aria-label`, visible text, or equivalent

### 13.2 Implementation Examples

- `tabindex="0"` on page list items with `keydown` handlers for arrow key navigation
- `aria-label` attributes on icon-only buttons
- Focus management that moves focus to the content area after page navigation

# Extensions

The capabilities in this section are SHOULD-level. They enhance the reading experience but are not part of standard CommonMark syntax. Implementations are encouraged to support them where feasible.

## 14. Math Rendering

Inline math and display math SHOULD be rendered using a math typesetting engine.

### 14.1 Requirements

- Inline math delimited by `$...$` SHOULD be rendered inline with the surrounding text
- Display math delimited by `$$...$$` SHOULD be rendered as a centered block
- If math rendering is not supported, the raw syntax MUST be preserved as-is. It MUST NOT be stripped, hidden, or garbled
- The math rendering style SHOULD adapt to the host's font size and color scheme

### 14.2 Implementation Examples

- KaTeX for fast client-side rendering
- MathJax for broader LaTeX coverage
- Server-side rendering to SVG or MathML

## 15. Diagram Rendering

Fenced code blocks with diagram language identifiers SHOULD be rendered as visual diagrams in preview mode.

### 15.1 Requirements

- At minimum, ` ```mermaid ` blocks SHOULD be supported
- Other diagram languages (e.g., `plantuml`, `d2`, `graphviz`) MAY also be supported
- If diagram rendering is not supported for a given language, the block MUST fall back to a standard syntax-highlighted code block (Section 2)
- Rendered diagrams SHOULD adapt to the host's color scheme

### 15.2 Implementation Examples

- Mermaid.js for client-side rendering
- Server-side rendering via CLI tools
- Interactive diagrams with zoom/pan

## 16. Footnotes

Footnote syntax SHOULD be rendered as linked footnotes with back-references.

### 16.1 Requirements

- Footnote references (`[^1]`, `[^note]`) SHOULD render as superscript links that jump to the footnote definition
- Footnote definitions (`[^1]: ...`) SHOULD render at the bottom of the page with back-links to each reference
- If footnotes are not supported, the raw syntax MUST be preserved as-is. It MUST NOT be stripped or hidden

### 16.2 Implementation Examples

- Superscript numbers that link to a footnote section at the page bottom
- Tooltip/popover previews on hover
- Sidenotes in wide layouts

# Conformance

An implementation may claim conformance to MDXG at one of two levels:

## MDXG Viewer

A read-only implementation. MUST support:

- Theme adaptation (Section 1)
- Code block rendering with syntax highlighting and copy button (Section 2)
- Task list rendering (Section 3)
- Image rendering (Section 4)
- Table rendering (Section 5)
- Virtual pages with H1/H2 boundaries (Section 6)
- Page navigation (Section 7)
- Page outline (Section 8)
- Sequential navigation (Section 9)
- Search (Section 10)
- Keyboard navigation (Section 13)

An MDXG Viewer MAY support source view (Section 11.2) and mode toggle (Section 11.4), but these are not required for viewer conformance. Source edit and document links are not required.

## MDXG Editor

A full implementation. MUST support everything in MDXG Viewer, plus:

- Mode toggle between preview and source (Section 11.4)
- Source edit with sync to the underlying document (Section 11.3)
- Document links opening in MDXG (Section 12)

Extensions (Sections 14–16) are SHOULD-level and do not affect conformance claims at either level, but implementations are encouraged to support them.
