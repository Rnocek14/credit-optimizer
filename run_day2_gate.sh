#!/bin/bash
# Day-2 Gate Test Runner for Life Path
# Run from the project root

OUTPUT="day2_gate_results.txt"
echo "=== DAY-2 GATE RESULTS ===" > $OUTPUT
date >> $OUTPUT

echo -e "\n--- 1) BUILD ---" | tee -a $OUTPUT
npm run build 2>&1 | tee -a $OUTPUT | head -n 50

echo -e "\n--- 2) EDGE FUNCTIONS SANITY ---" | tee -a $OUTPUT
npx tsx scripts/test-functions.ts 2>&1 | tee -a $OUTPUT

echo -e "\n--- 3) E2E TESTS ---" | tee -a $OUTPUT
if npm run | grep -q "cy:run:day2"; then
  npm run cy:run:day2 2>&1 | tee -a $OUTPUT
else
  npx cypress run -s cypress/e2e/day2-flows.cy.ts 2>&1 | tee -a $OUTPUT
fi

echo -e "\n--- 4) UI SPOT CHECKS ---" | tee -a $OUTPUT
echo "Perform the following in browser & note Pass/Fail:" | tee -a $OUTPUT
echo "A) Attach Proof Project in Skill Tree → visible on /projects → visible on /resume-builder" | tee -a $OUTPUT
echo "B) Export OpenBadge in /wallet → confirm toast 'Badge Exported!'" | tee -a $OUTPUT
echo "C) /institution and /employer load with Demo Mode banner" | tee -a $OUTPUT
echo "D) LinkedIn Import → roadmap modal → Add Top 2 Steps to Plan → visible in /plan" | tee -a $OUTPUT

echo -e "\n--- 5) PERSISTENCE CHECK ---" | tee -a $OUTPUT
echo "Reload /projects and /resume-builder, then record: 'projects: persisted' or 'projects: session-only (expected)'" | tee -a $OUTPUT

echo -e "\n--- 6) SPRINT FLAG ---" | tee -a $OUTPUT
echo "In DevTools console: localStorage.setItem('day2_done','true'); visit /sprint-board → confirm ✅ Day 2 — High-Impact: Done" | tee -a $OUTPUT
echo "Take screenshot of header + first Day-2 card" | tee -a $OUTPUT

echo -e "\n=== END OF DAY-2 GATE ===" | tee -a $OUTPUT
echo "Results saved to $OUTPUT"
