import fs from "fs";

const path = "D:/nolsapp2.1/nolsaf/apps/web/app/public/properties/[slug]/page.tsx";
const raw = fs.readFileSync(path, "utf8");

{
  // ── Compact branded facts bar: #02665e bg + white diagonal dashes ──
  const lines = raw.split("\n");
  const start = lines.findIndex(l => l.includes("{/* Facts */}"));
  if (start === -1) { console.error("Facts marker not found"); process.exit(1); }

  // Find end of facts wrapper div
  let depth = 0, end = start;
  for (let i = start; i < lines.length; i++) {
    const t = lines[i].replace(/\r/, "");
    depth += (t.match(/<div/g) || []).length;
    depth -= (t.match(/<\/div>/g) || []).length;
    if (i > start && depth === 0) { end = i; break; }
  }
  console.log(`Replacing lines ${start + 1}–${end + 1}`);

  const ind = "            ";
  const stripe = "repeating-linear-gradient(135deg,rgba(255,255,255,0.13) 0px,rgba(255,255,255,0.13) 1.5px,transparent 1.5px,transparent 10px)";

  const stat = (iconJsx, valExpr, label) => [
    `${ind}  <div className="relative flex items-center gap-2.5 px-4 py-3 flex-1 min-w-0 overflow-hidden">`,
    `${ind}    <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "${stripe}" }} />`,
    `${ind}    ${iconJsx}`,
    `${ind}    <div className="relative">`,
    `${ind}      <div className="text-sm font-bold text-white leading-none tabular-nums">${valExpr}</div>`,
    `${ind}      <div className="text-[11px] text-white/60 mt-0.5">${label}</div>`,
    `${ind}    </div>`,
    `${ind}  </div>`,
  ];

  const newLines = [
    `${ind}{/* Facts */}`,
    `${ind}<div className="flex items-stretch rounded-xl bg-[#02665e] overflow-hidden divide-x divide-white/10 shadow-sm">`,
    ...stat(`<Users className="w-4 h-4 text-white/80 shrink-0 relative" />`, `{property.maxGuests ?? "\u2014"}`, "Guests"),
    ...stat(`<BedDouble className="w-4 h-4 text-white/80 shrink-0 relative" />`, `{property.totalBedrooms ?? "\u2014"}`, "Bedrooms"),
    ...stat(`<Bath className="w-4 h-4 text-white/80 shrink-0 relative" />`, `{property.totalBathrooms ?? "\u2014"}`, "Bathrooms"),
    `${ind}  <div className="relative flex items-center gap-2.5 px-4 py-3 flex-1 min-w-0 overflow-hidden bg-white/10">`,
    `${ind}    <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "${stripe}" }} />`,
    `${ind}    <ShieldCheck className="w-4 h-4 text-white/80 shrink-0 relative" />`,
    `${ind}    <div className="relative">`,
    `${ind}      <div className="text-sm font-bold text-white leading-none">Verified</div>`,
    `${ind}      <div className="text-[11px] text-white/60 mt-0.5">listing</div>`,
    `${ind}    </div>`,
    `${ind}  </div>`,
    `${ind}</div>`,
  ];

  lines.splice(start, end - start + 1, ...newLines);
  fs.writeFileSync(path, lines.join("\n"), "utf8");
  console.log("SUCCESS — branded facts bar applied");
  process.exit(0);
}


// Replace facts block by line numbers (robust, avoids string-match issues)
const lines = raw.split("\n");
const startIdx = lines.findIndex(l => l.includes("{/* Facts */}") && l.includes("Facts"));
if (startIdx === -1) { console.error("Facts marker not found"); process.exit(1); }

// Find the closing </div> that ends the facts wrapper
let depth = 0;
let endIdx = startIdx;
for (let i = startIdx; i < lines.length; i++) {
  const stripped = lines[i].replace(/\r/, "");
  depth += (stripped.match(/<div/g) || []).length;
  depth -= (stripped.match(/<\/div>/g) || []).length;
  if (i > startIdx && depth === 0) { endIdx = i; break; }
}

console.log(`Replacing lines ${startIdx + 1}–${endIdx + 1}`);

const eol = raw.includes("\r\n") ? "\r\n" : "\n";
const indent = "            "; // 12 spaces

const newLines = [
  `${indent}{/* Facts */}`,
  `${indent}<div className="flex items-stretch rounded-xl border border-slate-200 bg-white overflow-hidden divide-x divide-slate-100">`,
  `${indent}  <div className="flex items-center gap-2.5 px-4 py-3 flex-1 min-w-0">`,
  `${indent}    <Users className="w-4 h-4 text-[#02665e] shrink-0" />`,
  `${indent}    <div>`,
  `${indent}      <div className="text-sm font-bold text-slate-900 leading-none tabular-nums">{property.maxGuests ?? "\u2014"}</div>`,
  `${indent}      <div className="text-[11px] text-slate-400 mt-0.5">Guests</div>`,
  `${indent}    </div>`,
  `${indent}  </div>`,
  `${indent}  <div className="flex items-center gap-2.5 px-4 py-3 flex-1 min-w-0">`,
  `${indent}    <BedDouble className="w-4 h-4 text-[#02665e] shrink-0" />`,
  `${indent}    <div>`,
  `${indent}      <div className="text-sm font-bold text-slate-900 leading-none tabular-nums">{property.totalBedrooms ?? "\u2014"}</div>`,
  `${indent}      <div className="text-[11px] text-slate-400 mt-0.5">Bedrooms</div>`,
  `${indent}    </div>`,
  `${indent}  </div>`,
  `${indent}  <div className="flex items-center gap-2.5 px-4 py-3 flex-1 min-w-0">`,
  `${indent}    <Bath className="w-4 h-4 text-[#02665e] shrink-0" />`,
  `${indent}    <div>`,
  `${indent}      <div className="text-sm font-bold text-slate-900 leading-none tabular-nums">{property.totalBathrooms ?? "\u2014"}</div>`,
  `${indent}      <div className="text-[11px] text-slate-400 mt-0.5">Bathrooms</div>`,
  `${indent}    </div>`,
  `${indent}  </div>`,
  `${indent}  <div className="flex items-center gap-2.5 px-4 py-3 flex-1 min-w-0 bg-[#02665e]/[0.04]">`,
  `${indent}    <ShieldCheck className="w-4 h-4 text-[#02665e] shrink-0" />`,
  `${indent}    <div>`,
  `${indent}      <div className="text-sm font-bold text-[#02665e] leading-none">Verified</div>`,
  `${indent}      <div className="text-[11px] text-[#02665e]/50 mt-0.5">listing</div>`,
  `${indent}    </div>`,
  `${indent}  </div>`,
  `${indent}</div>`,
];

lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
fs.writeFileSync(path, lines.join(eol), "utf8");
console.log("SUCCESS");

