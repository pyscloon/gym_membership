import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';


// Test pages for routing

const DashboardPage = () => <div className="p-8 text-2xl font-bold">Dashboard Page</div>;
const ProfilePage = () => <div className="p-8 text-2xl font-bold">Profile Page</div>;
const LoginPage = () => <div className="p-8 text-2xl font-bold">Login Page</div>;

//  Wrapper for routing context with specific initial route

const SidebarWithRouter = ({ initialRoute = '/dashboard' }: { initialRoute?: string }) => {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/dashboard" element={<Sidebar />} />
        <Route path="/profile" element={<Sidebar />} />
        <Route path="/login" element={<Sidebar />} />
      </Routes>
    </MemoryRouter>
  );
};

const FullPageLayout = ({ initialRoute = '/dashboard', isMobile = false }: { initialRoute?: string; isMobile?: boolean }) => {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <div className={`flex ${isMobile ? 'flex-col' : ''} min-h-screen bg-gray-100`}>
        <Routes>
          <Route path="/dashboard" element={<Sidebar />} />
          <Route path="/profile" element={<Sidebar />} />
          <Route path="/login" element={<Sidebar />} />
        </Routes>
        <main className="flex-1 p-8 bg-white">
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </main>
      </div>
    </MemoryRouter>
  );
};

const meta = {
  title: 'Components/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The Sidebar component serves as the main navigation element for the application. It displays the Flex Republic logo, navigation links for Dashboard and Profile, and a logout button. Responsive design adapts to mobile, tablet, and desktop screens.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <SidebarWithRouter initialRoute="/dashboard" />,
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
};

export const Mobile: Story = {
  render: () => <SidebarWithRouter initialRoute="/dashboard" />,
  parameters: {
    viewport: {
      defaultViewport: 'iphone14',
    },
  },
};

export const Tablet: Story = {
  render: () => <SidebarWithRouter initialRoute="/dashboard" />,
  parameters: {
    viewport: {
      defaultViewport: 'ipad',
    },
  },
};

export const LargeDesktop: Story = {
  render: () => <SidebarWithRouter initialRoute="/dashboard" />,
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
};

export const DashboardActive: Story = {
  render: () => <SidebarWithRouter initialRoute="/dashboard" />,
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
  storyName: 'Dashboard Active State',
};

export const ProfileActive: Story = {
  render: () => <SidebarWithRouter initialRoute="/profile" />,
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
  storyName: 'Profile Active State',
};

export const FullPageDesktop: Story = {
  render: () => <FullPageLayout initialRoute="/dashboard" isMobile={false} />,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'desktop',
    },
  },
};

export const FullPageMobile: Story = {
  render: () => <FullPageLayout initialRoute="/dashboard" isMobile={true} />,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'iphone14',
    },
  },
};

export const FullPageWithProfileActive: Story = {
  render: () => <FullPageLayout initialRoute="/profile" isMobile={false} />,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'desktop',
    },
  },
};

export const HoverStateDesktop: Story = {
  render: () => <SidebarWithRouter initialRoute="/dashboard" />,
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
    docs: {
      description: {
        story: 'Hover over the Profile link to see the hover background color change from `bg-flexWhite/10` to `bg-flexWhite/20`',
      },
    },
  },
};
