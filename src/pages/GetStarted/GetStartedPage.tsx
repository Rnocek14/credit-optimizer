/**
 * GetStartedPage — 60-second onboarding flow.
 * Career → Constraints → Generate → Top 3 Results
 *
 * Also: captures SEO attribution (?ref=guide&slug=…) and fires lightweight
 * funnel events (get_started_started, get_started_completed) tagged with the
 * source slug. This is how we'll know which public guide actually drives
 * conversions before building real attribution infrastructure.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { CareerPickerStep } from './steps/CareerPickerStep';
import { ConstraintStep } from './steps/ConstraintStep';
import { GeneratingStep } from './steps/GeneratingStep';
import { ResultsStep } from './steps/ResultsStep';
import {
  useQuickPlanGeneration,
  type QuickPlanConstraints,
  type GoalPreference,
  type ExperienceLevel,
} from '@/hooks/useQuickPlanGeneration';
import { useActivePlan } from '@/hooks/useActivePlan';
import {
  useCaptureGuideAttribution,
  readGuideAttribution,
} from '@/hooks/useGuideAttribution';
import { logEvent } from '@/lib/analytics';
import { GraduationCap } from 'lucide-react';

type Step = 'career' | 'constraints' | 'generating' | 'results';

export default function GetStartedPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('career');
  const [careerId, setCareerId] = useState<string | null>(null);
  const [constraints, setConstraints] = useState<QuickPlanConstraints | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const { data: activePlan, isLoading: planLoading } = useActivePlan();
  const { results } = useQuickPlanGeneration(constraints);

  // Persist ?ref / ?slug from URL into sessionStorage on mount.
  useCaptureGuideAttribution();

  // Fire funnel-start event exactly once per session.
  const startedFiredRef = useRef(false);
  useEffect(() => {
    if (startedFiredRef.current) return;
    startedFiredRef.current = true;
    const attr = readGuideAttribution();
    logEvent('get_started_started', {
      ref: attr.ref,
      slug: attr.slug,
    });
  }, []);

  // All hooks above — conditional returns below
  if (!planLoading && activePlan) {
    return <Navigate to="/today" replace />;
  }

  const handleCareerSelect = (id: string | null) => {
    setCareerId(id);
    setStep('constraints');
  };

  const handleGenerate = (goal: GoalPreference, experience: ExperienceLevel) => {
    setConstraints({ careerId, goal, experience });
    setStep('generating');
  };

  const handleGeneratingComplete = useCallback(() => {
    setStep('results');
  }, []);

  const handleSelectTemplate = async (templateId: string) => {
    setIsApplying(true);
    try {
      // Funnel completion event — captures source attribution.
      const attr = readGuideAttribution();
      logEvent('get_started_completed', {
        templateId,
        careerId,
        ref: attr.ref,
        slug: attr.slug,
      });
      navigate(`/edu-tree-v6/${templateId}`);
      toast.success('Opening your degree plan…');
    } catch (err) {
      toast.error('Failed to load plan. Please try again.');
      setIsApplying(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Get Started – Build Your Degree Plan | Pivot</title>
        <meta name="description" content="Build your personalized degree plan in under 60 seconds." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Pivot</span>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 max-w-4xl">
          {step === 'career' && (
            <CareerPickerStep onSelect={handleCareerSelect} />
          )}
          {step === 'constraints' && (
            <ConstraintStep
              onGenerate={handleGenerate}
              onBack={() => setStep('career')}
            />
          )}
          {step === 'generating' && (
            <GeneratingStep onComplete={handleGeneratingComplete} />
          )}
          {step === 'results' && (
            <ResultsStep
              results={results}
              onSelectTemplate={handleSelectTemplate}
              isApplying={isApplying}
              goal={constraints?.goal}
              careerId={careerId}
            />
          )}
        </main>
      </div>
    </>
  );
}
