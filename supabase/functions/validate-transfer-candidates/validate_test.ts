const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET')!;

Deno.test("re-validate TESU candidates", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-transfer-candidates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': CRON_SECRET,
    },
    body: JSON.stringify({
      auto_promote_threshold: 0.80,
    }),
  });
  
  const data = await res.json();
  console.log("Status:", res.status);
  console.log(`Validated: ${data.validated}, Promoted: ${data.promoted}, Flagged: ${data.flagged}`);
  
  if (data.results) {
    const promoted = data.results.filter((r: any) => r.action === 'promoted');
    const flagged = data.results.filter((r: any) => r.action !== 'promoted');
    
    console.log(`\n=== PROMOTED (${promoted.length}) ===`);
    for (const r of promoted.slice(0, 15)) {
      console.log(`  ✅ ${r.source} → ${r.target} score=${r.validation_score}`);
    }
    
    console.log(`\n=== FLAGGED (${flagged.length}) ===`);
    for (const r of flagged.slice(0, 10)) {
      console.log(`  ⚠️ ${r.source} → ${r.target} score=${r.validation_score} flags=${r.flags.join(',')}`);
    }
  }
});
