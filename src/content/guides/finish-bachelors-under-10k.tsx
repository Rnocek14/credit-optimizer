/**
 * Guide content: How to finish a bachelor's under $10k.
 *
 * Top-of-funnel viral / shareable page. Less comparison-table heavy, more
 * "here's the actual recipe." Intent: aspirational searchers who don't yet
 * know that this is even possible.
 */
import { CheckCircle2 } from 'lucide-react';
import { INSTITUTION_RATES, PROVIDER_RATES, providerCostForCredits, formatRateCaveat } from '@/lib/pricing/referenceRates';
import { POLICY_GROUND_TRUTH } from '@/lib/degree/policyGroundTruth';
import { getNoncollegiateCap } from '@/lib/degree/institutionPolicies';

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
        <strong>A school that accepts most of your credits by transfer.</strong>{' '}
        Out of the 120 credits a bachelor's requires, the three schools below
        let you transfer in nearly all of them — the rest is "residency", the
        credits you must actually earn there:{' '}
        <strong>COSC {POLICY_GROUND_TRUTH.COSC.residencyCredits} credits</strong>{' '}
        (just the Cornerstone and Capstone courses),{' '}
        <strong>TESU {POLICY_GROUND_TRUTH.TESU.residencyCredits}</strong>, and{' '}
        <strong>Excelsior {POLICY_GROUND_TRUTH.EXCELSIOR.residencyCredits}</strong>.
        Note the separate, lower ceiling on alt-credit specifically: TESU caps
        ACE/NCCRS credit at {POLICY_GROUND_TRUTH.TESU.maxAceNccrsCredits}.
      </li>
      <li>
        <strong>Alt-credit for the bulk of it.</strong> Sophia Learning,
        StraighterLine, and Study.com offer ACE-credit-recommended courses for
        roughly $30–$70 per credit, against the{' '}
        ${INSTITUTION_RATES.TESU.perCreditUsd}/credit TESU charges out of state.
      </li>
      <li>
        <strong>An efficient residency plan.</strong> The credits you actually
        take at the school are where most of your money goes, so a school with
        a small residency requirement saves you more than a small per-credit
        rate does. Both TESU and COSC bill per credit.
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
            <td className="p-3">
              Sophia Learning (4 months @ ${PROVIDER_RATES.SOPHIA.monthlyUsd} → ~30 credits)
            </td>
            <td className="p-3 font-mono">
              ${providerCostForCredits('SOPHIA', 30, 4)?.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="p-3">
              StraighterLine (8 months @ ${PROVIDER_RATES.STRAIGHTERLINE.monthlyUsd} +{' '}
              ${PROVIDER_RATES.STRAIGHTERLINE.perCourseUsd}/course → ~60 credits = 20 courses)
            </td>
            <td className="p-3 font-mono">
              ${providerCostForCredits('STRAIGHTERLINE', 60, 8)?.toLocaleString()}
            </td>
          </tr>
          <tr className="bg-muted/30">
            <td className="p-3 italic">
              Alt-credit subtotal: 90 credits — exactly COSC's{' '}
              {getNoncollegiateCap('COSC')}-credit alt-credit ceiling. You cannot buy
              your way past this line.
            </td>
            <td className="p-3 font-mono italic">
              $
              {(
                (providerCostForCredits('SOPHIA', 30, 4) ?? 0) +
                (providerCostForCredits('STRAIGHTERLINE', 60, 8) ?? 0)
              ).toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="p-3">
              The remaining {120 - getNoncollegiateCap('COSC')} credits at COSC @{' '}
              ${INSTITUTION_RATES.COSC.perCreditUsd}/credit
            </td>
            <td className="p-3 font-mono">
              $
              {(
                (120 - getNoncollegiateCap('COSC')) * INSTITUTION_RATES.COSC.perCreditUsd
              ).toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="p-3">Enrollment + graduation fees</td>
            <td className="p-3 font-mono">
              ${INSTITUTION_RATES.COSC.requiredFeesUsd.toLocaleString()}
            </td>
          </tr>
          <tr className="bg-primary/5 font-semibold">
            <td className="p-3">Total (COSC route)</td>
            <td className="p-3 font-mono">
              $
              {(
                (providerCostForCredits('SOPHIA', 30, 4) ?? 0) +
                (providerCostForCredits('STRAIGHTERLINE', 60, 8) ?? 0) +
                (120 - getNoncollegiateCap('COSC')) * INSTITUTION_RATES.COSC.perCreditUsd +
                INSTITUTION_RATES.COSC.requiredFeesUsd
              ).toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p className="text-sm text-muted-foreground mt-3">
      Every figure above is computed from the same pricing data the planner uses,
      so this table cannot drift away from your actual plan.{' '}
      {formatRateCaveat('COSC')}
    </p>
    <p className="text-sm text-muted-foreground mt-2">
      <strong>Read the third row again</strong> — it is the one that decides your
      bill. COSC's <em>residency</em> minimum is only{' '}
      {POLICY_GROUND_TRUTH.COSC.residencyCredits} credits (Cornerstone and
      Capstone, which cannot be transferred), and it is tempting to conclude you
      only pay for {POLICY_GROUND_TRUTH.COSC.residencyCredits}. You do not. The
      binding constraint is the separate {getNoncollegiateCap('COSC')}-credit
      ceiling on alt-credit: once you hit it, every remaining credit toward the
      120 has to come from a regionally accredited college — COSC itself, or a
      community college at its own per-credit rate.
    </p>
    <p className="text-sm text-muted-foreground mt-2">
      That is the number to attack. Covering some of those{' '}
      {120 - getNoncollegiateCap('COSC')} credits at a community college instead
      of at COSC is usually the single largest saving available on this route,
      and it is the step most people skip.
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
      for under <strong>$10k</strong>. From scratch, plan on 18–24 months, and
      budget by the table above rather than by a headline number.
    </p>
    <p>
      If you're 18 and full-time enrolled, this is not your path — go to a
      state school. This works because you're already partway there.
    </p>

    <h2>The catch</h2>
    <p>
      The recipe is simple. Executing it is not. One wrong 3-credit course at
      TESU costs ${(INSTITUTION_RATES.TESU.perCreditUsd * 3).toLocaleString()}{' '}
      out of state. The wrong alt-credit provider for your school wastes 3 months. The
      wrong order between residency and transfer credit forces you to retake
      requirements. <strong>The savings come from sequencing</strong>, not
      from the providers.
    </p>
  </article>
);
