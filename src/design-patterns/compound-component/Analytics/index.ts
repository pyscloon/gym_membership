import { AnalyticsProvider } from './AnalyticsContext';
import { 
  AnalyticsHeader, 
  AnalyticsStatGrid, 
  AnalyticsActivityChart, 
  AnalyticsRevenueChart, 
  AnalyticsRatioAnalysis,
  AnalyticsStatus
} from './AnalyticsComponents';

export const Analytics = {
  Provider: AnalyticsProvider,
  Status: AnalyticsStatus,
  Header: AnalyticsHeader,
  Stats: AnalyticsStatGrid,
  ActivityChart: AnalyticsActivityChart,
  RevenueChart: AnalyticsRevenueChart,
  RatioAnalysis: AnalyticsRatioAnalysis,
};
