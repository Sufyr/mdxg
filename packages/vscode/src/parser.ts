import hljs from "highlight.js";
import { parseMarkdown as sharedParse, escapeHtml } from "@mdxg/parser";
export type { Page, Heading } from "@mdxg/parser";

export function parseMarkdown(raw: string) {
  return sharedParse(raw, {
    codeRenderer(text, lang) {
      let highlighted: string;
      if (lang && hljs.getLanguage(lang)) {
        highlighted = hljs.highlight(text, { language: lang }).value;
      } else {
        highlighted = escapeHtml(text);
      }
      const langLabel = lang ? ` data-lang="${escapeHtml(lang)}"` : "";
      return { html: `<pre${langLabel}><code class="hljs">${highlighted}</code></pre>` };
    },
  });
}
