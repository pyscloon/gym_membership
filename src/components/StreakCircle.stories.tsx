/**
 * StreakCircle.stories.tsx - Storybook stories for StreakCircle component
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { StreakCircle } from "./StreakCircle";

const meta = {
  title: "Components/StreakCircle",
  component: StreakCircle,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof StreakCircle>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * No streak - user hasn't checked in yet
 */
export const NoStreak: Story = {
  args: {
    streak: 0,
    last7Days: [false, false, false, false, false, false, false],
    loading: false,
    error: null,
  },
};

/**
 * Single day streak
 */
export const SingleDay: Story = {
  args: {
    streak: 1,
    last7Days: [false, false, false, false, false, false, true],
    loading: false,
    error: null,
  },
};

/**
 * 3-day consecutive streak (with glow effect)
 */
export const ThreeDayStreak: Story = {
  args: {
    streak: 3,
    last7Days: [false, false, false, false, true, true, true],
    loading: false,
    error: null,
  },
};

/**
 * 5-day streak (stronger glow)
 */
export const FiveDayStreak: Story = {
  args: {
    streak: 5,
    last7Days: [false, false, true, true, true, true, true],
    loading: false,
    error: null,
  },
};

/**
 * 7-day perfect streak (all days active with glow)
 */
export const PerfectWeek: Story = {
  args: {
    streak: 7,
    last7Days: [true, true, true, true, true, true, true],
    loading: false,
    error: null,
  },
};

/**
 * Broken streak - missed yesterday
 */
export const BrokenStreak: Story = {
  args: {
    streak: 0,
    last7Days: [true, true, true, true, true, false, true],
    loading: false,
    error: null,
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    streak: 0,
    last7Days: [],
    loading: true,
    error: null,
  },
};

/**
 * Error state
 */
export const Error: Story = {
  args: {
    streak: 0,
    last7Days: [],
    loading: false,
    error: "Failed to fetch streak data from server",
  },
};

/**
 * Partial week with mixed activity
 */
export const PartialWeek: Story = {
  args: {
    streak: 2,
    last7Days: [true, false, true, false, false, true, true],
    loading: false,
    error: null,
  },
};
