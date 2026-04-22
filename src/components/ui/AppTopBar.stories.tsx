import type { Meta, StoryObj } from '@storybook/react-vite';
import { within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AppUiProvider } from '../../context/AppUiContext';
import AppTopBar from './AppTopBar';

type MockSupabaseState = {
  session: {
    user: {
      id: string;
      email: string;
      user_metadata: Record<string, unknown>;
    };
    access_token: string;
  } | null;
  tables: {
    memberships: Array<{
      user_id: string;
      status: 'active' | 'pending' | 'canceled' | 'expired';
    }>;
  };
};

function setMockSession(state: MockSupabaseState) {
  const globalState = globalThis as typeof globalThis & {
    __PLAYWRIGHT_MOCK_SUPABASE_STATE__?: MockSupabaseState;
  };

  if (!globalState.__PLAYWRIGHT_MOCK_SUPABASE_STATE__) {
    globalState.__PLAYWRIGHT_MOCK_SUPABASE_STATE__ = {
      session: null,
      tables: {
        memberships: [],
      },
    };
  }

  globalState.__PLAYWRIGHT_MOCK_SUPABASE_STATE__.session = state.session;
  globalState.__PLAYWRIGHT_MOCK_SUPABASE_STATE__.tables.memberships = state.tables.memberships;
}

const meta = {
  title: 'Components/UI/AppTopBar',
  component: AppTopBar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'AppTopBar is the main site header. It swaps between default, landing, and admin action modes, and shows different buttons based on auth state.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <BrowserRouter>
        <AppUiProvider>
          <div className="min-h-screen bg-[#000033] p-4">
            <Story />
          </div>
        </AppUiProvider>
      </BrowserRouter>
    ),
  ],
} satisfies Meta<typeof AppTopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GuestDesktopHeader: Story = {
  args: {
    mode: 'default',
    fixed: true,
  },
  loaders: [
    async () => {
      setMockSession({
        session: null,
        tables: { memberships: [] },
      });
      return {};
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByText(/FLEX/i);
    canvas.getByRole('button', { name: /toggle menu/i });
    canvas.getByRole('button', { name: /login/i });
  },
};

export const ActiveMemberHeader: Story = {
  args: {
    mode: 'default',
    fixed: false,
  },
  loaders: [
    async () => {
      setMockSession({
        session: {
          user: {
            id: 'member-user-1',
            email: 'member@example.com',
            user_metadata: {},
          },
          access_token: 'mock-token-member-user-1',
        },
        tables: {
          memberships: [
            {
              user_id: 'member-user-1',
              status: 'active',
            },
          ],
        },
      });
      return {};
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button', { name: /toggle menu/i });
    await userEvent.click(toggle);
    canvas.getByText(/active profile/i);
    canvas.getByRole('link', { name: /dashboard/i });
    canvas.getByRole('link', { name: /membership/i });
    canvas.getByRole('link', { name: /about us/i });
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const AdminActionsBar: Story = {
  args: {
    mode: 'admin-actions',
    fixed: true,
    onLogout: () => {},
  },
  loaders: [
    async () => {
      setMockSession({
        session: {
          user: {
            id: 'admin-user-1',
            email: 'admin@gmail.com',
            user_metadata: {},
          },
          access_token: 'mock-token-admin-user-1',
        },
        tables: {
          memberships: [],
        },
      });
      return {};
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button', { name: /toggle menu/i });
    await userEvent.click(toggle);
    canvas.getByText(/dashboard/i);
    canvas.getByRole('button', { name: /logout/i });
  },
};
