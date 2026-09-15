# Monetization Runbook

> ## ⛔ BLOCKED — do not drive paid or SEO traffic yet
>
> **See `docs/TRANSFERABILITY_ACCURACY_AUDIT_2026-09-15.md` (verdict: RED).**
>
> The affiliate plumbing described below is complete and correct. The product
> it monetizes is not currently accurate. Specifically: when no transfer rule
> exists, `useTransferVerification.ts:205-220` returns `verified` or `elective`
> rather than `unknown`, so the UI asserts a transfer approval it has no basis
> for — under a green "Verified" badge, on public pages, next to affiliate
> links.
>
> That combination is the problem. Unverified claims are an editorial mistake;
> unverified claims **monetized by affiliate links** are a commercial
> representation. The disclosure this runbook adds even states "our
> recommendations come from verified transfer data," which is not true today.
>
> **Order of operations is therefore: fix accuracy (audit items 1-4, ~2 days),
> then apply to affiliate programs.** Applying first is also tactically wrong —
> networks review live sites, and one that overstates verification is a
> rejection risk.

How this project makes money, what is already wired, and the exact steps left.

**Current revenue: $0/month.** Not because the product is broken — it builds and
runs — but because of two gaps, one of which is now closed.

---

## The model

There is exactly one revenue mechanism in this codebase: **affiliate commission
on outbound clicks to alt-credit providers.**

A user reads a guide or builds a plan → clicks through to Sophia / Study.com /
StraighterLine → buys a subscription → we earn a commission. The click fires an
`outbound_provider_click` event, which is the revenue event.

There is no paid tier, no subscription, and no B2B billing wired up. `subscriptionTiers.ts`
and `quota-check` exist but are not connected to a payment processor. If you want
recurring product revenue later, that is a separate build.

---

## What was broken

**1. The revenue surface was on the wrong page.** `ProviderLinkStrip` — the only
component with outbound provider links — rendered on exactly one route:
`/plan/preview/:templateId`. That is 3+ clicks deep, behind `/get-started` →
`/compare` → pick a template.

Meanwhile the five `/guides/*` pages — which are literally provider-comparison
affiliate content, titled things like *"StraighterLine vs Sophia vs Study.com"* —
had **zero** outbound links. Not one. A reader would get to "Pick Sophia if…",
decide, and find nothing to click. That is total leakage on the highest-intent
traffic the site is designed to attract.

**2. Nothing was tracked or attributed.** Affiliate env vars were unset, so even
a click that did happen resolved to a plain provider homepage and earned nothing.
Only 2 of 5 providers had any affiliate support at all.

## What is now fixed (in code)

- `ProviderLinkStrip` renders on **every guide** (`/guides/:slug`), on
  `/compare`, and on `/transfer-check` — plus the original plan preview.
- Each guide declares its own provider list in `src/content/guides/registry.ts`,
  ordered editorially. Pricing guides lead with CLEP, which pays nothing — a
  comparison site that reorders for commission stops being worth linking to.
- All 5 providers are affiliate-configurable, via either a full network tracking
  link (`*_URL`) or a bare referral code (`*_CODE`).
- Every outbound link carries a **sub-ID** (`source__sessionId`), so a commission
  landing in a network dashboard three weeks later can be traced to the page that
  earned it. Without this you get paid but never learn what works.
- Affiliate links are marked `rel="sponsored nofollow"`. This site's entire
  acquisition model is organic search; unmarked affiliate links risk a Google
  manual penalty, which would be fatal rather than annoying.
- FTC disclosure renders above the links, automatically, and only when a real
  affiliate relationship is configured.

Covered by `src/lib/__tests__/providers.test.ts` (21 tests).

---

## What only you can do

### Step 1 — Apply to the affiliate programs

Nothing earns until these are approved. Applications generally want a live site
with real content, which is why this comes after deploying, not before.

| Provider | Program | Notes |
|---|---|---|
| Sophia Learning | Affiliate program (run via Impact) | Highest priority — cheapest option, so it converts best, and it's what the guides already recommend most |
| Study.com | Affiliate program (has run via FlexOffers / Impact) | Highest payout of the three |
| StraighterLine | Affiliate program (has run via Impact / CJ) | Worth having for the "traditional university" segment |
| CLEP / College Board | **None** | Nonprofit test administrator. Link anyway — it's the honest cheapest answer and it's what makes the other recommendations credible |
| DSST / Prometric | **None** | Same |

Verify current commission terms and network yourself at application time — rates
and networks change, and I'd rather you read the live terms than trust a number
written down here.

### Step 2 — Paste the codes in

Once approved, set these wherever you deploy (Vercel/Netlify env vars, **not**
a committed `.env`):

```
VITE_AFF_SOPHIA_URL=          # or VITE_AFF_SOPHIA_CODE
VITE_AFF_STUDYCOM_URL=        # or VITE_AFF_STUDYCOM_CODE
VITE_AFF_STRAIGHTERLINE_URL=  # or VITE_AFF_STRAIGHTERLINE_CODE
```

Prefer `*_URL` (the full tracking deep link the network gives you) when offered —
it is the attribution path the network actually supports. Use `*_CODE` only for a
plain `?ref=` style referral.

These are build-time variables. **Vite inlines them at build, so you must
redeploy after changing them.** Setting an env var without a rebuild does nothing.

### Step 3 — Verify before trusting it

After deploying with codes set, on a live guide page:

1. Right-click a provider link → copy address. Confirm it contains your affiliate
   code/tracking domain **and** a `subId`/`sub1` param.
2. Confirm the link's `rel` includes `sponsored`.
3. Confirm the disclosure line renders above the links.
4. Click through and confirm the click registers in your network dashboard.

Then check the `events` table:

```sql
select payload->>'provider' as provider,
       payload->>'source'   as source,
       count(*)             as clicks
from events
where name = 'outbound_provider_click'
group by 1, 2
order by clicks desc;
```

That query is your revenue dashboard. `source` tells you which guide earns.

---

## The honest bottleneck: traffic

The code is now ready to earn. That is necessary but not sufficient — **affiliate
revenue is a traffic business**, and this is the real constraint:

- There are **5 guides**. That is a seed, not an inventory.
- Ranking for a term like "sophia learning transfer" takes months of indexing.
- Rough order of magnitude: affiliate conversion on this kind of content runs at
  a low single-digit percentage of clicks, and only a fraction of readers click
  out at all. Meaningful monthly revenue needs **thousands** of monthly visitors,
  not dozens.

So the realistic sequence is: deploy → get indexed → publish more guides against
real search demand → watch which `source` values produce clicks → write more of
what works. The `subId` attribution exists specifically so that loop is possible.

**Highest-leverage next moves, in order:**

1. Confirm the site is actually deployed and indexable at a real domain.
   Canonicals and the sitemap currently hardcode `https://pivot.app` — if that
   is not the live domain, every canonical tag is pointing at the wrong place and
   search engines will not rank you. Fix that first; it is cheap and it blocks
   everything else.
2. Submit the sitemap in Google Search Console.
3. Apply to Sophia + Study.com.
4. Write more guides. The existing five are good; the site needs 20–50 to have a
   real organic surface area.

---

## Open question for the owner

I could not determine from the repo whether the site is currently live, or at
what domain. `pivot.app` is hardcoded in `PublicLayout`, `sitemap.xml`, and
`robots.txt`. If the real domain differs, that is a one-line fix in each place
and it should happen before any SEO effort.
