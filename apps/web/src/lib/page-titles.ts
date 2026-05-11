import { getDocs } from "./content";

export async function getPageTitle(slug: string): Promise<string | null> {
  const docs = await getDocs();

  if (!slug) {
    return "Markdown Experience\nGuidelines";
  }

  const segments = slug.split("/");
  const [first, ...rest] = segments;
  const doc = docs.find((d) => d.slug === first);
  if (!doc) return null;

  if (rest.length === 0) {
    return doc.pages[0]?.title ?? doc.label;
  }

  const pageSlug = rest[0];
  const page = doc.pages.find((p) => p.id === pageSlug);
  if (!page) return null;

  return page.title;
}
