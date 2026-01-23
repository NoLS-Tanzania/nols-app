"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Cpu,
  Gavel,
  MessageSquare,
  ReceiptText,
} from "lucide-react";

type DemoTabId = "chat" | "reminders" | "invoices" | "auctions";

type ChatMessage = { id: string; role: "user" | "ai"; text: string };

function HexBadge({ icon }: { icon: React.ReactNode }) {
  return (
    <div
      className="relative grid h-12 w-12 place-items-center"
      style={{
        clipPath:
          "polygon(25% 6%, 75% 6%, 96% 50%, 75% 94%, 25% 94%, 4% 50%)",
      }}
    >
      <div className="absolute inset-0 bg-slate-900" />
      <div className="absolute inset-0 ring-1 ring-white/25" />
      <div className="pointer-events-none absolute -inset-3 bg-emerald-400/10 blur-xl" />
      <div className="relative text-white/80">{icon}</div>
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 ${
        active
          ? "border border-white/15 bg-white/10 text-white shadow-sm"
          : "border border-white/10 bg-transparent text-white/70 hover:bg-white/5 hover:text-white/90"
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function Panel({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`transition-all duration-300 ${
        active
          ? "opacity-100 translate-y-0"
          : "pointer-events-none absolute inset-0 opacity-0 translate-y-1"
      }`}
      aria-hidden={!active}
    >
      {children}
    </div>
  );
}

export default function No4PAIDemoCard() {
  const tabs = useMemo(
    () =>
      [
        { id: "chat" as const, label: "Chat" },
        { id: "reminders" as const, label: "Reminders" },
        { id: "invoices" as const, label: "Invoices" },
        { id: "auctions" as const, label: "Auctions" },
      ],
    []
  );

  const [tab, setTab] = useState<DemoTabId>("chat");

  const [chatInput, setChatInput] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const replyTimeoutRef = useRef<number | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: "m1",
      role: "user",
      text: "Hi, can I do a late check-out tomorrow?",
    },
    {
      id: "m2",
      role: "ai",
      text: "Yes. I can request it from the property and confirm fees (if any). What time do you need?",
    },
    {
      id: "m3",
      role: "user",
      text: "2 PM. Also remind me before check-out.",
    },
    {
      id: "m4",
      role: "ai",
      text: "Done. I’ll schedule a reminder and update your booking timeline.",
    },
  ]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      if (replyTimeoutRef.current) window.clearTimeout(replyTimeoutRef.current);
    };
  }, []);

  // Auto-rotate tabs to make it feel “live” (user click pauses briefly)
  const [userInteractedAt, setUserInteractedAt] = useState<number>(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      if (now - userInteractedAt < 9000) return;
      setTab((t) => {
        const idx = tabs.findIndex((x) => x.id === t);
        const next = tabs[(idx + 1) % tabs.length];
        return next.id;
      });
    }, 3500);
    return () => window.clearInterval(id);
  }, [tabs, userInteractedAt]);

  const selectTab = (id: DemoTabId) => {
    setUserInteractedAt(Date.now());
    setTab(id);
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setUserInteractedAt(Date.now());

    const userMsg = { id: `u-${Date.now()}`, role: "user" as const, text };
    setChatMessages((m) => [...m, userMsg]);
    setChatInput("");

    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    if (replyTimeoutRef.current) window.clearTimeout(replyTimeoutRef.current);

    setIsTyping(true);

    // short delay before the typing indicator feels “active”
    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(true);
    }, 150);

    replyTimeoutRef.current = window.setTimeout(() => {
      const lower = text.toLowerCase();
      const reply =
        lower.includes("checkout") || lower.includes("check-out")
          ? "I can handle that. I’ll confirm the check-out window, request any late check-out approval, and send you a reminder before departure."
          : lower.includes("invoice") || lower.includes("claim")
            ? "Got it. I’ll collect the documents, verify totals, and flag anything that needs approval—then mark it ready for payout."
            : lower.includes("auction") || lower.includes("route") || lower.includes("bid")
              ? "I can submit your offer, validate constraints, and publish it to the route pool—then track ranking and award status."
              : "Understood. I’ll take the next step and keep you updated in the timeline. If anything needs approval, I’ll ask first.";

      setChatMessages((m) => [...m, { id: `a-${Date.now()}`, role: "ai", text: reply }]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div className="group relative rounded-3xl">
      <div className="pointer-events-none absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-emerald-400/35 via-sky-400/25 to-fuchsia-400/30 opacity-80 blur-[1px] transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10" />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[min(840px,92vw)] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-0 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-slate-900 text-white ring-1 ring-white/10">
                <Cpu className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-white">No4P AI in action</h3>
                <p className="mt-0.5 text-sm text-white/70">A live-feeling sample of core integrations.</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white/80 sm:self-auto">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live demo
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((t) => (
              <TabButton
                key={t.id}
                active={tab === t.id}
                label={t.label}
                onClick={() => selectTab(t.id)}
              />
            ))}
          </div>

          <p className="-mt-1 text-xs text-white/55">Click a tab to follow the workflow. Auto-rotates when idle.</p>

          <div className="relative min-h-[420px] rounded-2xl border border-white/10 bg-slate-900/40 p-4">
            <Panel active={tab === "chat"}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HexBadge icon={<MessageSquare className="h-5 w-5" />} />
                  <div>
                    <div className="text-sm font-semibold text-white">Chat & support</div>
                    <div className="text-xs text-white/60">Customers • Owners • Drivers</div>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white/70">Auto + human handoff</span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-12">
                <div className="md:col-span-7">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold text-white/70">Conversation</div>
                      <div className="text-[11px] text-white/55">Sample messages</div>
                    </div>

                    <div className="mt-3 max-h-[220px] space-y-3 overflow-y-auto pr-1" aria-label="Demo chat transcript">
                      {chatMessages.map((m) => (
                        <div key={m.id} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
                          <div
                            className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                              m.role === "user"
                                ? "border border-white/10 bg-slate-950 text-white/85"
                                : "bg-emerald-500/15 text-white/90 ring-1 ring-emerald-300/20"
                            }`}
                          >
                            {m.text}
                          </div>
                        </div>
                      ))}

                      {isTyping ? (
                        <div className="flex justify-end">
                          <div className="max-w-[90%] rounded-2xl bg-sky-500/12 px-3 py-2 text-sm text-white/90 ring-1 ring-sky-300/20" aria-label="AI is typing">
                            <span className="inline-flex items-center gap-1 align-middle">
                              <span
                                className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70"
                                style={{ animationDelay: "0ms" }}
                              />
                              <span
                                className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70"
                                style={{ animationDelay: "120ms" }}
                              />
                              <span
                                className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70"
                                style={{ animationDelay: "240ms" }}
                              />
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold text-white/70">Try it</div>
                      <div className="text-[11px] text-white/55">UI demo only</div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={chatInput}
                        onChange={(e) => {
                          setUserInteractedAt(Date.now());
                          setChatInput(e.target.value);
                        }}
                        onFocus={() => setUserInteractedAt(Date.now())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") sendChat();
                        }}
                        placeholder='Ask: “remind me about checkout”, “process invoice claim”, “submit auction offer”…'
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white/90 placeholder:text-white/40 outline-none transition focus:border-emerald-300/30 focus:ring-2 focus:ring-emerald-300/25"
                        aria-label="Try the demo chat"
                      />
                      <button
                        type="button"
                        onClick={sendChat}
                        disabled={!chatInput.trim()}
                        className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="text-xs font-semibold text-white/70">What happens behind the scenes</div>
                    <div className="mt-3 space-y-3">
                      <div className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs font-semibold text-white/70 ring-1 ring-white/10">1</span>
                        <div>
                          <div className="text-sm font-semibold text-white/90">Capture intent</div>
                          <div className="text-xs text-white/60">Understands the request and attaches it to the booking.</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs font-semibold text-white/70 ring-1 ring-white/10">2</span>
                        <div>
                          <div className="text-sm font-semibold text-white/90">Notify the right party</div>
                          <div className="text-xs text-white/60">Pings owner/staff/driver with context and required actions.</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs font-semibold text-white/70 ring-1 ring-white/10">3</span>
                        <div>
                          <div className="text-sm font-semibold text-white/90">Update timeline + follow-ups</div>
                          <div className="text-xs text-white/60">Schedules reminders and logs the outcome for auditing.</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="text-xs font-semibold text-white/70">Outcome</div>
                    <div className="mt-1 text-sm text-white/85">
                      A request is created, the property is notified, and the traveler gets a reminder—without leaving chat.
                    </div>
                    <div className="mt-2 text-xs text-white/55">If approvals are required, No4P AI asks before committing changes.</div>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel active={tab === "reminders"}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HexBadge icon={<Bell className="h-5 w-5" />} />
                  <div>
                    <div className="text-sm font-semibold text-white">Reminders</div>
                    <div className="text-xs text-white/60">Check-in/out • Arrivals • Payments</div>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white/70">Scheduled</span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-12">
                <div className="md:col-span-7">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                      <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-emerald-500/12 ring-1 ring-emerald-300/20">
                        <Bell className="h-4 w-4 text-white/80" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-white/90">Check-out reminder</div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-300/20">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Ready
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-white/60">Sends message + updates the booking timeline.</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                      <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-sky-500/12 ring-1 ring-sky-300/20">
                        <Bell className="h-4 w-4 text-white/80" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white/90">Arrival time follow-up</div>
                        <div className="mt-1 text-xs text-white/60">If arrival details are missing, prompt the traveler once.</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                      <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-fuchsia-500/10 ring-1 ring-fuchsia-300/20">
                        <Bell className="h-4 w-4 text-white/80" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white/90">Payment confirmation</div>
                        <div className="mt-1 text-xs text-white/60">Confirms payment events and stores receipt metadata.</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="text-xs font-semibold text-white/70">How reminders work</div>
                    <div className="mt-2 space-y-2 text-sm text-white/85">
                      <div className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs font-semibold text-white/70 ring-1 ring-white/10">1</span>
                        <div>
                          <div className="font-semibold text-white/90">Trigger</div>
                          <div className="text-xs text-white/60">Based on dates, missing info, or payment events.</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs font-semibold text-white/70 ring-1 ring-white/10">2</span>
                        <div>
                          <div className="font-semibold text-white/90">Message</div>
                          <div className="text-xs text-white/60">Personalized text + correct channel (SMS/email/in-app/WhatsApp).</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs font-semibold text-white/70 ring-1 ring-white/10">3</span>
                        <div>
                          <div className="font-semibold text-white/90">Audit trail</div>
                          <div className="text-xs text-white/60">Logs delivery + updates the booking timeline.</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-white/50">Reminders can be SMS, email, in-app, or WhatsApp—based on your setup.</p>
                </div>
              </div>
            </Panel>

            <Panel active={tab === "invoices"}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HexBadge icon={<ReceiptText className="h-5 w-5" />} />
                  <div>
                    <div className="text-sm font-semibold text-white">Invoice claims</div>
                    <div className="text-xs text-white/60">Verification • Exceptions • Payout readiness</div>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white/70">Processing</span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-12">
                <div className="md:col-span-7">
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-white/90">Claim #INV-20491</div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white/70 ring-1 ring-white/10">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
                          Verifying totals
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
                        <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-sky-400/70 via-emerald-400/50 to-fuchsia-400/60" />
                      </div>
                      <div className="mt-2 text-xs text-white/60">Matches documents, checks totals, flags exceptions for review.</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-white/90">Claim #INV-20458</div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-300/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Ready for payout
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-white/60">Approved and queued for settlement in the next cycle.</div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="text-xs font-semibold text-white/70">AI checks</div>
                    <div className="mt-2 space-y-2 text-sm text-white/85">
                      <div className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs font-semibold text-white/70 ring-1 ring-white/10">1</span>
                        <div>
                          <div className="font-semibold text-white/90">Validate documents</div>
                          <div className="text-xs text-white/60">Extracts amounts, dates, vendor names, and required fields.</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs font-semibold text-white/70 ring-1 ring-white/10">2</span>
                        <div>
                          <div className="font-semibold text-white/90">Detect exceptions</div>
                          <div className="text-xs text-white/60">Flags mismatched totals, duplicates, or missing proofs.</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs font-semibold text-white/70 ring-1 ring-white/10">3</span>
                        <div>
                          <div className="font-semibold text-white/90">Prepare payout</div>
                          <div className="text-xs text-white/60">Marks ready items for settlement and produces an audit trail.</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-white/50">Human-in-the-loop controls keep approvals and audit trails intact.</p>
                </div>
              </div>
            </Panel>

            <Panel active={tab === "auctions"}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HexBadge icon={<Gavel className="h-5 w-5" />} />
                  <div>
                    <div className="text-sm font-semibold text-white">Auction offers</div>
                    <div className="text-xs text-white/60">Validation • Ranking • Awards</div>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white/70">Publishing</span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-12">
                <div className="md:col-span-7">
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-white/90">Route offer received</div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white/70 ring-1 ring-white/10">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-fuchsia-400" />
                          Posting
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-white/70">
                        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2">
                          <div className="text-white/55">Pickup window</div>
                          <div className="mt-0.5 font-semibold text-white/85">09:00–10:30</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2">
                          <div className="text-white/55">Expected payout</div>
                          <div className="mt-0.5 font-semibold text-white/85">TZS 95,000</div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-white/60">Constraints validated; route added to the claim pool.</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-white/90">Best-fit ranking</div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white/70 ring-1 ring-white/10">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                          Scoring
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-white/60">Balances reliability, distance, pricing, and fairness rules.</div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="text-xs font-semibold text-white/70">Selection logic</div>
                    <div className="mt-2 space-y-2 text-sm text-white/85">
                      <div className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs font-semibold text-white/70 ring-1 ring-white/10">1</span>
                        <div>
                          <div className="font-semibold text-white/90">Validate constraints</div>
                          <div className="text-xs text-white/60">Capacity, location rules, time windows, compliance flags.</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs font-semibold text-white/70 ring-1 ring-white/10">2</span>
                        <div>
                          <div className="font-semibold text-white/90">Score fairly</div>
                          <div className="text-xs text-white/60">Balances reliability, distance, pricing, and SLA.</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs font-semibold text-white/70 ring-1 ring-white/10">3</span>
                        <div>
                          <div className="font-semibold text-white/90">Track award status</div>
                          <div className="text-xs text-white/60">Notifies winners/alternates and records reasoning for audit.</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-white/50">Award logic can be tuned: priority, ratings, region rules, and SLA.</p>
                </div>
              </div>
            </Panel>
          </div>

          <p className="text-xs text-white/50">Sample UI — final integration screens can be customized to your workflow.</p>
        </div>
      </div>
    </div>
  );
}
