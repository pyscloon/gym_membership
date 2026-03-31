/**
 * PaymentModal - User-facing payment selection and confirmation UI
 */

import { useState, useRef } from "react";
import type { UserType, PaymentMethod } from "../types/payment";
import { MEMBERSHIP_PRICES, PAYMENT_METHOD_LABELS } from "../types/payment";

interface PaymentModalProps {
  isOpen: boolean;
  selectedUserType: UserType;
  onClose: () => void;
  onInitiatePayment: (method: PaymentMethod, proofOfPayment?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
}

export default function PaymentModal({
  isOpen,
  selectedUserType,
  onClose,
  onInitiatePayment,
  isLoading,
  error,
  onClearError,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setPhotoPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInitiatePayment = async () => {
    if (!selectedMethod) {
      setHasSubmitted(true);
      return;
    }

    if (selectedMethod === "online" && !photoPreview) {
      setHasSubmitted(true);
      return;
    }

    try {
      onClearError();
      await onInitiatePayment(selectedMethod, photoPreview || undefined);
      setSelectedMethod(null);
      setHasSubmitted(false);
      setPhotoPreview(null);
    } catch (err) {
      console.error("Payment initiation error:", err);
    }
  };

  const amount = MEMBERSHIP_PRICES[selectedUserType];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-flexNavy">Payment Details</h2>
          <button
            onClick={() => {
              onClose();
              setSelectedMethod(null);
              setHasSubmitted(false);
              onClearError();
            }}
            className="text-flexNavy/50 hover:text-flexNavy transition"
            aria-label="Close payment modal"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
            <p className="font-semibold">Error</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* Amount Display */}
        <div className="mb-6 rounded-lg bg-flexBlue/8 p-4 border border-flexBlue/25">
          <p className="text-sm text-flexNavy/70">Selected Plan</p>
          <p className="mt-1 text-lg font-semibold capitalize text-flexNavy">{selectedUserType.replace("-", " ")}</p>
          <p className="text-sm text-flexNavy/70 mt-3">Amount to Pay</p>
          <p className="text-3xl font-bold text-flexBlue mt-2">₱{amount.toLocaleString()}</p>
        </div>

        {/* Payment Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-flexNavy mb-3">
            Payment Method
            {hasSubmitted && !selectedMethod && (
              <span className="text-red-600 ml-1">*</span>
            )}
          </label>
          <div className="space-y-2">
            {(["cash",  "card", "online"] as const).map((method) => (
              <button
                key={method}
                onClick={() => {
                  setSelectedMethod(method);
                  setPhotoPreview(null);
                  onClearError();
                }}
                className={`w-full rounded-lg border-2 p-3 text-left transition ${
                  selectedMethod === method
                    ? "border-flexBlue bg-flexBlue/10"
                    : "border-flexNavy/15 hover:border-flexBlue/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-flexNavy">
                      {PAYMENT_METHOD_LABELS[method]}
                    </p>
                    <p className="text-xs text-flexNavy/60 mt-0.5">
                      {method === "cash"
                        ? "Admin will confirm your payment"
                        : method === "online"
                          ? "Admin will verify with photo proof"
                          : "Instant confirmation"}
                    </p>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      selectedMethod === method
                        ? "border-flexBlue bg-flexBlue"
                        : "border-flexNavy/30"
                    }`}
                  >
                    {selectedMethod === method && (
                      <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        {selectedMethod === "cash" && (
          <div className="mb-6 rounded-lg bg-amber-50 p-4 border border-amber-200 text-sm text-amber-800">
            <p className="font-semibold">Cash Payment Note</p>
            <p className="mt-1 text-xs">
              An admin will receive your payment request and confirm it manually. Your membership will activate once confirmed.
            </p>
          </div>
        )}

        {selectedMethod === "card" && (
          <div className="mb-6 rounded-lg bg-blue-50 p-4 border border-blue-200 text-sm text-blue-800">
            <p className="font-semibold">Card Payment</p>
            <p className="mt-1 text-xs">
              Payment will be processed immediately and you'll receive instant confirmation.
            </p>
          </div>
        )}

        {selectedMethod === "online" && (
          <div className="mb-6 space-y-4">
            <div className="rounded-lg bg-purple-50 p-4 border border-purple-200 text-sm text-purple-800">
              <p className="font-semibold">Online Transfer</p>
              <p className="mt-1 text-xs">
                Please transfer to: GYM ACCOUNT | Please upload a screenshot or photo of the payment confirmation as proof.
              </p>
            </div>

            {/* Photo Upload Section */}
            <div>
              <label className="block text-sm font-semibold text-flexNavy mb-2">
                Payment Proof
                {hasSubmitted && !photoPreview && (
                  <span className="text-red-600 ml-1">*</span>
                )}
              </label>
              
              {photoPreview ? (
                <div className="rounded-lg border border-flexNavy/15 overflow-hidden bg-white p-3">
                  <img
                    src={photoPreview}
                    alt="Payment proof preview"
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="w-full rounded-lg border border-red-300 text-red-600 px-3 py-2 text-sm font-semibold hover:bg-red-50 transition"
                  >
                    Remove Photo
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border-2 border-dashed border-flexBlue/50 p-6 text-center cursor-pointer hover:bg-flexBlue/5 transition"
                >
                  <svg className="h-8 w-8 text-flexBlue mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-semibold text-flexBlue">Click to upload photo</p>
                  <p className="text-xs text-flexNavy/60 mt-1">PNG, JPG, GIF up to 5MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              onClose();
              setSelectedMethod(null);
              setHasSubmitted(false);
              setPhotoPreview(null);
              onClearError();
            }}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-flexNavy/20 px-4 py-3 font-semibold text-flexNavy transition hover:bg-flexNavy/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleInitiatePayment}
            disabled={isLoading || !selectedMethod}
            className="flex-1 rounded-lg bg-flexBlue px-4 py-3 font-semibold text-white transition hover:bg-flexNavy disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pay Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
