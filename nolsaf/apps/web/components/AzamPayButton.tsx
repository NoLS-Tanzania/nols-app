"use client";

import React, { useState, useRef, useEffect } from 'react';
import PaymentMethodModal from './PaymentMethodModal';

interface AzamPayButtonProps {
  invoiceId: number;
  amount: number;
  currency?: string;
  phoneNumber?: string;
  provider?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  showPaymentMethodModal?: boolean; // If true, shows payment method selection modal
}

/**
 * AzamPay Payment Button Component
 * 
 * Features:
 * - Prevents double-clicking with button disable
 * - Idempotency key generation
 * - Payment status polling
 * - Error handling
 * - Success/error callbacks
 */
export default function AzamPayButton({
  invoiceId,
  amount,
  currency = "TZS",
  phoneNumber: initialPhoneNumber,
  provider: initialProvider,
  onSuccess,
  onError,
  className = "",
  disabled: externalDisabled = false,
  children,
  showPaymentMethodModal = true,
}: AzamPayButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "initiating" | "pending" | "success" | "failed">("idle");
  // Removed unused idempotencyKey state
  // Removed unused paymentRef state
  const [showModal, setShowModal] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<string | undefined>(initialPhoneNumber);
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>(initialProvider);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const isSubmittingRef = useRef(false);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Stop polling when payment succeeds or fails
  useEffect(() => {
    if (paymentStatus === "success" || paymentStatus === "failed") {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [paymentStatus]);

  /**
   * Poll payment status
   */
  const pollPaymentStatus = async (ref: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${API_URL}/api/payments/azampay/status/${ref}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to check payment status");
      }

      const data = await response.json();
      
      if (data.invoiceStatus === "PAID" || data.paymentStatus === "SUCCESS") {
        setPaymentStatus("success");
        if (onSuccess) {
          onSuccess(data);
        }
        return true; // Payment completed
      } else if (data.paymentStatus === "FAILED") {
        setPaymentStatus("failed");
        if (onError) {
          onError("Payment failed");
        }
        return true; // Payment failed
      }

      return false; // Still pending
    } catch (error: any) {
      console.error("Error polling payment status:", error);
      return false;
    }
  };

  /**
   * Start polling payment status
   */
  const startPolling = (ref: string) => {
    // Poll immediately
    pollPaymentStatus(ref);

    // Then poll every 3 seconds for up to 2 minutes
    let pollCount = 0;
    const maxPolls = 40; // 40 * 3s = 120s = 2 minutes

    pollingIntervalRef.current = setInterval(async () => {
      pollCount++;
      const completed = await pollPaymentStatus(ref);

      if (completed || pollCount >= maxPolls) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        if (pollCount >= maxPolls && !completed) {
          // Timeout - stop polling but keep status as pending
          console.warn("Payment status polling timeout");
        }
      }
    }, 3000);
  };

  /**
   * Initiate payment with selected method
   */
  const initiatePayment = async (phone?: string, provider?: string) => {
    const phoneToUse = phone || selectedPhone || initialPhoneNumber;
    const providerToUse = provider || selectedProvider || "Airtel";

    // Double-click protection: ignore clicks within 500ms
    const now = Date.now();
    if (now - lastClickTimeRef.current < 500) {
      return;
    }
    lastClickTimeRef.current = now;

    // Prevent multiple simultaneous submissions
    if (isSubmittingRef.current || isProcessing) {
      return;
    }

    // If payment method modal is enabled and no phone/provider selected, show modal
    if (showPaymentMethodModal && !phoneToUse) {
      setShowModal(true);
      return;
    }

    if (!phoneToUse) {
      if (onError) {
        onError("Phone number is required for payment");
      }
      return;
    }

    isSubmittingRef.current = true;
    setIsProcessing(true);
    setPaymentStatus("initiating");

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      
      // Generate idempotency key
      const key = `azampay-${invoiceId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      // Removed setIdempotencyKey(key) as idempotencyKey state is not used

      const response = await fetch(`${API_URL}/api/payments/azampay/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          invoiceId,
          idempotencyKey: key,
          phoneNumber: phoneToUse,
          provider: providerToUse,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Payment initiation failed");
      }

      if (data.ok) {
        setPaymentStatus("pending");

        // If there's a checkout URL, redirect to it
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          // Start polling for status
          startPolling(data.paymentRef || data.transactionId);
        }
      } else {
        throw new Error(data.error || "Payment initiation failed");
      }
    } catch (error: any) {
      console.error("Payment initiation error:", error);
      setPaymentStatus("failed");
      setIsProcessing(false);
      isSubmittingRef.current = false;
      
      if (onError) {
        onError(error.message || "Failed to initiate payment");
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    initiatePayment();
  };

  const handlePaymentMethodSelect = (method: {
    provider: string;
    phoneNumber: string;
    providerName: string;
  }) => {
    setSelectedPhone(method.phoneNumber);
    setSelectedProvider(method.provider);
    setShowModal(false);
    // Initiate payment with selected method
    initiatePayment(method.phoneNumber, method.provider);
  };

  const isDisabled = externalDisabled || isProcessing || paymentStatus === "pending" || paymentStatus === "success";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`
          ${className}
          ${isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
          transition-all duration-200
        `}
        aria-busy={isProcessing}
        aria-label={
          isProcessing
            ? "Processing payment..."
            : paymentStatus === "pending"
            ? "Payment in progress..."
            : "Pay with AzamPay"
        }
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            {paymentStatus === "initiating" && "Initiating payment..."}
            {paymentStatus === "pending" && "Waiting for payment confirmation..."}
          </span>
        ) : paymentStatus === "success" ? (
          <span className="flex items-center gap-2">
            <span>✓</span>
            Payment Successful!
          </span>
        ) : paymentStatus === "failed" ? (
          <span className="flex items-center gap-2">
            <span>✗</span>
            Payment Failed - Click to Retry
          </span>
        ) : (
          children || `Pay ${amount.toLocaleString()} ${currency}`
        )}
      </button>

      {/* Payment Method Selection Modal */}
      {showPaymentMethodModal && (
        <PaymentMethodModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSelect={handlePaymentMethodSelect}
          invoiceId={invoiceId}
          amount={amount}
          currency={currency}
          defaultPhone={initialPhoneNumber}
        />
      )}
    </>
  );
}


