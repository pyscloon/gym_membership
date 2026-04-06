# Decorator Pattern Documentation

## Overview

This document explains the Decorator pattern implemented in the gym membership system. These patterns provide
a clean, maintainable way to layer price modifications (discounts and vouchers) on top of a base price
without modifying the base class or using nested conditionals.

## Why Decorator Pattern?

**Problem:** Without decorators, price logic becomes cluttered with conditional logic:
```typescript
// Before: Messy conditionals
let price = basePrice;
if (isStudent) {
  price = price * 0.80;
}
if (voucherCode === "RED") {
  price = price - 100;
} else if (voucherCode === "KENJI") {
  price = price * 0.90;
}
```

**Solution:** Decorators encapsulate price modification behavior:
```typescript
// After: Clean decorator-driven logic
let price: PriceComponent = new BasePrice(1500);
price = new DiscountDecorator(price, 0.20, "Student");
price = new VoucherDecorator(price, resolveVoucher("KENJI")!);
price.getAmount();      // 1080
price.getDescription(); // Base price → Student (20% off) → Voucher "KENJI" (10% off)
```

## Three Decorator Layers

### 1. Component Interface: `PriceComponent`

Contract that every price object in the chain must satisfy.

```typescript
export interface PriceComponent {
  getAmount(): number;
  getDescription(): string;
}
```

### 2. Concrete Base: `BasePrice`

Holds the raw membership price. All decorators wrap around this.

```typescript
export class BasePrice implements PriceComponent {
  constructor(private readonly price: number) {}
  getAmount(): number { return this.price; }
  getDescription(): string { return "Base price"; }
}
```

### 3. Abstract Decorator: `PriceDecorator`

Delegates to the wrapped component by default. All concrete decorators extend this and override as needed.

```typescript
export abstract class PriceDecorator implements PriceComponent {
  constructor(protected readonly wrapped: PriceComponent) {}
  getAmount(): number { return this.wrapped.getAmount(); }
  getDescription(): string { return this.wrapped.getDescription(); }
}
```

## Concrete Decorators

### `DiscountDecorator`

Applies a percentage reduction for Student, Senior Citizen, or PWD eligibility.

```typescript
export class DiscountDecorator extends PriceDecorator {
  constructor(wrapped: PriceComponent, private discountRate: number, private label: string) {
    super(wrapped);
  }
  getAmount(): number {
    return Math.round(this.wrapped.getAmount() * (1 - this.discountRate));
  }
  getDescription(): string {
    return `${this.wrapped.getDescription()} → ${this.label} (${this.discountRate * 100}% off)`;
  }
}
```

### `VoucherDecorator`

Applies a flat (₱) or percentage (%) reduction from a voucher code. Price is floored at 0 and never goes negative.

```typescript
export class VoucherDecorator extends PriceDecorator {
  constructor(wrapped: PriceComponent, private voucher: ResolvedVoucher) {
    super(wrapped);
  }
  getAmount(): number {
    const base = this.wrapped.getAmount();
    if (this.voucher.type === "flat") {
      return Math.max(0, base - this.voucher.value);
    }
    return Math.max(0, Math.round(base * (1 - this.voucher.value)));
  }
  getDescription(): string {
    const detail = this.voucher.type === "flat"
      ? `₱${this.voucher.value} off`
      : `${this.voucher.value * 100}% off`;
    return `${this.wrapped.getDescription()} → Voucher "${this.voucher.code}" (${detail})`;
  }
}
```

## Supporting Configuration

### Voucher Registry

Replace with an API call when backend is connected.

```typescript
export const VOUCHER_REGISTRY: Record<string, ResolvedVoucher> = {
  RED:      { code: "RED",      type: "flat",    value: 100,  label: "₱100 off" },
  KENJI:    { code: "KENJI",    type: "percent", value: 0.10, label: "10% off"  },
  GUILARAN: { code: "GUILARAN", type: "flat",    value: 200,  label: "₱200 off" },
};
```

### Discount Config

```typescript
export const DISCOUNT_CONFIG: Record<DiscountCategory, { label: string; rate: number }> = {
  student: { label: "Student",        rate: 0.20 },
  senior:  { label: "Senior Citizen", rate: 0.20 },
  pwd:     { label: "PWD",            rate: 0.20 },
};
```

## Factory Helper: `buildPrice`

Builds the full price chain from a raw price, optional discount, and optional voucher.

```typescript
export function buildPrice(
  rawPrice: number,
  discountCategory?: DiscountCategory | null,
  appliedVoucher?: ResolvedVoucher | null
): PriceComponent {
  let price: PriceComponent = new BasePrice(rawPrice);
  if (discountCategory) {
    const cfg = DISCOUNT_CONFIG[discountCategory];
    price = new DiscountDecorator(price, cfg.rate, cfg.label);
  }
  if (appliedVoucher) {
    price = new VoucherDecorator(price, appliedVoucher);
  }
  return price;
}
```

File: `src/design-patterns/decorator/decorator.ts`
