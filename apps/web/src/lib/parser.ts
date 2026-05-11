import { createHighlighter, type Highlighter } from "shiki";
import { parseMarkdown as sharedParse, escapeHtml } from "@mdxg/parser";
export type { Page, Heading } from "@mdxg/parser";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark", "github-light"],
      langs: [
        "javascript", "typescript", "python", "bash", "json", "html", "css",
        "markdown", "yaml", "toml", "rust", "go", "java", "c", "cpp",
        "ruby", "php", "sql", "shell", "diff", "jsx", "tsx", "xml",
        "swift", "kotlin", "scala", "zig", "lua",
      ],
    });
  }
  return highlighterPromise;
}

export async function parseMarkdown(raw: string) {
  const highlighter = await getHighlighter();

  return sharedParse(raw, {
    codeRenderer(text, lang) {
      const loaded = highlighter.getLoadedLanguages();
      const resolved = lang && loaded.includes(lang) ? lang : "plaintext";
      return {
        html: highlighter.codeToHtml(text, {
          lang: resolved,
          themes: { light: "github-light", dark: "github-dark" },
          defaultColor: false,
        }),
      };
    },
  });
}
