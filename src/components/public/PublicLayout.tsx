/**
 * PublicLayout — Auth-free shell for indexable SEO pages.
 *
 * NOTHING in this layout requires login, the AppShell, or React Query data.
 * That is intentional: every byte rendered here is crawlable and shareable.
 *
 * Used by:  /guides/:slug  (and future public surfaces — vs pages, calculators)
 *
 * Sections:
 *   - <Helmet>     SEO title, description, canonical, OG, JSON-LD
 *   - <header>     Minimal brand bar with one CTA into the app
 *   - <main>       Page content (article body)
 *   - <footer>     Lightweight links + legal
 */
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export interface PublicLayoutProps {
  /** Page <title>. Keep ≤60 chars; keyword first. */
  title: string;
  /** Meta description. Keep ≤160 chars. */
  description: string;
  /** Canonical URL (absolute path). Defaults to current location at runtime. */
  canonicalPath?: string;
  /** Optional JSON-LD payload (already a JS object). Stringified into a script tag. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  children: React.ReactNode;
}

const SITE_NAME = 'Pivot';

export function PublicLayout({
  title,
  description,
  canonicalPath,
  jsonLd,
  children,
}: PublicLayoutProps) {
  const canonical = canonicalPath
    ? `https://pivot.app${canonicalPath}`
    : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        {canonical && <link rel="canonical" href={canonical} />}

        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        {canonical && <meta property="og:url" content={canonical} />}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />

        {jsonLd && (
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        )}
      </Helmet>

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="border-b border-border/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="font-semibold tracking-tight text-lg"
            aria-label={`${SITE_NAME} home`}
          >
            {SITE_NAME}
          </Link>
          <Button asChild size="sm" variant="default" className="gap-1.5">
            <Link to="/get-started">
              See your path
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-border/60 mt-12">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {SITE_NAME}. Plan the smartest path to your degree.</p>
          <nav className="flex items-center gap-5">
            <Link to="/guides" className="hover:text-foreground transition-colors">
              Guides
            </Link>
            <Link to="/get-started" className="hover:text-foreground transition-colors">
              Get started
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
