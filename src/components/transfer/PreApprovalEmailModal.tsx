/**
 * Pre-Approval Email Modal
 * 
 * Shared modal component for generating registrar emails and logging responses:
 * - Step 1: Generate Email
 * - Step 2: Log Response (Tier 4 evidence)
 */

import { useState, useMemo } from 'react';
import { Copy, Mail, ExternalLink, Check, AlertCircle, FileText, Calendar, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  generatePreApprovalEmail,
  getRegistrarEmailHint,
  validatePreApprovalParams,
  type PreApprovalCourse,
  type PreApprovalEmailParams,
} from '@/lib/transfer/preApprovalEmail';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type AdvisorResult = 'approved_equivalent' | 'approved_elective' | 'not_accepted' | 'conditional';

interface PreApprovalEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetInstitution: string;
  degreeProgram?: string;
  catalogYear?: string;
  courses: PreApprovalCourse[];
  studentName?: string;
  studentEmail?: string;
}

export function PreApprovalEmailModal({
  open,
  onOpenChange,
  targetInstitution,
  degreeProgram = '',
  catalogYear,
  courses,
  studentName: initialName = '',
  studentEmail: initialEmail = '',
}: PreApprovalEmailModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'generate' | 'log'>('generate');
  
  // Step 1: Generate Email state
  const [studentName, setStudentName] = useState(initialName);
  const [studentEmail, setStudentEmail] = useState(initialEmail);
  const [program, setProgram] = useState(degreeProgram);
  const [copiedField, setCopiedField] = useState<'subject' | 'body' | null>(null);

  // Step 2: Log Response state
  const [advisorResult, setAdvisorResult] = useState<AdvisorResult | ''>('');
  const [responseText, setResponseText] = useState('');
  const [responseDate, setResponseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get registrar email hint
  const registrarEmail = useMemo(
    () => getRegistrarEmailHint(targetInstitution),
    [targetInstitution]
  );

  // Build email params
  const emailParams: PreApprovalEmailParams = useMemo(() => ({
    studentName: studentName.trim(),
    studentEmail: studentEmail.trim() || undefined,
    targetInstitution,
    degreeProgram: program.trim(),
    catalogYear,
    courses,
  }), [studentName, studentEmail, targetInstitution, program, catalogYear, courses]);

  // Validate
  const validationErrors = useMemo(
    () => validatePreApprovalParams(emailParams),
    [emailParams]
  );

  const isValid = validationErrors.length === 0;

  // Generate email
  const generatedEmail = useMemo(() => {
    if (!isValid) return null;
    return generatePreApprovalEmail(emailParams);
  }, [emailParams, isValid]);

  // Build mailto with recipient if known
  const mailtoWithRecipient = useMemo(() => {
    if (!generatedEmail) return null;
    if (registrarEmail) {
      const encodedSubject = encodeURIComponent(generatedEmail.subject);
      const encodedBody = encodeURIComponent(generatedEmail.body);
      return `mailto:${registrarEmail}?subject=${encodedSubject}&body=${encodedBody}`;
    }
    return generatedEmail.mailtoLink;
  }, [generatedEmail, registrarEmail]);

  const handleCopy = async (field: 'subject' | 'body') => {
    if (!generatedEmail) return;
    const text = field === 'subject' ? generatedEmail.subject : generatedEmail.body;
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field === 'subject' ? 'Subject' : 'Body'} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenEmail = () => {
    if (mailtoWithRecipient) {
      window.location.href = mailtoWithRecipient;
    }
  };

  const mailtoTooLong = mailtoWithRecipient && mailtoWithRecipient.length > 2000;

  const getResultLabel = (result: AdvisorResult): string => {
    switch (result) {
      case 'approved_equivalent': return 'Approved as equivalent';
      case 'approved_elective': return 'Approved as elective only';
      case 'not_accepted': return 'Not accepted';
      case 'conditional': return 'Conditional / needs review';
      default: return '';
    }
  };

  const handleSaveEvidence = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to save evidence');
      return;
    }

    if (!advisorResult || !responseText.trim()) {
      toast.error('Please provide a response summary and paste the advisor response');
      return;
    }

    // Require degree program for contextual evidence
    if (!program.trim()) {
      toast.error('Degree program is required to log evidence');
      return;
    }

    // Quality guardrail: minimum response length
    if (responseText.trim().length < 25) {
      toast.error('Please paste the full advisor response (at least 25 characters)');
      return;
    }

    setIsSaving(true);

    try {
      const inserts = courses.map(course => ({
        user_id: user.id,
        target_institution: targetInstitution,
        source_institution: course.sourceInstitution,
        source_course_code: course.courseCode,
        degree_program: program.trim(),
        catalog_year: catalogYear || null,
        outcome_type: 'advisor_preapproval' as const,
        credits_applied: course.credits,
        provenance_notes: `[${getResultLabel(advisorResult)}]\n\nAdvisor Response:\n${responseText.trim()}`,
        outcome_date: responseDate,
        is_public: isPublic,
      }));

      const { error } = await supabase
        .from('transfer_outcomes')
        .upsert(inserts, {
          onConflict: 'user_id,source_institution,source_course_code,target_institution,outcome_type',
          ignoreDuplicates: false,
        });

      if (error) throw error;

      toast.success(`Saved/updated Tier 4 evidence for ${courses.length} course${courses.length > 1 ? 's' : ''}`);
      
      setAdvisorResult('');
      setResponseText('');
      setIsPublic(false);
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving evidence:', error);
      toast.error('Failed to save evidence. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Transfer Pre-Approval
          </DialogTitle>
          <DialogDescription>
            Generate a registrar email or log an advisor response
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'generate' | 'log')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="gap-2">
              <Mail className="h-4 w-4" />
              Generate Email
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-2">
              <FileText className="h-4 w-4" />
              Log Response
            </TabsTrigger>
          </TabsList>

          {/* Step 1: Generate Email */}
          <TabsContent value="generate" className="space-y-6 mt-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <div className="text-sm font-medium">Target Institution</div>
                <div className="text-lg font-mono">{targetInstitution}</div>
              </div>
              {registrarEmail && (
                <Badge variant="secondary" className="gap-1">
                  <Mail className="h-3 w-3" />
                  {registrarEmail}
                </Badge>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="studentName">Your Name *</Label>
                <Input
                  id="studentName"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentEmail">Your Email (optional)</Label>
                <Input
                  id="studentEmail"
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="program">Degree Program *</Label>
              <Input
                id="program"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                placeholder="e.g., B.S. in Computer Science"
              />
            </div>

            <div className="space-y-2">
              <Label>Courses for Evaluation ({courses.length})</Label>
              <div className="max-h-32 overflow-y-auto rounded-lg border bg-muted/30 p-3 space-y-1">
                {courses.map((course, i) => (
                  <div key={i} className="text-sm flex items-center justify-between">
                    <span className="font-mono">{course.courseCode}</span>
                    <span className="text-muted-foreground">{course.credits}cr</span>
                  </div>
                ))}
              </div>
            </div>

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {generatedEmail && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Subject</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleCopy('subject')}
                    >
                      {copiedField === 'subject' ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <div className="p-2 rounded bg-muted text-sm font-medium">
                    {generatedEmail.subject}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Email Body</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleCopy('body')}
                    >
                      {copiedField === 'body' ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    readOnly
                    value={generatedEmail.body}
                    className="min-h-[200px] text-sm font-mono resize-none"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {!mailtoTooLong ? (
                <Button
                  onClick={handleOpenEmail}
                  disabled={!isValid}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Email Client
                </Button>
              ) : (
                <div className="flex-1 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    <strong>Email too long for one-click open.</strong> Copy the subject and body below, 
                    then paste into Gmail/Outlook.
                  </p>
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => handleCopy('body')}
                disabled={!isValid}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Email
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              After sending, switch to the <strong>Log Response</strong> tab to record the advisor's reply as Tier 4 evidence.
            </p>
          </TabsContent>

          {/* Step 2: Log Response */}
          <TabsContent value="log" className="space-y-6 mt-4">
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Target Institution</div>
                <div className="font-mono">{targetInstitution}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Courses</div>
                <Badge variant="outline">{courses.length} course{courses.length > 1 ? 's' : ''}</Badge>
              </div>
              {program && (
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Program</div>
                  <div className="text-sm text-muted-foreground">{program}</div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="advisorResult">Advisor's Response *</Label>
              <Select value={advisorResult} onValueChange={(v) => setAdvisorResult(v as AdvisorResult)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select response type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved_equivalent">
                    ✅ Approved as equivalent
                  </SelectItem>
                  <SelectItem value="approved_elective">
                    📘 Approved as elective only
                  </SelectItem>
                  <SelectItem value="not_accepted">
                    ❌ Not accepted
                  </SelectItem>
                  <SelectItem value="conditional">
                    ⚠️ Conditional / needs review
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responseText">Paste Advisor Response *</Label>
              <Textarea
                id="responseText"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Paste the email response from the registrar or advisor here..."
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">
                This text will be stored as provenance for your Tier 4 evidence.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responseDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Received
              </Label>
              <Input
                id="responseDate"
                type="date"
                value={responseDate}
                onChange={(e) => setResponseDate(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-0.5">
                <Label htmlFor="visibility" className="flex items-center gap-2 cursor-pointer">
                  {isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  Share with community
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isPublic 
                    ? 'This evidence will help other students with similar transfers'
                    : 'This evidence stays private to your account'
                  }
                </p>
              </div>
              <Switch
                id="visibility"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            {courses.length > 1 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  This will log the same response for all {courses.length} courses. 
                  If the advisor gave different responses per course, please log them individually.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleSaveEvidence}
              disabled={!advisorResult || !responseText.trim() || isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Save as Tier 4 Evidence
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Advisor pre-approval is Tier 4 evidence — strong but not binding until confirmed on transcript.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
