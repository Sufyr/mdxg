# Getting Started

Welcome to the project! This page covers the basics.

## Installation

Run the following command:

```bash
npm install better-md
```

## Configuration

Create a config file in your project root.

### Basic Config

```json
{
  "theme": "dark",
  "pages": true
}
```

### Advanced Config

You can customize every aspect of the renderer.

## Quick Start

After installation, open any `.md` file and press `Cmd+Shift+V`.

# Architecture

This section describes how the extension works internally.

## Parser

The parser splits your markdown document on `# H1` headings. Each H1 becomes a separate virtual page.

## Webview

The webview renders three columns:

- **Left sidebar** — Table of contents listing all pages (H1s)
- **Main content** — The current page's rendered markdown
- **Right sidebar** — "On this page" showing H2–H6 within the current page

### Layout Grid

The layout uses CSS Grid with `grid-template-columns: 220px 1fr 200px`.

### Theming

All colors inherit from VS Code's theme variables, so it looks native in any theme.

## Navigation

Click any page in the left sidebar to jump to it. Use the Previous / Next buttons at the top of the content area.

# API Reference

## `parseMarkdown(raw: string): Page[]`

Splits the raw markdown string into an array of `Page` objects.

## `Page` Interface

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string` | The H1 text |
| `id` | `string` | URL-safe slug |
| `headings` | `Heading[]` | H2–H6 in this page |
| `html` | `string` | Rendered HTML |

## `Heading` Interface

```typescript
interface Heading {
  level: number;
  text: string;
  id: string;
}
```

# Contributing

## Development Setup

1. Clone the repo
2. Run `npm install`
3. Press `F5` to launch the extension host

## Code Style

We use TypeScript strict mode and follow the VS Code extension guidelines.

## Submitting PRs

- Create a feature branch
- Write tests for new functionality
- Open a PR against `main`
