import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { getDocs } from "@/lib/content";
import { Header } from "@/components/header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mdxg.dev"),
  title: {
    default: "MDXG — Markdown Experience Guidelines",
    template: "%s | MDXG",
  },
  description:
    "A specification for how interfaces should present and interact with markdown documents.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://mdxg.dev",
    siteName: "MDXG",
    title: "MDXG — Markdown Experience Guidelines",
    description:
      "A specification for how interfaces should present and interact with markdown documents.",
    images: [{ url: "/og", width: 1200, height: 630, alt: "MDXG" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MDXG — Markdown Experience Guidelines",
    description:
      "A specification for how interfaces should present and interact with markdown documents.",
    images: ["/og"],
  },
};

const themeScript = `
(function() {
  var t = localStorage.getItem('theme');
  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const docs = await getDocs();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex h-screen flex-col overflow-hidden bg-background font-sans text-foreground antialiased">
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <Header docs={docs.map((d) => ({ slug: d.slug, label: d.label }))} />
        {children}
      </body>
    </html>
  );
}
