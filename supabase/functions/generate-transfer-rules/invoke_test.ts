// Quick invocation test for generate-transfer-rules
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const body = {
  target_institution: "TESU",
  source_institution: "STUDYCOM",
  raw_text: `Thomas Edison State University Course Equivalency & Transfer Guide

TESU Course | Study.com Course | Status
---|---|---
ACC-1010 Principles of Financial Accounting | Accounting 101: Financial Accounting | accepted
ACC-1020 Principles of Managerial Accounting | Accounting 102: Intro to Managerial Accounting | accepted
ACC-2010 Intermediate Accounting I | Accounting 201: Intermediate Financial Accounting I | accepted
ACC-2020 Intermediate Accounting II | Accounting 202: Intermediate Accounting II | accepted
ACC-3010 Managerial Accounting | Accounting 301: Applied Managerial Accounting | accepted
ACC-3030 Cost Accounting | Accounting 303: Cost Accounting | accepted
ITS-1300 Database Fundamentals | Analytics 103: Intro to Relational Databases & SQL | accepted
BIO-1010 Introductory Biology | Biology 101: Intro to Biology | accepted
BIO-2410 Human Genetics | Biology 102: Basic Genetics | accepted
BUS-1010 Introduction to Business | Business 100: Intro to Business | accepted
MAN-2100 Principles of Management | Business 101: Principles of Management | accepted
MKT-2010 Principles of Marketing | Business 102: Principles of Marketing | accepted
LAW-2010 Business Law | Business 103: Introductory Business Law | accepted
ECO-1120 Microeconomics | Economics 101: Principles of Microeconomics | accepted
ECO-1110 Macroeconomics | Economics 102: Macroeconomics | accepted
ENC-1010 Writing for Success | English 104: College Composition I | accepted
ENC-1020 Writing for Success II | English 105: College Composition II | accepted
MAT-1150 Intermediate Algebra | Math 101: College Algebra | accepted
MAT-1050 Applied Liberal Arts Mathematics | Math 102: College Mathematics | accepted
MAT-1290 Precalculus | Math 103: Precalculus | accepted
MAT-2310 Calculus I | Math 104: Calculus | accepted
STA-2010 Principles of Statistics | Statistics 101: Principles of Statistics | accepted
PSY-2350 Intro to Abnormal Psychology | Psychology 106: Abnormal Psychology | accepted
PSY-2110 Developmental Psychology | Psychology 107: Life Span Developmental Psychology | accepted
SOC-1010 Our Changing World: An Introduction to Sociology | Sociology 101: Intro to Sociology | accepted
COM-2090 Public Speaking | Communications 101: Public Speaking | accepted
COS-1110 Introduction to Programming | Computer Science 109: Introduction to Programming | accepted
COS-2050 Python Programming | Computer Science 113: Programming in Python | accepted
PHI-1999 Intro to Philosophy | Philosophy 101: Principles of Philosophy | accepted
HIS-1130 American History I | History 103: US History I | accepted
HIS-1140 American History II | History 104: US History II | accepted
CHE-1010 Survey of Chemistry | Chemistry 101: General Chemistry | accepted
ENS-2000 Environmental Science | Environmental Science 101: Environment and Humanity | accepted
FIN-2000 Principles of Finance | Finance 101: Principles of Finance | accepted
CRJ-1020 Introduction to Criminal Justice | Criminal Justice 101: Intro to Criminal Justice | accepted`,
  evidence_url: "https://study.com/college/school/thomas-edison-state-university.html",
  auto_promote_threshold: 0.80,
};

Deno.test("invoke generate-transfer-rules for TESU", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-transfer-rules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", JSON.stringify(data, null, 2));
  
  if (!res.ok) {
    throw new Error(`Failed: ${JSON.stringify(data)}`);
  }
  
  console.log(`\n=== RESULTS ===`);
  console.log(`Total candidates: ${data.total}`);
  console.log(`Promoted: ${data.promoted_count}`);
  console.log(`Pending: ${data.pending_count}`);
  console.log(`Duplicates: ${data.duplicate_count}`);
  
  if (data.candidates) {
    const promoted = data.candidates.filter((c: any) => c.status === 'promoted' || c.status === 'pending');
    console.log(`\nCandidate details:`);
    for (const c of data.candidates.slice(0, 10)) {
      console.log(`  ${c.source} → ${c.target} [${c.status}] conf=${c.confidence}`);
    }
  }
});
