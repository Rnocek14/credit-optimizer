/**
 * Guide content: How to finish a bachelor's under $10k.
 *
 * Top-of-funnel viral / shareable page. Less comparison-table heavy, more
 * "here's the actual recipe." Intent: aspirational searchers who don't yet
 * know that this is even possible.
 */
import { CheckCircle2 } from 'lucide-react';

export const FinishBachelorsUnder10kGuide = () => (
  <article className="prose prose-slate dark:prose-invert max-w-none">
    <p className="text-lg text-muted-foreground leading-relaxed">
      The average US bachelor's degree costs <strong>$104,000</strong>. The
      cheapest accredited route, done correctly, costs under <strong>$10,000
      total</strong> — including tuition, fees, and alt-credit subscriptions.
      Here's the exact recipe, the schools that allow it, and the trade-offs
      nobody tells you about.
    </p>

    {/* ── The recipe ──────────────────────────────────────── */}
    <h2>The recipe (in 4 ingredients)</h2>
    <ol>
      <li>
        <strong>A school that accepts 90 transfer credits.</strong> Out of 120
        total credits required for a bachelor's, this means you only owe the
        school 30. Three schools do this well online: TESU, COSC, Excelsior.
      </li>
      <li>
        <strong>Alt-credit for the first 90.</strong> Sophia Learning,
        StraighterLine, and Study.com offer ACE-credit-recommended courses for
        $30–$70 per credit instead of the $400+ schools charge.
      </li>
      <li>
        <strong>An efficient residency plan.</strong> The 30 credits you
        actually take at the school is where most of your money goes. Choose a
        per-credit-billed program (TESU) or a flat-rate term (COSC) based on
        how fast you can study.
      </li>
      <li>
        <strong>One enrollment year, not four.</strong> Tuition is billed by
        time enrolled. If you finish in 12 months, you pay one year of fees.
        If you stretch it to four, you pay four.
      </li>
    </ol>

    {/* ── The math ─────────────────────────────────────────── */}
    <h2>The math, line by line</h2>
    <div className="not-prose overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left p-3 font-semibold">Line item</th>
            <th className="text-left p-3 font-semibold">Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr>
            <td className="p-3">Sophia Learning (4 months @ $99 → ~30 credits)</td>
            <td className="p-3 font-mono">$396</td>
          </tr>
          <tr>
            <td className="p-3">StraighterLine (8 months @ $99 + course fees → ~60 credits)</td>
            <td className="p-3 font-mono">$5,532</td>
          </tr>
          <tr>
            <td className="p-3">TESU residency: 30 credits @ $419/credit</td>
            <td className="p-3 font-mono">$12,570</td>
          </tr>
          <tr>
            <td className="p-3 italic">…or COSC residency: 30 credits flat-rate</td>
            <td className="p-3 font-mono">~$9,000</td>
          </tr>
          <tr>
            <td className="p-3">Annual enrollment + graduation fees</td>
            <td className="p-3 font-mono">~$700</td>
          </tr>
          <tr className="bg-primary/5 font-semibold">
            <td className="p-3">Total (COSC route)</td>
            <td className="p-3 font-mono">~$15,600</td>
          </tr>
          <tr className="bg-primary/5 font-semibold">
            <td className="p-3">Total (aggressive: max Sophia + COSC)</td>
            <td className="p-3 font-mono">~$9,800</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p className="text-sm text-muted-foreground mt-3">
      "Aggressive" assumes you finish 90 credits via Sophia in roughly 6 months
      and complete COSC residency in one academic year.
    </p>

    {/* ── Trade-offs ──────────────────────────────────────── */}
    <h2>What nobody tells you</h2>
    <ul>
      <li>
        <strong>You will not have a "college experience."</strong> No campus,
        no clubs, no career fair. The diploma is identical; the journey is not.
      </li>
      <li>
        <strong>Some employers will not recognize the schools.</strong> They
        are regionally accredited, which is the gold standard, but TESU and
        COSC are not household names. This matters less than people think but
        it's not zero.
      </li>
      <li>
        <strong>You have to be your own academic advisor.</strong> The schools
        will not stop you from taking courses that don't fit. This is the
        single biggest reason people overspend on this route.
      </li>
    </ul>

    {/* ── Who this works for ──────────────────────────────── */}
    <h2>Who this is actually for</h2>
    <p>
      This recipe is built for adults: people with some college credit, a job,
      and zero patience for four years of debt. If you have an associate's
      degree already, you can usually finish in <strong>9–12 months</strong>{' '}
      for under <strong>$10k</strong>. From scratch, plan on 18–24 months and
      $12–$16k.
    </p>
    <p>
      If you're 18 and full-time enrolled, this is not your path — go to a
      state school. This works because you're already partway there.
    </p>

    <h2>The catch</h2>
    <p>
      The recipe is simple. Executing it is not. The wrong course at TESU is
      $419. The wrong alt-credit provider for your school wastes 3 months. The
      wrong order between residency and transfer credit forces you to retake
      requirements. <strong>The savings come from sequencing</strong>, not
      from the providers.
    </p>
  </article>
);
