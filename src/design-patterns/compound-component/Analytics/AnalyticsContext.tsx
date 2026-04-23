import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWalkInVsMemberAnalyticsByDays } from '../../../lib/analyticsService';
import type { AnalyticsData } from '../../../lib/analyticsService';

interface AnalyticsContextProps {
  data: AnalyticsData | null;
  timeRange: 30 | 60 | 90;
  setTimeRange: (range: 30 | 60 | 90) => void;
  isLoading: boolean;
  error: string | null;
  showBackButton: boolean;
  minimalView: boolean;
  navigate: (path: string) => void;
}

const AnalyticsContext = createContext<AnalyticsContextProps | undefined>(undefined);

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

interface AnalyticsProviderProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  minimalView?: boolean;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({
  children,
  showBackButton = true,
  minimalView = false,
}) => {
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<30 | 60 | 90>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await getWalkInVsMemberAnalyticsByDays(timeRange);
        if (!isMounted) return;
        setAnalyticsData(data);
      } catch (error) {
        if (!isMounted) return;
        setAnalyticsData(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load analytics right now."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAnalytics();
    const refreshInterval = window.setInterval(loadAnalytics, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
    };
  }, [timeRange]);

  const value = {
    data: analyticsData,
    timeRange,
    setTimeRange,
    isLoading,
    error: errorMessage,
    showBackButton,
    minimalView,
    navigate: (path: string) => navigate(path),
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};
