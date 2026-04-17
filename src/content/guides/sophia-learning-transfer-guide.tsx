/**
 * Guide content: Which schools accept Sophia Learning credit.
 *
 * Sophia is the highest-volume alt-credit provider in our routing data,
 * so this page also doubles as our highest-intent SEO surface for
 * affiliate / rev-share monetization (Track 2).
 */

export const SophiaTransferGuide = () => (
  <article className="prose prose-slate dark:prose-invert max-w-none">
    <p className="text-lg text-muted-foreground leading-relaxed">
      Sophia Learning's $99/month unlimited model is the single biggest cost
      lever for anyone finishing a U.S. bachelor's degree. But the credit only
      counts if your university accepts it — and "accepts it" has a lot of
      asterisks. Here's the verified list.
    </p>

    <h2>Schools that accept Sophia (verified)</h2>
    <div className="not-prose overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left font-semibold p-3">School</th>
            <th className="text-left font-semibold p-3">Cap</th>
            <th className="text-left font-semibold p-3">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr>
            <td className="p-3 font-medium">Thomas Edison State (TESU)</td>
            <td className="p-3">Up to 90 transfer cr total</td>
            <td className="p-3">ACE-evaluated courses accepted as lower-div</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Charter Oak State (COSC)</td>
            <td className="p-3">Up to 90 transfer cr total</td>
            <td className="p-3">Counts toward gen-ed and free electives</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Excelsior University</td>
            <td className="p-3">Up to 117 cr total</td>
            <td className="p-3">Highest ceiling of the major five</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">Purdue University Global</td>
            <td className="p-3">Up to 75% of degree</td>
            <td className="p-3">Subject to program-specific limits</td>
          </tr>
          <tr>
            <td className="p-3 font-medium">University of Maryland Global</td>
            <td className="p-3">Up to 90 cr</td>
            <td className="p-3">Strong gen-ed acceptance</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>How Sophia credit actually works</h2>
    <ol>
      <li>
        You complete a Sophia course online (most take 8–40 hours).
      </li>
      <li>
        Sophia awards an ACE-recommended credit recommendation (American
        Council on Education).
      </li>
      <li>
        You request an official transcript and have it sent to your
        university.
      </li>
      <li>
        The university evaluates the ACE recommendation against their own
        catalog and awards equivalent credit.
      </li>
    </ol>

    <h2>What can go wrong</h2>
    <ul>
      <li>
        <strong>Major-specific caps.</strong> A school may accept 90 Sophia
        credits in general but only 24 toward your specific major.
      </li>
      <li>
        <strong>Upper-division gaps.</strong> Sophia courses are almost all
        100/200-level. They don't satisfy upper-division requirements.
      </li>
      <li>
        <strong>Capstone & residency.</strong> Sophia credit can't fulfill
        residency requirements — every degree requires some credits earned
        directly at the granting institution.
      </li>
    </ul>

    <h2>The smart way to use Sophia</h2>
    <p>
      Sophia is best used to clear gen-eds and free electives in bulk during a
      single $99 month. Most students subscribe, complete 8–15 courses in 30
      days, then cancel. That's potentially $4,000–$8,000 of saved tuition
      for $99 — but only if those courses map to <em>your</em> degree's
      requirements at <em>your</em> chosen school.
    </p>
  </article>
);
