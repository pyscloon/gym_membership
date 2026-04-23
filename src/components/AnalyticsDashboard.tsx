import { Analytics } from "../design-patterns/compound-component/Analytics";

type AnalyticsDashboardProps = {
  showBackButton?: boolean;
  minimalView?: boolean;
};

/**
 * AnalyticsDashboard Component - Displays walk-in vs member trends and revenue analytics
 * Refactored using the Compound Component Design Pattern.
 */
export default function AnalyticsDashboard({
  showBackButton = true,
  minimalView = false,
}: AnalyticsDashboardProps) {
  return (
    <Analytics.Provider showBackButton={showBackButton} minimalView={minimalView}>
      <Analytics.Status />
      <Analytics.Header />
      <Analytics.Stats />
      <Analytics.ActivityChart />
      <Analytics.RevenueChart />
      <Analytics.RatioAnalysis />
    </Analytics.Provider>
  );
}
