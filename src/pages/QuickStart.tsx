import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, Sparkles, TrendingUp, MapPin, Target, Share2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { useQuotaCheck } from '@/hooks/useQuotaCheck';
import { useOnboardingSubmit } from '@/hooks/useOnboardingSubmit';
import { ShareModal } from '@/components/ShareModal';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { useToast } from '@/hooks/use-toast';

const quickStartSchema = z.object({
  career_goal: z.string().min(1, 'Please select a career goal'),
  target_role: z.string().min(1, 'Please enter a target role'),
  location: z.string().min(1, 'Please enter a location')
});

type QuickStartForm = z.infer<typeof quickStartSchema>;

interface DiagnosisResult {
  success: boolean;
  score: number;
  score_bucket: string;
  insights: string[];
  referralCode: string;
  onboarding_id: string;
}

const CAREER_GOALS = [
  { value: 'skill_up', label: 'Skill Up', icon: '📈' },
  { value: 'career_change', label: 'Career Change', icon: '🔄' },
  { value: 'promotion', label: 'Get Promoted', icon: '⬆️' },
  { value: 'freelance', label: 'Go Freelance', icon: '💼' },
  { value: 'leadership', label: 'Leadership Role', icon: '👑' },
  { value: 'startup', label: 'Start a Business', icon: '🚀' }
];

export default function QuickStart() {
  const [step, setStep] = useState(1);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: quotaData, isLoading: quotaLoading } = useQuotaCheck();
  const { mutate: submitOnboarding, isPending: isSubmitting } = useOnboardingSubmit();
  
  const form = useForm<QuickStartForm>({
    resolver: zodResolver(quickStartSchema),
    defaultValues: {
      career_goal: '',
      target_role: '',
      location: ''
    }
  });

  React.useEffect(() => {
    // Check if growth layer is enabled
    if (!isFeatureEnabled('growthLayerEnabled')) {
      navigate('/plan', { replace: true });
      return;
    }
    
    // Track page view
    trackTelemetryEvent({
      task: 'quick_start_view',
      route: '/quick-start',
      complexity: { step }
    });
  }, [step, navigate]);

  React.useEffect(() => {
    // If quota is reached, show upgrade message
    if (quotaData?.limit_reached) {
      toast({
        title: "Usage Limit Reached",
        description: "You've reached your monthly limit. Upgrade to continue using quick diagnosis.",
        variant: "destructive"
      });
    }
  }, [quotaData, toast]);

  const onSubmit = (data: QuickStartForm) => {
    if (quotaData?.limit_reached) {
      toast({
        title: "Upgrade Required",
        description: "Please upgrade your plan to continue.",
        variant: "destructive"
      });
      return;
    }

    // Ensure all required fields are present
    const submissionData = {
      career_goal: data.career_goal,
      target_role: data.target_role,
      location: data.location
    };

    trackTelemetryEvent({
      task: 'quick_start_submit',
      route: '/quick-start',
      complexity: submissionData
    });

    submitOnboarding(submissionData, {
      onSuccess: (result) => {
        setDiagnosis(result);
        trackTelemetryEvent({
          task: 'quick_start_result_view',
          route: '/quick-start',
          complexity: { 
            score: result.score, 
            bucket: result.score_bucket,
            insights_count: result.insights?.length || 0
          }
        });
      },
      onError: (error) => {
        toast({
          title: "Analysis Failed",
          description: "Unable to generate your career diagnosis. Please try again.",
          variant: "destructive"
        });
        console.error('Quick start submission failed:', error);
      }
    });
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const getBucketColor = (bucket: string) => {
    switch (bucket) {
      case 'strong': return 'bg-success text-success-foreground';
      case 'growing': return 'bg-warning text-warning-foreground';
      case 'emerging': return 'bg-info text-info-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  if (diagnosis) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-elevation">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">Your Career Diagnosis</CardTitle>
            <p className="text-muted-foreground">Based on your responses, here's your readiness assessment</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="text-4xl font-bold text-primary">{diagnosis.score}/100</div>
              <Badge className={`px-4 py-2 text-sm font-medium ${getBucketColor(diagnosis.score_bucket)}`}>
                {diagnosis.score_bucket.charAt(0).toUpperCase() + diagnosis.score_bucket.slice(1)} Career Readiness
              </Badge>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Key Insights
              </h3>
              <div className="space-y-2">
                {diagnosis.insights?.slice(0, 3).map((insight, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => setShowShareModal(true)}
                className="flex-1"
                variant="gradient"
              >
                <Share2 className="w-4 h-4" />
                Share Results
              </Button>
              <Button 
                onClick={() => navigate('/plan')}
                variant="outline"
                className="flex-1"
              >
                Continue Planning
              </Button>
            </div>
          </CardContent>
        </Card>

        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          referralCode={diagnosis.referralCode}
          scoreBucket={diagnosis.score_bucket}
          insights={diagnosis.insights?.slice(0, 2) || []}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elevation">
        <CardHeader className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center">
            <Target className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle>Quick Career Assessment</CardTitle>
          <p className="text-muted-foreground">Get instant insights in 3 simple steps</p>
          <div className="flex justify-center mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    i <= step 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i}
                </div>
                {i < 3 && (
                  <div 
                    className={`w-8 h-0.5 transition-colors ${
                      i < step ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {step === 1 && (
                <FormField
                  control={form.control}
                  name="career_goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">What's your main career goal?</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your goal" />
                          </SelectTrigger>
                          <SelectContent>
                            {CAREER_GOALS.map((goal) => (
                              <SelectItem key={goal.value} value={goal.value}>
                                <span className="flex items-center gap-2">
                                  <span>{goal.icon}</span>
                                  {goal.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {step === 2 && (
                <FormField
                  control={form.control}
                  name="target_role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">What role are you targeting?</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Senior Data Scientist, Product Manager"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {step === 3 && (
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Where are you looking?</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., San Francisco, CA or Remote"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={step === 1}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>

                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={
                      (step === 1 && !form.watch('career_goal')) ||
                      (step === 2 && !form.watch('target_role')) ||
                      (step === 3 && !form.watch('location'))
                    }
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || quotaLoading}
                    className="min-w-[120px]"
                  >
                    {isSubmitting ? 'Analyzing...' : 'Get Diagnosis'}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}