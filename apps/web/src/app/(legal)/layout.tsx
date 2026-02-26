import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata = {
  robots: {
    index: true,
    follow: true,
  },
} satisfies Metadata;

export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Terug
          </Link>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            inovy
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-8 sm:py-16">
        {children}
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {year} Inovico B.V.</p>
            <nav aria-label="Juridische pagina's" className="flex gap-6">
              <Link
                href="/privacy-policy"
                className="transition-colors hover:text-foreground"
              >
                Privacybeleid
              </Link>
              <Link
                href="/terms-of-service"
                className="transition-colors hover:text-foreground"
              >
                Algemene Voorwaarden
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

