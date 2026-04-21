import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsDashboard from './AnalyticsDashboard';

const AnalyticsDashboardStoryShell = ({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) => (
  <div className={className}>
    <div className="max-w-7xl mx-auto">{children}</div>
  </div>
);

const findRangeButton = (canvasElement: HTMLElement, label: string) =>
  Array.from(canvasElement.querySelectorAll<HTMLButtonElement>('button')).find(
    (button) => button.textContent?.includes(label),
  );

const meta = {
  title: 'Components/AnalyticsDashboard',
  component: AnalyticsDashboard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'AnalyticsDashboard component displays comprehensive analytics data comparing walk-in vs member performance metrics. It includes daily activity trends, revenue comparisons, and ratio analysis with interactive time range selection.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/admin/analytics']}>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof AnalyticsDashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Tablet view - AnalyticsDashboard on tablet device
 * Shows responsive layout on tablet screens
 */
export const TabletView: Story = {
  args: {},
  render: () => (
    <div className="min-h-screen bg-flexBlack p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-flexWhite">Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-flexWhite">Analytics Overview</h1>
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
        story:
          'Shows the AnalyticsDashboard on tablet viewport with appropriately sized charts and responsive grid layouts.',
      },
    },
  },
};

/**
 * Embedded analytics - Compact layout for a dashboard section
 * Shows the component without the back button and with minimal chrome
 */
export const EmbeddedMinimal: Story = {
  args: {},
  render: () => (
    <div className="min-h-screen bg-flexBlack p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-2xl border border-flexWhite/10 bg-flexWhite/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-flexWhite/70">Insights Module</p>
          <h1 className="mt-2 text-3xl font-bold text-flexWhite">Analytics Snapshot</h1>
          <p className="mt-2 text-sm text-flexWhite/65">
            Embedded view for admin home pages and summary screens.
          </p>
        </div>
        <AnalyticsDashboard minimalView={true} showBackButton={false} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows AnalyticsDashboard embedded into another page with minimal styling and no back button.',
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
    <AnalyticsDashboardStoryShell className="min-h-screen bg-flexBlack p-8">
      <>
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-flexWhite">Dashboard</p>
          <h1 className="mt-2 text-4xl font-bold text-flexWhite">Complete Analytics Dashboard</h1>
          <p className="mt-2 text-flexWhite/70">
            Full-width view with comprehensive metrics and detailed trend analysis
          </p>
        </div>
        <AnalyticsDashboard />
      </>
    </AnalyticsDashboardStoryShell>
  ),
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
    docs: {
      description: {
        story:
          'Shows AnalyticsDashboard on desktop viewport with full width optimal spacing and complete feature visibility.',
      },
    },
  },
};

/**
 * Desktop quarterly view - Focus on longer trend analysis
 * Switches to the 90-day range after the dashboard loads
 */
export const DesktopQuarterly: Story = {
  args: {},
  render: () => (
    <AnalyticsDashboardStoryShell className="min-h-screen bg-flexBlack p-8">
      <>
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-flexWhite">Quarterly Review</p>
          <h1 className="mt-2 text-4xl font-bold text-flexWhite">90-Day Performance Trends</h1>
          <p className="mt-2 text-flexWhite/70">
            Extended range view for strategic planning and longer-term comparisons.
          </p>
        </div>
        <AnalyticsDashboard />
      </>
    </AnalyticsDashboardStoryShell>
  ),
  play: async ({ canvasElement }) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const button90 = findRangeButton(canvasElement, '90d');
    if (button90) {
      button90.click();
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  },
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
    docs: {
      description: {
        story: 'Shows the dashboard after switching to the 90-day time range for quarterly analytics review.',
      },
    },
  },
};

/**
 * Management shell - Analytics inside a broader admin layout
 * Demonstrates how the charts fit into a fuller dashboard page
 */
export const AdminInsightsLayout: Story = {
  args: {},
  render: () => (
    <div className="min-h-screen bg-flexBlack">
      <div className="border-b border-flexWhite/10 bg-flexWhite/5 px-8 py-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-flexWhite/70">Admin Console</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-flexWhite">Performance Insights</h1>
              <p className="mt-2 text-sm text-flexWhite/65">
                Compare member retention, walk-in traffic, and revenue performance in one view.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-flexWhite lg:w-[360px]">
              <div className="rounded-xl border border-flexWhite/10 bg-flexWhite/10 p-4">
                <p className="text-flexWhite/60">Active Members</p>
                <p className="mt-2 text-2xl font-bold">142</p>
              </div>
              <div className="rounded-xl border border-flexWhite/10 bg-flexWhite/10 p-4">
                <p className="text-flexWhite/60">Revenue Goal</p>
                <p className="mt-2 text-2xl font-bold">82%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnalyticsDashboardStoryShell className="p-8">
        <AnalyticsDashboard showBackButton={false} />
      </AnalyticsDashboardStoryShell>
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
    docs: {
      description: {
        story: 'Shows AnalyticsDashboard integrated into a broader admin insights page with supporting summary cards.',
      },
    },
  },
};
