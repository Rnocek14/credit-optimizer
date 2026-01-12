/**
 * Pre-Approval Email Generator for Transfer Credit Verification
 * 
 * Generates registrar-safe emails that students can send to verify
 * transfer credit acceptance before committing to courses.
 * 
 * This is Tier 4 evidence in the Evidence Stack.
 */

export interface PreApprovalCourse {
  sourceInstitution: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  aceNccrsStatus?: string;
  providerType?: string;
}

export interface PreApprovalEmailParams {
  studentName: string;
  studentEmail?: string;
  targetInstitution: string;
  degreeProgram: string;
  catalogYear?: string;
  courses: PreApprovalCourse[];
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  mailtoLink: string;
}

/**
 * Format provider type for email readability
 */
function formatProviderType(type?: string): string {
  if (!type) return '';
  
  const typeLabels: Record<string, string> = {
    'alt_credit': 'Alternative Credit Provider',
    'clep': 'CLEP Examination',
    'dsst': 'DSST Examination',
    'ace': 'ACE Evaluated',
    'nccrs': 'NCCRS Evaluated',
    'portfolio': 'Portfolio Assessment',
    'military': 'Military Training',
  };
  
  return typeLabels[type.toLowerCase()] || type;
}

/**
 * Format ACE/NCCRS status for credibility
 */
function formatCredentialStatus(course: PreApprovalCourse): string {
  const parts: string[] = [];
  
  if (course.aceNccrsStatus) {
    parts.push(`ACE/NCCRS: ${course.aceNccrsStatus}`);
  }
  
  if (course.providerType) {
    const formatted = formatProviderType(course.providerType);
    if (formatted && !parts.includes(formatted)) {
      parts.push(formatted);
    }
  }
  
  return parts.length > 0 ? ` [${parts.join(', ')}]` : '';
}

/**
 * Generate a pre-approval email for transfer credit verification
 * 
 * The email is designed to:
 * 1. Be professional and respect registrar authority
 * 2. Include structured evidence for easy evaluation
 * 3. Ask clear, binary questions
 * 4. Acknowledge this is preliminary evaluation
 */
export function generatePreApprovalEmail(params: PreApprovalEmailParams): GeneratedEmail {
  const { 
    studentName, 
    studentEmail,
    targetInstitution, 
    degreeProgram, 
    catalogYear,
    courses 
  } = params;
  
  // Format course list with credentials
  const courseList = courses.map(c => {
    const credential = formatCredentialStatus(c);
    return `• ${c.sourceInstitution} - ${c.courseCode}: ${c.courseTitle} (${c.credits} credits)${credential}`;
  }).join('\n');
  
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  
  const catalogYearNote = catalogYear 
    ? `\n\nI am planning to enroll for the ${catalogYear} catalog year.`
    : '';
  
  const subject = `Transfer Credit Pre-Evaluation Request - ${degreeProgram}`;
  
  const body = `Dear ${targetInstitution} Transfer Credit Office,

I am considering enrollment in the ${degreeProgram} program and would like to request a preliminary evaluation of the following coursework for transfer credit:

${courseList}

Total: ${totalCredits} credits across ${courses.length} course(s)${catalogYearNote}

Could you please confirm:

1. Whether these credits would transfer to ${targetInstitution}
2. How they would apply toward degree requirements (specific course equivalencies or elective credit)
3. Any limitations I should be aware of (credit caps, minimum grade requirements, catalog year restrictions, etc.)

I understand this is a preliminary evaluation and that official determination requires enrollment and submission of official transcripts.

Thank you for your time and assistance.

Sincerely,
${studentName}${studentEmail ? `\n${studentEmail}` : ''}`;

  // Generate mailto link (URL encoded)
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  const mailtoLink = `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
  
  return {
    subject,
    body,
    mailtoLink,
  };
}

/**
 * Get common registrar email patterns for institutions
 * Returns null if no known pattern exists
 */
export function getRegistrarEmailHint(institutionCode: string): string | null {
  const knownPatterns: Record<string, string> = {
    'TESU': 'transfercredit@tesu.edu',
    'COSC': 'registrar@charteroak.edu', 
    'WGU': 'transferevaluation@wgu.edu',
    'UMPI': 'transfercredit@maine.edu',
    'SNHU': 'transfer@snhu.edu',
  };
  
  return knownPatterns[institutionCode.toUpperCase()] || null;
}

/**
 * Validate email params before generation
 */
export function validatePreApprovalParams(params: PreApprovalEmailParams): string[] {
  const errors: string[] = [];
  
  if (!params.studentName?.trim()) {
    errors.push('Student name is required');
  }
  
  if (!params.targetInstitution?.trim()) {
    errors.push('Target institution is required');
  }
  
  if (!params.degreeProgram?.trim()) {
    errors.push('Degree program is required');
  }
  
  if (!params.courses?.length) {
    errors.push('At least one course is required');
  }
  
  params.courses?.forEach((course, index) => {
    if (!course.courseCode?.trim()) {
      errors.push(`Course ${index + 1}: Course code is required`);
    }
    if (!course.courseTitle?.trim()) {
      errors.push(`Course ${index + 1}: Course title is required`);
    }
    if (!course.credits || course.credits <= 0) {
      errors.push(`Course ${index + 1}: Valid credit count is required`);
    }
  });
  
  return errors;
}
