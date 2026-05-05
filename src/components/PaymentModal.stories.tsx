import type { Meta, StoryObj } from '@storybook/react-vite';
import { waitFor, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import PaymentModal from './PaymentModal';

const meta = {
  title: 'Components/PaymentModal',
  component: PaymentModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'PaymentModal shows the tier, discount, voucher, and payment-method selection flow used during membership purchase.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PaymentModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockOnInitiatePayment = async () => {};

export const TierAndMethodSelectionFlow: Story = {
  args: {
    isOpen: true,
    selectedUserType: 'monthly',
    onSelectUserType: () => {},
    onClose: () => {},
    onInitiatePayment: mockOnInitiatePayment,
    isLoading: false,
    error: null,
    onClearError: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    canvas.getByRole('heading', { name: /payment details/i });
    canvas.getByText(/selected plan/i);
    canvas.getByRole('button', { name: /^pay ₱499$/i });

    await user.click(canvas.getByRole('button', { name: /^yearly$/i }));

    await waitFor(() => {
      canvas.getByRole('button', { name: /^pay ₱3,999$/i });
    });

    await user.click(canvas.getByRole('button', { name: /online transfer/i }));

    await waitFor(() => {
      canvas.getByText(/upload confirmation screenshot/i);
      canvas.getByRole('button', { name: /pay ₱3,999/i });
    });
  },
};

export const DiscountAndVoucherFlow: Story = {
  args: {
    isOpen: true,
    selectedUserType: 'semi-yearly',
    onSelectUserType: () => {},
    onClose: () => {},
    onInitiatePayment: mockOnInitiatePayment,
    isLoading: false,
    error: null,
    onClearError: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    const seniorButton = canvas.getByRole('button', { name: /senior citizen/i });
    await user.click(seniorButton);
    within(seniorButton).getByText(/20% off/i);

    const voucherInput = canvas.getByPlaceholderText(/e\.g\. kenji/i);
    await user.type(voucherInput, 'KENJI');
    await user.click(canvas.getByRole('button', { name: /apply/i }));

    await waitFor(() => {
      const voucherSection = canvas.getByText(/voucher code/i).closest('div');
      if (!voucherSection) {
        throw new Error('voucher section not found');
      }

      within(voucherSection).getByRole('button', { name: /remove/i });
      within(voucherSection).getByText(/^kenji$/i);
    });
  },
};