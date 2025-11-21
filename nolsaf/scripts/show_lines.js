const fs = require('fs');
const p = 'apps/web/components/DriverDashboard.tsx';
const s = fs.readFileSync(p,'utf8').split('\n');
const start = 640 - 1;
const end = 680 - 1;
for (let i = start; i <= end && i < s.length; i++) {
  console.log((i + 1).toString().padStart(4) + ': ' + s[i]);
}
