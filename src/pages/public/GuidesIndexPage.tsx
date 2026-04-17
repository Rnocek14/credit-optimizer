/**
 * GuidesIndexPage — `/guides`
 *
 * Public, indexable index of all guides. This page also gets a sitemap entry
 * and JSON-LD CollectionPage schema. Internal linking from this index helps
 * Google discover individual guides faster.
 */
import { Link } from 'react-router-dom';
import { PublicLayout } from '@/components/public/PublicLayout';
import { Card } from '@/components/ui/card';
import { GUIDES } from '@/content/guides/registry';
import { ArrowRight } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  compare: 'School comparisons',
  pricing: 'Cost & pricing',
  transfer: 'Transfer credit',
  speed: 'Time to degree',
};

export default function GuidesIndexPage() {
  const sorted = [...GUIDES].sort((a, b) => a.order - b.order);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Pivot Guides — Online Degree Planning',
    description:
      'Data-backed guides for finishing your accredited online bachelor\'s degree faster and cheaper.',
    url: 'https://pivot.app/guides',
    hasPart: sorted.map((g) => ({
      '@type': 'Article',
      headline: g.title,
      url: `https://pivot.app/guides/${g.slug}`,
    })),
  };

  return (
    <PublicLayout
      title="Online Degree Guides | Pivot"
      description="Data-backed guides for finishing your accredited online bachelor's degree faster and cheaper. School comparisons, transfer credit rules, and real cost numbers."
      canonicalPath="/guides"
      jsonLd={jsonLd}
    >
      <div className="container mx-auto px-4 py-10 lg:py-16 max-w-4xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Online degree guides
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Real numbers. No affiliate fluff. Built on verified transfer rules
            from the schools that actually let you finish online.
          </p>
        </header>

        <ul className="grid gap-4 md:grid-cols-2">
          {sorted.map((g) => (
            <li key={g.slug}>
              <Link to={`/guides/${g.slug}`} className="block group h-full">
                <Card className="p-5 h-full flex flex-col gap-3 hover:border-primary/50 transition-colors">
                  <p className="text-xs uppercase tracking-wider text-primary font-semibold">
                    {CATEGORY_LABELS[g.category] ?? g.category}
                  </p>
                  <h2 className="text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
                    {g.title}
                  </h2>
                  <p className="text-sm text-muted-foreground flex-1">
                    {g.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Read guide
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PublicLayout>
  );
}
