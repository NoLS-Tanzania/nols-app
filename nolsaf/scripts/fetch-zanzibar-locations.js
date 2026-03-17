/**
 * Script to fetch Zanzibar (Unguja + Pemba) administrative data from OpenStreetMap
 * via the Overpass API and append it to tzRegionsFull.ts / tzRegions.ts
 *
 * Zanzibar uses "shehia" as the equivalent of mainland Tanzania "ward".
 * Administrative levels in OSM for Zanzibar:
 *   admin_level=4  → Region  (e.g. Unguja Kaskazini, Unguja Mjini Magharibi, Pemba Kaskazini …)
 *   admin_level=6  → District
 *   admin_level=7  → Shehia  (ward equivalent)
 *
 * Usage:
 *   node scripts/fetch-zanzibar-locations.js
 *
 * This will:
 *   1. Query Overpass for all Zanzibar admin boundaries
 *   2. Build the same RegionFullData structure used by tzRegionsFull.ts
 *   3. Patch REGIONS and REGION_CODES in tzRegions.ts
 *   4. Append the new entries to tzRegionsFull.ts
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Overpass query — fetch all admin_level 4/6/7 relations inside Zanzibar.
// Zanzibar's OSM relation id is 1027461 (Tanzania Zanzibar semi-autonomous region).
// We use a bounding box that tightly covers Unguja + Pemba to keep the query fast.
// ---------------------------------------------------------------------------
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

// bbox: south,west,north,east — covers Unguja + Pemba
const OVERPASS_QUERY = `[out:json][timeout:90][bbox:-6.5,39.0,-4.7,40.0];(relation["admin_level"="4"]["name"];relation["admin_level"="6"]["name"];relation["admin_level"="7"]["name"];);out tags;`;

// Official Tanzanian region codes for Zanzibar (from NBS Tanzania)
const ZANZIBAR_REGION_CODES = {
  'UNGUJA KASKAZINI': '54',   // Zanzibar North (Unguja North)
  'UNGUJA KUSINI':    '55',   // Zanzibar South (Unguja South)
  'MJINI MAGHARIBI':  '51',   // Zanzibar West / Urban (Stone Town + surroundings)
  'PEMBA KASKAZINI':  '52',   // Pemba North
  'PEMBA KUSINI':     '53',   // Pemba South
};

// Canonical display names (OSM name tags can vary slightly)
const REGION_NAME_NORMALISE = {
  'zanzibar north':           'UNGUJA KASKAZINI',
  'unguja kaskazini':         'UNGUJA KASKAZINI',
  'north unguja':             'UNGUJA KASKAZINI',
  'kaskazini unguja':         'UNGUJA KASKAZINI',
  'zanzibar south':           'UNGUJA KUSINI',
  'unguja kusini':            'UNGUJA KUSINI',
  'south unguja':             'UNGUJA KUSINI',
  'kusini unguja':            'UNGUJA KUSINI',
  'zanzibar west':            'MJINI MAGHARIBI',
  'mjini magharibi':          'MJINI MAGHARIBI',
  'unguja mjini magharibi':   'MJINI MAGHARIBI',
  'urban west':               'MJINI MAGHARIBI',
  'west zanzibar':            'MJINI MAGHARIBI',
  'pemba north':              'PEMBA KASKAZINI',
  'pemba kaskazini':          'PEMBA KASKAZINI',
  'kaskazini pemba':          'PEMBA KASKAZINI',
  'north pemba':              'PEMBA KASKAZINI',
  'pemba south':              'PEMBA KUSINI',
  'pemba kusini':             'PEMBA KUSINI',
  'kusini pemba':             'PEMBA KUSINI',
  'south pemba':              'PEMBA KUSINI',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function httpsGetRaw(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'nolsaf-zanzibar-script/1.0' } }, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpsGetRaw(res.headers.location).then(resolve, reject);
      }
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        if (res.statusCode !== 200) reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
        else resolve(data);
      });
    }).on('error', reject);
  });
}

async function overpassFetch(query) {
  const encoded = encodeURIComponent(query);
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`  Trying ${endpoint}…`);
      const data = await httpsGetRaw(`${endpoint}?data=${encoded}`);
      return data;
    } catch (err) {
      console.warn(`  Failed (${err.message.slice(0, 60)}) — trying next mirror`);
    }
  }
  throw new Error('All Overpass mirrors failed');
}

function normaliseRegionName(raw) {
  const key = raw.toLowerCase().trim().replace(/\s+/g, ' ');
  return REGION_NAME_NORMALISE[key] || raw.toUpperCase().trim();
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Querying Overpass API for Zanzibar administrative boundaries…');
  console.log('(This may take up to 30 seconds)');

  let raw;
  try {
    raw = await overpassFetch(OVERPASS_QUERY);
  } catch (err) {
    console.error('Overpass query failed:', err.message);
    process.exit(1);
  }

  let osm;
  try {
    osm = JSON.parse(raw);
  } catch {
    console.error('Failed to parse Overpass JSON response');
    console.error(raw.slice(0, 500));
    process.exit(1);
  }

  const elements = osm.elements || [];
  console.log(`Received ${elements.length} OSM elements`);

  // Separate by admin_level
  const regions   = elements.filter(e => e.tags?.admin_level === '4');
  const districts = elements.filter(e => e.tags?.admin_level === '6');
  const shehias   = elements.filter(e => e.tags?.admin_level === '7');

  console.log(`  Regions:   ${regions.length}`);
  console.log(`  Districts: ${districts.length}`);
  console.log(`  Shehias:   ${shehias.length}`);

  // ---------------------------------------------------------------------------
  // Build hierarchy:  region → district → shehia
  // OSM doesn't encode parent/child directly in the tags-only response,
  // so we use name-based matching (district names reference parent region
  // in the "is_in" tag when present, otherwise we match by known mappings).
  //
  // Known district → region mapping for Zanzibar:
  //   Unguja (main island): Kaskazini 'A', Kaskazini 'B', Mjini, Magharibi 'A', Magharibi 'B', Kati, Kusini
  //   Pemba island:         Micheweni, Wete, Chakechake, Mkoani
  // ---------------------------------------------------------------------------
  const DISTRICT_TO_REGION = {
    // Unguja North
    "KASKAZINI 'A'":  'UNGUJA KASKAZINI',
    "KASKAZINI 'B'":  'UNGUJA KASKAZINI',
    'KASKAZINI A':    'UNGUJA KASKAZINI',
    'KASKAZINI B':    'UNGUJA KASKAZINI',
    // Urban West (Mjini Magharibi)
    'MJINI':          'MJINI MAGHARIBI',
    "MAGHARIBI 'A'":  'MJINI MAGHARIBI',
    "MAGHARIBI 'B'":  'MJINI MAGHARIBI',
    'MAGHARIBI A':    'MJINI MAGHARIBI',
    'MAGHARIBI B':    'MJINI MAGHARIBI',
    // Unguja South
    'KATI':           'UNGUJA KUSINI',
    'KUSINI':         'UNGUJA KUSINI',
    // Pemba North
    'MICHEWENI':      'PEMBA KASKAZINI',
    'WETE':           'PEMBA KASKAZINI',
    // Pemba South
    'CHAKECHAKE':     'PEMBA KUSINI',
    'CHAKE CHAKE':    'PEMBA KUSINI',
    'MKOANI':         'PEMBA KUSINI',
  };

  // Initialise region map with all 5 canonical regions
  const regionMap = new Map();
  for (const [name, code] of Object.entries(ZANZIBAR_REGION_CODES)) {
    regionMap.set(name, { name, code, districts: new Map() });
  }

  // Populate from OSM region elements — only accept the 5 canonical Zanzibar regions.
  // Ignore anything else (mainland Tanzania edges, Kenya) caught by the bounding box.
  for (const el of regions) {
    const rawName = el.tags?.name || '';
    const normName = normaliseRegionName(rawName);
    // Only accept names that map to one of our canonical 5 Zanzibar regions
    if (normName && ZANZIBAR_REGION_CODES[normName] && !regionMap.get(normName)?.districts?.size) {
      // Region already initialised — just confirm it exists, don't overwrite
    }
  }

  // Place districts into their regions
  for (const el of districts) {
    const rawName = (el.tags?.name || '').toUpperCase().trim();
    if (!rawName) continue;

    // Try "is_in:region" tag first, then our lookup table
    const isInRaw = (el.tags?.['is_in:region'] || el.tags?.['is_in'] || '').toUpperCase();
    let regionName = normaliseRegionName(isInRaw) || DISTRICT_TO_REGION[rawName];

    if (!regionName) {
      // Last resort: check partial match in lookup
      const matchKey = Object.keys(DISTRICT_TO_REGION).find(k => rawName.includes(k) || k.includes(rawName));
      if (matchKey) regionName = DISTRICT_TO_REGION[matchKey];
    }

    if (!regionName || !regionMap.has(regionName)) {
      console.warn(`  WARN: Could not map district "${rawName}" to a region — skipping`);
      continue;
    }

    const region = regionMap.get(regionName);
    if (!region.districts.has(rawName)) {
      region.districts.set(rawName, { name: rawName, code: el.tags?.ref || '', wards: new Map() });
    }
  }

  // Place shehias into their districts
  for (const el of shehias) {
    const rawName = (el.tags?.name || '').toUpperCase().trim();
    if (!rawName) continue;

    const isInDistrict = (el.tags?.['is_in:district'] || '').toUpperCase().trim();

    for (const [, region] of regionMap) {
      for (const [distName, district] of region.districts) {
        if (
          isInDistrict === distName ||
          isInDistrict.includes(distName) ||
          distName.includes(isInDistrict)
        ) {
          if (!district.wards.has(rawName)) {
            district.wards.set(rawName, {
              name: rawName,
              code: el.tags?.ref || '',
              postcode: el.tags?.postal_code || el.tags?.ref || '',
              streets: [],
            });
          }
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // If OSM returned very few districts/shehias (API may be sparse),
  // fall back to the known authoritative district list so the regions are
  // at least present and correct in the file — shehias can be filled in later.
  // ---------------------------------------------------------------------------
  const FALLBACK_DISTRICTS = {
    'UNGUJA KASKAZINI': ["KASKAZINI 'A'", "KASKAZINI 'B'"],
    'MJINI MAGHARIBI':  ['MJINI', "MAGHARIBI 'A'", "MAGHARIBI 'B'"],
    'UNGUJA KUSINI':    ['KATI', 'KUSINI'],
    'PEMBA KASKAZINI':  ['MICHEWENI', 'WETE'],
    'PEMBA KUSINI':     ['CHAKECHAKE', 'MKOANI'],
  };

  for (const [regionName, fallbackDists] of Object.entries(FALLBACK_DISTRICTS)) {
    const region = regionMap.get(regionName);
    if (!region) continue;
    for (const dName of fallbackDists) {
      if (!region.districts.has(dName)) {
        console.log(`  Adding fallback district "${dName}" to ${regionName}`);
        region.districts.set(dName, { name: dName, code: '', wards: new Map() });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Serialise to RegionFullData structure
  // ---------------------------------------------------------------------------
  const zanzibarFullData = [];
  for (const [, region] of regionMap) {
    const districts = Array.from(region.districts.values()).map(d => ({
      name: d.name,
      code: d.code || null,
      wards: Array.from(d.wards.values()).map(w => ({
        name: w.name,
        code: w.code || null,
        postcode: w.postcode || w.code || null,
        streets: w.streets,
      })),
    }));

    zanzibarFullData.push({
      name: region.name,
      code: region.code,
      districts,
    });
  }

  // Sort regions by name
  zanzibarFullData.sort((a, b) => a.name.localeCompare(b.name));

  console.log('\nBuilt Zanzibar regions:');
  for (const r of zanzibarFullData) {
    const distCount = r.districts.length;
    const shehiaCount = r.districts.reduce((s, d) => s + d.wards.length, 0);
    console.log(`  ${r.name} (code: ${r.code}) — ${distCount} districts, ${shehiaCount} shehias`);
  }

  // ---------------------------------------------------------------------------
  // 1. Patch tzRegionsFull.ts — append the 5 Zanzibar entries
  // ---------------------------------------------------------------------------
  const fullDataPath = path.join(__dirname, '../apps/web/lib/tzRegionsFull.ts');
  let fullDataContent = fs.readFileSync(fullDataPath, 'utf8');

  // Check none of the regions are already present
  const alreadyPresent = zanzibarFullData.filter(r => fullDataContent.includes(`"name": "${r.name}"`));
  if (alreadyPresent.length > 0) {
    console.warn(`\nWARN: Some Zanzibar regions already exist in tzRegionsFull.ts: ${alreadyPresent.map(r => r.name).join(', ')}`);
    console.warn('Remove them manually before re-running this script to avoid duplicates.');
    process.exit(1);
  }

  // Build the TS snippet to inject (just the 5 region objects)
  const newEntries = zanzibarFullData.map(r => JSON.stringify(r, null, 2)
    .replace(/"([^"]+)":/g, '  "$1":')  // keep double-quoted keys (valid TS)
  ).join(',\n');

  // Insert before the closing ] of the REGIONS_FULL_DATA array
  fullDataContent = fullDataContent.replace(
    /\];\s*$/,
    `,\n${newEntries}\n];\n`
  );

  fs.writeFileSync(fullDataPath, fullDataContent, 'utf8');
  console.log(`\n✓ Appended ${zanzibarFullData.length} Zanzibar regions to tzRegionsFull.ts`);

  // ---------------------------------------------------------------------------
  // 2. Patch tzRegions.ts — add to RD and REGION_CODES
  // ---------------------------------------------------------------------------
  const regionsPath = path.join(__dirname, '../apps/web/lib/tzRegions.ts');
  let regionsContent = fs.readFileSync(regionsPath, 'utf8');

  for (const r of zanzibarFullData) {
    if (regionsContent.includes(`"${r.name}"`)) {
      console.warn(`WARN: "${r.name}" already in tzRegions.ts — skipping`);
      continue;
    }

    const districtNames = r.districts.map(d => `"${d.name}"`).join(', ');

    // Inject into RD object — before the closing };
    regionsContent = regionsContent.replace(
      /^(const RD: Record<string, string\[\]> = \{[\s\S]*?)(\};\s*$)/m,
      `$1  "${r.name}": [${districtNames}],\n$2`
    );

    // Inject into REGION_CODES — before the closing };
    regionsContent = regionsContent.replace(
      /^(const REGION_CODES: Record<string, string> = \{[\s\S]*?)(\};\s*$)/m,
      `$1  "${r.name}": "${r.code}",\n$2`
    );
  }

  fs.writeFileSync(regionsPath, regionsContent, 'utf8');
  console.log(`✓ Patched tzRegions.ts with ${zanzibarFullData.length} Zanzibar regions`);

  console.log('\nDone. Run `tsc --noEmit` in apps/web to verify no type errors.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
