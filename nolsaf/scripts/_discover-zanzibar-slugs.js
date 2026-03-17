const https = require('https');

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400) return get(r.headers.location).then(res).catch(rej);
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
    }).on('error', rej);
    setTimeout(() => rej(new Error('timeout')), 15000);
  });
}

async function main() {
  // 1. List all region slugs
  const regionPage = await get('https://www.tanzaniapostcode.com/location/');
  const regionLinks = [...new Set([...regionPage.matchAll(/href="(\/location\/[^\/\"]+\/)"/g)].map(m => m[1]).filter(l => l !== '/location/'))];
  console.log('=== All region slugs ===');
  regionLinks.forEach(l => console.log(l));

  // 2. Look for Zanzibar/Pemba/Unguja
  const zanzibar = regionLinks.filter(l => /pemba|unguja|zanzibar|mjini|kaskazini|kusini/i.test(l));
  console.log('\n=== Zanzibar-related ===');
  zanzibar.forEach(l => console.log(l));

  // 3. Probe a ward page from mjini to understand postcode location
  const wardPage = await get('https://www.tanzaniapostcode.com/location/mjini-magharibi/mjini/kikwajuni/');
  // Find the postcode in the page
  const codeMatches = [...wardPage.matchAll(/(\d{5})/g)].map(m => m[1]);
  const tableSection = wardPage.substring(wardPage.indexOf('postcode') !== -1 ? wardPage.toLowerCase().indexOf('postcode') - 200 : 0);
  console.log('\n=== Ward page postcodes found ===', codeMatches.slice(0, 20));
  console.log('\n=== Table area ===');
  const tblIdx = wardPage.toLowerCase().indexOf('<table');
  if (tblIdx !== -1) console.log(wardPage.substring(tblIdx, tblIdx + 1000));
}

main().catch(console.error);
