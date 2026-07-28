/**
 * RevenueShareService - Calculates revenue split between platform and developer
 * Default: Platform 30%, Developer 70% (configurable)
 */

interface RevenueShareConfig {
  platformFeePercent: number;
  developerPercent: number;
}

export class RevenueShareService {
  private config: RevenueShareConfig;

  constructor(config?: Partial<RevenueShareConfig>) {
    this.config = {
      platformFeePercent: config?.platformFeePercent || 30,
      developerPercent: config?.developerPercent || 70,
    };
  }

  /**
   * Calculate revenue split
   * @param grossAmount - Total amount before split (in smallest currency unit)
   * @returns {platformFee, developerAmount, total}
   */
  calculateSplit(grossAmount: number): { platformFee: number; developerAmount: number; total: number } {
    const platformFee = Math.round(grossAmount * this.config.platformFeePercent / 100);
    const developerAmount = grossAmount - platformFee;
    return { platformFee, developerAmount, total: grossAmount };
  }

  /**
   * Get current configuration
   */
  getConfig(): RevenueShareConfig {
    return {...this.config};
  }

  /**
   * Update revenue share configuration
   */
  setConfig(config: Partial<RevenueShareConfig>): void {
    this.config = { ...this.config, ...config };
    // Validate percentages sum to 100
    if (this.config.platformFeePercent + this.config.developerPercent !== 100) {
      console.warn("Warning: Platform and developer percentages should sum to 100%");
    }
  }
}

export function createRevenueShareService(config?: Partial<RevenueShareConfig>): RevenueShareService {
  return new RevenueShareService(config);
}
