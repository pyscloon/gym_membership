import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { waitFor, within } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsDashboard from './AnalyticsDashboard';
import { supabase } from '../lib/supabaseClient';

type MockTransactionRow = {
  id: string;
  user_id: string;
  user_type: 'monthly' | 'semi-yearly' | 'yearly' | 'walk-in';
  amount: number;
  method: 'cash' | 'online';
  status: 'paid' | 'awaiting-confirmation' | 'awaiting-verification';
  payment_proof_status: string | null;
  proof_of_payment_url: string | null;
  discount_id_proof_url: string | null;
  rejection_reason: string | null;
  failure_reason: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

type MockAnalyticsState = {
  transactions: MockTransactionRow[];
};

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const createTransaction = (
  id: string,
  userType: MockTransactionRow['user_type'],
  amount: number,
  days: number,
  status: MockTransactionRow['status'] = 'paid',
): MockTransactionRow => ({
  id,
  user_id: `analytics-user-${id}`,
  user_type: userType,
  amount,
  method: userType === 'walk-in' ? 'cash' : 'online',
  status,
  payment_proof_status: null,
  proof_of_payment_url: null,
  discount_id_proof_url: null,
  rejection_reason: null,
  failure_reason: null,
  confirmed_at: daysAgo(days),
  created_at: daysAgo(days),
  updated_at: daysAgo(days),
});

const seedAnalyticsState = (): MockAnalyticsState => ({
  transactions: [
    createTransaction('monthly-1', 'monthly', 499, 2),
    createTransaction('monthly-2', 'monthly', 499, 8),
    createTransaction('semi-yearly-1', 'semi-yearly', 699, 14),
    createTransaction('yearly-1', 'yearly', 3999, 21),
    createTransaction('walk-in-1', 'walk-in', 60, 1),
    createTransaction('walk-in-2', 'walk-in', 60, 4),
    createTransaction('walk-in-3', 'walk-in', 60, 16),
    createTransaction('pending-online-1', 'monthly', 499, 24, 'awaiting-verification'),
  ],
});

function createMockQuery(state: MockAnalyticsState) {
  const filters: Array<{ column: keyof MockTransactionRow; values: unknown[] }> = [];
  let orderBy: { column: keyof MockTransactionRow; ascending: boolean } | null = null;

  const readRows = () => {
    let rows = state.transactions.map((transaction) => ({ ...transaction }));

    for (const filter of filters) {
      rows = rows.filter((row) => filter.values.includes(row[filter.column]));
    }

    const activeOrder = orderBy;
    if (activeOrder) {
      rows = rows.sort((a, b) => {
        const left = String(a[activeOrder.column] ?? '');
        const right = String(b[activeOrder.column] ?? '');
        return activeOrder.ascending ? left.localeCompare(right) : right.localeCompare(left);
      });
    }

    return { data: rows, error: null };
  };

  const query = {
    select() {
      return query;
    },
    in(column: keyof MockTransactionRow, values: unknown[]) {
      filters.push({ column, values });
      return query;
    },
    order(column: keyof MockTransactionRow, options?: { ascending?: boolean }) {
      orderBy = { column, ascending: options?.ascending ?? true };
      return query;
    },
    then<TResult1 = ReturnType<typeof readRows>, TResult2 = never>(
      onfulfilled?: ((value: ReturnType<typeof readRows>) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve(readRows()).then(onfulfilled, onrejected);
    },
  };

  return query;
}

function installMockAnalyticsSupabase() {
  if (!supabase) return;
  const state = seedAnalyticsState();

  Object.assign(supabase, {
    from(tableName: string) {
      if (tableName !== 'transactions') {
        throw new Error(`Unexpected analytics story table: ${tableName}`);
      }

      return createMockQuery(state);
    },
  });
}

const assertDashboardLoaded = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);

  await waitFor(() => {
    canvas.getByText(/analytics & trends/i);
    canvas.getByText(/daily activity trends/i);
    canvas.getByText(/daily revenue trends/i);
    canvas.getByText(/activity ratio/i);
    canvas.getByText(/revenue distribution/i);
    canvas.getByText(/total members/i);
    canvas.getByText(/total walk-ins/i);
  });
};

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
  loaders: [
    async () => {
      installMockAnalyticsSupabase();
      return {};
    },
  ],
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
  play: async ({ canvasElement }) => {
    await assertDashboardLoaded(canvasElement);
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
  play: async ({ canvasElement }) => {
    await assertDashboardLoaded(canvasElement);
  },
};