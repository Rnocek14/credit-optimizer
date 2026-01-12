/**
 * Pre-Approval Email Modal
 * 
 * Shared modal component for generating registrar emails from any location:
 * - Course drawer
 * - Transfer verification badge
 * - Plan sidebar
 */

import { useState, useMemo } from 'react';
import { Copy, Mail, ExternalLink, Check, AlertCircle } from 'lucide-react';
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
import {
  generatePreApprovalEmail,
  getRegistrarEmailHint,
  validatePreApprovalParams,
  type PreApprovalCourse,
  type PreApprovalEmailParams,
} from '@/lib/transfer/preApprovalEmail';

interface PreApprovalEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Pre-populated data
  targetInstitution: string;
  degreeProgram?: string;
  catalogYear?: string;
  courses: PreApprovalCourse[];
  // Optional: student info if available
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
  const [studentName, setStudentName] = useState(initialName);
  const [studentEmail, setStudentEmail] = useState(initialEmail);
  const [program, setProgram] = useState(degreeProgram);
  const [copiedField, setCopiedField] = useState<'subject' | 'body' | null>(null);

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
      // Use location.href for better Safari/locked-down browser compatibility
      window.location.href = mailtoWithRecipient;
    }
  };

  // Check if mailto is too long (practical limit ~2000 chars for most email clients)
  const mailtoTooLong = mailtoWithRecipient && mailtoWithRecipient.length > 2000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Request Transfer Pre-Approval
          </DialogTitle>
          <DialogDescription>
            Generate a registrar-safe email to verify transfer credit acceptance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Target Institution */}
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

          {/* Student Info */}
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

          {/* Degree Program */}
          <div className="space-y-2">
            <Label htmlFor="program">Degree Program *</Label>
            <Input
              id="program"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="e.g., B.S. in Computer Science"
            />
          </div>

          {/* Courses Summary */}
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

          {/* Validation Errors */}
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

          {/* Generated Email Preview */}
          {generatedEmail && (
            <div className="space-y-3">
              {/* Subject */}
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

              {/* Body */}
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

          {/* Actions */}
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
              <Alert className="flex-1">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Email too long for mailto — please copy and paste instead.
                </AlertDescription>
              </Alert>
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

          {/* Trust Note - clarify that responses (not this email) create evidence */}
          <p className="text-xs text-muted-foreground text-center">
            This email respects registrar authority. When you receive a response, 
            you can log it as Tier 4 evidence in your transfer verification history.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}