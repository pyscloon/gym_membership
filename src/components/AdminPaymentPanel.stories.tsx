import type { Meta, StoryObj } from '@storybook/react-vite';
import { waitFor, within } from '@testing-library/dom';
import AdminPaymentPanel from './AdminPaymentPanel';
import type { UserType, PaymentTransaction } from '../types/payment';
import { MEMBERSHIP_PRICES } from '../types/payment';
import { supabase } from '../lib/supabaseClient';
import {
  simulateAdminConfirmation,
  verifyOnlinePayment,
  rejectOnlinePayment,
  getStoredTransaction,
  saveTransaction,
} from '../lib/paymentSimulator';

/**
 * Mock payment confirmation handler
 */
const mockOnConfirmPayment = async (transactionId: string, userId: string, userType: UserType) => {
  console.log(`✅ Confirmed payment ${transactionId} for ${userType} user ${userId}`);
  await simulateAdminConfirmation(transactionId);
};

/**
 * Mock payment decline handler
 */
const mockOnDeclinePayment = async (transactionId: string, userId: string, userType: UserType) => {
  console.log(`❌ Declined payment ${transactionId} for ${userType} user ${userId}`);
  const stored = await getStoredTransaction(transactionId);
  if (stored) {
    stored.status = 'failed';
    await saveTransaction(stored);
  }
};

/**
 * Mock online payment verification handler
 */
const mockOnVerifyOnlinePayment = async (transactionId: string, userId: string, userType: UserType) => {
  console.log(`✅ Verified online payment ${transactionId} for ${userType} user ${userId}`);
  await verifyOnlinePayment(transactionId);
};

/**
 * Mock online payment rejection handler
 */
const mockOnRejectOnlinePayment = async (transactionId: string, userId: string, userType: UserType, reason: string) => {
  console.log(`❌ Rejected online payment ${transactionId} for ${userType} user ${userId} - Reason: ${reason}`);
  await rejectOnlinePayment(transactionId, reason);
};

/**
 * Helper function to create test transactions
 */
const createTestTransaction = (
  method: 'cash' | 'online',
  userType: UserType = 'monthly',
  userId = '11111111-1111-4111-8111-111111111111'
): PaymentTransaction => {
  const basePrice = MEMBERSHIP_PRICES[userType];
  const amount = basePrice;
  
  return {
    id: `${method}-${userType}-${userId}`,
    userId,
    userType,
    amount,
    method,
    status: method === 'online' ? 'awaiting-verification' : 'awaiting-confirmation',
    paymentProofStatus: method === 'online' ? 'pending' : undefined,
    proofOfPaymentUrl: method === 'online' ? 'https://via.placeholder.com/200' : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

type MockSupabaseState = {
  session: null;
  tables: {
    transactions: Array<Record<string, unknown>>;
    profiles: Array<Record<string, unknown>>;
    memberships: Array<Record<string, unknown>>;
  };
};

type MockTableName = keyof MockSupabaseState['tables'];

const cloneRows = <T,>(rows: T[]): T[] =>
  rows.map((row) => ({ ...(row as Record<string, unknown>) })) as T[];

function createMockQuery(state: MockSupabaseState, tableName: MockTableName) {
  const filters: Array<{ column: string; values: unknown[] }> = [];
  let orderBy: { column: string; ascending: boolean } | null = null;

  const readRows = () => {
    let rows = cloneRows(state.tables[tableName]);

    for (const filter of filters) {
      rows = rows.filter((row) => filter.values.includes((row as Record<string, unknown>)[filter.column]));
    }

    const activeOrder = orderBy;
    if (activeOrder) {
      rows = rows.sort((a, b) => {
        const left = String((a as Record<string, unknown>)[activeOrder.column] ?? '');
        const right = String((b as Record<string, unknown>)[activeOrder.column] ?? '');
        return activeOrder.ascending ? left.localeCompare(right) : right.localeCompare(left);
      });
    }

    return { data: rows, error: null };
  };

  const query = {
    select() {
      return query;
    },
    in(column: string, values: unknown[]) {
      filters.push({ column, values });
      return query;
    },
    order(column: string, options?: { ascending?: boolean }) {
      orderBy = { column, ascending: options?.ascending ?? true };
      return query;
    },
    then<TResult1 = ReturnType<typeof readRows>, TResult2 = never>(
      onfulfilled?: ((value: ReturnType<typeof readRows>) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) {
      return Promise.resolve(readRows()).then(onfulfilled, onrejected);
    },
  };

  return query;
}

function installMockSupabase(state: MockSupabaseState) {
  if (!supabase) return;

  Object.assign(supabase, {
    from(tableName: MockTableName) {
      return createMockQuery(state, tableName);
    },
    storage: {
      from() {
        return {
          async createSignedUrl(path: string) {
            return { data: { signedUrl: path }, error: null };
          },
          getPublicUrl(path: string) {
            return { data: { publicUrl: path } };
          },
          async list() {
            return { data: [], error: null };
          },
        };
      },
    },
  });
}

function setMockState(state: MockSupabaseState) {
  const globalState = globalThis as typeof globalThis & {
    __PLAYWRIGHT_MOCK_SUPABASE_STATE__?: MockSupabaseState;
  };

  globalState.__PLAYWRIGHT_MOCK_SUPABASE_STATE__ = state;
  installMockSupabase(state);
}

const storyTimestamp = '2026-05-01T00:00:00.000Z';

function buildSeedState(transactions: PaymentTransaction[]): MockSupabaseState {
  const displayNameByUserId: Record<string, string> = {
    'user-alpha-1': 'Alpha Tester',
    'user-beta-1': 'Beta Tester',
    'user-gamma-1': 'Gamma Tester',
    'user-delta-1': 'Delta Tester',
    'user-epsilon-1': 'Epsilon Tester',
  };

  const profiles = transactions.map((transaction) => ({
    id: transaction.userId,
    full_name: displayNameByUserId[transaction.userId] ?? transaction.userId,
    email: `${transaction.userId}@example.com`,
  }));

  const memberships = transactions.map((transaction) => ({
    user_id: transaction.userId,
    tier: transaction.userType,
    status: 'active',
    start_date: storyTimestamp,
    renewal_date: '2026-06-01T00:00:00.000Z',
  }));

  return {
    session: null,
    tables: {
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        user_id: transaction.userId,
        user_type: transaction.userType,
        amount: transaction.amount,
        method: transaction.method,
        status: transaction.status,
        proof_of_payment_url: transaction.proofOfPaymentUrl ?? null,
        discount_id_proof_url: transaction.discountIdProofUrl ?? null,
        created_at: transaction.createdAt,
      })),
      profiles,
      memberships,
    },
  };
}

function seedSingleCashPayment() {
  const transaction = createTestTransaction('cash', 'monthly', 'user-alpha-1');
  setMockState(buildSeedState([transaction]));
}

function seedSingleOnlinePayment() {
  const transaction = createTestTransaction('online', 'yearly', 'user-beta-1');
  setMockState(buildSeedState([transaction]));
}

const meta = {
  title: 'Components/AdminPaymentPanel',
  component: AdminPaymentPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The AdminPaymentPanel component provides an admin interface for managing pending payment confirmations. It displays cash and online payment requests with options to confirm, decline, verify, or reject payments. The panel auto-refreshes every 2 seconds to show new payment requests.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AdminPaymentPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view - AdminPaymentPanel with no pending payments
 * Shows empty state with helpful message
 */
export const NoPendingPayments: Story = {
  args: {
    onConfirmPayment: mockOnConfirmPayment,
    onDeclinePayment: mockOnDeclinePayment,
    onVerifyOnlinePayment: mockOnVerifyOnlinePayment,
    onRejectOnlinePayment: mockOnRejectOnlinePayment,
  },
  loaders: [
    async () => {
      setMockState({
        session: null,
        tables: {
          transactions: [],
          profiles: [],
          memberships: [],
        },
      });
      return { loaded: true };
    }
  ],
  render: (args) => {
    return (
      <div className="min-h-screen bg-flexBlack p-8">
        <AdminPaymentPanel {...args} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the empty state when there are no pending payments. Displays a helpful message indicating all payments have been confirmed.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      canvas.getByText(/no pending payments/i);
      canvas.getByText(/all pending payments have been processed/i);
    });
  },
};

/**
 * Panel with single cash payment pending
 * Shows a cash payment request awaiting confirmation
 */
export const SingleCashPayment: Story = {
  args: {
    onConfirmPayment: mockOnConfirmPayment,
    onDeclinePayment: mockOnDeclinePayment,
    onVerifyOnlinePayment: mockOnVerifyOnlinePayment,
    onRejectOnlinePayment: mockOnRejectOnlinePayment,
  },
  loaders: [
    async () => {
      seedSingleCashPayment();
      return { loaded: true };
    }
  ],
  render: (args) => {
    return (
      <div className="min-h-screen bg-flexBlack p-8">
        <AdminPaymentPanel {...args} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays a single cash payment request for a monthly membership with amount and user details. Admin can confirm or decline the payment.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      canvas.getByText(/alpha tester/i);
      canvas.getByText(/monthly/i);
      canvas.getByText(/receipt proof/i);
      canvas.getByRole('button', { name: /confirm/i });
      canvas.getByRole('button', { name: /decline/i });
    });
  },
};

/**
 * Panel with multiple cash payments
 * Shows several cash payment requests in a scrollable list
 */
export const MultipleCashPayments: Story = {
  args: {
    onConfirmPayment: mockOnConfirmPayment,
    onDeclinePayment: mockOnDeclinePayment,
    onVerifyOnlinePayment: mockOnVerifyOnlinePayment,
    onRejectOnlinePayment: mockOnRejectOnlinePayment,
  },
  loaders: [
    async () => {
      setMockState(buildSeedState([
        createTestTransaction('cash', 'monthly', 'user-alpha-1'),
        createTestTransaction('cash', 'semi-yearly', 'user-beta-1'),
        createTestTransaction('cash', 'yearly', 'user-gamma-1'),
        createTestTransaction('cash', 'walk-in', 'user-delta-1'),
      ]));
      return { loaded: true };
    }
  ],
  render: (args) => {
    return (
      <div className="min-h-screen bg-flexBlack p-8">
        <AdminPaymentPanel {...args} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows multiple cash payment requests with different membership tiers. The list displays total pending amount and count with tier-based pricing.',
      },
    },
  },
};

/**
 * Panel with single online payment pending
 * Shows an online transfer payment with photo proof and verification flow
 */
export const SingleOnlinePayment: Story = {
  args: {
    onConfirmPayment: mockOnConfirmPayment,
    onDeclinePayment: mockOnDeclinePayment,
    onVerifyOnlinePayment: mockOnVerifyOnlinePayment,
    onRejectOnlinePayment: mockOnRejectOnlinePayment,
  },
  loaders: [
    async () => {
      seedSingleOnlinePayment();
      return { loaded: true };
    }
  ],
  render: (args) => {
    return (
      <div className="min-h-screen bg-flexBlack p-8">
        <AdminPaymentPanel {...args} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays a single online payment request for a yearly membership. Includes option to view payment proof photo and fields for rejection reason if needed.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      canvas.getByText(/beta tester/i);
      canvas.getByText(/yearly/i);
      canvas.getByText(/member upload here/i);
      canvas.getByRole('button', { name: /open/i });
    });
  },
};

/**
 * Panel with multiple online payments
 * Shows several online payment requests with photo proofs
 */
export const MultipleOnlinePayments: Story = {
  args: {
    onConfirmPayment: mockOnConfirmPayment,
    onDeclinePayment: mockOnDeclinePayment,
    onVerifyOnlinePayment: mockOnVerifyOnlinePayment,
    onRejectOnlinePayment: mockOnRejectOnlinePayment,
  },
  loaders: [
    async () => {
      setMockState(buildSeedState([
        createTestTransaction('online', 'semi-yearly', 'user-beta-1'),
        createTestTransaction('online', 'yearly', 'user-gamma-1'),
        createTestTransaction('online', 'monthly', 'user-alpha-1'),
      ]));
      return { loaded: true };
    }
  ],
  render: (args) => {
    return (
      <div className="min-h-screen bg-flexBlack p-8">
        <AdminPaymentPanel {...args} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows multiple online payment requests with various membership tiers. Each item has a photo proof review option and verification buttons.',
      },
    },
  },
};

/**
 * Panel with mixed payment types
 * Shows both cash and online payments in the same list
 */
export const MixedPaymentTypes: Story = {
  args: {
    onConfirmPayment: mockOnConfirmPayment,
    onDeclinePayment: mockOnDeclinePayment,
    onVerifyOnlinePayment: mockOnVerifyOnlinePayment,
    onRejectOnlinePayment: mockOnRejectOnlinePayment,
  },
  loaders: [
    async () => {
      setMockState(buildSeedState([
        createTestTransaction('cash', 'monthly', 'user-alpha-1'),
        createTestTransaction('online', 'semi-yearly', 'user-beta-1'),
        createTestTransaction('cash', 'yearly', 'user-gamma-1'),
        createTestTransaction('online', 'walk-in', 'user-delta-1'),
        createTestTransaction('cash', 'monthly', 'user-epsilon-1'),
      ]));
      return { loaded: true };
    }
  ],
  render: (args) => {
    return (
      <div className="min-h-screen bg-flexBlack p-8">
        <AdminPaymentPanel {...args} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays a mix of cash and online payment requests with different membership tiers. Shows different UI elements and action buttons for each payment type.',
      },
    },
  },
};

/**
 * High volume payment requests
 * Shows the panel with many pending payments
 */
export const HighVolumePayments: Story = {
  args: {
    onConfirmPayment: mockOnConfirmPayment,
    onDeclinePayment: mockOnDeclinePayment,
    onVerifyOnlinePayment: mockOnVerifyOnlinePayment,
    onRejectOnlinePayment: mockOnRejectOnlinePayment,
  },
  loaders: [
    async () => {
      const payments: PaymentTransaction[] = [];
      const userIds = [
        'user-alpha-1', 'user-beta-1', 'user-gamma-1', 'user-delta-1',
        'user-epsilon-1', 'user-zeta-1', 'user-eta-1', 'user-theta-1',
        'user-iota-1', 'user-kappa-1', 'user-lambda-1', 'user-mu-1'
      ];
      const tiers: UserType[] = ['monthly', 'semi-yearly', 'yearly', 'walk-in'];
      const methods: ('cash' | 'online')[] = ['cash', 'online'];

      for (let i = 0; i < 12; i++) {
        const tier = tiers[i % 4];
        const method = methods[i % 2];
        payments.push(createTestTransaction(method, tier, userIds[i]));
      }
      setMockState(buildSeedState(payments));
      return { loaded: true };
    }
  ],
  render: (args) => {
    return (
      <div className="min-h-screen bg-flexBlack p-8">
        <AdminPaymentPanel {...args} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the AdminPaymentPanel handling a large number of pending payments across all membership tiers. Shows scrollable list with summary statistics.',
      },
    },
  },
};

/**
 * Interactive demo with cash payment
 */
export const InteractiveCashDemo: Story = {
  args: {
    onConfirmPayment: mockOnConfirmPayment,
    onDeclinePayment: mockOnDeclinePayment,
    onVerifyOnlinePayment: mockOnVerifyOnlinePayment,
    onRejectOnlinePayment: mockOnRejectOnlinePayment,
  },
  loaders: [
    async () => {
      setMockState(buildSeedState([
        createTestTransaction('cash', 'monthly', 'user-alpha-1'),
        createTestTransaction('cash', 'yearly', 'user-gamma-1'),
      ]));
      return { loaded: true };
    }
  ],
  render: (args) => {
    return (
      <div className="min-h-screen bg-flexBlack p-8">
        <AdminPaymentPanel {...args} />
      </div>
    );
  },
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
    docs: {
      description: {
        story: 'Interactive demo for testing the confirm/decline payment flows with different membership tiers. Click buttons to test loading states and check console logs.',
      },
    },
  },
};

/**
 * Interactive demo with online payment
 */
export const InteractiveOnlineDemo: Story = {
  args: {
    onConfirmPayment: mockOnConfirmPayment,
    onDeclinePayment: mockOnDeclinePayment,
    onVerifyOnlinePayment: mockOnVerifyOnlinePayment,
    onRejectOnlinePayment: mockOnRejectOnlinePayment,
  },
  loaders: [
    async () => {
      setMockState(buildSeedState([
        createTestTransaction('online', 'semi-yearly', 'user-beta-1'),
        createTestTransaction('online', 'yearly', 'user-gamma-1'),
      ]));
      return { loaded: true };
    }
  ],
  render: (args) => {
    return (
      <div className="min-h-screen bg-flexBlack p-8">
        <AdminPaymentPanel {...args} />
      </div>
    );
  },
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
    docs: {
      description: {
        story: 'Interactive demo for testing the verify/reject online payment flows with higher-tier memberships. Review payment proofs and test button interactions.',
      },
    },
  },
};
