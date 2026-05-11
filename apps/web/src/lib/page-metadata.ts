import type { Metadata } from "next";
import { getPageTitle } from "./page-titles";

const DESCRIPTION =
  "A specification for how interfaces should present and interact with markdown documents.";

export async function pageMetadata(slug: string): Promise<Metadata> {
  const title = await getPageTitle(slug);
  if (!title) return {};

  const displayTitle = title.replace(/\n/g, " ");
  const fullTitle = `${displayTitle} | MDXG`;
  const ogImageUrl = slug ? `/og/${slug}` : "/og";

  return {
    title: displayTitle,
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "MDXG",
      title: fullTitle,
      description: DESCRIPTION,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${displayTitle} - MDXG`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: DESCRIPTION,
      images: [ogImageUrl],
    },
  };
}
