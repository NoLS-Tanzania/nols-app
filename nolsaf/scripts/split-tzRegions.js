/**
 * Script to extract REGIONS_FULL_DATA from tzRegions.ts and move it to tzRegionsFull.ts
 */

const fs = require('fs');
const path = require('path');

const tzRegionsPath = path.join(__dirname, '../apps/web/lib/tzRegions.ts');

try {
  const content = fs.readFileSync(tzRegionsPath, 'utf8');
  
  // Find the index where REGIONS_FULL_DATA starts
  const startIndex = content.indexOf('export const REGIONS_FULL_DATA = [');
  if (startIndex === -1) {
    console.log('REGIONS_FULL_DATA not found');
    process.exit(1);
  }
  
  // Find where it ends - look for '] as any;' at the very end
  // We need to find the matching closing bracket
  let bracketCount = 0;
  let foundFirstBracket = false;
  let endIndex = startIndex;
  
  for (let i = startIndex + 'export const REGIONS_FULL_DATA = '.length; i < content.length; i++) {
    if (content[i] === '[') {
      bracketCount++;
      foundFirstBracket = true;
    } else if (content[i] === ']') {
      bracketCount--;
      if (foundFirstBracket && bracketCount === 0) {
        // Found the matching closing bracket
        // Now find 'as any;' after it
        const rest = content.substring(i + 1).trim();
        if (rest.startsWith('as any;')) {
          endIndex = i + 1 + 'as any;'.length;
          break;
        }
      }
    }
  }
  
  if (endIndex === startIndex) {
    console.log('Could not find end of REGIONS_FULL_DATA');
    process.exit(1);
  }
  
  // Extract basic content (everything before REGIONS_FULL_DATA)
  const basicContent = content.substring(0, startIndex).trim();
  
  // Extract full data
  const fullDataContent = content.substring(startIndex + 'export const REGIONS_FULL_DATA = '.length, endIndex - 'as any;'.length).trim();
  
  // Write basic file
  const newBasicContent = basicContent + '\n\n// Note: REGIONS_FULL_DATA (with wards and streets) is NOT exported from this file\n// To avoid conflicts, import REGIONS_FULL_DATA from the separate file:\n// import { REGIONS_FULL_DATA } from \'@/lib/tzRegionsFull\'\n';
  fs.writeFileSync(tzRegionsPath, newBasicContent, 'utf8');
  
  // Write full data file
  const fullFilePath = path.join(__dirname, '../apps/web/lib/tzRegionsFull.ts');
  const fullFileContent = `/**
 * Full Tanzania regions data with districts, wards, and streets
 * 
 * This data is generated from GitHub:
 * https://raw.githubusercontent.com/HackEAC/tanzania-locations-db/main/location-files
 * 
 * Generated using: nolsaf/scripts/update-tanzania-locations.js
 */

import type { RegionFullData } from './tzRegions';

export const REGIONS_FULL_DATA: RegionFullData[] = [
${fullDataContent}
] as any;
`;
  
  fs.writeFileSync(fullFilePath, fullFileContent, 'utf8');
  
  console.log('✅ Successfully split tzRegions.ts');
  console.log(`   - Basic file: ${newBasicContent.split('\n').length} lines`);
  console.log(`   - Full data file: ${fullFileContent.split('\n').length} lines`);
  
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
