"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

type AgentContractPayload = {
  ok?: boolean;
  contract?: {
    title?: string;
    content?: string;
    generatedAt?: string;
  };
  workflow?: {
    status?: "PENDING_NOLSAF_SIGNATURE" | "PENDING_AGENT_SIGNATURE" | "EXECUTED";
    nolsafSignedAt?: string;
    agentSignedAt?: string;
    nolsafSignatoryName?: string;
    agentSignerName?: string;
    contractId?: string;
    version?: string;
  } | null;
  error?: string;
  message?: string;
};

type ContractBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "clause"; number: string; level: number; text: string }
  | { type: "label"; label: string; value: string }
  | { type: "list"; items: string[] }
  | {
      type: "signatureColumns";
      leftTitle: string;
      leftItems: string[];
      rightTitle: string;
      rightItems: string[];
    }
  | { type: "paragraph"; text: string };

const stripInlineMarkdown = (input: string): string => {
  return input
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .trim();
};

const parseContractBlocks = (raw: string): ContractBlock[] => {
  const lines = raw.replace(/\r/g, "").split("\n");
  const blocks: ContractBlock[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      blocks.push({ type: "list", items: listBuffer });
      listBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    const h1 = trimmed.match(/^#\s+(.+)$/);
    if (h1) {
      flushList();
      blocks.push({ type: "h1", text: stripInlineMarkdown(h1[1]) });
      continue;
    }

    const h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2) {
      flushList();
      blocks.push({ type: "h2", text: stripInlineMarkdown(h2[1]) });
      continue;
    }

    const h3 = trimmed.match(/^###\s+(.+)$/);
    if (h3) {
      flushList();
      blocks.push({ type: "h3", text: stripInlineMarkdown(h3[1]) });
      continue;
    }

    const labelLine = trimmed.match(/^\*\*([^*]+):\*\*\s*(.+)$/);
    if (labelLine) {
      flushList();
      blocks.push({
        type: "label",
        label: stripInlineMarkdown(labelLine[1]),
        value: stripInlineMarkdown(labelLine[2]),
      });
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      listBuffer.push(stripInlineMarkdown(bullet[1]));
      continue;
    }

    const clauseLine = trimmed.match(/^(\d+(?:\.\d+)*)(?:\.)?\s+(.+)$/);
    if (clauseLine) {
      flushList();
      const clauseNumber = clauseLine[1];
      blocks.push({
        type: "clause",
        number: clauseNumber,
        level: clauseNumber.split(".").length,
        text: stripInlineMarkdown(clauseLine[2]),
      });
      continue;
    }

    flushList();
    blocks.push({ type: "paragraph", text: stripInlineMarkdown(trimmed) });
  }

  flushList();

  // Convert signature section into a dedicated two-column block on larger screens.
  const enhanced: ContractBlock[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const current = blocks[i];
    const next = blocks[i + 1];
    const third = blocks[i + 2];
    const fourth = blocks[i + 3];

    const looksLikeLeftHeader =
      current?.type === "paragraph" && /^FOR\s+NOLSAF$/i.test(current.text.trim());
    const looksLikeRightHeader =
      third?.type === "paragraph" && /^FOR\s+THE\s+OPERATOR$/i.test(third.text.trim());

    if (
      looksLikeLeftHeader &&
      next?.type === "list" &&
      looksLikeRightHeader &&
      fourth?.type === "list"
    ) {
      enhanced.push({
        type: "signatureColumns",
        leftTitle: current.text,
        leftItems: next.items,
        rightTitle: third.text,
        rightItems: fourth.items,
      });
      i += 3;
      continue;
    }

    enhanced.push(current);
  }

  return enhanced;
};

const clauseAnchorId = (number: string): string => `contract-clause-${number.replace(/\./g, "-")}`;

function signatureHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function buildSignatureCode(params: {
  contractId: string;
  version: string;
  party: "NOLSAF" | "OPERATOR";
  signedAt: string;
}): string {
  const fingerprint = signatureHash(`${params.contractId}|${params.version}|${params.party}|${params.signedAt}`);
  return `NLS-SIG-${params.party}-${fingerprint}`;
}

export default function AgentContractContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [workflow, setWorkflow] = useState<NonNullable<AgentContractPayload["workflow"]> | null>(null);
  const [signatureQr, setSignatureQr] = useState<{ nolsaf: string | null; operator: string | null }>({
    nolsaf: null,
    operator: null,
  });
  const [signing, setSigning] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const loadContract = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/agent/contract", {
          credentials: "include",
          signal: controller.signal,
        });

        const data = (await res.json().catch(() => ({}))) as AgentContractPayload;

        if (!mounted) return;

        if (!res.ok || !data?.contract?.content) {
          setContent("");
          setWorkflow(null);
          setError(data?.message || data?.error || "Contract is not available yet.");
          return;
        }

        setContent(String(data.contract.content));
        setWorkflow(data.workflow || null);
      } catch {
        if (!mounted) return;
        setError("Unable to load contract right now.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadContract();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [refreshKey]);

  useEffect(() => {
    let mounted = true;

    const generate = async () => {
      if (!workflow?.contractId) {
        if (mounted) setSignatureQr({ nolsaf: null, operator: null });
        return;
      }

      const version = workflow.version || "1.0.0";
      const nolsafSignedAt = workflow.nolsafSignedAt || "";
      const operatorSignedAt = workflow.agentSignedAt || "";

      const nolsafPayload = nolsafSignedAt
        ? JSON.stringify(
            {
              kind: "contract-signature",
              contractId: workflow.contractId,
              version,
              party: "NOLSAF",
              signer: workflow.nolsafSignatoryName || null,
              signedAt: nolsafSignedAt,
              code: buildSignatureCode({
                contractId: workflow.contractId,
                version,
                party: "NOLSAF",
                signedAt: nolsafSignedAt,
              }),
            },
            null,
            0
          )
        : "";

      const operatorPayload = operatorSignedAt
        ? JSON.stringify(
            {
              kind: "contract-signature",
              contractId: workflow.contractId,
              version,
              party: "OPERATOR",
              signer: workflow.agentSignerName || null,
              signedAt: operatorSignedAt,
              code: buildSignatureCode({
                contractId: workflow.contractId,
                version,
                party: "OPERATOR",
                signedAt: operatorSignedAt,
              }),
            },
            null,
            0
          )
        : "";

      const [nolsafQr, operatorQr] = await Promise.all([
        nolsafPayload ? QRCode.toDataURL(nolsafPayload, { margin: 1, width: 96 }) : Promise.resolve(null),
        operatorPayload ? QRCode.toDataURL(operatorPayload, { margin: 1, width: 96 }) : Promise.resolve(null),
      ]);

      if (mounted) {
        setSignatureQr({
          nolsaf: nolsafQr,
          operator: operatorQr,
        });
      }
    };

    void generate();
    return () => {
      mounted = false;
    };
  }, [workflow]);

  const handleAgentSign = async () => {
    if (signing) return;
    setSigning(true);
    try {
      const res = await fetch("/api/agent/contract/sign", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as AgentContractPayload;
      if (!res.ok) {
        setError(data?.message || data?.error || "Unable to sign contract right now.");
        return;
      }
      setError(null);
      setRefreshKey((v) => v + 1);
    } catch {
      setError("Unable to sign contract right now.");
    } finally {
      setSigning(false);
    }
  };

  const blocks = parseContractBlocks(content);
  const topLevelClauses = blocks.filter((block): block is Extract<ContractBlock, { type: "clause" }> => block.type === "clause" && block.level === 1);
  const workflowStatus = String(workflow?.status || "").toUpperCase();
  const statusMessage =
    workflowStatus === "PENDING_NOLSAF_SIGNATURE"
      ? "Awaiting NoLSAF admin signature"
      : workflowStatus === "PENDING_AGENT_SIGNATURE"
        ? "NoLSAF has signed. Your countersignature is required."
        : workflowStatus === "EXECUTED"
          ? "Executed by both NoLSAF and operator"
          : "Workflow not initialized";
  const statusTone =
    workflowStatus === "EXECUTED"
      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
      : workflowStatus === "PENDING_AGENT_SIGNATURE"
        ? "bg-amber-50 border-amber-200 text-amber-900"
        : "bg-slate-50 border-slate-200 text-slate-800";

  return (
    <div className="w-full h-full min-h-0">
      {loading ? (
        <div className="space-y-3 px-1 py-2 sm:py-3">
          <div className="h-4 w-48 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-4 w-full rounded-full bg-slate-200 animate-pulse" />
          <div className="h-4 w-[92%] rounded-full bg-slate-200 animate-pulse" />
          <div className="h-4 w-[85%] rounded-full bg-slate-200 animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="text-sm font-bold text-slate-900">Contract unavailable</div>
          <div className="text-sm text-slate-600 mt-1">{error}</div>
          <div className="mt-4">
            <a
              href="mailto:support@nolsaf.com"
              className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-brand text-white font-semibold no-underline hover:bg-brand-700 shadow-card transition-colors"
            >
              Email support
            </a>
          </div>
        </div>
      ) : (
        <div className="h-full overflow-auto rounded-xl border border-slate-200 bg-white p-4 sm:p-6 md:p-8">
          <article className="w-full max-w-full sm:max-w-5xl mx-auto space-y-6 sm:space-y-8 text-left">
            <section className={`rounded-xl border p-4 sm:p-5 ${statusTone}`}>
              <div className="text-sm font-semibold">Contract status</div>
              <div className="text-sm mt-1">{statusMessage}</div>
              {workflow?.contractId ? <div className="text-xs mt-2 opacity-80">Contract ID: {workflow.contractId}</div> : null}
              {workflowStatus === "PENDING_AGENT_SIGNATURE" ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleAgentSign}
                    disabled={signing}
                    className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-brand text-white font-semibold no-underline hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-card transition-colors"
                  >
                    {signing ? "Signing..." : "Sign As Operator"}
                  </button>
                </div>
              ) : null}
            </section>

            {topLevelClauses.length > 0 ? (
              <section className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Contents</div>
                <div className="grid gap-1">
                  {topLevelClauses.map((clause) => (
                    <a
                      key={clause.number}
                      href={`#${clauseAnchorId(clause.number)}`}
                      className="text-sm sm:text-base leading-relaxed text-slate-700 hover:text-slate-900 no-underline"
                    >
                      <span className="font-semibold text-slate-900">{clause.number}.</span>{" "}
                      <span>{clause.text}</span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {blocks.map((block, idx) => {
                if (block.type === "h1") {
                  return (
                    <section key={idx} className="py-4 sm:py-5">
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">{block.text}</h2>
                    </section>
                  );
                }

                if (block.type === "h2") {
                  return (
                    <section key={idx} className="py-4 sm:py-5">
                      <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-snug">{block.text}</h3>
                    </section>
                  );
                }

                if (block.type === "h3") {
                  return (
                    <section key={idx} className="py-3 sm:py-4">
                      <h4 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">{block.text}</h4>
                    </section>
                  );
                }

                if (block.type === "label") {
                  return (
                    <section key={idx} className="py-3 sm:py-4 text-sm sm:text-base leading-relaxed text-slate-800">
                      <span className="font-semibold text-slate-900">{block.label}: </span>
                      <span>{block.value}</span>
                    </section>
                  );
                }

                if (block.type === "clause") {
                  const isTopLevel = block.level === 1;
                  const leftIndent = block.level <= 1 ? "pl-0" : block.level === 2 ? "pl-5" : "pl-8";

                  return (
                    <section
                      key={idx}
                      id={isTopLevel ? clauseAnchorId(block.number) : undefined}
                      className={`py-3 sm:py-4 ${leftIndent}`}
                    >
                      <div className="grid grid-cols-[auto,1fr] gap-x-3 text-sm sm:text-base leading-relaxed text-slate-800">
                        <span className="font-semibold text-slate-900">{block.number}.</span>
                        <span className={isTopLevel ? "font-semibold text-slate-900" : "text-slate-800"}>{block.text}</span>
                      </div>
                    </section>
                  );
                }

                if (block.type === "list") {
                  let inheritedClauseLevel: number | null = null;
                  for (let i = idx - 1; i >= 0; i -= 1) {
                    const candidate = blocks[i];
                    if (candidate.type === "clause") {
                      inheritedClauseLevel = candidate.level;
                      break;
                    }
                    if (candidate.type === "h1" || candidate.type === "h2" || candidate.type === "h3") {
                      break;
                    }
                  }

                  const nestedIndent =
                    inheritedClauseLevel === null
                      ? "pl-6 sm:pl-8"
                      : inheritedClauseLevel <= 1
                        ? "pl-12 sm:pl-14"
                        : inheritedClauseLevel === 2
                          ? "pl-14 sm:pl-16"
                          : "pl-16 sm:pl-20";

                  return (
                    <section key={idx} className="py-2 sm:py-3">
                      <ol className={`list-[lower-roman] ${nestedIndent} pr-2 sm:pr-4 space-y-1 text-sm sm:text-base leading-relaxed text-slate-800 marker:font-semibold marker:text-slate-700`}>
                        {block.items.map((item, itemIdx) => (
                          <li key={itemIdx}>{item}</li>
                        ))}
                      </ol>
                    </section>
                  );
                }

                if (block.type === "signatureColumns") {
                  const renderSignatureItems = (items: string[], party: "NOLSAF" | "OPERATOR") => {
                    return items.map((item, itemIdx) => {
                      const m = item.match(/^([^:]+):\s*(.*)$/);
                      if (!m) {
                        return (
                          <div key={itemIdx} className="text-sm sm:text-base text-slate-800">
                            {item}
                          </div>
                        );
                      }

                      const label = m[1].trim();
                      const value = m[2].trim();

                      if (label.toLowerCase() === "signature") {
                        const signedAt = party === "NOLSAF" ? workflow?.nolsafSignedAt : workflow?.agentSignedAt;
                        const version = workflow?.version || "1.0.0";
                        const contractId = workflow?.contractId || "";
                        const code =
                          signedAt && contractId
                            ? buildSignatureCode({
                                contractId,
                                version,
                                party,
                                signedAt,
                              })
                            : null;
                        const qrSrc = party === "NOLSAF" ? signatureQr.nolsaf : signatureQr.operator;

                        return (
                          <div key={itemIdx} className="grid grid-cols-[120px,1fr] gap-x-2 text-sm sm:text-base text-slate-800 items-start">
                            <span className="font-semibold text-slate-900">{label}</span>
                            <div className="space-y-1">
                              {signedAt && code ? (
                                <>
                                  <div className="inline-flex items-center rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900">
                                    Digital signature verified
                                  </div>
                                  <div className="text-xs text-slate-600">Verification code: <span className="font-semibold text-slate-900">{code}</span></div>
                                  {qrSrc ? (
                                    <img
                                      src={qrSrc}
                                      alt={`${party} signature verification QR`}
                                      className="h-20 w-20 rounded border border-slate-200 bg-white p-1"
                                    />
                                  ) : null}
                                </>
                              ) : (
                                <span>{value || "Pending digital signature"}</span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={itemIdx} className="grid grid-cols-[120px,1fr] gap-x-2 text-sm sm:text-base text-slate-800">
                          <span className="font-semibold text-slate-900">{label}</span>
                          <span>{value}</span>
                        </div>
                      );
                    });
                  };

                  return (
                    <section key={idx} className="py-4 sm:py-5">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-2">
                          <h5 className="text-sm sm:text-base font-semibold text-slate-900">{block.leftTitle}</h5>
                          {renderSignatureItems(block.leftItems, "NOLSAF")}
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-2">
                          <h5 className="text-sm sm:text-base font-semibold text-slate-900">{block.rightTitle}</h5>
                          {renderSignatureItems(block.rightItems, "OPERATOR")}
                        </div>
                      </div>
                    </section>
                  );
                }

                return (
                  <section
                    key={idx}
                    className="py-3 sm:py-4 text-sm sm:text-base leading-relaxed text-slate-800"
                    style={{
                      textAlign: "justify",
                      textJustify: "inter-word",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      hyphens: "auto",
                    }}
                  >
                    {block.text}
                  </section>
                );
              })}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
