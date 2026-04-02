# Factory Method Pattern Documentation

## Overview

This document explains the Factory Method pattern used for tiered gym subscriptions.
The goal is to centralize creation of subscription access objects so pricing, duration, and descriptions come from one place.

## Why Factory Method Pattern?

**Problem:** Without a factory, tier logic gets duplicated in different files.

```typescript
// Before (hardcoded): 
const price = tier === "monthly" ? 499 : tier === "semi-yearly" ? 699 : 1199;
const duration = tier === "monthly" ? 30 : tier === "semi-yearly" ? 182 : 365;
```

**Solution:** Use one factory to create tier objects with behavior.

```typescript
// After: 
const access = AccessFactory.create_access("monthly");
console.log(access.get_price());
console.log(access.get_duration());
console.log(access.get_description());
```

## Pattern Structure

### 1. Product Base Class: AccessType

File: `src/design-patterns/factory/factory.ts`

Defines the contract for all tier products:
- `get_price()`
- `get_duration()`
- `get_description()`

### 2. Concrete Products

Implemented in `src/design-patterns/factory/factory.ts`:
- `MonthlyAccess`
- `SemiYearlyAccess`
- `YearlyAccess`

Each class provides:
- Its own price
- Its own duration in days
- Its own description

### 3. Creator: AccessFactory

`AccessFactory.create_access(access_type: string)` creates the correct `AccessType` object for:
- `"monthly"`
- `"semi_yearly"`
- `"yearly"`

Project compatibility is also supported for `"semi-yearly"`.

Invalid types throw an error.

## Current Project Integration

The factory is used in tiered subscription flows:

1. `src/lib/membershipService.ts`
- Uses the factory to derive renewal duration from subscription tier.

2. `src/types/payment.ts`
- Uses the factory to derive monthly, semi-yearly, and yearly prices.

This keeps tier behavior centralized and avoids duplicate conditionals outside the factory.

## Usage Example

```typescript
import { AccessFactory } from "../design-patterns";

const userSelectedTier = "yearly";
const access = AccessFactory.create_access(userSelectedTier);

console.log("Price:", access.get_price());
console.log("Duration:", access.get_duration(), "days");
console.log("Description:", access.get_description());
```

## Error Handling Example

```typescript
try {
  AccessFactory.create_access("weekly");
} catch (error) {
  console.error("Invalid tier selected", error);
}
```

## Benefits

1. Single source of truth for tier behavior.
2. Cleaner service and payment modules.
3. Easy to add new subscription tiers later.
4. Better alignment with object-oriented design.
5. No if-else chains outside factory creation logic.

## Extending With A New Tier

To add a new tier:
1. Create a new class extending `AccessType`.
2. Implement price, duration, and description methods.
3. Add one case in `AccessFactory.create_access`.
4. Reuse the factory from services and UI instead of adding new conditionals.
