/**
 * scrape-zanzibar-postcodes.js
 * 
 * Crawls tanzaniapostcode.com for all 5 Zanzibar regions, extracting real
 * district â†’ ward â†’ postcode data, then writes it into tzRegionsFull.ts.
 * 
 * Usage:  node nolsaf/scripts/scrape-zanzibar-postcodes.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400) {
        return get(r.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(new Error(`Timeout: ${url}`)); });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function isRateLimited(html) {
  return html.includes('Unusual Traffic') || html.includes('unusual traffic');
}

async function getWithRetry(url, maxRetries = 6) {
  // Always wait before every request (polite baseline)
  await sleep(5000);
  for (let i = 0; i < maxRetries; i++) {
    const html = await get(url);
    if (!isRateLimited(html)) return html;
    const backoff = 60000 + i * 30000; // 60s, 90s, 120s, 150s, 180s, 210s
    console.log(`    ⚠ Rate limited on ${url.split('/').pop() || url} — backing off ${backoff/1000}s...`);
    await sleep(backoff);
  }
  return null; // failed after retries
}

/** Extract postcode from ward detail page */
function extractPostcode(html) {
  if (!html || isRateLimited(html)) return null;
  // Match patterns like: 71102, in various contexts
  // The title is like: "KIKWAJUNI Postcode - MJINI - MJINI MAGHARIBI | Tanzania Postcode"
  // Table rows show: Postcode | 71102
  const patterns = [
    /Postcode[\s\S]{0,100}>(\d{5})</i,
    /<td[^>]*>\s*(\d{5})\s*<\/td>/,
    />\s*(\d{5})\s*</g,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      const code = m[1];
      // Tanzania postcodes: 5 digits, starting 1-9 (not 00000)
      if (/^[1-9]\d{4}$/.test(code)) return code;
    }
  }
  // Try all 5-digit sequences and pick first valid Tanzania one
  const all = [...html.matchAll(/\b(\d{5})\b/g)].map(m => m[1]).filter(c => /^[1-9]\d{4}$/.test(c));
  return all[0] || null;
}

/** Extract ward name from ward detail page (clean up "BROWSE LOCATION - X, DISTRICT, REGION" format) */
function extractWardName(html, wardSlug) {
  // Try <title> first: "WARDNAME Postcode - DISTRICT - REGION | Tanzania Postcode"
  const titleMatch = html.match(/<title>([^<]+?)\s*(?:Post\s*Code|Postcode)/i);
  if (titleMatch) {
    return titleMatch[1].trim().toUpperCase();
  }
  // Try <h1>
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    let name = h1Match[1].trim();
    // Clean "BROWSE LOCATION - BUBUBU, MAGHARIBI, MJINI MAGHARIBI" â†’ "BUBUBU"
    name = name.replace(/^BROWSE LOCATION\s*[-â€“]\s*/i, '');
    name = name.replace(/,.*$/, ''); // strip ", DISTRICT, REGION"
    return name.trim().toUpperCase();
  }
  return wardSlug.replace(/-/g, ' ').toUpperCase();
}

/** Discover district slugs from a region page */
function extractDistrictLinks(html, regionSlug) {
  const found = new Set();
  const rx = new RegExp(`href="(/location/${regionSlug}/([^/"]+)/)"`, 'g');
  let m;
  while ((m = rx.exec(html)) !== null) found.add(m[1]);
  return [...found];
}

/** Extract ward links from a district page */
function extractWardLinks(html, regionSlug, districtSlug) {
  const found = new Set();
  const rx = new RegExp(`href="(/location/${regionSlug}/${districtSlug}/([^/"]+)/)"`, 'g');
  let m;
  while ((m = rx.exec(html)) !== null) found.add(m[1]);
  return [...found];
}

// â”€â”€ Zanzibar region map (corrected slugs from tanzaniapostcode.com) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ZANZIBAR_REGIONS = [
  {
    name: 'MJINI MAGHARIBI',
    code: '71',
    slug: 'mjini-magharibi',
    districtNameMap: { 'mjini': { name: 'MJINI', code: '711' }, 'magharibi': { name: "MAGHARIBI", code: '712' } },
  },
  {
    name: 'PEMBA KASKAZINI',
    code: '72',
    slug: 'pemba-north',
    districtNameMap: {},
  },
  {
    name: 'PEMBA KUSINI',
    code: '73',
    slug: 'pemba-south',
    districtNameMap: {},
  },
  {
    name: 'UNGUJA KASKAZINI',
    code: '74',
    slug: 'unguja-north',
    districtNameMap: {},
  },
  {
    name: 'UNGUJA KUSINI',
    code: '75',
    slug: 'unguja-south',
    districtNameMap: {},
  },
];

// â”€â”€ Scraper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function scrapeRegion(region) {
  const BASE = 'https://www.tanzaniapostcode.com';
  console.log(`\n== ${region.name} (${region.slug}) ==`);

  const regionPage = await getWithRetry(`${BASE}/location/${region.slug}/`);
  if (!regionPage) { console.log('  âœ— Region page failed'); return { name: region.name, code: region.code, districts: [] }; }

  const districtPaths = extractDistrictLinks(regionPage, region.slug);
  console.log(`  Districts found: ${districtPaths.length} â€” ${districtPaths.map(p => p.split('/')[3]).join(', ')}`);

  const builtDistricts = [];
  let distCode = parseInt(region.code) * 10 + 1; // e.g. 71 â†’ 711, 712, ...

  for (const dPath of districtPaths) {
    const dSlug = dPath.replace(/^\/|\/$/g, '').split('/')[2]; // e.g. "mjini"
    const knownMapping = region.districtNameMap[dSlug];
    const districtName = knownMapping ? knownMapping.name : dSlug.replace(/-/g, ' ').toUpperCase();
    const districtCode = knownMapping ? knownMapping.code : String(distCode++);
    console.log(`\n  District: ${districtName} (${dSlug})`);

    const districtPage = await getWithRetry(`${BASE}${dPath}`);
    if (!districtPage) { builtDistricts.push({ name: districtName, code: districtCode, wards: [] }); continue; }

    const wardPaths = extractWardLinks(districtPage, region.slug, dSlug);
    console.log(`  ${wardPaths.length} wards to fetch...`);

    const wards = [];
    let wardCode = parseInt(districtCode) * 100 + 1; // e.g. 711 â†’ 71101, 71102...

    for (const wPath of wardPaths) {
      const wSlug = wPath.replace(/^\/|\/$/g, '').split('/').pop();
      const wardPage = await getWithRetry(`${BASE}${wPath}`);

      if (!wardPage) {
        console.log(`    âœ— Failed: ${wSlug}`);
        wards.push({ name: wSlug.replace(/-/g, ' ').toUpperCase(), code: '', postcode: '', streets: [] });
        wardCode++;
        continue;
      }

      const wardName = extractWardName(wardPage, wSlug);
      const postcode = extractPostcode(wardPage);
      console.log(`    ${wardName} â†’ ${postcode || '?'}`);
      wards.push({ name: wardName, code: postcode || String(wardCode), postcode: postcode || '', streets: [] });
      wardCode++;
    }

    builtDistricts.push({ name: districtName, code: districtCode, wards });
    await sleep(10000); // rest between districts
  }

  return { name: region.name, code: region.code, districts: builtDistricts };
}

// â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

(async () => {
  const rawOut = path.join(__dirname, '_zanzibar-raw.json');

  // Resume from existing partial results if available
  let results = [];
  if (fs.existsSync(rawOut)) {
    results = JSON.parse(fs.readFileSync(rawOut, 'utf8'));
    const doneNames = results.map(r => r.name);
    console.log(`\nResuming — already have: ${doneNames.join(', ')}`);
  }
  const doneSet = new Set(results.map(r => r.name));

  for (const region of ZANZIBAR_REGIONS) {
    if (doneSet.has(region.name)) { console.log(`\nSkipping ${region.name} (already done)`); continue; }
    try {
      const built = await scrapeRegion(region);
      results.push(built);
      // Save after every region so partial work is not lost
      fs.writeFileSync(rawOut, JSON.stringify(results, null, 2), 'utf8');
      console.log(`\n  ✓ Saved partial results after ${region.name}`);
      // Cool-down between regions (site is aggressive)
      if (ZANZIBAR_REGIONS.indexOf(region) < ZANZIBAR_REGIONS.length - 1) {
        console.log('  Waiting 60s before next region...');
        await sleep(60000);
      }
    } catch (e) {
      console.error(`  ✗ Failed ${region.name}:`, e.message);
      results.push({ name: region.name, code: region.code, districts: [] });
      fs.writeFileSync(rawOut, JSON.stringify(results, null, 2), 'utf8');
    }
  }

  // Save raw results for inspection
  fs.writeFileSync(rawOut, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nâœ“ Raw data saved to ${rawOut}`);

  // â”€â”€ Write to tzRegionsFull.ts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fullDataPath = path.join(__dirname, '../apps/web/lib/tzRegionsFull.ts');
  let content = fs.readFileSync(fullDataPath, 'utf8');

  // Find and replace the entire Zanzibar block (everything from first Zanzibar entry to end)
  // The Zanzibar block starts with the entry for MJINI MAGHARIBI
  const firstMarker = '"name": "MJINI MAGHARIBI"';
  const markerIdx = content.lastIndexOf(firstMarker);
  if (markerIdx === -1) {
    console.error('\nâœ— Could not find MJINI MAGHARIBI marker in tzRegionsFull.ts');
    console.log('  â†’ Raw data is in', rawOut);
    console.log('  â†’ Manually replace the last 5 entries in the file with the raw JSON');
    process.exit(1);
  }

  // Walk back to find the opening { of this entry
  let blockStart = markerIdx;
  while (blockStart > 0 && content[blockStart] !== '{') blockStart--;
  // Also include the preceding comma+newline+spaces
  let insertPoint = blockStart;
  while (insertPoint > 0 && /[\s,]/.test(content[insertPoint - 1])) insertPoint--;

  const pre = content.substring(0, insertPoint);
  const newEntries = results.map(r => JSON.stringify(r, null, 2)).join(',\n  ');
  const newContent = `${pre},\n  ${newEntries}\n] as any;\n`;

  fs.writeFileSync(fullDataPath, newContent, 'utf8');
  console.log('\nâœ“ tzRegionsFull.ts updated with real Zanzibar postcode data');

  for (const r of results) {
    const totalWards = r.districts.reduce((s, d) => s + d.wards.length, 0);
    const withCode = r.districts.reduce((s, d) => s + d.wards.filter(w => w.postcode).length, 0);
    console.log(`  ${r.name}: ${r.districts.length} districts, ${totalWards} wards (${withCode} with postcode)`);
  }
})();
