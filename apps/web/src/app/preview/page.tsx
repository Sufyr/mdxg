"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseMarkdown, type Page } from "@/lib/parser";
import { getPreviewMarkdown } from "@/lib/preview-store";
import { MdxgViewer } from "@/components/mdxg-viewer";

export default function PreviewPage() {
  const router = useRouter();
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [pages, setPages] = useState<Page[] | null>(null);
  const rawMarkdown = getPreviewMarkdown();

  useEffect(() => {
    if (!rawMarkdown) {
      router.replace("/");
      return;
    }
    parseMarkdown(rawMarkdown).then(setPages);
  }, [rawMarkdown, router]);

  if (!rawMarkdown) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        No file loaded. Redirecting...
      </div>
    );
  }

  if (!pages) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        No content to preview.
      </div>
    );
  }

  return (
    <MdxgViewer
      pages={pages}
      rawMarkdown={rawMarkdown}
      activePageIndex={activePageIndex}
      onPageChange={setActivePageIndex}
    />
  );
}
