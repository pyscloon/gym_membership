import type { Meta, StoryObj } from '@storybook/react';
import AnalyticsDashboard from './AnalyticsDashboard';

const meta = {
  title: 'Components/AnalyticsDashboard',
  component: AnalyticsDashboard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'AnalyticsDashboard component displays comprehensive analytics data comparing walk-in vs member performance metrics. It includes daily activity trends, revenue comparisons, and ratio analysis with interactive time range selection.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AnalyticsDashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view - AnalyticsDashboard with 30-day analytics
 * Shows complete analytics dashboard with all charts and stats
 */
export const Default30Days: Story = {
  args: {},
  render: () => (
    <div className="min-h-screen bg-flexBlack p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-flexWhite font-semibold">Dashboard</p>
          <h1 className="text-4xl font-bold text-flexWhite mt-2">Analytics Overview</h1>
          <p className="text-flexWhite/70 mt-2">Comprehensive view of walk-in vs member performance trends</p>
        </div>
        <AnalyticsDashboard />
      </div>
    </div>
  ),
  play: async () => {
    // Default time range is 30 days, just wait to show the dashboard
    await new Promise(resolve => setTimeout(resolve, 1000));
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the complete AnalyticsDashboard with default 30-day analytics. Displays summary stats, daily activity trends, revenue comparisons, and activity/revenue ratios.',
      },
    },
  },
};

/**
 * 60-day view - AnalyticsDashboard showing 60-day analytics
 * Extended time range for trend analysis
 */
export const Long60Days: Story = {
  args: {},
  render: () => (
    <div className="min-h-screen bg-flexBlack p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-flexWhite font-semibold">Dashboard</p>
          <h1 className="text-4xl font-bold text-flexWhite mt-2">Analytics Overview - Extended</h1>
          <p className="text-flexWhite/70 mt-2">60-day trend analysis with detailed metrics</p>
        </div>
        <AnalyticsDashboard />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Wait for dashboard to load
    await new Promise(resolve => setTimeout(resolve, 500));
    // Find and click the 60-day button
    const buttons = Array.from(canvasElement.querySelectorAll('button'));
    const button60 = buttons.find(btn => btn.textContent?.includes('60d'));
    if (button60) {
      (button60 as HTMLButtonElement).click();
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows AnalyticsDashboard with 60-day analytics data. Provides extended time period for identifying longer-term trends and patterns.',
      },
    },
  },
};

/**
 * 90-day view - AnalyticsDashboard showing quarterly analytics
 * Full quarter view for comprehensive trend analysis
 */
export const Long90Days: Story = {
  args: {},
  render: () => (
    <div className="min-h-screen bg-flexBlack p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-flexWhite font-semibold">Dashboard</p>
          <h1 className="text-4xl font-bold text-flexWhite mt-2">Analytics Overview - Quarterly</h1>
          <p className="text-flexWhite/70 mt-2">90-day quarterly performance metrics</p>
        </div>
        <AnalyticsDashboard />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Wait for dashboard to load
    await new Promise(resolve => setTimeout(resolve, 500));
    // Find and click the 90-day button
    const buttons = Array.from(canvasElement.querySelectorAll('button'));
    const button90 = buttons.find(btn => btn.textContent?.includes('90d'));
    if (button90) {
      (button90 as HTMLButtonElement).click();
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows AnalyticsDashboard with 90-day quarterly analytics. Ideal for strategic planning and identifying seasonal patterns.',
      },
    },
  },
};

/**
 * Mobile view - AnalyticsDashboard on small screen
 * Shows responsive layout on mobile devices
 */
export const MobileView: Story = {
  args: {},
  render: () => (
    <div className="min-h-screen bg-flexBlack p-4">
      <div>
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-flexWhite font-semibold">Dashboard</p>
          <h1 className="text-2xl font-bold text-flexWhite mt-2">Analytics</h1>
        </div>
        <AnalyticsDashboard />
      </div>
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: 'iphone14',
    },
    docs: {
      description: {
        story: 'Shows how AnalyticsDashboard adapts to mobile viewport. Charts and stats stack vertically for optimal mobile experience.',
      },
    },
  },
};

/**
 * Tablet view - AnalyticsDashboard on tablet device
 * Shows responsive layout on tablet screens
 */
export const TabletView: Story = {
  args: {},
  render: () => (
    <div className="min-h-screen bg-flexBlack p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-flexWhite font-semibold">Dashboard</p>
          <h1 className="text-3xl font-bold text-flexWhite mt-2">Analytics Overview</h1>
        </div>
        <AnalyticsDashboard />
      </div>
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: 'ipad',
    },
    docs: {
      description: {
        story: 'Shows the AnalyticsDashboard on tablet viewport with appropriately sized charts and responsive grid layouts.',
      },
    },
  },
};

/**
 * Desktop view - AnalyticsDashboard on full desktop screen
 * Shows optimal layout with full functionality
 */
export const DesktopFullWidth: Story = {
  args: {},
  render: () => (
    <div className="min-h-screen bg-flexBlack p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-flexWhite font-semibold">Dashboard</p>
          <h1 className="text-4xl font-bold text-flexWhite mt-2">Complete Analytics Dashboard</h1>
          <p className="text-flexWhite/70 mt-2">Full-width view with comprehensive metrics and detailed trend analysis</p>
        </div>
        <AnalyticsDashboard />
      </div>
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
    docs: {
      description: {
        story: 'Shows AnalyticsDashboard on desktop viewport with full width optimal spacing and complete feature visibility.',
      },
    },
  },
};

/**
 * With context integration - AnalyticsDashboard in a dashboard wrapper
 * Shows analytics as part of a larger dashboard layout
 */
export const WithDashboardWrapper: Story = {
  args: {},
  render: () => (
    <div className="min-h-screen bg-flexBlack">
      {/* Header */}
      <div className="bg-flexWhite/10 border-b border-flexNavy/20 p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs uppercase tracking-[0.18em] text-flexWhite font-semibold">Gym Management System</p>
          <h1 className="text-3xl font-bold text-flexWhite mt-2">Performance Insights</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-lg border border-flexNavy/15 bg-flexWhite/60 p-4">
              <p className="text-xs uppercase tracking-wider text-flexNavy font-semibold">Active Members</p>
              <p className="text-2xl font-bold text-flexNavy mt-2">142</p>
            </div>
            <div className="rounded-lg border border-flexNavy/15 bg-flexWhite/60 p-4">
              <p className="text-xs uppercase tracking-wider text-flexNavy font-semibold">This Month Revenue</p>
              <p className="text-2xl font-bold text-flexNavy mt-2">₱156,300</p>
            </div>
            <div className="rounded-lg border border-flexNavy/15 bg-flexWhite/60 p-4">
              <p className="text-xs uppercase tracking-wider text-flexNavy font-semibold">Pending Payments</p>
              <p className="text-2xl font-bold text-flexNavy mt-2">12</p>
            </div>
          </div>

          {/* Analytics Dashboard */}
          <AnalyticsDashboard />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows AnalyticsDashboard integrated within a complete dashboard layout with header and summary cards.',
      },
    },
  },
};

/**
 * Analytics comparison - Side by side metric comparison
 * Useful for showing member vs walk-in performance
 */
export const MetricComparison: Story = {
  args: {},
  render: () => (
    <div className="min-h-screen bg-flexBlack p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-flexWhite font-semibold">Performance Metrics</p>
          <h1 className="text-4xl font-bold text-flexWhite mt-2">Member vs Walk-In Analysis</h1>
          <p className="text-flexWhite/70 mt-2">Detailed comparison of membership retention and walk-in traffic patterns</p>
        </div>

        {/* Comparison metrics header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl border border-blue-500/50 bg-blue-500/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-flexWhite">Members</p>
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-blue-200">Recurring Revenue</p>
            <p className="text-xs text-flexWhite/70 mt-2">Predictable and stable income stream</p>
          </div>

          <div className="rounded-2xl border border-teal-500/50 bg-teal-500/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-flexWhite">Walk-Ins</p>
              <svg className="h-5 w-5 text-teal-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v2h8v-2zM2 8a2 2 0 11-4 0 2 2 0 014 0zM7 15a4 4 0 00-8 0v2h8v-2z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-teal-200">Variable Income</p>
            <p className="text-xs text-flexWhite/70 mt-2">Growth opportunity and market reach</p>
          </div>
        </div>

        <AnalyticsDashboard />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows AnalyticsDashboard with comparison context highlighting the benefits of members vs walk-in revenue models.',
      },
    },
  },
};
