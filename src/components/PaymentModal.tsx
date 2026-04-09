/**
 * PaymentModal - User-facing payment selection and confirmation UI
 * Discount & Voucher logic uses the Decorator Design Pattern.
 */

import { useState, useRef } from "react";
import type { UserType, PaymentMethod } from "../types/payment";
import { MEMBERSHIP_PRICES, PAYMENT_METHOD_LABELS } from "../types/payment";
import { PAYMENT_TIER_OPTIONS, resolveTierSelection } from "../lib/paymentTierSelection";

// DECORATOR PATTERN — Price Calculation

/** Base interface every price component must satisfy */
interface PriceComponent {
  getAmount(): number;
  getDescription(): string;
}

/** Concrete base: wraps the raw membership price */
class BasePrice implements PriceComponent {
  private readonly price: number;
  constructor(price: number) { this.price = price; }
  getAmount() { return this.price; }
  getDescription() { return "Base price"; }
}

/** Abstract decorator — all decorators extend this */
abstract class PriceDecorator implements PriceComponent {
  protected readonly wrapped: PriceComponent;
  constructor(wrapped: PriceComponent) { this.wrapped = wrapped; }
  getAmount() { return this.wrapped.getAmount(); }
  getDescription() { return this.wrapped.getDescription(); }
}

/** Discount decorator — applies a percentage reduction (e.g. 20%) */
class DiscountDecorator extends PriceDecorator {
  private readonly discountRate: number;
  private readonly label: string;
  constructor(wrapped: PriceComponent, discountRate: number, label: string) {
    super(wrapped);
    this.discountRate = discountRate;
    this.label = label;
  }
  getAmount() {
    return Math.round(this.wrapped.getAmount() * (1 - this.discountRate));
  }
  getDescription() {
    return `${this.wrapped.getDescription()} → ${this.label} (${this.discountRate * 100}% off)`;
  }
}

/** Voucher decorator — applies a flat-amount or percentage coupon */
class VoucherDecorator extends PriceDecorator {
  private readonly voucher: ResolvedVoucher;
  constructor(wrapped: PriceComponent, voucher: ResolvedVoucher) {
    super(wrapped);
    this.voucher = voucher;
  }
  getAmount() {
    const base = this.wrapped.getAmount();
    if (this.voucher.type === "flat") {
      return Math.max(0, base - this.voucher.value);
    }
    return Math.max(0, Math.round(base * (1 - this.voucher.value)));
  }
  getDescription() {
    const detail =
      this.voucher.type === "flat"
        ? `₱${this.voucher.value} off`
        : `${this.voucher.value * 100}% off`;
    return `${this.wrapped.getDescription()} → Voucher "${this.voucher.code}" (${detail})`;
  }
}

// Voucher registry (placeholder ini)


interface ResolvedVoucher {
  code: string;
  type: "flat" | "percent";
  value: number;
  label: string;
}

const VOUCHER_REGISTRY: Record<string, ResolvedVoucher> = {
  red: { code: "red", type: "flat",    value: 100,  label: "₱100 off" },
  kenji:  { code: "kenji",  type: "percent", value: 0.10, label: "10% off"  },
  Guilaran: { code: "Guilaran", type: "flat",    value: 200,  label: "₱200 off" },
};

function resolveVoucher(code: string): ResolvedVoucher | null {
  return VOUCHER_REGISTRY[code.trim().toUpperCase()] ?? null;
}

// Discount category config
type DiscountCategory = "student" | "senior" | "pwd";

const DISCOUNT_CONFIG: Record<
  DiscountCategory,
  { label: string; rate: number; color: string; description: string }
> = {
  student: { label: "Student",       rate: 0.20, color: "blue",   description: "20% off with valid school ID" },
  senior:  { label: "Senior Citizen",rate: 0.20, color: "emerald",description: "20% off with senior citizen ID" },
  pwd:     { label: "PWD",           rate: 0.20, color: "violet", description: "20% off with PWD ID card" },
};

interface PaymentModalProps {
  isOpen: boolean;
  selectedUserType: UserType;
  onSelectUserType?: (userType: UserType) => void;
  onClose: () => void;
  onInitiatePayment: (
    method: PaymentMethod,
    proofOfPayment?: string,
    discountCategory?: DiscountCategory,
    discountIdProof?: string,
    voucherCode?: string
  ) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
}

export default function PaymentModal({
  isOpen,
  selectedUserType,
  onSelectUserType,
  onClose,
  onInitiatePayment,
  isLoading,
  error,
  onClearError,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod]         = useState<PaymentMethod | null>(null);
  const [hasSubmitted, setHasSubmitted]             = useState(false);
  const [photoPreview, setPhotoPreview]             = useState<string | null>(null);

  // Discount state
  const [discountCategory, setDiscountCategory]     = useState<DiscountCategory | null>(null);
  const [discountIdPreview, setDiscountIdPreview]   = useState<string | null>(null);

  // Voucher state
  const [voucherInput, setVoucherInput]             = useState("");
  const [appliedVoucher, setAppliedVoucher]         = useState<ResolvedVoucher | null>(null);
  const [voucherError, setVoucherError]             = useState<string | null>(null);
  const [voucherSuccess, setVoucherSuccess]         = useState<string | null>(null);

  const fileInputRef      = useRef<HTMLInputElement>(null);
  const discountIdRef     = useRef<HTMLInputElement>(null);

  // Photo handlers

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDiscountIdSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setDiscountIdPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleApplyVoucher = () => {
    setVoucherError(null);
    setVoucherSuccess(null);
    if (!voucherInput.trim()) {
      setVoucherError("Please enter a voucher code.");
      return;
    }
    const resolved = resolveVoucher(voucherInput);
    if (!resolved) {
      setVoucherError("Invalid voucher code. Please try again.");
      setAppliedVoucher(null);
      return;
    }
    setAppliedVoucher(resolved);
    setVoucherSuccess(`Voucher applied: ${resolved.label}`);
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput("");
    setVoucherError(null);
    setVoucherSuccess(null);
  };

  const rawPrice = MEMBERSHIP_PRICES[selectedUserType];
  let price: PriceComponent = new BasePrice(rawPrice);

  if (discountCategory) {
    const cfg = DISCOUNT_CONFIG[discountCategory];
    price = new DiscountDecorator(price, cfg.rate, cfg.label);
  }
  if (appliedVoucher) {
    price = new VoucherDecorator(price, appliedVoucher);
  }

  const finalAmount   = price.getAmount();
  const totalSavings  = rawPrice - finalAmount;


  const handleInitiatePayment = async () => {
    if (!selectedMethod) { setHasSubmitted(true); return; }
    if (selectedMethod === "online" && !photoPreview) { setHasSubmitted(true); return; }
    if (discountCategory && !discountIdPreview) { setHasSubmitted(true); return; }

    try {
      onClearError();
      await onInitiatePayment(
        selectedMethod,
        photoPreview || undefined,
        discountCategory || undefined,
        discountIdPreview || undefined,
        appliedVoucher?.code
      );

      setSelectedMethod(null);
      setHasSubmitted(false);
      setPhotoPreview(null);
      setDiscountCategory(null);
      setDiscountIdPreview(null);
      setVoucherInput("");
      setAppliedVoucher(null);
      setVoucherError(null);
      setVoucherSuccess(null);
    } catch (err) {
      console.error("Payment initiation error:", err);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedMethod(null);
    setHasSubmitted(false);
    setPhotoPreview(null);
    setDiscountCategory(null);
    setDiscountIdPreview(null);
    setVoucherInput("");
    setAppliedVoucher(null);
    setVoucherError(null);
    setVoucherSuccess(null);
    onClearError();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8 max-h-[90vh] overflow-y-auto">

        {/* ── Header ── */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-flexNavy">Payment Details</h2>
          <button
            onClick={handleClose}
            className="text-flexNavy/50 hover:text-flexNavy transition"
            aria-label="Close payment modal"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
            <p className="font-semibold">Error</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* ── Tier Selection ── */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-flexNavy mb-3">
            Membership Tier
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_TIER_OPTIONS.map((tier) => {
              const isActive = selectedUserType === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    const nextTier = resolveTierSelection(selectedUserType, tier);
                    onSelectUserType?.(nextTier);
                    onClearError();
                  }}
                  disabled={isLoading}
                  className={`rounded-lg border-2 p-2.5 text-left transition ${
                    isActive
                      ? "border-flexBlue bg-flexBlue/10"
                      : "border-flexNavy/15 hover:border-flexBlue/50"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                  aria-pressed={isActive}
                >
                  <p className="text-xs font-semibold text-flexNavy capitalize">
                    {tier.replace("-", " ")}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Amount Display ── */}
        <div className="mb-6 rounded-lg bg-flexBlue/8 p-4 border border-flexBlue/25">
          <p className="text-sm text-flexNavy/70">Selected Plan</p>
          <p className="mt-1 text-lg font-semibold capitalize text-flexNavy">
            {selectedUserType.replace("-", " ")}
          </p>

          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-sm text-flexNavy/70">Amount to Pay</p>
              <p className="text-3xl font-bold text-flexBlue mt-1">
                ₱{finalAmount.toLocaleString()}
              </p>
            </div>
            {totalSavings > 0 && (
              <div className="text-right">
                <p className="text-xs text-flexNavy/50 line-through">
                  ₱{rawPrice.toLocaleString()}
                </p>
                <p className="text-sm font-semibold text-emerald-600">
                  You save ₱{totalSavings.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {(discountCategory || appliedVoucher) && (
            <details className="mt-3">
              <summary className="text-xs text-flexNavy/50 cursor-pointer select-none">
                Price breakdown
              </summary>
              <p className="text-xs text-flexNavy/60 mt-1 font-mono leading-relaxed">
                {price.getDescription()}
              </p>
            </details>
          )}
        </div>

        {/* ── Discount Section ── */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-flexNavy mb-1">
            Discount Eligibility
          </label>
          <p className="text-xs text-flexNavy/60 mb-3">
            Select a category if you qualify for a 20% discount. ID upload required.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(DISCOUNT_CONFIG) as DiscountCategory[]).map((cat) => {
              const cfg   = DISCOUNT_CONFIG[cat];
              const active = discountCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    if (active) {
                      setDiscountCategory(null);
                      setDiscountIdPreview(null);
                    } else {
                      setDiscountCategory(cat);
                      setDiscountIdPreview(null);
                    }
                    onClearError();
                  }}
                  className={`rounded-lg border-2 p-2.5 text-center transition ${
                    active
                      ? "border-flexBlue bg-flexBlue/10"
                      : "border-flexNavy/15 hover:border-flexBlue/40"
                  }`}
                >
                  <p className={`text-xs font-semibold ${active ? "text-flexBlue" : "text-flexNavy"}`}>
                    {cfg.label}
                  </p>
                  <p className="text-[10px] text-flexNavy/50 mt-0.5">{cfg.rate * 100}% off</p>
                </button>
              );
            })}
          </div>

          {/* ID Upload for discount */}
          {discountCategory && (
            <div className="mt-3">
              <label className="block text-xs font-semibold text-flexNavy mb-1">
                {DISCOUNT_CONFIG[discountCategory].label} ID Proof
                {hasSubmitted && !discountIdPreview && (
                  <span className="text-red-600 ml-1">* Required</span>
                )}
              </label>
              <p className="text-[11px] text-flexNavy/55 mb-2">
                {DISCOUNT_CONFIG[discountCategory].description}
              </p>

              {discountIdPreview ? (
                <div className="rounded-lg border border-flexNavy/15 overflow-hidden bg-white p-3">
                  <img
                    src={discountIdPreview}
                    alt="Discount ID proof"
                    className="w-full h-36 object-cover rounded-lg mb-2"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountIdPreview(null);
                      if (discountIdRef.current) discountIdRef.current.value = "";
                    }}
                    className="w-full rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-50 transition"
                  >
                    Remove ID
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => discountIdRef.current?.click()}
                  className={`rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition ${
                    hasSubmitted && !discountIdPreview
                      ? "border-red-400 bg-red-50"
                      : "border-flexBlue/40 hover:bg-flexBlue/5"
                  }`}
                >
                  <svg className="h-6 w-6 text-flexBlue mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
                  </svg>
                  <p className="text-xs font-semibold text-flexBlue">Upload valid ID</p>
                  <p className="text-[10px] text-flexNavy/50 mt-0.5">PNG, JPG up to 5MB</p>
                  <input
                    ref={discountIdRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDiscountIdSelect}
                    className="hidden"
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="border-t border-flexNavy/10 mb-6" />

        {/* ── Voucher Section ── */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-flexNavy mb-1">
            Voucher Code
          </label>
          <p className="text-xs text-flexNavy/60 mb-3">
            Enter a promo or voucher code to get additional savings.
          </p>

          {appliedVoucher ? (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-emerald-700 font-mono tracking-wider">
                  {appliedVoucher.code}
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">{appliedVoucher.label}</p>
              </div>
              <button
                type="button"
                onClick={handleRemoveVoucher}
                className="text-xs text-red-500 hover:text-red-700 font-semibold transition"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={voucherInput}
                onChange={(e) => {
                  setVoucherInput(e.target.value.toUpperCase());
                  setVoucherError(null);
                  setVoucherSuccess(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleApplyVoucher()}
                placeholder="e.g. Kenji"
                disabled={isLoading}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-2 transition ${
                  voucherError
                    ? "border-red-400 focus:ring-red-300"
                    : "border-flexNavy/20 focus:ring-flexBlue/40"
                }`}
              />
              <button
                type="button"
                onClick={handleApplyVoucher}
                disabled={isLoading || !voucherInput.trim()}
                className="rounded-lg bg-flexBlue px-4 py-2.5 text-sm font-semibold text-white hover:bg-flexNavy transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          )}

          {voucherError && (
            <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {voucherError}
            </p>
          )}
          {voucherSuccess && !appliedVoucher && (
            <p className="text-xs text-emerald-600 mt-1.5">{voucherSuccess}</p>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="border-t border-flexNavy/10 mb-6" />

        {/* ── Payment Method Selection ── */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-flexNavy mb-3">
            Payment Method
            {hasSubmitted && !selectedMethod && (
              <span className="text-red-600 ml-1">* Required</span>
            )}
          </label>
          <div className="space-y-2">
            {(["cash", "card", "online"] as const).map((method) => (
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

        {/* ── Method-specific notes ── */}
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
                Please transfer to: GYM ACCOUNT | Upload a screenshot or photo of the payment confirmation as proof.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-flexNavy mb-2">
                Payment Proof
                {hasSubmitted && !photoPreview && (
                  <span className="text-red-600 ml-1">* Required</span>
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
                      if (fileInputRef.current) fileInputRef.current.value = "";
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

        <div className="flex gap-3">
          <button
            onClick={handleClose}
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
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pay ₱{finalAmount.toLocaleString()}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}