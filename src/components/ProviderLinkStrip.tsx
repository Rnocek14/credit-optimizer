/**
 * ProviderLinkStrip — "Where to get your credits."
 *
 * The monetization surface: tracked outbound links to the alt-credit
 * providers a plan relies on. Every click fires `outbound_provider_click`
 * (the revenue event) before opening the provider in a new tab.
 * Sponsored relationships are disclosed inline when affiliate config is set.
 */
import { Card } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { PROVIDERS, getOutboundUrl, type ProviderKey } from '@/lib/providers';
import { logEvent } from '@/lib/analytics';

interface ProviderLinkStripProps {
  /** Which providers to show, in order. Defaults to the core four. */
  providerKeys?: ProviderKey[];
  /** Analytics context, e.g. 'plan_preview' | 'compare'. */
  source: string;
  templateId?: string | null;
}

const DEFAULT_KEYS: ProviderKey[] = ['SOPHIA', 'STUDYCOM', 'CLEP', 'DSST'];

export function ProviderLinkStrip({
  providerKeys = DEFAULT_KEYS,
  source,
  templateId = null,
}: ProviderLinkStripProps) {
  const anySponsored = providerKeys.some((k) => PROVIDERS[k].sponsored);

  return (
    <Card className="p-6 md:p-8">
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Where to get your credits</h2>
          <p className="text-sm text-muted-foreground">
            These are the providers plans like this one are built from. Start with the
            cheapest source that covers your remaining requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {providerKeys.map((key) => {
            const p = PROVIDERS[key];
            return (
              <a
                key={key}
                href={getOutboundUrl(key)}
                target="_blank"
                rel={p.sponsored ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}
                onClick={() =>
                  logEvent('outbound_provider_click', {
                    provider: key,
                    source,
                    template_id: templateId,
                    sponsored: p.sponsored,
                  })
                }
                className="group flex items-start justify-between gap-3 rounded-lg border border-border/60 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium text-foreground flex items-center gap-1.5">
                    {p.name}
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <p className="text-xs text-muted-foreground">{p.blurb}</p>
                  <p className="text-xs font-medium text-primary">{p.pricing}</p>
                </div>
              </a>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Always confirm a course counts toward your specific program before purchasing.
          {anySponsored && (
            <> Some links are affiliate links — they never change your price, and they
            help keep Pivot free.</>
          )}
        </p>
      </div>
    </Card>
  );
}
