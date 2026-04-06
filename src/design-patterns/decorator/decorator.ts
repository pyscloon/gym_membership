
// DECORATOR PATTERN — Price Calculation
// PaymentModal

export interface ResolvedVoucher {
  code: string;
  type: "flat" | "percent";
  value: number;
  label: string;
}

/** Base interface every price component must satisfy */
export interface PriceComponent {
  getAmount(): number;
  getDescription(): string;
}

/** Concrete base: wraps the raw membership price */
export class BasePrice implements PriceComponent {
  private readonly price: number;
  constructor(price: number) { this.price = price; }
  getAmount() { return this.price; }
  getDescription() { return "Base price"; }
}

/** Abstract decorator — all decorators extend this */
export abstract class PriceDecorator implements PriceComponent {
  protected readonly wrapped: PriceComponent;
  constructor(wrapped: PriceComponent) { this.wrapped = wrapped; }
  getAmount() { return this.wrapped.getAmount(); }
  getDescription() { return this.wrapped.getDescription(); }
}

/** Discount decorator — applies a percentage reduction (e.g. 20%) */
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

/** Voucher decorator — applies a flat-amount or percentage coupon */
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
    const detail =
      this.voucher.type === "flat"
        ? `₱${this.voucher.value} off`
        : `${this.voucher.value * 100}% off`;
    return `${this.wrapped.getDescription()} → Voucher "${this.voucher.code}" (${detail})`;
  }
}