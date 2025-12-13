/**
 * Script to download and process Tanzania locations data from HackEAC/tanzania-locations-db
 * Updates the tzRegions.ts library with complete data including regions, districts, wards, streets, and postcodes
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const REGIONS = [
  'arusha', 'dar-es-salaam', 'dodoma', 'geita', 'iringa', 'kagera',
  'katavi', 'kigoma', 'kilimanjaro', 'lindi', 'manyara', 'mara',
  'mbeya', 'morogoro', 'mtwara', 'mwanza', 'njombe', 'pwani',
  'rukwa', 'ruvuma', 'shinyanga', 'simiyu', 'singida', 'songwe',
  'tabora', 'tanga'
];

const BASE_URL = 'https://raw.githubusercontent.com/HackEAC/tanzania-locations-db/main/location-files';

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => resolve(data));
      response.on('error', reject);
    }).on('error', reject);
  });
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  // The CSV has duplicate column names: REGION,POSTCODE,DISTRICT,POSTCODE,WARD,POSTCODE,STREET,PLACES
  // We need to read by position: [0]=REGION, [1]=REGION_POSTCODE, [2]=DISTRICT, [3]=DISTRICT_POSTCODE, 
  // [4]=WARD, [5]=WARD_POSTCODE, [6]=STREET, [7]=PLACES
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Handle CSV with quoted fields that may contain commas
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add last value
    
    if (values.length >= 6) { // Need at least 6 columns (up to WARD_POSTCODE)
      // Read by position since column names are duplicated
      const row = {
        REGION: values[0] || '',
        REGIONCODE: values[1] || '', // Region postcode
        DISTRICT: values[2] || '',
        DISTRICTCODE: values[3] || '', // District postcode
        WARD: values[4] || '',
        WARDCODE: values[5] || '', // Ward postcode (this is what we need!)
        STREET: values[6] || '',
        PLACES: values[7] || ''
      };
      data.push(row);
    }
  }
  
  return data;
}

async function processAllRegions() {
  const regionMap = new Map(); // region name -> { code, districts: Map }
  const allData = [];
  
  console.log('Downloading and processing region data...');
  
  for (const regionSlug of REGIONS) {
    try {
      const url = `${BASE_URL}/${regionSlug}.csv`;
      console.log(`Downloading ${regionSlug}...`);
      const csvData = await downloadFile(url);
      const rows = parseCSV(csvData);
      
      for (const row of rows) {
        const regionName = row.REGION || '';
        const regionCode = row.REGIONCODE || '';
        const districtName = row.DISTRICT || '';
        const districtCode = row.DISTRICTCODE || '';
        const wardName = row.WARD || '';
        const wardCode = row.WARDCODE || '';
        const street = row.STREET || '';
        const places = row.PLACES || '';
        
        if (!regionName || !districtName) continue;
        
        // Normalize region name (handle variations)
        const normalizedRegion = regionName.toUpperCase()
          .replace(/-/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (!regionMap.has(normalizedRegion)) {
          regionMap.set(normalizedRegion, {
            code: regionCode,
            name: regionName,
            districts: new Map()
          });
        }
        
        const region = regionMap.get(normalizedRegion);
        
        if (!region.districts.has(districtName)) {
          region.districts.set(districtName, {
            code: districtCode,
            name: districtName,
            wards: new Map()
          });
        }
        
        const district = region.districts.get(districtName);
        
        if (wardName && !district.wards.has(wardName)) {
          // Ward code can serve as postcode (Tanzania uses administrative codes as postal codes)
          district.wards.set(wardName, {
            code: wardCode,
            name: wardName,
            postcode: wardCode || undefined, // Ward code is the postal code
            streets: new Set()
          });
        }
        
        if (wardName && street) {
          const ward = district.wards.get(wardName);
          if (ward) {
            ward.streets.add(street);
          }
        }
        
        allData.push({
          region: regionName,
          regionCode,
          district: districtName,
          districtCode,
          ward: wardName,
          wardCode,
          street,
          places
        });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error processing ${regionSlug}:`, error.message);
    }
  }
  
  // Convert to the format needed for tzRegions.ts
  const regionsArray = [];
  const regionsFullData = []; // Full hierarchical data with wards and streets
  
  for (const [regionName, regionData] of regionMap.entries()) {
    const districts = Array.from(regionData.districts.values()).map(d => ({
      name: d.name,
      code: d.code,
      wards: Array.from(d.wards.values()).map(w => {
        // Ensure postcode field always exists - use code if postcode is undefined/empty
        const postcode = w.postcode || w.code || null;
        return {
          name: w.name,
          code: w.code || null, // Use null instead of empty string for consistency
          postcode: postcode, // Always include postcode field, even if null
          streets: Array.from(w.streets).filter(s => s.trim())
        };
      })
    }));
    
    // For backward compatibility - simple districts array
    regionsArray.push({
      name: regionData.name,
      code: regionData.code,
      districts: districts.map(d => d.name)
    });
    
    // Full hierarchical data
    regionsFullData.push({
      name: regionData.name,
      code: regionData.code,
      districts: districts
    });
  }
  
  // Sort regions by name
  regionsArray.sort((a, b) => a.name.localeCompare(b.name));
  regionsFullData.sort((a, b) => a.name.localeCompare(b.name));
  
  return { regionsArray, regionsFullData, fullData: allData };
}

async function main() {
  try {
    const { regionsArray, regionsFullData, fullData } = await processAllRegions();
    
    // Generate the TypeScript file
    const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    
    // Create region code map
    const regionCodeMap = {};
    regionsArray.forEach(r => {
      if (r.code) {
        regionCodeMap[r.name] = r.code;
      }
    });
    
    // Build districts list for backward compatibility
    const regionsCode = regionsArray.map(r => {
      const districtsList = r.districts.map(d => `"${d.replace(/"/g, '\\"')}"`).join(',');
      return `  "${r.name}": [${districtsList}]`;
    }).join(',\n');
    
    const tsContent = `export type Region = { id: string; name: string; districts: string[]; code?: string };
export type District = { name: string; code?: string; wards?: Ward[] };
export type Ward = { name: string; code?: string; postcode?: string; streets?: string[] };

const RD: Record<string, string[]> = {
${regionsCode}
};

const REGION_CODES: Record<string, string> = ${JSON.stringify(regionCodeMap, null, 2)};

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const REGIONS = Object.entries(RD).map(([name, districts]) => ({
  id: slug(name),
  name,
  districts,
  code: REGION_CODES[name] || undefined,
})) as Region[];

export const REGION_BY_ID: Record<string, Region> =
  Object.fromEntries(REGIONS.map(r => [r.id, r])) as Record<string, Region>;

// Full data structure with wards and streets (for future use)
// This contains complete hierarchical data: regions -> districts -> wards -> streets
export const REGIONS_FULL_DATA = ${JSON.stringify(regionsFullData, null, 2)} as any;
`;
    
    // Write to file
    const outputPath = path.join(__dirname, '../apps/web/lib/tzRegions.ts');
    fs.writeFileSync(outputPath, tsContent, 'utf8');
    
    console.log(`\n✅ Successfully updated ${outputPath}`);
    console.log(`   - ${regionsArray.length} regions`);
    console.log(`   - ${fullData.length} total location entries`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
