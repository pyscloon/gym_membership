import React, { useState } from 'react';
import { usePaymentContext, DISCOUNT_CONFIG, VOUCHER_REGISTRY } from './PaymentContext';
import type { DiscountCategory } from './PaymentContext';
import { PAYMENT_TIER_OPTIONS, resolveTierSelection } from '../../../lib/paymentTierSelection';
import { PAYMENT_METHOD_LABELS } from '../../../types/payment';

export const PaymentContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export const PaymentHeader: React.FC = () => {
  const { onClose } = usePaymentContext();
  return (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-2xl font-bold text-flexNavy">Payment Details</h2>
      <button onClick={onClose} className="text-flexNavy/50 hover:text-flexNavy transition" aria-label="Close payment modal">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export const PaymentError: React.FC = () => {
  const { error } = usePaymentContext();
  if (!error) return null;
  return (
    <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
      <p className="font-semibold">Error</p>
      <p className="mt-1">{error}</p>
    </div>
  );
};

export const PaymentTierSelector: React.FC = () => {
  const { selectedUserType, setSelectedUserType, isLoading } = usePaymentContext();
  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-flexNavy mb-3">Membership Tier</label>
      <div className="grid grid-cols-2 gap-2">
        {PAYMENT_TIER_OPTIONS.map((tier) => {
          const isActive = selectedUserType === tier;
          return (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedUserType(resolveTierSelection(selectedUserType, tier))}
              disabled={isLoading}
              className={`rounded-lg border-2 p-2.5 text-left transition ${isActive ? "border-flexBlue bg-flexBlue/10" : "border-flexNavy/15 hover:border-flexBlue/50"} disabled:opacity-60 disabled:cursor-not-allowed`}
              aria-pressed={isActive}
            >
              <p className="text-xs font-semibold text-flexNavy capitalize">{tier.replace("-", " ")}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const PaymentAmountDisplay: React.FC = () => {
  const { selectedUserType, finalAmount, rawPrice, totalSavings, priceDescription, discountCategory, appliedVoucher } = usePaymentContext();
  return (
    <div className="mb-6 rounded-lg bg-flexBlue/8 p-4 border border-flexBlue/25">
      <p className="text-sm text-flexNavy/70">Selected Plan</p>
      <p className="mt-1 text-lg font-semibold capitalize text-flexNavy">{selectedUserType.replace("-", " ")}</p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-sm text-flexNavy/70">Amount to Pay</p>
          <p className="text-3xl font-bold text-flexBlue mt-1">₱{finalAmount.toLocaleString()}</p>
        </div>
        {totalSavings > 0 && (
          <div className="text-right">
            <p className="text-xs text-flexNavy/50 line-through">₱{rawPrice.toLocaleString()}</p>
            <p className="text-sm font-semibold text-emerald-600">You save ₱{totalSavings.toLocaleString()}</p>
          </div>
        )}
      </div>
      {(discountCategory || appliedVoucher) && (
        <details className="mt-3">
          <summary className="text-xs text-flexNavy/50 cursor-pointer select-none">Price breakdown</summary>
          <p className="text-xs text-flexNavy/60 mt-1 font-mono leading-relaxed">{priceDescription}</p>
        </details>
      )}
    </div>
  );
};

export const PaymentDiscountSection: React.FC = () => {
  const { discountCategory, setDiscountCategory, setDiscountIdPreview, discountIdPreview, hasSubmitted, isLoading, discountIdRef, onClearError } = usePaymentContext();

  const handleIdSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setDiscountIdPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-flexNavy mb-1">Discount Eligibility</label>
      <p className="text-xs text-flexNavy/60 mb-3">Select a category if you qualify for a 20% discount. ID upload required.</p>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(DISCOUNT_CONFIG) as DiscountCategory[]).map((cat) => {
          const cfg = DISCOUNT_CONFIG[cat];
          const active = discountCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setDiscountCategory(active ? null : cat);
                if (active) setDiscountIdPreview(null);
                onClearError();
              }}
              className={`rounded-lg border-2 p-2.5 text-center transition ${active ? "border-flexBlue bg-flexBlue/10" : "border-flexNavy/15 hover:border-flexBlue/40"}`}
            >
              <p className={`text-xs font-semibold ${active ? "text-flexBlue" : "text-flexNavy"}`}>{cfg.label}</p>
              <p className="text-[10px] text-flexNavy/50 mt-0.5">{cfg.rate * 100}% off</p>
            </button>
          );
        })}
      </div>
      {discountCategory && (
        <div className="mt-3">
          <label className="block text-xs font-semibold text-flexNavy mb-1">
            {DISCOUNT_CONFIG[discountCategory].label} ID Proof
            {hasSubmitted && !discountIdPreview && <span className="text-red-600 ml-1">* Required</span>}
          </label>
          {discountIdPreview ? (
            <div className="rounded-lg border border-flexNavy/15 overflow-hidden bg-white p-3">
              <img src={discountIdPreview} alt="Discount ID proof" className="w-full h-36 object-cover rounded-lg mb-2" />
              <button onClick={() => setDiscountIdPreview(null)} className="w-full rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-50 transition">Remove ID</button>
            </div>
          ) : (
            <div onClick={() => discountIdRef.current?.click()} className={`rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition ${hasSubmitted && !discountIdPreview ? "border-red-400 bg-red-50" : "border-flexBlue/40 hover:bg-flexBlue/5"}`}>
              <svg className="h-6 w-6 text-flexBlue mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
              </svg>
              <p className="text-xs font-semibold text-flexBlue">Upload valid ID</p>
              <input ref={discountIdRef} type="file" accept="image/*" onChange={handleIdSelect} className="hidden" disabled={isLoading} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const PaymentVoucherSection: React.FC = () => {
  const { voucherInput, setVoucherInput, appliedVoucher, setAppliedVoucher, isLoading } = usePaymentContext();
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    setError(null);
    const code = voucherInput.trim().toUpperCase();
    if (!code) return setError("Please enter a voucher code.");
    const v = VOUCHER_REGISTRY[code];
    if (!v) return setError("Invalid voucher code.");
    setAppliedVoucher(v);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-flexNavy mb-1">Voucher Code</label>
      {appliedVoucher ? (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <div><p className="text-sm font-bold text-emerald-700">{appliedVoucher.code}</p><p className="text-xs text-emerald-600">{appliedVoucher.label}</p></div>
          <button onClick={() => setAppliedVoucher(null)} className="text-xs text-red-500 font-semibold">Remove</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input type="text" value={voucherInput} onChange={(e) => setVoucherInput(e.target.value)} placeholder="e.g. KENJI" className="flex-1 rounded-lg border px-3 py-2.5 text-sm text-flexNavy bg-white" />
          <button onClick={handleApply} disabled={isLoading || !voucherInput.trim()} className="rounded-lg bg-flexBlue px-4 py-2.5 text-sm text-white">Apply</button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
};

export const PaymentMethodSection: React.FC = () => {
  const { selectedMethod, setSelectedMethod, setPhotoPreview, onClearError, hasSubmitted } = usePaymentContext();
  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-flexNavy mb-3">
        Payment Method {hasSubmitted && !selectedMethod && <span className="text-red-600 ml-1">* Required</span>}
      </label>
      <div className="space-y-2">
        {(["cash", "card", "online"] as const).map((method) => (
          <button
            key={method}
            onClick={() => { setSelectedMethod(method); setPhotoPreview(null); onClearError(); }}
            className={`w-full rounded-lg border-2 p-3 text-left transition ${selectedMethod === method ? "border-flexBlue bg-flexBlue/10" : "border-flexNavy/15 hover:border-flexBlue/50"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-flexNavy">{PAYMENT_METHOD_LABELS[method]}</p>
                <p className="text-xs text-flexNavy/60 mt-0.5">{method === "cash" ? "Admin will confirm manually" : method === "online" ? "Admin will verify photo" : "Instant confirmation"}</p>
              </div>
              <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === method ? "border-flexBlue bg-flexBlue" : "border-flexNavy/30"}`}>
                {selectedMethod === method && <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export const PaymentProofSection: React.FC = () => {
  const { selectedMethod, photoPreview, setPhotoPreview, hasSubmitted, fileInputRef, isLoading } = usePaymentContext();
  if (selectedMethod !== "online") {
    return selectedMethod === "cash" ? (
      <div className="mb-6 rounded-lg bg-amber-50 p-4 border border-amber-200 text-xs text-amber-800"><p className="font-semibold">Cash Payment Note</p><p>Admin will confirm your request manually.</p></div>
    ) : selectedMethod === "card" ? (
      <div className="mb-6 rounded-lg bg-blue-50 p-4 border border-blue-200 text-xs text-blue-800"><p className="font-semibold">Card Payment</p><p>Instant confirmation.</p></div>
    ) : null;
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="rounded-lg bg-purple-50 p-4 border border-purple-200 text-xs text-purple-800"><p className="font-semibold">Online Transfer</p><p>Upload confirmation screenshot.</p></div>
      <label className="block text-sm font-semibold text-flexNavy mb-2">Payment Proof {hasSubmitted && !photoPreview && <span className="text-red-600 ml-1">* Required</span>}</label>
      {photoPreview ? (
        <div className="rounded-lg border border-flexNavy/15 overflow-hidden bg-white p-3">
          <img src={photoPreview} alt="Proof preview" className="w-full h-48 object-cover rounded-lg mb-3" />
          <button onClick={() => setPhotoPreview(null)} className="w-full rounded-lg border border-red-300 text-red-600 px-3 py-2 text-sm font-semibold">Remove Photo</button>
        </div>
      ) : (
        <div onClick={() => fileInputRef.current?.click()} className="rounded-lg border-2 border-dashed border-flexBlue/50 p-6 text-center cursor-pointer hover:bg-flexBlue/5 transition">
          <svg className="h-8 w-8 text-flexBlue mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <p className="text-sm font-semibold text-flexBlue">Click to upload photo</p>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" disabled={isLoading} />
        </div>
      )}
    </div>
  );
};

export const PaymentFooter: React.FC = () => {
  const { onClose, onInitiatePayment, isLoading, selectedMethod, finalAmount } = usePaymentContext();
  return (
    <div className="flex gap-3">
      <button onClick={onClose} disabled={isLoading} className="flex-1 rounded-lg border border-flexNavy/20 px-4 py-3 font-semibold text-flexNavy transition hover:bg-flexNavy/5 disabled:opacity-50">Cancel</button>
      <button onClick={onInitiatePayment} disabled={isLoading || !selectedMethod} className="flex-1 rounded-lg bg-flexBlue px-4 py-3 font-semibold text-white transition hover:bg-flexNavy disabled:opacity-50 flex items-center justify-center gap-2">
        {isLoading ? "Processing..." : `Pay ₱${finalAmount.toLocaleString()}`}
      </button>
    </div>
  );
};
