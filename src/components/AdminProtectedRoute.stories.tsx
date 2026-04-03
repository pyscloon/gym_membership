import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrowserRouter } from 'react-router-dom';
import AdminProtectedRoute from './AdminProtectedRoute';

const meta = {
  title: 'Components/AdminProtectedRoute',
  component: AdminProtectedRoute,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'AdminProtectedRoute is a route guard component that protects admin pages from unauthorized access. It checks if the user is authenticated as an admin and shows a loading state while checking. If the user is not authenticated, they are redirected to the admin login page.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <BrowserRouter>
        <Story />
      </BrowserRouter>
    ),
  ],
} satisfies Meta<typeof AdminProtectedRoute>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Loading state - AdminProtectedRoute while checking authentication
 * Shows loading message while session is being verified
 */
export const CheckingSession: Story = {
  args: {
    children: null,
  },
  render: () => (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-flexBlack p-8">
        <div className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6">
          <h1 className="text-3xl font-bold text-flexNavy mb-4">Admin Dashboard</h1>
          <p className="text-flexNavy/70">This content should only be visible to authenticated admins.</p>
        </div>
      </div>
    </AdminProtectedRoute>
  ),
  play: async () => {
    // Keep story visible for 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the loading state while AdminProtectedRoute checks if the user has an admin session. Displays a "Checking admin session..." message.',
      },
    },
  },
};

/**
 * Authenticated admin - AdminProtectedRoute with valid admin credentials
 * Shows protected content when user is authenticated as admin
 */
export const AuthenticatedAdmin: Story = {
  args: {
    children: null,
  },
  render: () => (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-flexBlack p-8">
        <div className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-flexNavy font-semibold">Welcome Admin</p>
              <h1 className="text-3xl font-bold text-flexNavy mt-2">Dashboard</h1>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-green-700">Authenticated</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="rounded-xl border border-flexNavy/15 p-6 bg-blue-50/50">
              <p className="text-xs uppercase tracking-wider text-flexNavy/70 font-semibold">Payment Confirmations</p>
              <p className="text-3xl font-bold text-flexBlue mt-2">12</p>
              <p className="text-xs text-flexNavy/60 mt-1">Awaiting your review</p>
            </div>

            <div className="rounded-xl border border-flexNavy/15 p-6 bg-green-50/50">
              <p className="text-xs uppercase tracking-wider text-flexNavy/70 font-semibold">Confirmed Today</p>
              <p className="text-3xl font-bold text-green-600 mt-2">28</p>
              <p className="text-xs text-flexNavy/60 mt-1">Payments processed</p>
            </div>

            <div className="rounded-xl border border-flexNavy/15 p-6 bg-purple-50/50">
              <p className="text-xs uppercase tracking-wider text-flexNavy/70 font-semibold">Online Verifications</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">5</p>
              <p className="text-xs text-flexNavy/60 mt-1">Photo proofs pending</p>
            </div>

            <div className="rounded-xl border border-flexNavy/15 p-6 bg-amber-50/50">
              <p className="text-xs uppercase tracking-wider text-flexNavy/70 font-semibold">Total Revenue</p>
              <p className="text-3xl font-bold text-amber-600 mt-2">₱42,850</p>
              <p className="text-xs text-flexNavy/60 mt-1">This month</p>
            </div>
          </div>

          <div className="mt-8 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-900">
              <strong>Admin Access Granted:</strong> You have successfully authenticated as an admin. You can now access protected admin features and manage payment confirmations.
            </p>
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  ),
  play: async () => {
    // Keep story visible for 4 seconds
    await new Promise(resolve => setTimeout(resolve, 4000));
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the protected admin dashboard content when a user is authenticated with valid admin credentials. The route guard allows the children to render.',
      },
    },
  },
};

/**
 * Not authenticated - AdminProtectedRoute with invalid or missing credentials
 * Shows redirect notice when user is not an admin
 */
export const NotAuthenticated: Story = {
  args: {
    children: null,
  },
  render: () => (
    <div className="min-h-screen bg-flexBlack p-8">
      <div className="max-w-md mx-auto rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M7.08 6.47A9.002 9.002 0 0112 2c4.97 0 9 3.582 9 8s-4.03 8-9 8c-.46 0-.92-.05-1.36-.15M7.08 6.47L5.6 5M7.08 6.47l1.5 1.5m10.84 10.06L18.4 19m0 0l-1.5-1.5m1.5 1.5L16.92 17.53" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-flexNavy text-center mb-2">Access Denied</h2>
        <p className="text-sm text-flexNavy/70 text-center mb-6">
          You are not authenticated as an admin. The AdminProtectedRoute component will redirect you to the login page.
        </p>
        <a
          href="/admin/login"
          className="block w-full text-center rounded-lg bg-flexBlue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Go to Admin Login
        </a>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Illustrates what happens when a non-admin user tries to access a protected admin route. The AdminProtectedRoute component would redirect to "/admin/login".',
      },
    },
  },
};

/**
 * Without Supabase - AdminProtectedRoute when Supabase is not configured
 * Shows access denied when authentication cannot be verified
 */
export const NoSupabaseConfig: Story = {
  args: {
    children: null,
  },
  render: () => (
    <div className="min-h-screen bg-flexBlack p-8">
      <div className="max-w-md mx-auto rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2m0 0H8M12 20h4" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-flexNavy text-center mb-2">Configuration Missing</h2>
        <p className="text-sm text-flexNavy/70 text-center mb-6">
          Supabase is not configured or the admin email is not set. The AdminProtectedRoute will deny access.
        </p>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <p><strong>Required environment variables:</strong></p>
          <ul className="mt-2 space-y-1 font-mono text-amber-700">
            <li>• VITE_SUPABASE_URL</li>
            <li>• VITE_SUPABASE_KEY</li>
            <li>• VITE_ADMIN_EMAIL</li>
          </ul>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows the state when Supabase is not properly configured or the admin email environment variable is missing. The route guard denies all access.',
      },
    },
  },
};

/**
 * Admin dashboard preview - Full admin dashboard content
 * Shows what authenticated admins see when accessing the dashboard
 */
export const AdminDashboardPreview: Story = {
  args: {
    children: null,
  },
  render: () => (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-flexBlack p-8">
        <div className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6">
          <div className="border-b border-flexNavy/15 pb-6 mb-6">
            <p className="text-xs uppercase tracking-[0.18em] text-flexNavy font-semibold">Admin Dashboard</p>
            <h1 className="text-3xl font-bold text-flexNavy mt-2">Payment Management</h1>
            <p className="text-sm text-flexNavy/60 mt-2">Manage and confirm pending membership payments</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 p-4">
              <p className="text-xs text-blue-700/70">Cash Payments</p>
              <p className="text-2xl font-bold text-blue-700 mt-2">8</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 p-4">
              <p className="text-xs text-purple-700/70">Online Transfers</p>
              <p className="text-2xl font-bold text-purple-700 mt-2">4</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 p-4">
              <p className="text-xs text-green-700/70">Confirmed</p>
              <p className="text-2xl font-bold text-green-700 mt-2">42</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 p-4">
              <p className="text-xs text-amber-700/70">Total Pending</p>
              <p className="text-2xl font-bold text-amber-700 mt-2">₱8,420</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-blue-900 mb-2">✓ Admin Access Active</p>
            <p className="text-xs text-blue-800">
              You have successfully authenticated as an admin. All admin features are now accessible.
            </p>
          </div>

          <div className="text-center py-12">
            <svg className="h-20 w-20 mx-auto text-flexBlue/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-flexNavy/70 text-sm">Admin payment confirmation panel content would render here</p>
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  ),
  play: async () => {
    // Keep story visible for 5 seconds to showcase the full dashboard
    await new Promise(resolve => setTimeout(resolve, 5000));
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows a preview of an admin dashboard with payment management statistics. This demonstrates the full content that becomes visible once authentication is verified.',
      },
    },
  },
};
