/**
 * Factory Method pattern for subscription access plans.
 * Keeps price/duration/description creation centralized.
 */

export abstract class AccessType {
  /** Return plan price in PHP. */
  abstract get_price(): number;

  /** Return plan duration in days. */
  abstract get_duration(): number;

  /** Return a user-facing description for the plan. */
  abstract get_description(): string;
}

export class MonthlyAccess extends AccessType {
  get_price(): number {
    return 499;
  }

  get_duration(): number {
    return 30;
  }

  get_description(): string {
    return "Monthly access with flexible billing and full gym floor usage.";
  }
}

export class SemiYearlyAccess extends AccessType {
  get_price(): number {
    return 699;
  }

  get_duration(): number {
    return 182;
  }

  get_description(): string {
    return "Semi-yearly access with better value and consistent training momentum.";
  }
}

export class YearlyAccess extends AccessType {
  get_price(): number {
    return 1199;
  }

  get_duration(): number {
    return 365;
  }

  get_description(): string {
    return "Yearly access with the best savings for long-term gym progress.";
  }
}

export class AccessFactory {
  /**
   * Create an access object from a type string.
   * Accepts the required input form "semi_yearly" and project form "semi-yearly".
   */
  static create_access(access_type: string): AccessType {
    const normalizedType = access_type.trim().toLowerCase();

    switch (normalizedType) {
      case "monthly":
        return new MonthlyAccess();
      case "semi_yearly":
      case "semi-yearly":
        return new SemiYearlyAccess();
      case "yearly":
        return new YearlyAccess();
      default:
        throw new Error(`Invalid access type: ${access_type}`);
    }
  }
}
