import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type AppUiContextValue = {
  notificationCount: number;
  setNotificationCount: (value: number) => void;
  membershipTier: string;
  setMembershipTier: (value: string) => void;
  avatarLabel: string;
  setAvatarLabel: (value: string) => void;
};

const AppUiContext = createContext<AppUiContextValue | null>(null);

type AppUiProviderProps = {
  children: ReactNode;
};

export function AppUiProvider({ children }: AppUiProviderProps) {
  const [notificationCount, setNotificationCount] = useState(3);
  const [membershipTier, setMembershipTier] = useState("monthly");
  const [avatarLabel, setAvatarLabel] = useState("FR");

  const value = useMemo(
    () => ({
      notificationCount,
      setNotificationCount,
      membershipTier,
      setMembershipTier,
      avatarLabel,
      setAvatarLabel,
    }),
    [avatarLabel, membershipTier, notificationCount]
  );

  return <AppUiContext.Provider value={value}>{children}</AppUiContext.Provider>;
}

export function useAppUi() {
  const context = useContext(AppUiContext);
  if (!context) {
    throw new Error("useAppUi must be used within AppUiProvider");
  }
  return context;
}
