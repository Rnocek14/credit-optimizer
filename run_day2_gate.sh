#!/usr/bin/env bash
set -euo pipefail

echo "=== Day-2 Gate: install ==="
npm ci

echo "=== Day-2 Gate: build ==="
set +e
BUILD_LOG=$(mktemp)
npm run build |& tee "$BUILD_LOG"
BUILD_STATUS=${PIPESTATUS[0]}
set -e

echo "=== Day-2 Gate: functions harness ==="
set +e
FUN_LOG=$(mktemp)
npx tsx scripts/test-functions.ts |& tee "$FUN_LOG"
FUN_STATUS=${PIPESTATUS[0]}
set -e

# Try to ensure an app server is available for Cypress (vite preview)
echo "=== Day-2 Gate: preview server (background) ==="
set +e
PREVIEW_LOG=$(mktemp)
(npm run preview -- --port 5173 |& tee "$PREVIEW_LOG") &
PREVIEW_PID=$!
# Give it a moment
sleep 4
curl -sSf http://localhost:5173 >/dev/null 2>&1 || true
set -e

echo "=== Day-2 Gate: cypress ==="
set +e
CYP_LOG=$(mktemp)
npx cypress run -s cypress/e2e/day2-flows.cy.ts |& tee "$CYP_LOG"
CYP_STATUS=${PIPESTATUS[0]}
set -e

echo "=== Day-2 Gate: assemble report ==="
REPORT=day2_readiness_report.md
cat > "$REPORT" <<'MD'
# Day‑2 Final Readiness Report

## Section 1 — Build
<PASTE build status: "success" or first ~50 lines of error>

## Section 2 — Functions (full output)
<PASTE full output of npx tsx scripts/test-functions.ts>

## Section 3 — Cypress
<PASTE summary line (tests, pass, fail, duration) and first failing stack if any>

## Section 4 — Persistence after one reload
/projects list: <persisted | session-only>
/resume-builder Proof Projects: <persisted | session-only>

## Section 5 — PASS/FAIL per Day‑2 criterion
A) Attach Proof Project → /projects → /resume-builder = <PASS/FAIL> (evidence or one-line patch)
B) Wallet OpenBadge export + verify-certificate POST = <PASS/FAIL> (evidence or patch)
C) /institution & /employer demo hubs load (conditional ok) = <PASS/FAIL>
D) /career-copilot heading visible; footer lazy-load; dev-auth fallback = <PASS/FAIL>
E) TrackSelector on /plan & /resume-builder (chip optional) = <PASS/FAIL>
F) Resume Builder "Proof Projects" section visible = <PASS/FAIL>
G) Functions 9/9 green = <PASS/FAIL> (paste harness lines)
H) Build clean + Cypress pass = <PASS/FAIL>

## Section 6 — Final verdict
Final Readiness Gate: <✅ PASS | ❌ FAIL + reasons>

### Ready for Final Demo (include if PASS)
- 9/9 dry‑run functions green (CORS/OPTIONS, verify_jwt=false)
- Key pages smoke‑pass: /plan, /resume-builder, /projects, /career-copilot, /wallet
- TrackSelector visible (chip optional)
- ResumeBuilder 42703 fallback OK
- Persistence status documented (projects/proof projects session‑only is acceptable)
- Screenshots captured (optional)
MD

# Fill the report with raw logs
{
  echo "## Section 1 — Build"
  if [ "$BUILD_STATUS" -eq 0 ]; then
    echo "success"
  else
    echo '```'
    head -n 50 "$BUILD_LOG"
    echo '```'
  fi
  echo
  echo "## Section 2 — Functions (full output)"
  echo '```'
  cat "$FUN_LOG"
  echo '```'
  echo
  echo "## Section 3 — Cypress"
  echo '```'
  # Print only the last ~80 lines to keep it readable
  tail -n 120 "$CYP_LOG"
  echo '```'
} >> "$REPORT"

echo "=== Day-2 Gate: report at $REPORT ==="
echo "=== Preview (tail) ==="
tail -n 60 "$REPORT" || true

# Clean preview server
if ps -p $PREVIEW_PID >/dev/null 2>&1; then
  kill $PREVIEW_PID || true
fi