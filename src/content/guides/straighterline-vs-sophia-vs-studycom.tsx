/**
 * Guide content: StraighterLine vs Sophia vs Study.com.
 *
 * Highest-intent comparison query in the alt-credit space. Whoever Googles
 * this is already in "I'm doing this" mode — they just need a deciding number.
 *
 * Numbers anchored to public pricing as of 2026-04. Update via the
 * alt_provider_pricing_packs table when sources change.
 */
import { CheckCircle2, XCircle } from 'lucide-react';

export const StraighterlineVsSophiaVsStudycomGuide = () => (
  <article className="prose prose-slate dark:prose-invert max-w-none">
    <p className="text-lg text-muted-foreground leading-relaxed">
      You can knock out 30+ general-education credits for under $1,000 using
      one of three providers: <strong>StraighterLine</strong>,{' '}
      <strong>Sophia Learning</strong>, or <strong>Study.com</strong>. They
      look similar from the outside. They're not. Here's the math, the
      transfer reality, and which one fits which student.
    </p>

    {/* ── Pricing table ────────────────────────────────────── */}
    <h2>Real cost per credit (2026)</h2>
    <div className="not-prose overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left p-3 font-semibold">Provider</th>
            <th className="text-left p-3 font-semibold">Subscription</th>
            <th className="text-left p-3 font-semibold">Per-course fee</th>
            <th className="text-left p-3 font-semibold">Effective $/credit*</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr>
            <td className="p-3 font-medium">Sophia Learning</td>
            <td className="p-3">$99 / month (unlimited)</td>
            <td className="p-3">—</td>
            <td className="p-3">~$33 (3 courses/mo)</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Study.com</td>
            <td className="p-3">$199 / month (College Plus)</td>
            <td className="p-3">—</td>
            <td className="p-3">~$66 (3 courses/mo)</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">StraighterLine</td>
            <td className="p-3">$99 / month membership</td>
            <td className="p-3">$79 per course</td>
            <td className="p-3">~$59 (3 courses/mo)</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p className="text-xs text-muted-foreground mt-2">
      * Assumes 3-credit courses and 1 month of active study per course. Faster
      pace = lower effective cost.
    </p>

    {/* ── Transfer acceptance ─────────────────────────────── */}
    <h2>Where the credit actually lands</h2>
    <p>
      Cost only matters if the school you're aiming at accepts the credit.
      Here's the verified picture for the three big "finish online" schools:
    </p>
    <div className="not-prose overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left p-3 font-semibold">School</th>
            <th className="text-left p-3 font-semibold">Sophia</th>
            <th className="text-left p-3 font-semibold">Study.com</th>
            <th className="text-left p-3 font-semibold">StraighterLine</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr>
            <td className="p-3 font-medium">TESU</td>
            <td className="p-3"><CheckCircle2 className="inline h-4 w-4 text-primary" /> Accepted (cap applies)</td>
            <td className="p-3"><CheckCircle2 className="inline h-4 w-4 text-primary" /> Accepted (cap applies)</td>
            <td className="p-3"><CheckCircle2 className="inline h-4 w-4 text-primary" /> Accepted</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">COSC</td>
            <td className="p-3"><CheckCircle2 className="inline h-4 w-4 text-primary" /> Accepted</td>
            <td className="p-3"><CheckCircle2 className="inline h-4 w-4 text-primary" /> Accepted</td>
            <td className="p-3"><CheckCircle2 className="inline h-4 w-4 text-primary" /> Accepted</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Excelsior</td>
            <td className="p-3"><CheckCircle2 className="inline h-4 w-4 text-primary" /> Accepted</td>
            <td className="p-3"><CheckCircle2 className="inline h-4 w-4 text-primary" /> Accepted</td>
            <td className="p-3"><CheckCircle2 className="inline h-4 w-4 text-primary" /> Accepted</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Most state universities</td>
            <td className="p-3"><XCircle className="inline h-4 w-4 text-muted-foreground" /> Spotty</td>
            <td className="p-3"><XCircle className="inline h-4 w-4 text-muted-foreground" /> Spotty</td>
            <td className="p-3"><CheckCircle2 className="inline h-4 w-4 text-primary" /> Better (ACE)</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p className="text-sm text-muted-foreground mt-3">
      Sophia and Study.com use ACE credit recommendations; StraighterLine uses
      ACE plus direct partnerships. ACE acceptance is the norm at the
      finish-online schools but the exception at traditional universities.
    </p>

    {/* ── Decision logic ──────────────────────────────────── */}
    <h2>Which one to actually pick</h2>
    <h3>Pick Sophia if…</h3>
    <ul>
      <li>You're targeting TESU, COSC, or Excelsior</li>
      <li>You can study fast (3+ courses/month) — the unlimited model only pays off at speed</li>
      <li>You want the cheapest possible per-credit cost</li>
    </ul>
    <h3>Pick Study.com if…</h3>
    <ul>
      <li>You want video-first learning with quizzes (most "course-like")</li>
      <li>You also want exam prep (CLEP/DSST included in plan)</li>
      <li>You're willing to pay a premium for structure</li>
    </ul>
    <h3>Pick StraighterLine if…</h3>
    <ul>
      <li>You're transferring to a state school, not a finish-online school</li>
      <li>You want the broadest course catalog (60+ courses)</li>
      <li>You need rolling enrollment with no cohort dates</li>
    </ul>

    <h2>The honest take</h2>
    <p>
      For 80% of people finishing a bachelor's online, <strong>Sophia is the
      right answer</strong> — fastest, cheapest, accepted at the schools that
      actually let you finish. StraighterLine wins when your target school is
      traditional and you need the strongest ACE pedigree. Study.com is rarely
      the math winner but is the best learning experience.
    </p>
  </article>
);
