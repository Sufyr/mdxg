const STORAGE_KEY = "mdxg-preview-markdown";

export function setPreviewMarkdown(md: string) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, md);
  }
}

export function getPreviewMarkdown(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function clearPreviewMarkdown() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
