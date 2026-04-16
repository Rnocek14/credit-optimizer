// Quick test: call generate-transfer-rules with TESU Study.com data
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET')!;

const rawText = `|  | TESU Course | Credits | Study.com Course |
| --- | --- | --- | --- |
|  | ACC-1010 Principles of Financial Accounting | Credits 3 lower | Accounting 101: Financial Accounting |
|  | ACC-1020 Principles of Managerial Accounting | Credits 3 lower | Accounting 102: Intro to Managerial Accounting |
|  | ACC-2010 Intermediate Accounting I | Credits 3 lower | Accounting 201: Intermediate Financial Accounting I |
|  | ACC-3010 Managerial Accounting | Credits 3 upper | Accounting 301: Applied Managerial Accounting |
|  | BIO-1010 Introductory Biology | Credits 3 lower | Biology 101: Intro to Biology |
|  | BIO-2100 Anatomy and Physiology I | Credits 3 lower | Biology 105: Anatomy & Physiology |
|  | BUS-1010 Introduction to Business | Credits 3 lower | Business 100: Intro to Business |
|  | MAN-2100 Principles of Management | Credits 3 lower | Business 101: Principles of Management |
|  | MKT-2010 Principles of Marketing | Credits 3 lower | Business 102: Principles of Marketing |
|  | COS-1010 Introduction to Computers | Credits 3 lower | Computer Science 103: Computer Concepts |
|  | COS-1110 Introduction to Programming | Credits 3 lower | Computer Science 109: Introduction to Programming |
|  | COS-2050 Python Programming | Credits 3 lower | Computer Science 113: Programming in Python |
|  | ECO-1120 Microeconomics | Credits 3 lower | Economics 101: Principles of Microeconomics |
|  | ECO-1110 Macroeconomics | Credits 3 lower | Economics 102: Macroeconomics |
|  | ENC-1010 Writing for Success | Credits 3 lower | English 104: College Composition I |
|  | HIS-1130 American History I | Credits 3 lower | History 103: US History I |
|  | HIS-1140 American History II | Credits 3 lower | History 104: US History II |
|  | HUM-1010 Intro to Humanities I | Credits 3 lower | Humanities 101: Intro to the Humanities |
|  | MAT-1210 College Algebra | Credits 4 lower | Math 105: Precalculus Algebra |
|  | PHI-1800 Intro to Ethics | Credits 3 lower | Philosophy 103: Ethics |
|  | SOC-1010 Introduction to Sociology | Credits 3 lower | Sociology 101: Intro to Sociology |
|  | STA-2010 Principles of Statistics | Credits 4 lower | Statistics 101: Principles of Statistics |
|  | COM-2090 Public Speaking | Credits 3 lower | Communications 101: Public Speaking |
|  | CHE-1010 Survey of Chemistry | Credits 3 lower | Chemistry 101: General Chemistry |
|  | FIN-3110 Corporate Finance | Credits 3 upper | Finance 301: Corporate Finance |
|  | OPM-3010 Operations Management | Credits 3 upper | Business 312: Advanced Operations Management |
|  | CIS-3010 Management Information Systems | Credits 3 upper | Business 303: Management Information Systems |
|  | PHI-3840 Ethics and the Business Professional | Credits 3 upper | Business 310: Advanced Business Ethics |`;

Deno.test('TESU pipeline end-to-end', async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-transfer-rules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': CRON_SECRET,
    },
    body: JSON.stringify({
      target_institution: 'TESU',
      source_institution: 'STUDYCOM',
      raw_text: rawText,
      evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html',
      auto_promote_threshold: 0.80,
    }),
  });

  console.log('Status:', response.status);
  const result = await response.json();
  console.log('Result:', JSON.stringify(result, null, 2));

  // Assertions
  if (!response.ok) {
    throw new Error(`Function returned ${response.status}: ${JSON.stringify(result)}`);
  }

  console.log(`\n=== TESU Pipeline Results ===`);
  console.log(`Total candidates: ${result.total}`);
  console.log(`Promoted: ${result.promoted_count}`);
  console.log(`Pending: ${result.pending_count}`);
  console.log(`Duplicates: ${result.duplicate_count}`);
  
  if (result.candidates) {
    console.log(`\nCandidate details:`);
    for (const c of result.candidates) {
      console.log(`  ${c.source} → ${c.target} [${c.status}] conf=${c.confidence} ${c.acceptance}`);
    }
  }
});
