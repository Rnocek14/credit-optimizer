#!/usr/bin/env node
/**
 * Build-time sitemap generator.
 *
 * Reads the guide registry and writes public/sitemap.xml so deployed builds
 * advertise every public surface to Google / Bing. Run automatically as part
 * of `npm run build` (wired in package.json), and also runnable standalone:
 *
 *     node scripts/build-sitemap.mjs
 *
 * Important: this script is intentionally dependency-free (plain Node, no TS,
 * no bundler) so it can run before Vite builds the app.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SITE_URL = process.env.SITE_URL || 'https://pivot.app';

// Parse the guide registry without importing TS — read the file as text and
// extract slugs + updatedAt fields. Crude but dependency-free.
function readGuides() {
  const src = readFileSync(
    join(ROOT, 'src/content/guides/registry.ts'),
    'utf8'
  );
  const guides = [];
  const slugRe = /slug:\s*'([^']+)'[\s\S]*?updatedAt:\s*'([^']+)'/g;
  let m;
  while ((m = slugRe.exec(src)) !== null) {
    guides.push({ slug: m[1], updatedAt: m[2] });
  }
  return guides;
}

function urlEntry(loc, lastmod, priority = '0.7') {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function build() {
  const today = new Date().toISOString().slice(0, 10);
  const guides = readGuides();

  const staticUrls = [
    urlEntry(`${SITE_URL}/`, today, '1.0'),
    urlEntry(`${SITE_URL}/guides`, today, '0.9'),
  ];

  const guideUrls = guides.map((g) =>
    urlEntry(`${SITE_URL}/guides/${g.slug}`, g.updatedAt, '0.8')
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...guideUrls].join('\n')}
</urlset>
`;

  writeFileSync(join(ROOT, 'public/sitemap.xml'), xml);
  console.log(
    `[sitemap] wrote ${staticUrls.length + guideUrls.length} URLs to public/sitemap.xml`
  );
}

build();
