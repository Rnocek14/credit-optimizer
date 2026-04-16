/**
 * ComparePage — placeholder until Phase 3 ships the full comparison surface.
 * Routed to from /get-started ResultsStep "Compare all 5 schools" CTA.
 */
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Scale, Sparkles } from 'lucide-react';

export default function ComparePage() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Compare Degree Plans | Pivot</title>
        <meta
          name="description"
          content="Side-by-side comparison of verified degree plans across 5 universities — coming soon."
        />
      </Helmet>

      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-xl text-center space-y-6 animate-fade-in-up">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Scale className="h-8 w-8" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold tracking-wider uppercase">
                Coming next
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Side-by-side comparison
            </h1>
            <p className="text-muted-foreground text-lg">
              Compare all 5 verified universities — cost, time, and personalized
              transfer fit based on credits you already have. We're polishing this
              now.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => navigate('/get-started')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to your top 3
            </Button>
            <Button
              onClick={() => navigate('/edu-tree-v5/marketplace')}
              className="gap-2"
            >
              Browse full marketplace
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
