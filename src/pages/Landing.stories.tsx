import type { Meta, StoryObj } from '@storybook/react-vite';
import { waitFor, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppUiProvider } from '../context/AppUiContext';
import Landing from './Landing';

const meta = {
  title: 'Pages/Landing',
  component: Landing,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Landing page with hero, testimonials, app features, locations, and CTA sections.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <AppUiProvider>
          <Story />
        </AppUiProvider>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof Landing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UnitHeroContent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    canvas.getByRole('heading', { name: /forge your/i });
    canvas.getByText(/legacy\./i);
    canvas.getByRole('link', { name: /start membership/i });
    canvas.getByRole('link', { name: /explore features/i });
    canvas.getByRole('heading', { name: /users talk about us/i });
  },
};

export const FeatureSwitchingFlow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    const dashboardCard = canvas.getByRole('heading', { name: /^dashboard$/i });
    await user.click(dashboardCard);

    await waitFor(() => {
      canvas.getByAltText(/dashboard preview/i);
    });

    const scanCard = canvas.getByRole('heading', { name: /check-in \/ check-out/i });
    await user.click(scanCard);

    await waitFor(() => {
      canvas.getByAltText(/check-in \/ check-out preview/i);
    });
  },
};

export const IntegrationLocationDistanceFlow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    const originalConfirm = window.confirm;
    const originalGeolocation = navigator.geolocation;

    try {
      window.confirm = () => true;

      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (success: PositionCallback) => {
            success({
              coords: {
                latitude: 10.732,
                longitude: 122.56,
                accuracy: 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
              },
              timestamp: Date.now(),
            } as GeolocationPosition);
          },
          watchPosition: () => 0,
          clearWatch: () => {},
        } as Geolocation,
      });

        await user.click(canvas.getByRole('button', { name: /enter your location/i }));

      await waitFor(() => {
        canvas.getByText(/location access approved\./i);
      });

      await waitFor(() => {
        const chips = canvas.getAllByText(/km/i);
        if (chips.length < 2) {
          throw new Error('Expected distance chips for both branches');
        }
      });
    } finally {
      window.confirm = originalConfirm;
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: originalGeolocation,
      });
    }
  },
};
