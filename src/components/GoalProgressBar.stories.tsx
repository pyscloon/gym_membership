import type { Meta, StoryObj } from "@storybook/react-vite";
import { within } from "@testing-library/dom";
import GoalProgressBar from "./GoalProgressBar";

const meta = {
  title: "Components/GoalProgressBar",
  component: GoalProgressBar,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Displays weekly goal progress with an inline days-left label and a completion state.",
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[320px] rounded-2xl bg-[#000033] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GoalProgressBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InProgress: Story = {
  args: {
    currentSessions: 2,
    weeklyGoal: 4,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByText(/2 days left/i);
  },
};

export const Complete: Story = {
  args: {
    currentSessions: 4,
    weeklyGoal: 4,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const label = canvas.queryByText(/day(s)? left/i);
    if (label) {
      throw new Error("Inline label should be hidden when the goal is complete.");
    }
  },
};
