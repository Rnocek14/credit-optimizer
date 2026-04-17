/**
 * GuidePage — `/guides/:slug`
 *
 * Looks up the guide by slug from the registry, renders it inside PublicLayout,
 * and appends the PlanPreviewCTA. If the slug doesn't exist, redirects to
 * /guides (the index).
 *
 * Each guide ships its own React component (in src/content/guides/) so we
 * keep content + layout decoupled and can iterate on copy without touching
 * route plumbing.
 */
import { Navigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PublicLayout } from '@/components/public/PublicLayout';
import { PlanPreviewCTA } from '@/components/public/PlanPreviewCTA';
import { findGuide, GUIDES } from '@/content/guides/registry';
import { TesuVsCoscGuide } from '@/content/guides/tesu-vs-cosc-bsba';
import { CheapestBachelorsGuide } from '@/content/guides/cheapest-online-bachelors-2025';
import { SophiaTransferGuide } from '@/content/guides/sophia-learning-transfer-guide';
import { StraighterlineVsSophiaVsStudycomGuide } from '@/content/guides/straighterline-vs-sophia-vs-studycom';
import { FinishBachelorsUnder10kGuide } from '@/content/guides/finish-bachelors-under-10k';
import { useEffect } from 'react';
import { logEvent } from '@/lib/analytics';

// Map slug → component. New guides: add entry to registry + map below.
const GUIDE_COMPONENTS: Record<string, React.ComponentType> = {
  'tesu-vs-cosc-bsba': TesuVsCoscGuide,
  'cheapest-online-bachelors-2025': CheapestBachelorsGuide,
  'sophia-learning-transfer-guide': SophiaTransferGuide,
  'straighterline-vs-sophia-vs-studycom': StraighterlineVsSophiaVsStudycomGuide,
  'finish-bachelors-under-10k': FinishBachelorsUnder10kGuide,
};

export default function GuidePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const meta = findGuide(slug);
  const GuideComponent = GUIDE_COMPONENTS[slug];

  // Fire view event once per slug change. Tracks which guides actually get
  // read so we can double down on what works (Track 1 measurement layer).
  useEffect(() => {
    if (meta) {
      logEvent('public_guide_view', {
        slug: meta.slug,
        category: meta.category,
      });
    }
  }, [meta]);

  if (!meta || !GuideComponent) {
    return <Navigate to="/guides" replace />;
  }

  // JSON-LD: Article schema for rich-snippet eligibility.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: meta.title,
    description: meta.description,
    datePublished: meta.updatedAt,
    dateModified: meta.updatedAt,
    author: { '@type': 'Organization', name: 'Pivot' },
    publisher: { '@type': 'Organization', name: 'Pivot' },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://pivot.app/guides/${meta.slug}`,
    },
  };

  return (
    <PublicLayout
      title={`${meta.title} | Pivot`}
      description={meta.description}
      canonicalPath={`/guides/${meta.slug}`}
      jsonLd={jsonLd}
    >
      <div className="container mx-auto px-4 py-8 lg:py-12 max-w-3xl space-y-8">
        {/* Breadcrumb back to index */}
        <Link
          to="/guides"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All guides
        </Link>

        {/* Decisive H1 */}
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold">
            {meta.category} guide
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            {meta.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated{' '}
            {new Date(meta.updatedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </header>

        {/* Guide body */}
        <GuideComponent />

        {/* End-of-guide CTA → product */}
        <PlanPreviewCTA sourceSlug={meta.slug} />

        {/* Related guides — keeps users in the SEO surface */}
        <section aria-labelledby="related" className="pt-6 border-t border-border">
          <h2 id="related" className="text-lg font-semibold mb-4">
            More guides
          </h2>
          <ul className="grid gap-3">
            {GUIDES.filter((g) => g.slug !== meta.slug)
              .slice(0, 3)
              .map((g) => (
                <li key={g.slug}>
                  <Link
                    to={`/guides/${g.slug}`}
                    className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/40 transition-colors"
                  >
                    <p className="font-medium">{g.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {g.description}
                    </p>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      </div>
    </PublicLayout>
  );
}
