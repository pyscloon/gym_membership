import type { Meta, StoryObj } from '@storybook/react-vite';
import AdminPaymentPanel from './AdminPaymentPanel';
import type { UserType, PaymentTransaction } from '../types/payment';
import { MEMBERSHIP_PRICES } from '../types/payment';
import { clearAllTransactions, saveTransaction, generateTransactionId } from '../lib/paymentSimulator';

/**
 * Mock payment confirmation handler
 */
const mockOnConfirmPayment = async (transactionId: string, userId: string, userType: UserType) => {
  console.log(`✅ Confirmed payment ${transactionId} for ${userType} user ${userId}`);
  await new Promise(resolve => setTimeout(resolve, 800));
};

/**
 * Mock payment decline handler
 */
const mockOnDeclinePayment = async (transactionId: string, userId: string, userType: UserType) => {
  console.log(`❌ Declined payment ${transactionId} for ${userType} user ${userId}`);
  await new Promise(resolve => setTimeout(resolve, 800));
};

/**
 * Mock online payment verification handler
 */
const mockOnVerifyOnlinePayment = async (transactionId: string, userId: string, userType: UserType) => {
  console.log(`✅ Verified online payment ${transactionId} for ${userType} user ${userId}`);
  await new Promise(resolve => setTimeout(resolve, 800));
};

/**
 * Mock online payment rejection handler
 */
const mockOnRejectOnlinePayment = async (transactionId: string, userId: string, userType: UserType, reason: string) => {
  console.log(`❌ Rejected online payment ${transactionId} for ${userType} user ${userId} - Reason: ${reason}`);
  await new Promise(resolve => setTimeout(resolve, 800));
};

/**
 * Helper function to create test transactions
 */
const createTestTransaction = (
  method: 'cash' | 'online',
  userType: UserType = 'monthly',
  userId = '11111111-1111-4111-8111-111111111111'
): PaymentTransaction => {
  // Get base price for tier and add some variance (platform fee, tax, etc)
  const basePrice = MEMBERSHIP_PRICES[userType];
  const variance = basePrice * (0.05 + Math.random() * 0.1); // 5-15% variance
  const amount = Math.round(basePrice + variance);
  
  return {
    id: generateTransactionId(),
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

/**
 * Helper to set up story with specific transactions
 */
const setupTransactions = async (transactions: PaymentTransaction[]) => {
  await clearAllTransactions();
  await Promise.all(transactions.map((t) => saveTransaction(t)));
};

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
  render: (args) => {
    void setupTransactions([]);
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
  render: (args) => {
    void setupTransactions([
      createTestTransaction('cash', 'monthly', '11111111-1111-4111-8111-111111111112'),
    ]);
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
  render: (args) => {
    void setupTransactions([
      createTestTransaction('cash', 'monthly', '11111111-1111-4111-8111-111111111112'),
      createTestTransaction('cash', 'semi-yearly', '11111111-1111-4111-8111-111111111113'),
      createTestTransaction('cash', 'yearly', '11111111-1111-4111-8111-111111111114'),
      createTestTransaction('cash', 'walk-in', '11111111-1111-4111-8111-111111111115'),
    ]);
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
  render: (args) => {
    void setupTransactions([
      createTestTransaction('online', 'yearly', '11111111-1111-4111-8111-111111111116'),
    ]);
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
  render: (args) => {
    void setupTransactions([
      createTestTransaction('online', 'semi-yearly', '11111111-1111-4111-8111-111111111116'),
      createTestTransaction('online', 'yearly', '11111111-1111-4111-8111-111111111117'),
      createTestTransaction('online', 'monthly', '11111111-1111-4111-8111-111111111118'),
    ]);
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
  render: (args) => {
    void setupTransactions([
      createTestTransaction('cash', 'monthly', '11111111-1111-4111-8111-111111111112'),
      createTestTransaction('online', 'semi-yearly', '11111111-1111-4111-8111-111111111116'),
      createTestTransaction('cash', 'yearly', '11111111-1111-4111-8111-111111111113'),
      createTestTransaction('online', 'walk-in', '11111111-1111-4111-8111-111111111117'),
      createTestTransaction('cash', 'monthly', '11111111-1111-4111-8111-111111111114'),
    ]);
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
 * Mobile view - AdminPaymentPanel on small screen
 * Shows responsive layout on mobile devices
 */
export const MobileView: Story = {
  args: {
    onConfirmPayment: mockOnConfirmPayment,
    onDeclinePayment: mockOnDeclinePayment,
    onVerifyOnlinePayment: mockOnVerifyOnlinePayment,
    onRejectOnlinePayment: mockOnRejectOnlinePayment,
  },
  render: (args) => {
    void setupTransactions([
      createTestTransaction('cash', 'monthly', '11111111-1111-4111-8111-111111111112'),
      createTestTransaction('online', 'yearly', '11111111-1111-4111-8111-111111111116'),
      createTestTransaction('cash', 'semi-yearly', '11111111-1111-4111-8111-111111111113'),
    ]);
    return (
      <div className="min-h-screen bg-flexBlack p-8">
        <AdminPaymentPanel {...args} />
      </div>
    );
  },
  parameters: {
    viewport: {
      defaultViewport: 'iphone14',
    },
    docs: {
      description: {
        story: 'Shows how the AdminPaymentPanel adapts to mobile viewport with mixed membership tiers. Buttons and content stack appropriately for smaller screens.',
      },
    },
  },
};

/**
 * Tablet view - AdminPaymentPanel on tablet device
 * Shows responsive layout on tablet screens
 */
export const TabletView: Story = {
  args: {
    onConfirmPayment: mockOnConfirmPayment,
    onDeclinePayment: mockOnDeclinePayment,
    onVerifyOnlinePayment: mockOnVerifyOnlinePayment,
    onRejectOnlinePayment: mockOnRejectOnlinePayment,
  },
  render: (args) => {
    void setupTransactions([
      createTestTransaction('cash', 'monthly', '11111111-1111-4111-8111-111111111112'),
      createTestTransaction('online', 'semi-yearly', '11111111-1111-4111-8111-111111111116'),
      createTestTransaction('cash', 'yearly', '11111111-1111-4111-8111-111111111113'),
      createTestTransaction('online', 'walk-in', '11111111-1111-4111-8111-111111111117'),
    ]);
    return (
      <div className="min-h-screen bg-flexBlack p-8">
        <AdminPaymentPanel {...args} />
      </div>
    );
  },
  parameters: {
    viewport: {
      defaultViewport: 'ipad',
    },
    docs: {
      description: {
        story: 'Shows the AdminPaymentPanel on tablet viewport with responsive spacing and layout adjustments for various tiers.',
      },
    },
  },
};

/**
 * Desktop view - AdminPaymentPanel on full desktop screen
 * Shows optimal layout with full functionality
 */
export const DesktopView: Story = {
  args: {
    onConfirmPayment: mockOnConfirmPayment,
    onDeclinePayment: mockOnDeclinePayment,
    onVerifyOnlinePayment: mockOnVerifyOnlinePayment,
    onRejectOnlinePayment: mockOnRejectOnlinePayment,
  },
  render: (args) => {
    void setupTransactions([
      createTestTransaction('cash', 'monthly', '11111111-1111-4111-8111-111111111112'),
      createTestTransaction('online', 'semi-yearly', '11111111-1111-4111-8111-111111111116'),
      createTestTransaction('cash', 'yearly', '11111111-1111-4111-8111-111111111113'),
      createTestTransaction('online', 'monthly', '11111111-1111-4111-8111-111111111117'),
      createTestTransaction('cash', 'walk-in', '11111111-1111-4111-8111-111111111114'),
      createTestTransaction('online', 'yearly', '11111111-1111-4111-8111-111111111118'),
    ]);
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
        story: 'Shows the AdminPaymentPanel on desktop viewport with full width and all membership tiers represented.',
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
  render: (args) => {
    const payments: PaymentTransaction[] = [];
    const userIds = ['11111111-1111-4111-8111-111111111119', '11111111-1111-4111-8111-111111111120', '11111111-1111-4111-8111-111111111121', '11111111-1111-4111-8111-111111111122', '11111111-1111-4111-8111-111111111123', '11111111-1111-4111-8111-111111111124', '11111111-1111-4111-8111-111111111125', '11111111-1111-4111-8111-111111111126', '11111111-1111-4111-8111-111111111127', '11111111-1111-4111-8111-111111111128', '11111111-1111-4111-8111-111111111129', '11111111-1111-4111-8111-111111111130'];
    const tiers: UserType[] = ['monthly', 'semi-yearly', 'yearly', 'walk-in'];
    const methods: ('cash' | 'online')[] = ['cash', 'online'];
    
    for (let i = 0; i < 12; i++) {
      const tier = tiers[i % 4];
      const method = methods[i % 2];
      payments.push(createTestTransaction(method, tier, userIds[i]));
    }
    void setupTransactions(payments);
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
  render: (args) => {
    void setupTransactions([
      createTestTransaction('cash', 'monthly', '11111111-1111-4111-8111-111111111112'),
      createTestTransaction('cash', 'yearly', '11111111-1111-4111-8111-111111111114'),
    ]);
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
  render: (args) => {
    void setupTransactions([
      createTestTransaction('online', 'semi-yearly', '11111111-1111-4111-8111-111111111116'),
      createTestTransaction('online', 'yearly', '11111111-1111-4111-8111-111111111117'),
    ]);
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
