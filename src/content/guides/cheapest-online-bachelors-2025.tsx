import { POLICY_GROUND_TRUTH } from '@/lib/degree/policyGroundTruth';
import { PROVIDER_RATES } from '@/lib/pricing/referenceRates';
/**
 * Guide content: Cheapest accredited online bachelor's degree in 2025.
 *
 * Anchored to the same five verified schools that power /get-started and
 * /compare. Numbers reflect a maxed-out alt-credit strategy.
 */

export const CheapestBachelorsGuide = () => (
  <article className="prose prose-slate dark:prose-invert max-w-none">
    <p className="text-lg text-muted-foreground leading-relaxed">
      A regionally accredited online bachelor's degree in 2025 can cost
      anywhere from $9,000 to $80,000+ depending on how aggressively you use
      alt-credit. Here are the cheapest paths that still produce a degree
      employers and grad schools will accept — no diploma mills, no
      unaccredited shortcuts.
    </p>

    <h2>The actual cheapest path</h2>
    <p>
      The minimum-cost strategy in 2025 looks like this:
    </p>
    <ol>
      <li>
        <strong>Transfer in ~90 credits</strong> from a combination of Sophia
        Learning (${PROVIDER_RATES.SOPHIA.monthlyUsd}/mo unlimited), Study.com
        (${PROVIDER_RATES.STUDYCOM.monthlyUsd}/mo College Plus), CLEP exams
        (~${PROVIDER_RATES.CLEP.perExamUsd} each), and DSST exams
        (~${PROVIDER_RATES.DSST.perExamUsd} each).
      </li>
      <li>
        <strong>Finish the remaining ~30 residency credits</strong> at a
        regionally accredited school that (a) accepts that volume of transfer
        credit and (b) has low per-credit tuition.
      </li>
    </ol>

    <h2>The five schools that make this work</h2>
    <div className="not-prose overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left font-semibold p-3">School</th>
            <th className="text-left font-semibold p-3">Max transfer</th>
            <th className="text-left font-semibold p-3">Min cost (est.)</th>
            <th className="text-left font-semibold p-3">Best for</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr>
            <td className="p-3 font-medium">Thomas Edison State (TESU)</td>
            <td className="p-3">
              {POLICY_GROUND_TRUTH.TESU.maxTransferCredits} cr
              <span className="block text-xs text-muted-foreground">
                ({POLICY_GROUND_TRUTH.TESU.maxAceNccrsCredits} cr max from alt-credit)
              </span>
            </td>
            <td className="p-3">~$10,000</td>
            <td className="p-3">Lowest residency requirement</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Charter Oak State (COSC)</td>
            <td className="p-3">
              {POLICY_GROUND_TRUTH.COSC.maxTransferCredits} cr
              <span className="block text-xs text-muted-foreground">(90 cr max from alt-credit)</span>
            </td>
            <td className="p-3">~$11,500</td>
            <td className="p-3">Lower per-credit tuition</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Excelsior University</td>
            <td className="p-3">
              {POLICY_GROUND_TRUTH.EXCELSIOR.maxTransferCredits} cr
              <span className="block text-xs text-muted-foreground">
                ({POLICY_GROUND_TRUTH.EXCELSIOR.maxAceNccrsCredits} cr max from alt-credit)
              </span>
            </td>
            <td className="p-3">~$13,000</td>
            <td className="p-3">High transfer ceiling</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">WGU</td>
            <td className="p-3">
              {POLICY_GROUND_TRUTH.WGU.maxTransferCredits} cr
              <span className="block text-xs text-muted-foreground">
                ({POLICY_GROUND_TRUTH.WGU.maxAceNccrsCredits} cr max from alt-credit; no Sophia or Study.com)
              </span>
            </td>
            <td className="p-3">~$8,500/yr (flat)</td>
            <td className="p-3">Self-paced, finish fast</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">SNHU</td>
            <td className="p-3">90 cr</td>
            <td className="p-3">~$30,000</td>
            <td className="p-3">Brand recognition + flexibility</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p className="text-xs text-muted-foreground mt-2">
      Transfer ceilings come from each school's published policy. The
      <strong> total-cost estimates are rough planning figures</strong>, not quotes —
      they move with how many credits you transfer, your residency status, and the
      year you enroll. Treat them as an ordering, not a price.
    </p>

    <h2>What "cheapest" actually means</h2>
    <p>
      The headline number above assumes you successfully transfer 90 credits
      of alt-credit. In practice, the cheapest school <em>for you</em> depends
      on which alt-credit you've already completed (or are willing to
      complete) and which courses fit your major's requirements. A $10
      difference per credit matters less than whether 6 of your Sophia
      courses count toward your specific degree.
    </p>

    <h2>Avoid these traps</h2>
    <ul>
      <li>
        <strong>Per-credit price ≠ total cost.</strong> A $200/credit school
        with a 30-credit residency cap costs less than a $150/credit school
        that demands 60 credits in residence.
      </li>
      <li>
        <strong>"Accelerated" doesn't mean "cheap."</strong> Some flat-rate
        programs are great if you finish in under a year, expensive if you
        don't.
      </li>
      <li>
        <strong>Watch capped categories.</strong> Many schools cap how many
        credits in a single category (e.g. upper-division business) you can
        transfer in. This is where alt-credit strategies break.
      </li>
    </ul>
  </article>
);
