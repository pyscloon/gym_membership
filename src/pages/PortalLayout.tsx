import { Outlet } from "react-router-dom";
import { AppShell } from "../components/ui";

export default function PortalLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
