$file = "D:\nolsapp2.1\nolsaf\apps\web\app\public\properties\[slug]\page.tsx"
$c = [IO.File]::ReadAllText($file)

# REDESIGN 1: Replace canFlip + return opening (beds/price card redesign + nights calc)
$oldDesign1 = @'
                                const canFlip = Boolean(modalDates.checkIn && modalDates.checkOut);

                                return (
                                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <div className="rounded-xl border border-[#02665e]/20 bg-[#02665e]/5 p-4">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                          <div className="text-[10px] font-bold text-[#02665e] uppercase tracking-widest">Beds</div>
                                          <div className="mt-1 text-sm font-bold text-slate-900">{row?.bedsSummary || "—"}</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-[10px] font-bold text-[#02665e] uppercase tracking-widest">Price / night</div>
                                          <div className="mt-1 text-lg font-black text-slate-900">
                                            {fmtMoney(row?.pricePerNight ?? null, property.currency)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
'@

$newDesign1 = @'
                                const canFlip = Boolean(modalDates.checkIn && modalDates.checkOut);
                                const nights = canFlip
                                  ? Math.max(1, Math.round(
                                      (new Date(modalDates.checkOut).getTime() - new Date(modalDates.checkIn).getTime()) / 86400000
                                    ))
                                  : 0;
                                const totalPrice = nights > 0 && typeof row?.pricePerNight === "number" && row.pricePerNight > 0
                                  ? row.pricePerNight * nights * modalRoomsQty
                                  : null;

                                return (
                                  <div className="space-y-3 pb-2">
                                    {/* Beds + Price */}
                                    <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[#02665e]/[0.07] border border-[#02665e]/20">
                                      <div>
                                        <div className="text-[10px] font-bold text-[#02665e] uppercase tracking-widest">Beds</div>
                                        <div className="mt-0.5 text-sm font-bold text-slate-900">{row?.bedsSummary || "—"}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-[10px] font-bold text-[#02665e] uppercase tracking-widest">Per night</div>
                                        <div className="mt-0.5 text-xl font-black text-slate-900">{fmtMoney(row?.pricePerNight ?? null, property.currency)}</div>
                                      </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
'@

$c = $c.Replace($oldDesign1, $newDesign1)

# REDESIGN 2: Replace rooms+adults steppers section
$oldSteppers = @'
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                        <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Rooms</div>
                                        <div className="mt-2 flex items-center justify-between gap-3">
                                          <div className="text-sm font-semibold text-slate-900">{modalRoomsQty}</div>
                                          <Stepper value={modalRoomsQty} min={1} max={maxRooms} onChange={setRooms} label="rooms" />
                                        </div>
                                        <div className="mt-1 text-[11px] text-slate-500">Max {maxRooms}.</div>
                                      </div>
                                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                        <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Adults</div>
                                        <div className="mt-2 flex items-center justify-between gap-3">
                                          <div className="text-sm font-semibold text-slate-900">{modalGuests.adults}</div>
                                          <Stepper value={modalGuests.adults} min={1} max={maxGuests} onChange={setAdults} label="adults" />
                                        </div>
                                        <div className="mt-1 text-[11px] text-slate-500">Max {maxGuests}.</div>
                                      </div>
                                    </div>
'@

$newSteppers = @'
                                    {/* Nights + Total summary */}
                                    {canFlip ? (
                                      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                        <span className="text-xs font-semibold text-slate-500">{nights} night{nights !== 1 ? "s" : ""}</span>
                                        {totalPrice !== null && (
                                          <span className="text-sm font-black text-slate-900">{fmtMoney(totalPrice, property.currency)}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-center px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/80">
                                        <span className="text-xs font-medium text-amber-700">Select check-in and check-out dates to continue</span>
                                      </div>
                                    )}

                                    {/* Rooms + Adults */}
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60">
                                        <div>
                                          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Rooms</div>
                                          <div className="text-[11px] text-slate-400 mt-0.5">Max {maxRooms}</div>
                                        </div>
                                        <Stepper value={modalRoomsQty} min={1} max={maxRooms} onChange={setRooms} label="rooms" />
                                      </div>
                                      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60">
                                        <div>
                                          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Adults</div>
                                          <div className="text-[11px] text-slate-400 mt-0.5">Max {maxGuests}</div>
                                        </div>
                                        <Stepper value={modalGuests.adults} min={1} max={maxGuests} onChange={setAdults} label="adults" />
                                      </div>
                                    </div>
'@

$c = $c.Replace($oldSteppers, $newSteppers)

# REDESIGN 3: Replace CTA section
$oldCTA = @'
                                    <div className="mt-4 flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setQuickBookingPage("availability");
                                        }}
                                        disabled={!canFlip}
                                        className="flex-1 rounded-xl bg-[#02665e] text-white py-2.5 text-sm font-bold hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Check availability →
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          document.getElementById("roomsSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                          setRoomQuickView(null);
                                        }}
                                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                      >
                                        View rooms
                                      </button>
                                    </div>

                                    {!canFlip ? (
                                      <div className="mt-2 text-xs text-amber-700 flex items-center gap-1.5"><span>↑</span> Select both check-in and check-out dates to continue.</div>
                                    ) : null}
                                  </div>
                                );
'@

$newCTA = @'
                                    {/* CTA */}
                                    <div className="space-y-1.5 pt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => { setQuickBookingPage("availability"); }}
                                        disabled={!canFlip}
                                        className="w-full rounded-xl bg-[#02665e] text-white py-3 text-sm font-bold hover:bg-[#014e47] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        Check availability →
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          document.getElementById("roomsSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                          setRoomQuickView(null);
                                        }}
                                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                      >
                                        View all rooms
                                      </button>
                                    </div>
                                  </div>
                                );
'@

$c = $c.Replace($oldCTA, $newCTA)

# Verify
$checks = @(
  @{ name = "nights calc"; ok = $c.Contains('const nights = canFlip') },
  @{ name = "total price calc"; ok = $c.Contains('const totalPrice = nights') },
  @{ name = "nights summary strip"; ok = $c.Contains('night{nights !== 1') },
  @{ name = "compact steppers"; ok = $c.Contains('grid-cols-2 gap-2') },
  @{ name = "full-width CTA"; ok = $c.Contains('w-full rounded-xl bg-[#02665e]') },
  @{ name = "View all rooms"; ok = $c.Contains('View all rooms') }
)

foreach ($check in $checks) {
  if ($check.ok) { Write-Host "OK: $($check.name)" } else { Write-Host "FAIL: $($check.name)" }
}

[IO.File]::WriteAllText($file, $c, [System.Text.Encoding]::UTF8)
Write-Host "Redesign written. Length: $($c.Length)"
