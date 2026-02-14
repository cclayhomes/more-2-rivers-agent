export interface MarketSnapshot {
  activeHomes: string;
  soldLast30Days: string;
  priceReductions: string;
  medianSoldPrice: string;
  avgDaysOnMarket: string;
}

export interface MarketDataProvider {
  getSnapshot(): Promise<MarketSnapshot>;
}

export class PlaceholderMarketProvider implements MarketDataProvider {
  async getSnapshot(): Promise<MarketSnapshot> {
    return {
      activeHomes: '[Active Homes]',
      soldLast30Days: '[Sold Last 30 Days]',
      priceReductions: '[Price Reductions]',
      medianSoldPrice: '[Median Sold Price]',
      avgDaysOnMarket: '[Avg Days on Market]'
    };
  }
}
