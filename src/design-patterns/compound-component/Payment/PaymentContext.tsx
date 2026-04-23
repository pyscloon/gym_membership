import React, { createContext, useContext, useState, useRef } from 'react';
import type { UserType, PaymentMethod } from '../../../types/payment';
import { MEMBERSHIP_PRICES } from '../../../types/payment';

// DECORATOR PATTERN — Price Calculation
export interface PriceComponent {
  getAmount(): number;
  getDescription(): string;
}

export class BasePrice implements PriceComponent {
  private readonly price: number;
  constructor(price: number) { this.price = price; }
  getAmount() { return this.price; }
  getDescription() { return "Base price"; }
}

export abstract class PriceDecorator implements PriceComponent {
  protected readonly wrapped: PriceComponent;
  constructor(wrapped: PriceComponent) { this.wrapped = wrapped; }
  getAmount() { return this.wrapped.getAmount(); }
  getDescription() { return this.wrapped.getDescription(); }
}

export class DiscountDecorator extends PriceDecorator {
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

export class VoucherDecorator extends PriceDecorator {
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
    const detail = this.voucher.type === "flat" ? `₱${this.voucher.value} off` : `${this.voucher.value * 100}% off`;
    return `${this.wrapped.getDescription()} → Voucher "${this.voucher.code}" (${detail})`;
  }
}

export interface ResolvedVoucher {
  code: string;
  type: "flat" | "percent";
  value: number;
  label: string;
}

export const VOUCHER_REGISTRY: Record<string, ResolvedVoucher> = {
  RED: { code: "RED", type: "flat", value: 100, label: "₱100 off" },
  KENJI: { code: "KENJI", type: "percent", value: 0.10, label: "10% off" },
  GUILARAN: { code: "GUILARAN", type: "flat", value: 200, label: "₱200 off" },
};

export type DiscountCategory = "student" | "senior" | "pwd";

export const DISCOUNT_CONFIG: Record<DiscountCategory, { label: string; rate: number; color: string; description: string }> = {
  student: { label: "Student", rate: 0.20, color: "blue", description: "20% off with valid school ID" },
  senior: { label: "Senior Citizen", rate: 0.20, color: "emerald", description: "20% off with senior citizen ID" },
  pwd: { label: "PWD", rate: 0.20, color: "violet", description: "20% off with PWD ID card" },
};

interface PaymentContextProps {
  selectedUserType: UserType;
  setSelectedUserType: (tier: UserType) => void;
  selectedMethod: PaymentMethod | null;
  setSelectedMethod: (method: PaymentMethod | null) => void;
  discountCategory: DiscountCategory | null;
  setDiscountCategory: (cat: DiscountCategory | null) => void;
  discountIdPreview: string | null;
  setDiscountIdPreview: (url: string | null) => void;
  voucherInput: string;
  setVoucherInput: (input: string) => void;
  appliedVoucher: ResolvedVoucher | null;
  setAppliedVoucher: (v: ResolvedVoucher | null) => void;
  photoPreview: string | null;
  setPhotoPreview: (url: string | null) => void;
  finalAmount: number;
  rawPrice: number;
  totalSavings: number;
  priceDescription: string;
  hasSubmitted: boolean;
  setHasSubmitted: (val: boolean) => void;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onInitiatePayment: () => Promise<void>;
  onClearError: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  discountIdRef: React.RefObject<HTMLInputElement | null>;
}

const PaymentContext = createContext<PaymentContextProps | undefined>(undefined);

export const usePaymentContext = () => {
  const context = useContext(PaymentContext);
  if (!context) throw new Error('usePaymentContext must be used within PaymentProvider');
  return context;
};

interface PaymentProviderProps {
  children: React.ReactNode;
  isOpen: boolean;
  selectedUserType: UserType;
  onSelectUserType?: (userType: UserType) => void;
  onClose: () => void;
  onInitiatePayment: (
    method: PaymentMethod,
    proofOfPayment?: string,
    discountCategory?: DiscountCategory,
    discountIdProof?: string,
    voucherCode?: string,
    finalAmount?: number
  ) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
}

export const PaymentProvider: React.FC<PaymentProviderProps> = ({
  children,
  isOpen,
  selectedUserType: initialTier,
  onSelectUserType,
  onClose,
  onInitiatePayment,
  isLoading,
  error,
  onClearError,
}) => {
  const [selectedTier, setSelectedTier] = useState<UserType>(initialTier);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [discountCategory, setDiscountCategory] = useState<DiscountCategory | null>(null);
  const [discountIdPreview, setDiscountIdPreview] = useState<string | null>(null);
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<ResolvedVoucher | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const discountIdRef = useRef<HTMLInputElement>(null);

  // Sync initial tier if it changes from outside
  React.useEffect(() => {
    setSelectedTier(initialTier);
  }, [initialTier]);

  const rawPrice = MEMBERSHIP_PRICES[selectedTier];
  let price: PriceComponent = new BasePrice(rawPrice);

  if (discountCategory) {
    const cfg = DISCOUNT_CONFIG[discountCategory];
    price = new DiscountDecorator(price, cfg.rate, cfg.label);
  }
  if (appliedVoucher) {
    price = new VoucherDecorator(price, appliedVoucher);
  }

  const finalAmount = price.getAmount();
  const totalSavings = rawPrice - finalAmount;
  const priceDescription = price.getDescription();

  const handleInitiate = async () => {
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
        appliedVoucher?.code,
        finalAmount
      );
      reset();
    } catch (err) {
      console.error("Payment error:", err);
    }
  };

  const reset = () => {
    setSelectedMethod(null);
    setHasSubmitted(false);
    setPhotoPreview(null);
    setDiscountCategory(null);
    setDiscountIdPreview(null);
    setVoucherInput("");
    setAppliedVoucher(null);
  };

  const handleClose = () => {
    onClose();
    reset();
    onClearError();
  };

  const value = {
    selectedUserType: selectedTier,
    setSelectedUserType: (tier: UserType) => {
      setSelectedTier(tier);
      onSelectUserType?.(tier);
      onClearError();
    },
    selectedMethod,
    setSelectedMethod,
    discountCategory,
    setDiscountCategory,
    discountIdPreview,
    setDiscountIdPreview,
    voucherInput,
    setVoucherInput,
    appliedVoucher,
    setAppliedVoucher,
    photoPreview,
    setPhotoPreview,
    finalAmount,
    rawPrice,
    totalSavings,
    priceDescription,
    hasSubmitted,
    setHasSubmitted,
    isLoading,
    error,
    onClose: handleClose,
    onInitiatePayment: handleInitiate,
    onClearError,
    fileInputRef,
    discountIdRef,
  };

  if (!isOpen) return null;

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
};
