import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveRoute, getAllRouteParams, getPageHref } from "@/lib/content";
import { pageMetadata } from "@/lib/page-metadata";
import { MdxgViewer } from "@/components/mdxg-viewer";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export async function generateStaticParams() {
  return getAllRouteParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  return pageMetadata(slug.join("/"));
}

export default async function DocPage({ params }: PageProps) {
  const { slug = [] } = await params;
  const resolved = await resolveRoute(slug);

  if (!resolved) notFound();

  const { doc, pageIndex } = resolved;

  const pageHrefs = doc.pages.map((_, i) => getPageHref(doc, i));

  return (
    <MdxgViewer
      pages={doc.pages}
      rawMarkdown={doc.rawMarkdown}
      activePageIndex={pageIndex}
      pageHrefs={pageHrefs}
    />
  );
}
