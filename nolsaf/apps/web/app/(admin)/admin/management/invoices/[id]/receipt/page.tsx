"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { sanitizeTrustedHtml } from "@/utils/html";

export default function AdminReceiptPdfPage({ params }: { params: { id: string } }) {
  const invoiceId = Number(params.id);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [receiptHtml, setReceiptHtml] = useState<string>("");
  const [filename, setFilename] = useState<string>(`Booking Reservation - invoice-${invoiceId}.pdf`);
  const [printedAt, setPrintedAt] = useState<string>("");
  const [printedBy, setPrintedBy] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const backHref = useMemo(() => "/admin/management/bookings", []);

  const receiptHtmlWithMeta = useMemo(() => {
    if (!receiptHtml) return "";
    if (!printedAt && !printedBy) return receiptHtml;
    if (receiptHtml.includes("Printed on:")) return receiptHtml; // avoid double injection

    const safeText = (s: string) =>
      String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const metaLine = `Printed on: <span style="font-weight:700;color:#0f172a;">${safeText(printedAt)}</span> • Printed by: <span style="font-weight:700;color:#0f172a;">${safeText(printedBy || "Admin")}</span>`;

    // Add minimal CSS (safe even if inline styles exist in template already)
    let html = receiptHtml.replace(
      /<\/style>/i,
      `\n.print-meta{margin-top:8px;font-size:10px;color:#64748b;line-height:1.35;}\n</style>`
    );

    // Prefer inserting inside footer meta (near "Generated on ...")
    if (html.includes("Official booking confirmation")) {
      html = html.replace(
        /(Official booking confirmation • Generated on [^<\n]+)(\s*)/,
        `$1<br/><span class="print-meta">${metaLine}</span>$2`
      );
      return html;
    }

    // Fallback: insert into footer-left block before the QR column
    if (html.includes('class="footer-left"')) {
      html = html.replace(
        /(<div class="footer-left"[^>]*>)/,
        `$1<div class="print-meta">${metaLine}</div>`
      );
    }
    return html;
  }, [receiptHtml, printedAt, printedBy]);

  const sanitizedReceiptHtmlWithMeta = useMemo(() => {
    return sanitizeTrustedHtml(receiptHtmlWithMeta);
  }, [receiptHtmlWithMeta]);

  // Load current admin (for "Printed by")
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/account/me", { credentials: "include", cache: "no-store" });
        const j = r.ok ? await r.json() : null;
        const safe = j?.data ?? j ?? null;
        const name = safe?.name || safe?.fullName || null;
        const role = safe?.role || null;
        const id = safe?.id || null;
        if (!mounted) return;
        const label = name ? String(name) : (role && id ? `${String(role)} #${String(id)}` : "Admin");
        setPrintedBy(label);
      } catch {
        if (mounted) setPrintedBy("Admin");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const url = `/api/admin/revenue/invoices/${invoiceId}/receipt.html`;
      const r = await fetch(url, { credentials: "include", cache: "no-store" });
      const html = await r.text();
      if (!r.ok) {
        throw new Error(`Failed to load receipt template (${r.status})`);
      }
      const fn = r.headers.get("x-nolsaf-filename") || `Booking Reservation - invoice-${invoiceId}.pdf`;
      setFilename(fn);
      setReceiptHtml(html);
      setPrintedAt((prev) => prev || new Date().toLocaleString());
    } catch (e: any) {
      setErr(e?.message || "Failed to load receipt");
      setReceiptHtml("");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
      setErr("Invalid invoice ID");
      setLoading(false);
      return;
    }
    load();
  }, [invoiceId, load]);

  useEffect(() => {
    let revokedUrl: string | null = null;
    async function gen() {
      if (!sanitizedReceiptHtmlWithMeta) return;
      const root = containerRef.current;
      if (!root) return;

      const el = (root.querySelector(".sheet") as HTMLElement | null) || root;

      setPdfGenerating(true);
      try {
        const html2pdfModule: any = await import("html2pdf.js");
        const h2p = html2pdfModule && (html2pdfModule.default || html2pdfModule);
        if (!h2p) throw new Error("html2pdf load failed");

        // Match the legacy template (A5 portrait).
        const worker = h2p().from(el).set({
          filename,
          margin: 10,
          jsPDF: { unit: "mm", format: "a5", orientation: "portrait" },
          html2canvas: { scale: Math.max(1, window.devicePixelRatio || 1) },
        });

        const pdf = await worker.toPdf().get("pdf");
        const nextUrl = pdf.output("bloburl");
        revokedUrl = nextUrl;
        setPdfUrl(nextUrl);
      } catch (e: any) {
        setPdfUrl(null);
        setErr(e?.message || "Failed to generate PDF");
      } finally {
        setPdfGenerating(false);
      }
    }
    gen();
    return () => {
      if (revokedUrl) {
        try { URL.revokeObjectURL(revokedUrl); } catch {}
      }
    };
  }, [sanitizedReceiptHtmlWithMeta, filename, invoiceId, printedAt, printedBy]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#02665e] mx-auto mb-3" />
          <div className="text-sm text-gray-600">Loading receipt…</div>
        </div>
      </div>
    );
  }

  if (err || !receiptHtml) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-sm text-red-600 font-medium">{err || "Receipt not available"}</div>
          <div className="mt-4">
            <Link href={backHref} className="text-[#02665e] hover:text-[#014e47] underline">
              ← Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={backHref}
          className="no-underline inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-800 shadow-sm hover:shadow-md hover:bg-gray-50 active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e] focus-visible:ring-offset-2"
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <a
          href={pdfUrl || "#"}
          download={filename}
          className={`no-underline inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-all ${
            pdfUrl ? "bg-[#02665e] hover:bg-[#014e47] shadow-sm hover:shadow-md" : "bg-gray-300 cursor-not-allowed"
          }`}
          onClick={(e) => { if (!pdfUrl) e.preventDefault(); }}
          title={pdfUrl ? "Download PDF" : "Generating PDF…"}
        >
          <Download className="w-4 h-4" />
          Download PDF
        </a>
      </div>

      {pdfGenerating && (
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#02665e]" />
          Generating PDF…
        </div>
      )}

      {pdfUrl ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <iframe title="Receipt PDF" src={pdfUrl} className="w-full h-[75vh]" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <iframe title="Receipt Template" srcDoc={sanitizedReceiptHtmlWithMeta} className="w-full h-[75vh]" />
        </div>
      )}

      {/* Hidden source HTML for PDF generation */}
      <div className="fixed left-[-10000px] top-0">
        <div ref={containerRef} dangerouslySetInnerHTML={{ __html: sanitizedReceiptHtmlWithMeta }} />
      </div>
    </div>
  );
}


