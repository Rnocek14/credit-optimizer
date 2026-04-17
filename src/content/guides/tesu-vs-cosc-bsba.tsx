/**
 * Guide content: TESU vs COSC BSBA comparison.
 *
 * This is the FIRST public SEO page. The pattern established here will be
 * reused for every comparison guide:
 *   1. Decisive H1 + lede
 *   2. Comparison table (the page's reason to exist)
 *   3. Section: when to choose A vs B
 *   4. Section: how transfer credit changes the math
 *   5. PlanPreviewCTA → product
 *
 * Numbers below are anchored to the verified data we already have for these
 * two institutions. Keep them in sync with the marketplace pricing source.
 */
import { CheckCircle2, XCircle } from 'lucide-react';

export const TesuVsCoscGuide = () => (
  <article className="prose prose-slate dark:prose-invert max-w-none">
    <p className="text-lg text-muted-foreground leading-relaxed">
      You've narrowed your online business degree search to two of the most
      transfer-friendly schools in the country: <strong>Thomas Edison State
      University (TESU)</strong> and <strong>Charter Oak State College
      (COSC)</strong>. Both are regionally accredited, both accept up to 90
      transfer credits, and both will let you finish a BSBA without ever
      stepping on a campus. Here's how they actually differ.
    </p>

    {/* ── At-a-glance table ────────────────────────────────── */}
    <h2>At a glance</h2>
    <div className="not-prose overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left font-semibold p-3">Factor</th>
            <th className="text-left font-semibold p-3">TESU BSBA</th>
            <th className="text-left font-semibold p-3">COSC BSBA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr>
            <td className="p-3 font-medium">Total credits required</td>
            <td className="p-3">120</td>
            <td className="p-3">120</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Max transfer credits</td>
            <td className="p-3">90</td>
            <td className="p-3">90</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Residency credits</td>
            <td className="p-3">16 (TECEP or course)</td>
            <td className="p-3">36 minimum</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Per-credit tuition (out-of-state)</td>
            <td className="p-3">~$519</td>
            <td className="p-3">~$469</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Sophia / Study.com accepted</td>
            <td className="p-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="inline h-4 w-4 mr-1" /> Yes
            </td>
            <td className="p-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="inline h-4 w-4 mr-1" /> Yes
            </td>
          </tr>
          <tr>
            <td className="p-3 font-medium">CLEP / DSST accepted</td>
            <td className="p-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="inline h-4 w-4 mr-1" /> Yes
            </td>
            <td className="p-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="inline h-4 w-4 mr-1" /> Yes
            </td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Capstone required</td>
            <td className="p-3">Yes (3 cr)</td>
            <td className="p-3">Yes (3 cr)</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Self-paced terms</td>
            <td className="p-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="inline h-4 w-4 mr-1" /> 12-week + TECEP
            </td>
            <td className="p-3 text-muted-foreground">
              <XCircle className="inline h-4 w-4 mr-1" /> 8-week terms only
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    {/* ── When to pick which ───────────────────────────────── */}
    <h2>Pick TESU if…</h2>
    <ul>
      <li>You want the lowest possible residency requirement (16 credits).</li>
      <li>
        You plan to use TECEP exams to finish faster — TESU developed the
        program and accepts unlimited TECEP credit toward residency.
      </li>
      <li>
        You're a working adult who needs true self-paced flexibility, not just
        "online."
      </li>
    </ul>

    <h2>Pick COSC if…</h2>
    <ul>
      <li>
        Out-of-pocket per-credit cost matters more than residency requirements.
        COSC is ~$50/credit cheaper out of state.
      </li>
      <li>You prefer structured 8-week terms and a defined cohort cadence.</li>
      <li>
        You live in Connecticut — COSC's in-state tuition is one of the lowest
        nationally.
      </li>
    </ul>

    {/* ── Where transfer credit changes the math ──────────── */}
    <h2>How alt-credit changes the math</h2>
    <p>
      Both schools accept up to 90 transfer credits, which means the real cost
      of either degree depends almost entirely on what you transfer in. A
      student starting with zero credits pays full tuition for 120 credits. A
      student transferring in 60 credits of Sophia Learning + 30 credits of
      CLEP/DSST pays for as few as 30 credits — closer to <strong>$15,000
      instead of $50,000+</strong>.
    </p>
    <p>
      TESU has a slight edge here because of its lower residency floor (16 vs
      36 credits). For maximum cost optimization, TESU + heavy alt-credit is
      typically the cheapest fully-accredited path to a U.S. bachelor's.
    </p>

    {/* ── The honest answer ───────────────────────────────── */}
    <h2>The honest answer</h2>
    <p>
      For most adult learners with existing college credit, the right answer
      isn't picking one school in a vacuum — it's running your <em>actual</em>
      transfer credits against both programs. Five extra Sophia courses can
      flip which school is cheaper. A capped category (like upper-division
      business) can flip which school is faster.
    </p>
    <p>
      That's the calculation our planner does automatically.
    </p>
  </article>
);
