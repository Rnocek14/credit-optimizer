/**
 * Canonical site origin.
 *
 * Every canonical link, JSON-LD @id and OG url must be built from this, never
 * from a hardcoded literal. `https://pivot.app` was previously inlined in eight
 * source files plus index.html, robots.txt and sitemap.xml. If that is not the
 * domain the site actually serves from, every canonical tag points somewhere
 * else — which tells search engines the real pages are duplicates of a domain
 * that may not exist, and is enough on its own to stop the site ranking.
 *
 * Set `VITE_SITE_URL` in the deploy environment. `vite.config.ts` defaults it
 * so index.html's `%VITE_SITE_URL%` placeholders always resolve, and
 * `scripts/build-sitemap.mjs` reads the same value (via SITE_URL or
 * VITE_SITE_URL) when generating sitemap.xml and robots.txt.
 *
 * Remember this is a BUILD-TIME value: changing it requires a redeploy.
 */
const RAW = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();

/** Origin with no trailing slash, e.g. "https://example.com". */
export const SITE_URL: string = (RAW && RAW.length > 0 ? RAW : 'https://pivot.app').replace(/\/+$/, '');

/**
 * Absolute URL for a site-relative path.
 * `absoluteUrl('/guides')` → "https://example.com/guides"
 */
export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
