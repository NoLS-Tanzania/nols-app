"use client";

import { Wallet, CreditCard, Eye, Smartphone, Search, X, Clock, CheckCircle, User, Building, Download, CheckSquare, Square, AlertCircle } from "lucide-react";
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import Image from "next/image";
import { escapeAttr, escapeHtml } from "@/utils/html";

interface InvoicePayment {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  receiptNumber?: string | null;
  date: string;
  amount: number;
  currency: string;
  status: string;
  owner: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  property: {
    id: number;
    title: string;
    type: string;
  } | null;
  paymentMethod?: string | null;
  paymentRef?: string | null;
  accountNumber?: string | null;
  approvedBy?: {
    id: number;
    name: string | null;
  } | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  paymentEvent?: {
    provider: string;
    eventId: string;
    status: string;
    createdAt: string;
  } | null;
}

interface SummaryData {
  waiting: number;
  paid: number;
}

export default function Page() {
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'waiting' | 'paid'>('waiting');
  const [summary, setSummary] = useState<SummaryData>({ waiting: 0, paid: 0 });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const pageSize = 30;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<InvoicePayment | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const api = useMemo(() => axios.create({ baseURL: "", withCredentials: true }), []);

  const formatDateOnly = (isoOrDate: string | Date) => {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatTimeWithSeconds = (isoOrDate: string | Date) => {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mi}:${ss}`;
  };

  const formatCurrency = (amount: number, currency = 'TZS') => {
    try {
      return new Intl.NumberFormat('en-TZ', { 
        style: 'currency', 
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (e) {
      return `${currency} ${amount.toLocaleString()}`;
    }
  };

  const formatPaymentMethod = (method?: string | null) => {
    if (!method) return 'Not specified';
    // Capitalize and format
    return method.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const generateReceiptPDF = async (payment: InvoicePayment) => {
    try {
      const receiptNo = payment.receiptNumber || `RCPT-${payment.invoiceId}`;
      const suggested = `${receiptNo}.pdf`;

      const safeText = (v: unknown) => escapeHtml(v);
      const safeAttr = (v: unknown) => escapeAttr(v);
      
      // Get QR code image as data URL
      const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
      const qrImageUrl = `${origin}/api/admin/invoices/${payment.invoiceId}/receipt.png`;
      
      let qrDataUrl = qrImageUrl;
      try {
        const resp = await fetch(qrImageUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          const reader = new FileReader();
          qrDataUrl = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        console.warn('Failed to convert QR to data URL, using image URL', e);
      }

      const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      };

      const formatDateTime = (dateStr?: string | null) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Payment Receipt - ${safeText(receiptNo)}</title>
          <style>
            @media print {
              @page {
                size: A5;
                margin: 20mm;
              }
              body { margin: 0; }
            }
            body {
              font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
              line-height: 1.45;
              color: #000000;
              background: #ffffff;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .sheet {
              position: relative;
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 18px 18px 16px;
              max-width: 560px;
              margin: 0 auto;
              overflow: hidden;
            }
            .sheet::before {
              content: "NoLSAF";
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 84px;
              letter-spacing: 6px;
              color: rgba(2, 102, 94, 0.06);
              transform: rotate(-18deg);
              pointer-events: none;
              z-index: 0;
            }
            .content { position: relative; z-index: 1; }
            .header {
              text-align: center;
              border-bottom: 2px solid rgba(2, 102, 94, 0.25);
              padding-bottom: 14px;
              margin-bottom: 16px;
            }
            .header h1 {
              color: #02665e;
              margin: 0;
              font-size: 22px;
              letter-spacing: 0.2px;
              font-weight: 800;
            }
            .header .subtitle {
              color: #334155;
              font-size: 12px;
              margin-top: 3px;
              font-weight: 600;
            }
            .code-box {
              position: relative;
              background: linear-gradient(135deg, rgba(2, 102, 94, 0.12), rgba(2, 102, 94, 0.06));
              border: 2px solid rgba(2, 102, 94, 0.6);
              padding: 16px 16px 14px;
              text-align: center;
              margin: 14px 0 16px;
              border-radius: 16px;
            }
            .verified-stamp {
              position: absolute;
              top: 12px;
              right: 12px;
              border: 2px solid rgba(2, 102, 94, 0.7);
              color: #02665e;
              border-radius: 9999px;
              padding: 6px 10px;
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 1.2px;
              text-transform: uppercase;
              transform: rotate(-10deg);
              background: rgba(255, 255, 255, 0.75);
            }
            .code {
              font-size: 38px;
              font-weight: 900;
              color: #02665e;
              letter-spacing: 4px;
              margin: 8px 0 6px;
            }
            .section {
              margin: 12px 0;
              page-break-inside: avoid;
            }
            .section-title {
              background: rgba(2, 102, 94, 0.12);
              color: #02665e;
              padding: 10px 12px;
              font-weight: 900;
              margin-bottom: 0;
              border-radius: 12px 12px 0 0;
              border: 1px solid rgba(2, 102, 94, 0.3);
              border-bottom: none;
            }
            .section-content {
              border: 1px solid rgba(148, 163, 184, 0.55);
              border-top: none;
              padding: 12px;
              border-radius: 0 0 12px 12px;
              background: #ffffff;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid rgba(148, 163, 184, 0.35);
              gap: 12px;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: 700;
              color: #1e293b;
              width: 40%;
            }
            .detail-value {
              color: #000000;
              width: 60%;
              text-align: right;
              font-weight: 700;
            }
            .detail-value strong {
              color: #000000;
              font-weight: 900;
            }
            .footer {
              margin-top: 14px;
              padding-top: 14px;
              border-top: 1px solid rgba(148, 163, 184, 0.45);
              color: #475569;
              font-size: 11px;
            }
            .footer-grid {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 14px;
            }
            .footer-left { flex: 1; min-width: 0; }
            .footer-title {
              font-size: 12px;
              font-weight: 900;
              color: #000000;
              margin: 0;
            }
            .footer-meta {
              margin-top: 6px;
              font-size: 11px;
              color: #334155;
              line-height: 1.35;
              font-weight: 600;
            }
            .qr-code {
              width: 120px;
              height: 120px;
              margin: 0 auto;
              display: block;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="content">
              <div class="header">
                <h1>NoLSAF</h1>
                <div class="subtitle">Payment Receipt Confirmation</div>
              </div>

              <div class="code-box">
                <div class="verified-stamp">PAID</div>
                <div style="font-size: 12px; color: #1e293b; margin-bottom: 6px; font-weight: 800;">Receipt Number</div>
                <div class="code">${safeText(receiptNo)}</div>
                <div style="font-size: 11px; color: #334155; margin-top: 2px; font-weight: 600;">
                  ${safeText(formatDate(payment.paidAt))}
                </div>
              </div>

              <div class="section">
                <div class="section-title">Payment Information</div>
                <div class="section-content">
                  <div class="detail-row">
                    <span class="detail-label">Amount:</span>
                    <span class="detail-value"><strong>${safeText(formatCurrency(payment.amount, payment.currency))}</strong></span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Payment Method:</span>
                    <span class="detail-value">${safeText(formatPaymentMethod(payment.paymentMethod) || 'Not specified')}</span>
                  </div>
                  ${payment.accountNumber ? `
                  <div class="detail-row">
                    <span class="detail-label">Account:</span>
                    <span class="detail-value" style="font-family: monospace;">${safeText(maskAccountNumber(payment.accountNumber))}</span>
                  </div>
                  ` : ''}
                  ${payment.paymentRef ? `
                  <div class="detail-row">
                    <span class="detail-label">Payment Reference:</span>
                    <span class="detail-value" style="font-family: monospace;">${safeText(payment.paymentRef)}</span>
                  </div>
                  ` : ''}
                  <div class="detail-row">
                    <span class="detail-label">Date Paid:</span>
                    <span class="detail-value">${safeText(formatDateTime(payment.paidAt))}</span>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Invoice Details</div>
                <div class="section-content">
                  <div class="detail-row">
                    <span class="detail-label">Invoice Number:</span>
                    <span class="detail-value" style="font-family: monospace;">${safeText(payment.invoiceNumber)}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Owner:</span>
                    <span class="detail-value">${safeText(payment.owner.name || `Owner #${payment.owner.id}`)}</span>
                  </div>
                  ${payment.property ? `
                  <div class="detail-row">
                    <span class="detail-label">Property:</span>
                    <span class="detail-value">${safeText(payment.property.title)}</span>
                  </div>
                  ` : ''}
                </div>
              </div>

              <div class="footer">
                <div class="footer-grid">
                  <div class="footer-left">
                    <p class="footer-title">NoLSAF — Your Stay, Our Promise</p>
                    <div class="footer-meta">
                      Official payment receipt • Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style="text-align: center;">
                    ${qrDataUrl ? `
                    <img src="${safeAttr(qrDataUrl)}" alt="Receipt QR Code" class="qr-code" />
                    <div style="font-size: 10px; margin-top: 6px; color: #334155; font-weight: 800;">Scan to verify</div>
                    ` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Create container and append
      const container = document.createElement('div');
      container.style.width = '148mm';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.innerHTML = receiptHtml;
      document.body.appendChild(container);

      // Dynamic import html2pdf
      const html2pdfModule = await import('html2pdf.js');
      const h2p = html2pdfModule && (html2pdfModule.default || html2pdfModule);
      if (!h2p) throw new Error('html2pdf load failed');

      await h2p().from(container).set({
        filename: suggested,
        margin: 10,
        jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' },
        html2canvas: { 
          scale: Math.max(2, window.devicePixelRatio || 2), 
          useCORS: true,
          logging: false,
          letterRendering: true,
          backgroundColor: '#ffffff'
        }
      }).save();

      container.remove();
    } catch (err: any) {
      console.error('PDF generation failed', err);
      const errorMessage = err?.message || 'Failed to generate PDF. Please try again.';
      throw new Error(errorMessage);
    }
  };

  // Bulk selection helpers
  const toggleSelectAll = () => {
    if (selectedIds.size === payments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(payments.map(p => p.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk mark as paid
  const handleBulkMarkPaid = async () => {
    if (selectedIds.size === 0) return;
    if (activeTab !== 'waiting') {
      alert('Bulk mark as paid is only available for waiting payments.');
      return;
    }

    const paymentRef = prompt(`Enter payment reference for ${selectedIds.size} invoice(s):`);
    if (!paymentRef || !paymentRef.trim()) return;

    const confirmMessage = `Mark ${selectedIds.size} invoice(s) as paid with reference "${paymentRef}"?`;
    if (!window.confirm(confirmMessage)) return;

    setBulkActionLoading(true);
    setError(null);
    try {
      const promises = Array.from(selectedIds).map(id =>
        api.post(`/api/admin/revenue/invoices/${id}/mark-paid`, { 
          method: "BANK", 
          ref: paymentRef.trim() 
        }).catch(err => ({ error: err }))
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => 'error' in r);
      
      if (errors.length > 0) {
        const successCount = selectedIds.size - errors.length;
        alert(`Successfully marked ${successCount} invoice(s) as paid. ${errors.length} failed.`);
      } else {
        alert(`Successfully marked ${selectedIds.size} invoice(s) as paid.`);
      }
      
      await loadPayments();
      await loadSummary();
      clearSelection();
    } catch (err: any) {
      console.error('Bulk mark paid failed', err);
      const errorMessage = err?.response?.data?.error || err?.message || 'Failed to mark invoices as paid. Please try again.';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // CSV Export
  const handleExportCSV = async () => {
    setExportLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('tab', activeTab);
      if (q.trim()) params.append('q', q.trim());
      if (selectedIds.size > 0) {
        params.append('selectedIds', Array.from(selectedIds).join(','));
      }

      const response = await api.get(`/admin/payments/export.csv?${params.toString()}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payments-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('CSV export failed', err);
      const errorMessage = err?.response?.data?.error || err?.message || 'Failed to export CSV. Please try again.';
      setError(errorMessage);
      alert(`Export failed: ${errorMessage}`);
    } finally {
      setExportLoading(false);
    }
  };

  const maskAccountNumber = (account?: string | null): string | null => {
    if (!account) return null;
    
    const cleaned = String(account).trim().replace(/[\s\-\(\)]/g, '');
    
    // Extract digits only for phone number detection
    const digits = cleaned.replace(/\D/g, '');
    
    // Determine if it's a phone number (starts with 0, 255, +255, 254, +254, or 9-10 digit number)
    const isPhoneNumber = /^(0|255|\+255|254|\+254)/.test(cleaned) || /^\d{9,10}$/.test(cleaned);
    
    if (isPhoneNumber) {
      // Normalize to local format (0XXX...)
      let localNumber = digits;
      
      // Case 1: Has country code (255 or 254) - convert to local format
      if (digits.startsWith('255')) {
        localNumber = '0' + digits.slice(3); // 255765012370 → 0765012370
      } else if (digits.startsWith('254')) {
        localNumber = '0' + digits.slice(3); // 254765012370 → 0765012370
      }
      // Case 2: Already in local format (starts with 0) - use as is
      // Case 3: No leading 0 or country code - assume it's local format (already correct)
      
      // Ensure it starts with 0 for proper masking (Tanzania/Kenya format)
      if (!localNumber.startsWith('0') && localNumber.length >= 9) {
        localNumber = '0' + localNumber;
      }
      
      if (localNumber.length >= 9 && localNumber.startsWith('0')) {
        // Format: 0765012370 → 076*****70 (first 3, last 2)
        const first3 = localNumber.slice(0, 3);
        const last2 = localNumber.slice(-2);
        return `${first3}*****${last2}`;
      }
    }
    
    // If it looks like a bank account (longer number, might have letters/numbers)
    if (cleaned.length > 8) {
      // Format: Show first 3 and last 2 characters (similar to phone)
      const first3 = cleaned.slice(0, 3);
      const last2 = cleaned.slice(-2);
      return `${first3}*****${last2}`;
    }
    
    // Fallback: mask middle characters
    if (cleaned.length > 5) {
      const first3 = cleaned.slice(0, 3);
      const last2 = cleaned.slice(-2);
      return `${first3}${'*'.repeat(Math.max(5, cleaned.length - 5))}${last2}`;
    }
    
    return cleaned; // Too short to mask meaningfully
  };

  const isMobileMoney = (method?: string | null) => {
    if (!method) return false;
    return /mobile|mpesa|tigopesa|airtel|lipa|m-pesa/i.test(method);
  };

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        pageSize,
        tab: activeTab,
      };
      if (q.trim() !== '') params.q = q.trim();

      const r = await api.get<{ items: InvoicePayment[]; total: number }>('/admin/payments/invoices', { params });
      setPayments(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load payments', err);
      const errorMessage = err?.response?.data?.error || err?.message || 'Failed to load payments. Please try again.';
      setError(errorMessage);
      setPayments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [api, activeTab, page, q]);

  const loadSummary = useCallback(async () => {
    try {
      const r = await api.get<SummaryData>('/admin/payments/summary');
      if (r.data) {
        setSummary({
          waiting: r.data.waiting || 0,
          paid: r.data.paid || 0,
        });
      }
    } catch (err: any) {
      console.error('Failed to load summary', err);
      // Don't set error state for summary failure, just use defaults
      setSummary({ waiting: 0, paid: 0 });
    }
  }, [api]);

  useEffect(() => {
    // Note: authify should be imported from your auth utility
    // For now, we'll rely on the API's requireRole middleware
    loadPayments();
    loadSummary();
  }, [loadPayments, loadSummary]);

  const badgeClasses = (status: string) => {
    if (status === 'PAID' || status === 'SUCCESS' || status === 'Completed') {
      return 'bg-green-50 text-green-700 border border-green-200';
    }
    if (status === 'APPROVED') {
      return 'bg-yellow-50 text-yellow-800 border border-yellow-200';
    }
    return 'bg-gray-50 text-gray-700 border border-gray-200';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mb-4">
            <Wallet className="h-8 w-8 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">Track and reconcile incoming and outgoing payments</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setActiveTab('waiting')}
          className={`bg-white rounded-lg border-2 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] ${
            activeTab === 'waiting'
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-200 hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                activeTab === 'waiting' ? 'bg-teal-100' : 'bg-yellow-100'
              }`}>
                <Clock className={`h-6 w-6 ${
                  activeTab === 'waiting' ? 'text-teal-600' : 'text-yellow-600'
                }`} />
              </div>
              <div className="text-left">
                <p className={`text-xs font-semibold uppercase tracking-wider ${
                  activeTab === 'waiting' ? 'text-teal-700' : 'text-gray-500'
                }`}>
                  Waiting
                </p>
                <p className={`text-2xl font-bold mt-1 ${
                  activeTab === 'waiting' ? 'text-teal-900' : 'text-gray-900'
                }`}>
                  {loading && summary.waiting === 0 ? "..." : summary.waiting.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Pending payments</p>
              </div>
            </div>
            {activeTab === 'waiting' && (
              <div className="h-3 w-3 rounded-full bg-teal-500"></div>
            )}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('paid')}
          className={`bg-white rounded-lg border-2 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] ${
            activeTab === 'paid'
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-200 hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                activeTab === 'paid' ? 'bg-teal-100' : 'bg-green-100'
              }`}>
                <CheckCircle className={`h-6 w-6 ${
                  activeTab === 'paid' ? 'text-teal-600' : 'text-green-600'
                }`} />
              </div>
              <div className="text-left">
                <p className={`text-xs font-semibold uppercase tracking-wider ${
                  activeTab === 'paid' ? 'text-teal-700' : 'text-gray-500'
                }`}>
                  Paid History
                </p>
                <p className={`text-2xl font-bold mt-1 ${
                  activeTab === 'paid' ? 'text-teal-900' : 'text-gray-900'
                }`}>
                  {loading && summary.paid === 0 ? "..." : summary.paid.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Completed payments</p>
              </div>
            </div>
            {activeTab === 'paid' && (
              <div className="h-3 w-3 rounded-full bg-teal-500"></div>
            )}
          </div>
        </button>
      </div>

      {/* Page Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-red-800">Something went wrong</div>
            <div className="text-sm text-red-700 break-words">{error}</div>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
            aria-label="Dismiss error"
            title="Dismiss"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="px-4 py-3 bg-teal-50 border-b border-teal-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-teal-900">
              <CheckSquare className="h-5 w-5" />
              <span>{selectedIds.size} payment{selectedIds.size !== 1 ? 's' : ''} selected</span>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'waiting' && (
                <button
                  onClick={handleBulkMarkPaid}
                  disabled={bulkActionLoading}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {bulkActionLoading ? 'Processing...' : 'Mark as Paid'}
                </button>
              )}
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
        {/* Search + Export */}
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <div className="relative w-full sm:flex-1 sm:max-w-xl mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm shadow-sm"
                placeholder="Search by invoice number, owner name, property..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                  }
                }}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={exportLoading}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:shadow-md hover:bg-gray-50 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                title="Export CSV"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm font-medium">{exportLoading ? "Exporting..." : "Export CSV"}</span>
              </button>
            </div>
          </div>
        </div>
        {loading ? (
          <>
            {/* Skeleton Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-4"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="h-8 bg-gray-200 rounded w-16 ml-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : payments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No {activeTab === 'waiting' ? 'pending' : 'completed'} payments found.</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search query or switch tabs.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center p-1 hover:bg-gray-200 rounded transition-colors"
                        title={selectedIds.size === payments.length ? 'Deselect all' : 'Select all'}
                      >
                        {selectedIds.size === payments.length ? (
                          <CheckSquare className="h-4 w-4 text-teal-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleSelect(payment.id)}
                          className="flex items-center justify-center p-1 hover:bg-gray-100 rounded transition-colors"
                          title={selectedIds.has(payment.id) ? 'Deselect' : 'Select'}
                        >
                          {selectedIds.has(payment.id) ? (
                            <CheckSquare className="h-4 w-4 text-teal-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatDateOnly(payment.date)}</div>
                        <div className="text-xs text-gray-500">{formatTimeWithSeconds(payment.date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{payment.owner.name || payment.owner.email || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {payment.property ? (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">{payment.property.title}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200 font-mono">
                          {payment.invoiceNumber}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isMobileMoney(payment.paymentMethod) ? (
                            <Smartphone className="h-4 w-4 text-teal-600" />
                          ) : (
                            <CreditCard className="h-4 w-4 text-teal-600" />
                          )}
                          <span className="text-sm text-gray-500">
                            {formatPaymentMethod(payment.paymentMethod)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 font-mono">
                          {maskAccountNumber(payment.accountNumber) || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClasses(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setModalOpen(true);
                          }}
                          className="text-teal-600 hover:text-teal-900 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {payments.map((payment) => (
                <div key={payment.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {payment.owner.name || payment.owner.email || 'N/A'}
                        </span>
                      </div>
                      {payment.property && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Building className="h-3 w-3" />
                          <span>{payment.property.title}</span>
                        </div>
                      )}
                    </div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClasses(payment.status)}`}>
                      {payment.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">Invoice:</span>
                      <code className="ml-1 text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded text-xs font-mono">
                        {payment.invoiceNumber}
                      </code>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Amount:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {formatCurrency(payment.amount, payment.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <span className="ml-1 text-gray-700">{formatDateOnly(payment.date)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Method:</span>
                      <span className="ml-1 text-gray-700">{formatPaymentMethod(payment.paymentMethod)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Account:</span>
                      <span className="ml-1 text-gray-700 font-mono">{maskAccountNumber(payment.accountNumber) || '-'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPayment(payment);
                      setModalOpen(true);
                    }}
                    className="w-full mt-2 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-teal-600 bg-gray-50 border border-teal-600 rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
                  >
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>View Details</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && payments.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} payments
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= total}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: View Invoice Details */}
      {modalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <h3 className="text-xl font-semibold text-gray-900">
                Invoice {selectedPayment.invoiceNumber}
              </h3>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSelectedPayment(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Modal Error Message */}
              {modalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700">{modalError}</p>
                  </div>
                  <button
                    onClick={() => setModalError(null)}
                    className="text-red-400 hover:text-red-600"
                    aria-label="Dismiss modal error"
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Invoice Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatDateOnly(selectedPayment.date)} {formatTimeWithSeconds(selectedPayment.date)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</div>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClasses(selectedPayment.status)}`}>
                    {selectedPayment.status}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Owner</div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedPayment.owner.name || selectedPayment.owner.email || 'N/A'}
                  </div>
                  {selectedPayment.owner.phone && (
                    <div className="text-xs text-gray-500 mt-1">{selectedPayment.owner.phone}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Property</div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedPayment.property?.title || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Amount</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Payment Method</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatPaymentMethod(selectedPayment.paymentMethod) || 'Not specified'}
                  </div>
                </div>
                {selectedPayment.accountNumber && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Account</div>
                    <div className="text-sm font-medium text-gray-900 font-mono">
                      {maskAccountNumber(selectedPayment.accountNumber)}
                    </div>
                  </div>
                )}
                {selectedPayment.paymentRef && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Payment Reference</div>
                    <div className="text-sm font-mono text-gray-900">{selectedPayment.paymentRef}</div>
                  </div>
                )}
                {selectedPayment.receiptNumber && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Receipt Number</div>
                    <div className="text-sm font-mono text-gray-900">{selectedPayment.receiptNumber}</div>
                  </div>
                )}
              </div>

              {/* Payment Event Info (if paid) */}
              {selectedPayment.paymentEvent && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Payment Event</div>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Provider:</span>
                      <span className="font-medium text-gray-900">{selectedPayment.paymentEvent.provider}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Event ID:</span>
                      <span className="font-mono text-gray-900">{selectedPayment.paymentEvent.eventId}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Processed:</span>
                      <span className="text-gray-900">
                        {formatDateOnly(selectedPayment.paymentEvent.createdAt)} {formatTimeWithSeconds(selectedPayment.paymentEvent.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt QR Code (if paid and has receipt) */}
              {selectedPayment.status === 'PAID' && selectedPayment.receiptNumber && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Receipt QR Code</div>
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-6 flex flex-col items-center justify-center">
                    <div className="bg-white rounded-lg p-4 shadow-md border-2 border-teal-200">
                      <Image
                        src={`/api/admin/invoices/${selectedPayment.invoiceId}/receipt.png`}
                        alt="Receipt QR Code"
                        width={224}
                        height={224}
                        unoptimized
                        className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                        onError={(e) => {
                          // Hide QR code if image fails to load
                          (e.currentTarget as any).style.display = 'none';
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-4 text-center max-w-xs">
                      Scan this QR code to verify the receipt authenticity
                    </p>
                    {selectedPayment.receiptNumber && (
                      <p className="text-xs font-mono text-teal-700 mt-2 bg-white px-3 py-1 rounded border border-teal-200">
                        {selectedPayment.receiptNumber}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                {selectedPayment.receiptNumber && selectedPayment.status === 'PAID' && (
                  <button
                    onClick={async () => {
                      try {
                        await generateReceiptPDF(selectedPayment);
                      } catch (err: any) {
                        console.error('Failed to generate PDF', err);
                        const errorMessage = err?.message || 'Failed to generate PDF. Please try again.';
                        setModalError(errorMessage);
                        setTimeout(() => setModalError(null), 5000);
                      }
                    }}
                    title="Download Receipt"
                    className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setSelectedPayment(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
