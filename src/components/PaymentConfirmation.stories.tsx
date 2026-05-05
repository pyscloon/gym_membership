import type { Meta, StoryObj } from '@storybook/react-vite';
import PaymentConfirmation from './PaymentConfirmation';
import type { PaymentTransaction } from '../types/payment';
import { MEMBERSHIP_PRICES } from '../types/payment';

/**
 * Mock onClose handler
 */
const mockOnClose = () => {
  console.log('❌ PaymentConfirmation closed');
};

/**
 * Mock onComplete handler
 */
const mockOnComplete = () => {
  console.log('✅ Payment confirmation completed');
};

/**
 * Helper function to create test transactions with specified status
 */
const createPaymentTransaction = (
  status: PaymentTransaction['status'],
  userType: PaymentTransaction['userType'] = 'monthly',
  method: 'cash' | 'online' = 'cash',
  userId = 'user_demo_123'
): PaymentTransaction => {
  const basePrice = MEMBERSHIP_PRICES[userType];
  const amount = basePrice;
  const timestamp = '2026-05-01T00:00:00.000Z';

  return {
    id: `${status}-${userType}-${method}-${userId}`,
    userId,
    userType,
    amount,
    method,
    status,
    paymentProofStatus: method === 'online' ? 'pending' : undefined,
    proofOfPaymentUrl: method === 'online' ? 'https://via.placeholder.com/200' : undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
    confirmedAt: status === 'paid' ? timestamp : undefined,
    failureReason: status === 'failed' ? 'Insufficient funds in account' : undefined,
  };
};

const meta = {
  title: 'Components/PaymentConfirmation',
  component: PaymentConfirmation,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The PaymentConfirmation modal displays the payment status after a transaction. It shows different states based on payment status (paid, failed, awaiting confirmation/verification). The modal auto-closes after 5 seconds for successful payments.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PaymentConfirmation>;

export default meta;
type Story = StoryObj<typeof meta>;


/**
 * Payment Successful - Paid status
 * Shows green success state with auto-close timer
 */
export const PaymentSuccessful: Story = {
  args: {
    transaction: createPaymentTransaction('paid', 'monthly', 'cash'),
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete,
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays successful payment confirmation with green styling. Shows payment details and auto-closes after 5 seconds. Features a "Continue to Dashboard" button.',
      },
    },
  },
};

/**
 * Awaiting Admin Confirmation - Cash payment pending
 * Shows amber/orange status while admin reviews cash payment
 */
export const AwaitingAdminConfirmation: Story = {
  args: {
    transaction: createPaymentTransaction('awaiting-confirmation', 'monthly', 'cash'),
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete,
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays pending cash payment awaiting admin confirmation. Shows loading spinner and informative message about next steps.',
      },
    },
  },
};

/**
 * Awaiting Payment Verification - Online payment pending
 * Shows purple status while admin verifies online payment proof
 */
export const AwaitingPaymentVerification: Story = {
  args: {
    transaction: createPaymentTransaction('awaiting-verification', 'semi-yearly', 'online'),
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete,
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays online payment awaiting admin verification of payment proof. Shows loading spinner and payment proof review message.',
      },
    },
  },
};

/**
 * Payment Failed - Failed status
 * Shows red error state with failure reason
 */
export const PaymentFailed: Story = {
  args: {
    transaction: createPaymentTransaction('failed', 'yearly', 'cash'),
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete,
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays payment failure with red styling. Shows failure reason and suggests trying a different payment method. Features a "Try Again" button.',
      },
    },
  },
};

/**
 * Processing - Processing status
 * Shows blue status while payment is being processed
 */
export const Processing: Story = {
  args: {
    transaction: createPaymentTransaction('processing', 'walk-in', 'online'),
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete,
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays payment while it is being processed. Shows loading indicator and blue styling.',
      },
    },
  },
};

/**
 * Idle - Ready status
 * Shows gray state when payment is ready but not yet initiated
 */
export const Idle: Story = {
  args: {
    transaction: createPaymentTransaction('idle', 'monthly', 'cash'),
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete,
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays idle payment state ready for initiation. Shows gray styling and neutral message.',
      },
    },
  },
};

/**
 * Successful Monthly Membership
 * Shows successful payment for monthly tier
 */
export const SuccessfulMonthlyMembership: Story = {
  args: {
    transaction: createPaymentTransaction('paid', 'monthly', 'cash'),
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete,
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays successful payment confirmation for a monthly membership tier (₱499).',
      },
    },
  },
};

/**
 * Successful Semi-Yearly Membership
 * Shows successful payment for semi-yearly tier
 */
export const SuccessfulSemiYearlyMembership: Story = {
  args: {
    transaction: createPaymentTransaction('paid', 'semi-yearly', 'online'),
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete,
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays successful payment confirmation for a semi-yearly membership tier (₱699) via online payment.',
      },
    },
  },
};

/**
 * Successful Yearly Membership
 * Shows successful payment for yearly tier
 */
export const SuccessfulYearlyMembership: Story = {
  args: {
    transaction: createPaymentTransaction('paid', 'yearly', 'cash'),
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete,
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays successful payment confirmation for a yearly membership tier (₱1,199) - the most expensive tier.',
      },
    },
  },
};

/**
 * Successful Walk-In Payment
 * Shows successful payment for walk-in tier
 */
export const SuccessfulWalkInPayment: Story = {
  args: {
    transaction: createPaymentTransaction('paid', 'walk-in', 'cash'),
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete,
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays successful payment confirmation for a walk-in payment tier (₱60) - the entry-level option.',
      },
    },
  },
};

/**
 * Long transaction ID display
 * Shows handling of long transaction IDs
 */
export const LongTransactionId: Story = {
  args: {
    transaction: {
      id: 'TXN-2024-04-02-ABC123DEF456GHI789JKL012',
      userId: 'user_long_id_demo',
      userType: 'yearly',
      amount: 1299,
      method: 'cash',
      status: 'paid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
    },
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete,
  },
  parameters: {
    viewport: {
      defaultViewport: 'iphone14',
    },
    docs: {
      description: {
        story: 'Shows how the modal handles long transaction IDs. ID is truncated and displayed in monospace font.',
      },
    },
  },
};

/**
 * Minimal transaction data
 * Shows handling with minimal transaction information
 */
export const MinimalTransactionData: Story = {
  args: {
    transaction: {
      id: 'TXN-123',
      userId: 'user123',
      userType: 'walk-in',
      amount: 60,
      method: 'cash',
      status: 'paid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows payment confirmation with minimal transaction data. No confirmedAt or failureReason included.',
      },
    },
  },
};

/**
 * With detailed failure reason
 * Shows payment failure with detailed explanation
 */
export const DetailedFailureReason: Story = {
  args: {
    transaction: {
      id: 'TXN-FAIL-002',
      userId: 'user_failed',
      userType: 'yearly',
      amount: 1299,
      method: 'online',
      status: 'failed',
      failureReason: 'Payment gateway returned error: Card declined by issuer due to insufficient funds. Please try with a different card or payment method.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows payment failure with detailed failure reason explaining why the transaction was declined.',
      },
    },
  },
};
