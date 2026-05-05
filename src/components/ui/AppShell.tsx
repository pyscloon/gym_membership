import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import AppTopBar from "./AppTopBar";
import PageTransition from "./PageTransition";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="fr-page-shell">
      <AppTopBar onOpenMobileNav={() => setMobileOpen(true)} fixed={false} />

      <div className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-7xl lg:grid-cols-[260px_1fr]">
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        <main className="px-4 py-10 sm:px-6 lg:px-10">
          <AnimatePresence mode="wait">
            <PageTransition routeKey={location.pathname}>{children}</PageTransition>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-[70] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-[rgba(0,0,30,0.62)]"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            />
            <motion.div
              className="absolute left-0 top-0 h-full"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <AppSidebar mobile onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
