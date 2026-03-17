/**
 * patch-zanzibar-data.js
 *
 * Applies real TCRA postcode data (from tzPostcodeList.pdf) to:
 *   1. apps/web/lib/tzRegions.ts  — fixes codes 72-75 and district names
 *   2. apps/web/lib/tzRegionsFull.ts — replaces Zanzibar block with real wards
 */

const fs = require('fs');
const path = require('path');

// ── Real Zanzibar data from official TCRA Tanzania Postcode List (2012) ────────

const ZANZIBAR_REGIONS = [
  {
    name: "MJINI MAGHARIBI",
    code: "71",
    districts: [
      {
        name: "MJINI",
        code: "711",
        wards: [
          { name: "MKUNAZINI",     code: "71101", postcode: "71101", streets: [] },
          { name: "KIKWAJUNI",     code: "71102", postcode: "71102", streets: [] },
          { name: "MCHANGANI",     code: "71103", postcode: "71103", streets: [] },
          { name: "RAHALEO",       code: "71104", postcode: "71104", streets: [] },
          { name: "MIEMBENI",      code: "71105", postcode: "71105", streets: [] },
          { name: "MAKADARA",      code: "71106", postcode: "71106", streets: [] },
          { name: "KWAHANI",       code: "71107", postcode: "71107", streets: [] },
          { name: "KWAALINATU",    code: "71108", postcode: "71108", streets: [] },
          { name: "JANG'OMBE",     code: "71109", postcode: "71109", streets: [] },
          { name: "MUUNGANO",      code: "71110", postcode: "71110", streets: [] },
          { name: "MWEMBE MAKUMBI",code: "71111", postcode: "71111", streets: [] },
          { name: "CHUMBUNI",      code: "71112", postcode: "71112", streets: [] },
          { name: "KWA MTIPURA",   code: "71113", postcode: "71113", streets: [] },
          { name: "KILIMA HEWA",   code: "71114", postcode: "71114", streets: [] },
          { name: "AMANI",         code: "71115", postcode: "71115", streets: [] },
          { name: "MAGOMENI",      code: "71116", postcode: "71116", streets: [] },
          { name: "NYERERE",       code: "71117", postcode: "71117", streets: [] },
          { name: "MPENDAE",       code: "71118", postcode: "71118", streets: [] },
          { name: "MEYA",          code: "71119", postcode: "71119", streets: [] },
        ]
      },
      {
        name: "MAGHARIBI",
        code: "712",
        wards: [
          { name: "MWANAKWEREKWE", code: "71201", postcode: "71201", streets: [] },
          { name: "TOMONDO",       code: "71202", postcode: "71202", streets: [] },
          { name: "MAGOGONI",      code: "71203", postcode: "71203", streets: [] },
          { name: "WELEZO",        code: "71204", postcode: "71204", streets: [] },
          { name: "KIJITO UPELE",  code: "71205", postcode: "71205", streets: [] },
          { name: "MTONI",         code: "71206", postcode: "71206", streets: [] },
          { name: "BUBUBU",        code: "71207", postcode: "71207", streets: [] },
          { name: "MBUZINI",       code: "71208", postcode: "71208", streets: [] },
          { name: "MFENESINI",     code: "71209", postcode: "71209", streets: [] },
          { name: "KIZIMBANI",     code: "71210", postcode: "71210", streets: [] },
          { name: "MWANYANYA",     code: "71211", postcode: "71211", streets: [] },
          { name: "MWERA",         code: "71212", postcode: "71212", streets: [] },
          { name: "FUONI",         code: "71213", postcode: "71213", streets: [] },
          { name: "KIEMBESAMAKI",  code: "71214", postcode: "71214", streets: [] },
          { name: "DIMANI",        code: "71215", postcode: "71215", streets: [] },
        ]
      }
    ]
  },
  {
    name: "UNGUJA KUSINI",
    code: "72",
    districts: [
      {
        name: "KUSINI",
        code: "721",
        wards: [
          { name: "MTENDE",           code: "72101", postcode: "72101", streets: [] },
          { name: "MZURI",            code: "72102", postcode: "72102", streets: [] },
          { name: "MTEGANI",          code: "72103", postcode: "72103", streets: [] },
          { name: "KIZIMKAZI",        code: "72104", postcode: "72104", streets: [] },
          { name: "KAJENGWA",         code: "72105", postcode: "72105", streets: [] },
          { name: "MUYUNI",           code: "72106", postcode: "72106", streets: [] },
          { name: "JAMBIANI KIKADINI",code: "72107", postcode: "72107", streets: [] },
          { name: "JAMBIANI KIBIGIJA",code: "72108", postcode: "72108", streets: [] },
          { name: "MUUNGONI",         code: "72109", postcode: "72109", streets: [] },
          { name: "PAJE",             code: "72110", postcode: "72110", streets: [] },
          { name: "BWEJUU",           code: "72111", postcode: "72111", streets: [] },
        ]
      },
      {
        name: "KATI",
        code: "722",
        wards: [
          { name: "DUNGA",     code: "72201", postcode: "72201", streets: [] },
          { name: "KOANI",     code: "72202", postcode: "72202", streets: [] },
          { name: "KIBOJE",    code: "72203", postcode: "72203", streets: [] },
          { name: "UZINI",     code: "72204", postcode: "72204", streets: [] },
          { name: "BAMBI",     code: "72205", postcode: "72205", streets: [] },
          { name: "NDIJANI",   code: "72206", postcode: "72206", streets: [] },
          { name: "CHWAKA",    code: "72207", postcode: "72207", streets: [] },
          { name: "JUMBI",     code: "72208", postcode: "72208", streets: [] },
          { name: "UNGUJA UKUU",code:"72209", postcode: "72209", streets: [] },
          { name: "UZI",       code: "72210", postcode: "72210", streets: [] },
          { name: "MICHAMVI",  code: "72211", postcode: "72211", streets: [] },
        ]
      }
    ]
  },
  {
    name: "UNGUJA KASKAZINI",
    code: "73",
    districts: [
      {
        name: "KASKAZINI A",
        code: "731",
        wards: [
          { name: "GAMBA",          code: "73101", postcode: "73101", streets: [] },
          { name: "MKWAJUNI",       code: "73102", postcode: "73102", streets: [] },
          { name: "KIVUNGE",        code: "73103", postcode: "73103", streets: [] },
          { name: "MKOKOTONI",      code: "73104", postcode: "73104", streets: [] },
          { name: "MUWANGE",        code: "73105", postcode: "73105", streets: [] },
          { name: "KIDOTI",         code: "73106", postcode: "73106", streets: [] },
          { name: "NUNGWI",         code: "73107", postcode: "73107", streets: [] },
          { name: "MATEMWE",        code: "73108", postcode: "73108", streets: [] },
          { name: "CHAANI",         code: "73109", postcode: "73109", streets: [] },
          { name: "KINYASINI",      code: "73110", postcode: "73110", streets: [] },
          { name: "PWANI MCHANGANI",code: "73111", postcode: "73111", streets: [] },
          { name: "TUMBATU",        code: "73112", postcode: "73112", streets: [] },
        ]
      },
      {
        name: "KASKAZINI B",
        code: "732",
        wards: [
          { name: "MAHONDA",    code: "73201", postcode: "73201", streets: [] },
          { name: "MANGAPWANI", code: "73202", postcode: "73202", streets: [] },
          { name: "FUJONI",     code: "73203", postcode: "73203", streets: [] },
          { name: "MTAMBILE",   code: "73204", postcode: "73204", streets: [] },
          { name: "MBIJI",      code: "73205", postcode: "73205", streets: [] },
          { name: "MUANDA",     code: "73206", postcode: "73206", streets: [] },
          { name: "KITOPE",     code: "73207", postcode: "73207", streets: [] },
          { name: "MGAMBO",     code: "73208", postcode: "73208", streets: [] },
          { name: "UPENJA",     code: "73209", postcode: "73209", streets: [] },
          { name: "MAKOBA",     code: "73210", postcode: "73210", streets: [] },
        ]
      }
    ]
  },
  {
    name: "PEMBA KUSINI",
    code: "74",
    districts: [
      {
        name: "MKOANI",
        code: "741",
        wards: [
          { name: "NG'OMBENI",   code: "74101", postcode: "74101", streets: [] },
          { name: "UWELENI",     code: "74102", postcode: "74102", streets: [] },
          { name: "MAKOMBENI",   code: "74103", postcode: "74103", streets: [] },
          { name: "MBUGUANI",    code: "74104", postcode: "74104", streets: [] },
          { name: "MAKOONGWE",   code: "74105", postcode: "74105", streets: [] },
          { name: "MBUYUNI",     code: "74106", postcode: "74106", streets: [] },
          { name: "CHANGAWENI",  code: "74107", postcode: "74107", streets: [] },
          { name: "WAMBAA",      code: "74108", postcode: "74108", streets: [] },
          { name: "MKANYAGENI",  code: "74109", postcode: "74109", streets: [] },
          { name: "CHOKOCHO",    code: "74110", postcode: "74110", streets: [] },
          { name: "KISIWA PANZA",code: "74111", postcode: "74111", streets: [] },
          { name: "MTAMBILE",    code: "74112", postcode: "74112", streets: [] },
          { name: "MUAMBE",      code: "74113", postcode: "74113", streets: [] },
          { name: "KENGEJA",     code: "74114", postcode: "74114", streets: [] },
          { name: "KANGANI",     code: "74115", postcode: "74115", streets: [] },
          { name: "KIWANI",      code: "74116", postcode: "74116", streets: [] },
          { name: "CHAMBANI",    code: "74117", postcode: "74117", streets: [] },
          { name: "MIZINGANI",   code: "74118", postcode: "74118", streets: [] },
        ]
      },
      {
        name: "CHAKECHAKE",
        code: "742",
        wards: [
          { name: "CHANJAANI",    code: "74201", postcode: "74201", streets: [] },
          { name: "MSINGINI",     code: "74202", postcode: "74202", streets: [] },
          { name: "CHACHANI",     code: "74203", postcode: "74203", streets: [] },
          { name: "TIBIRINZI",    code: "74204", postcode: "74204", streets: [] },
          { name: "KICHUNGWANI",  code: "74205", postcode: "74205", streets: [] },
          { name: "WARA",         code: "74206", postcode: "74206", streets: [] },
          { name: "MKOROSHONI",   code: "74207", postcode: "74207", streets: [] },
          { name: "KILINDI",      code: "74208", postcode: "74208", streets: [] },
          { name: "WAWI",         code: "74209", postcode: "74209", streets: [] },
          { name: "ZIWANI",       code: "74210", postcode: "74210", streets: [] },
          { name: "NG'AMBWA",     code: "74211", postcode: "74211", streets: [] },
          { name: "VITONGOJI",    code: "74212", postcode: "74212", streets: [] },
          { name: "KWALE",        code: "74213", postcode: "74213", streets: [] },
          { name: "SHUNGI",       code: "74214", postcode: "74214", streets: [] },
          { name: "NDAGONI",      code: "74215", postcode: "74215", streets: [] },
          { name: "PUJINI",       code: "74216", postcode: "74216", streets: [] },
          { name: "CHONGA",       code: "74217", postcode: "74217", streets: [] },
        ]
      }
    ]
  },
  {
    name: "PEMBA KASKAZINI",
    code: "75",
    districts: [
      {
        name: "WETE",
        code: "751",
        wards: [
          { name: "KIPANGANI",     code: "75101", postcode: "75101", streets: [] },
          { name: "BOPWE",         code: "75102", postcode: "75102", streets: [] },
          { name: "UTAANI",        code: "75103", postcode: "75103", streets: [] },
          { name: "JADIDA",        code: "75104", postcode: "75104", streets: [] },
          { name: "KIZIMBANI",     code: "75105", postcode: "75105", streets: [] },
          { name: "LIMBANI",       code: "75106", postcode: "75106", streets: [] },
          { name: "SELEMU",        code: "75107", postcode: "75107", streets: [] },
          { name: "PANDANI",       code: "75108", postcode: "75108", streets: [] },
          { name: "MTAMBWE",       code: "75109", postcode: "75109", streets: [] },
          { name: "KISIWANI",      code: "75110", postcode: "75110", streets: [] },
          { name: "MCHANGA MDOGO", code: "75111", postcode: "75111", streets: [] },
          { name: "OLE",           code: "75112", postcode: "75112", streets: [] },
          { name: "KANGAGANI",     code: "75113", postcode: "75113", streets: [] },
          { name: "KOJANI",        code: "75114", postcode: "75114", streets: [] },
          { name: "SHENGEJUU",     code: "75115", postcode: "75115", streets: [] },
          { name: "GANDO",         code: "75116", postcode: "75116", streets: [] },
          { name: "FUNDO",         code: "75117", postcode: "75117", streets: [] },
        ]
      },
      {
        name: "MICHEWENI",
        code: "752",
        wards: [
          { name: "MICHEWENI",        code: "75201", postcode: "75201", streets: [] },
          { name: "TUMBE",            code: "75202", postcode: "75202", streets: [] },
          { name: "KINOWE",           code: "75203", postcode: "75203", streets: [] },
          { name: "WINGWI MAPOFU",    code: "75204", postcode: "75204", streets: [] },
          { name: "KIUYU MAZIWANG'OMBE",code:"75205",postcode: "75205", streets: [] },
          { name: "WINGWI NJUGUNI",   code: "75206", postcode: "75206", streets: [] },
          { name: "SHUMBA VIAMBONI",  code: "75207", postcode: "75207", streets: [] },
          { name: "MGOGONI",          code: "75208", postcode: "75208", streets: [] },
          { name: "KONDE",            code: "75209", postcode: "75209", streets: [] },
          { name: "MSUKA",            code: "75210", postcode: "75210", streets: [] },
        ]
      }
    ]
  }
];

// ── 1. Patch tzRegions.ts ──────────────────────────────────────────────────────
const tzRegionsPath = path.join(__dirname, '../apps/web/lib/tzRegions.ts');
let tzRegions = fs.readFileSync(tzRegionsPath, 'utf8');

// Fix MAGHARIBI districts (was A and B separate, should be one)
tzRegions = tzRegions.replace(
  `"MJINI MAGHARIBI": ["MJINI", "MAGHARIBI 'A'", "MAGHARIBI 'B'"]`,
  `"MJINI MAGHARIBI": ["MJINI", "MAGHARIBI"]`
);
// Fix KASKAZINI district names (remove apostrophes)
tzRegions = tzRegions.replace(
  `"UNGUJA KASKAZINI": ["KASKAZINI 'A'", "KASKAZINI 'B'"]`,
  `"UNGUJA KASKAZINI": ["KASKAZINI A", "KASKAZINI B"]`
);
// Fix region codes
tzRegions = tzRegions.replace(`"PEMBA KASKAZINI": "72"`, `"PEMBA KASKAZINI": "75"`);
tzRegions = tzRegions.replace(`"PEMBA KUSINI": "73"`,    `"PEMBA KUSINI": "74"`);
tzRegions = tzRegions.replace(`"UNGUJA KASKAZINI": "74"`,`"UNGUJA KASKAZINI": "73"`);
tzRegions = tzRegions.replace(`"UNGUJA KUSINI": "75"`,   `"UNGUJA KUSINI": "72"`);

fs.writeFileSync(tzRegionsPath, tzRegions, 'utf8');
console.log('✓ tzRegions.ts updated (codes + district names)');

// ── 2. Patch tzRegionsFull.ts ─────────────────────────────────────────────────
const fullPath = path.join(__dirname, '../apps/web/lib/tzRegionsFull.ts');
let content = fs.readFileSync(fullPath, 'utf8');

const marker = '"name": "MJINI MAGHARIBI"';
const markerIdx = content.lastIndexOf(marker);
if (markerIdx === -1) {
  console.error('✗ Could not find MJINI MAGHARIBI in tzRegionsFull.ts');
  process.exit(1);
}

// Walk back to the opening { of the entry
let blockStart = markerIdx;
while (blockStart > 0 && content[blockStart] !== '{') blockStart--;

// Walk back past any preceding comma+whitespace
let insertPoint = blockStart;
while (insertPoint > 0 && /[\s,]/.test(content[insertPoint - 1])) insertPoint--;

const pre = content.substring(0, insertPoint);
const newEntries = ZANZIBAR_REGIONS.map(r => JSON.stringify(r, null, 2)).join(',\n  ');
const newContent = `${pre},\n  ${newEntries}\n] as any;\n`;

fs.writeFileSync(fullPath, newContent, 'utf8');
console.log('✓ tzRegionsFull.ts updated with real TCRA ward/postcode data');

for (const r of ZANZIBAR_REGIONS) {
  const w = r.districts.reduce((s, d) => s + d.wards.length, 0);
  console.log(`  ${r.name}: ${r.districts.length} districts, ${w} wards (code: ${r.code})`);
}
