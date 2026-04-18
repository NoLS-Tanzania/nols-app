$fp = "D:\nolsapp2.1\nolsaf\apps\web\app\(owner)\owner\profile\page.tsx"
$lines = [System.IO.File]::ReadAllLines($fp)
Write-Host "Loaded $($lines.Length) lines"

# ---- Step 1: Insert delete state vars after line 189 (index 188) ----
# Line 189 = "  const [businessLicenceExpiresOn, setBusinessLicenceExpiresOn] = useState<string>("");"
if ($lines[188] -notlike "*businessLicenceExpiresOn*") {
  Write-Error "ERROR: Line 189 doesn't match expected content. Aborting."; exit 1
}
$newState = @(
  "",
  "  const [deleteStep, setDeleteStep] = useState<null | 'confirm' | 'verify'>(null);",
  "  const [deleteNameInput, setDeleteNameInput] = useState("""");",
  "  const [deleting, setDeleting] = useState(false);"
)
$lines = $lines[0..188] + $newState + $lines[189..($lines.Length-1)]
Write-Host "Step 1 done. Now $($lines.Length) lines."

# After step 1, original line 1739 is now line 1743 (shifted by 4)
# Verify the delete button area
$btnStart = 1742  # 0-based index for line 1743
$btnEnd   = 1760  # 0-based index for line 1761
Write-Host "Button area preview:"
for ($i = $btnStart; $i -le $btnEnd; $i++) { Write-Host "  $($i+1): $($lines[$i])" }

# Find the actual line with the confirm() call
$confirmIdx = -1
for ($i = 1700; $i -lt 1780; $i++) {
  if ($lines[$i] -like '*confirm("Delete your account*') { $confirmIdx = $i; break }
}
if ($confirmIdx -eq -1) { Write-Error "ERROR: Could not find confirm() line. Aborting."; exit 1 }
Write-Host "Found confirm() at line $($confirmIdx+1)"

# Find the button start (search backward for <button onClick)
$btnStartIdx = -1
for ($i = $confirmIdx; $i -ge $confirmIdx - 10; $i--) {
  if ($lines[$i] -like '*<button onClick*') { $btnStartIdx = $i; break }
}
if ($btnStartIdx -eq -1) { Write-Error "ERROR: Could not find button start. Aborting."; exit 1 }
Write-Host "Button starts at line $($btnStartIdx+1)"

# Find the button end (search forward for </button>)
$btnEndIdx = -1
for ($i = $confirmIdx; $i -le $confirmIdx + 20; $i++) {
  if ($lines[$i] -like '*</button>*') { $btnEndIdx = $i; break }
}
if ($btnEndIdx -eq -1) { Write-Error "ERROR: Could not find button end. Aborting."; exit 1 }
Write-Host "Button ends at line $($btnEndIdx+1)"

# ---- Step 2: Replace the button onClick block ----
$newButton = @(
  "            <button onClick={() => setDeleteStep('confirm')} className=""inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 shadow-card transition-colors"">",
  "",
  "              <Trash2 className=""h-4 w-4"" />Delete account",
  "",
  "            </button>"
)
$lines = $lines[0..($btnStartIdx-1)] + $newButton + $lines[($btnEndIdx+1)..($lines.Length-1)]
Write-Host "Step 2 done. Now $($lines.Length) lines."

# ---- Step 3: Find the closing </div> before ); } and insert delete modal ----
# Find the last "  );" which closes the return
$returnCloseIdx = -1
for ($i = $lines.Length - 1; $i -ge $lines.Length - 30; $i--) {
  if ($lines[$i] -eq "  );") { $returnCloseIdx = $i; break }
}
if ($returnCloseIdx -eq -1) { Write-Error "ERROR: Could not find closing ); Aborting."; exit 1 }
Write-Host "Return closes at line $($returnCloseIdx+1)"

# Insert modal BEFORE the closing </div> that wraps everything (one line before "  );")
# But we need to insert after the last )} which closes an existing modal
# Find the )} that closes showConfirmDialog modal (last )} before return close)
$modalCloseIdx = -1
for ($i = $returnCloseIdx - 1; $i -ge $returnCloseIdx - 15; $i--) {
  if ($lines[$i].Trim() -eq ")}") { $modalCloseIdx = $i; break }
}
if ($modalCloseIdx -eq -1) { Write-Error "ERROR: Could not find )} to insert after. Aborting."; exit 1 }
Write-Host "Inserting modal after line $($modalCloseIdx+1)"

$modal = @(
  "",
  "    {/* Delete account modal */}",
  "    {deleteStep !== null && (",
  "      <div",
  "        role=""dialog""",
  "        aria-modal=""true""",
  "        aria-label=""Delete account""",
  "        className=""fixed inset-0 z-[9999] flex items-center justify-center p-5 pt-16 pb-20 md:p-8""",
  "        onClick={(e) => { if (e.target === e.currentTarget) { setDeleteStep(null); setDeleteNameInput(""""); } }}",
  "      >",
  "        <div className=""absolute inset-0 bg-black/50 backdrop-blur-sm"" aria-hidden />",
  "        <div className=""relative w-full max-w-md rounded-3xl bg-white shadow-[0_32px_80px_rgba(0,0,0,0.22)] overflow-hidden"">",
  "          <div className=""h-1.5 w-full bg-gradient-to-r from-rose-500 via-rose-600 to-rose-500"" />",
  "",
  "          {deleteStep === 'confirm' && (",
  "            <div className=""p-5"">",
  "              <div className=""mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100"">",
  "                <Trash2 className=""h-5 w-5 text-rose-600"" />",
  "              </div>",
  "              <h2 className=""text-center text-base font-bold text-slate-900"">Delete your account?</h2>",
  "              <p className=""mt-1.5 text-center text-xs text-slate-500"">",
  "                This action is <span className=""font-semibold text-rose-600"">permanent and irreversible</span>. Before you continue, understand what will be lost:",
  "              </p>",
  "              <ul className=""mt-4 space-y-2 rounded-2xl border border-rose-100 bg-rose-50/60 px-3.5 py-3"">",
  "                {[",
  "                  ""Your owner profile, listings, and booking history will be permanently deleted."",",
  "                  ""Any active bookings linked to your account will be cancelled."",",
  "                  ""You will lose access immediately \u2014 no recovery is possible."",",
  "                ].map((item) => (",
  "                  <li key={item} className=""flex items-start gap-2 text-xs text-rose-800"">",
  "                    <AlertTriangle className=""mt-px h-3.5 w-3.5 flex-shrink-0 text-rose-500"" />",
  "                    {item}",
  "                  </li>",
  "                ))}",
  "              </ul>",
  "              <div className=""mt-4 flex gap-2.5"">",
  "                <button",
  "                  onClick={() => { setDeleteStep(null); setDeleteNameInput(""""); }}",
  "                  className=""flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"">",
  "                  No, keep my account",
  "                </button>",
  "                <button",
  "                  onClick={() => setDeleteStep('verify')}",
  "                  className=""flex-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"">",
  "                  Yes, continue",
  "                </button>",
  "              </div>",
  "            </div>",
  "          )}",
  "",
  "          {deleteStep === 'verify' && (",
  "            <div className=""p-5"">",
  "              <button",
  "                onClick={() => setDeleteStep('confirm')}",
  "                className=""mb-4 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"">",
  "                <ArrowLeft className=""h-3.5 w-3.5"" /> Back",
  "              </button>",
  "              <div className=""mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100"">",
  "                <ShieldCheck className=""h-5 w-5 text-rose-600"" />",
  "              </div>",
  "              <h2 className=""text-center text-base font-bold text-slate-900"">Final confirmation</h2>",
  "              <p className=""mt-1.5 text-center text-xs text-slate-500"">",
  "                Type your full name exactly as registered to confirm deletion.",
  "              </p>",
  "              <p className=""mt-2.5 text-center text-xs font-mono font-semibold tracking-wide text-slate-700 bg-slate-100 rounded-lg py-1.5 px-3"">",
  "                {form.fullName || ""\u2014""}",
  "              </p>",
  "              <input",
  "                type=""text""",
  "                autoFocus",
  "                autoComplete=""off""",
  "                placeholder=""Type your full name\u2026""",
  "                value={deleteNameInput}",
  "                onChange={(e) => setDeleteNameInput(e.target.value)}",
  "                className=""mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/25""",
  "              />",
  "              <button",
  "                disabled={deleteNameInput.trim() !== (form.fullName ?? """").trim() || deleting}",
  "                onClick={async () => {",
  "                  setDeleting(true);",
  "                  try {",
  "                    await api.delete(""/api/account"");",
  "                    try { await fetch(""/api/auth/logout"", { method: ""POST"", credentials: ""include"" }); } catch {}",
  "                    window.location.href = ""/"";",
  "                  } catch (err: any) {",
  "                    setDeleting(false);",
  "                    setDeleteStep(null);",
  "                    setDeleteNameInput("""");",
  "                    alert(""Could not delete account: "" + String(err?.message ?? err));",
  "                  }",
  "                }}",
  "                className=""mt-3 w-full rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"">",
  "                {deleting ? ""Deleting\u2026"" : ""Permanently delete my account""}",
  "              </button>",
  "              <p className=""mt-3 text-center text-xs text-slate-400"">This cannot be undone.</p>",
  "            </div>",
  "          )}",
  "        </div>",
  "      </div>",
  "    )}"
)
$lines = $lines[0..$modalCloseIdx] + $modal + $lines[($modalCloseIdx+1)..($lines.Length-1)]
Write-Host "Step 3 done. Now $($lines.Length) lines."

# ---- Write file ----
[System.IO.File]::WriteAllLines($fp, $lines, [System.Text.UTF8Encoding]::new($false))
Write-Host "File written successfully!"
