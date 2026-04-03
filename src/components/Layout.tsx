import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-flexBlack via-flexNavy to-flexBlue p-0">
      <section className="grid min-h-screen w-full overflow-hidden bg-flexWhite/95 shadow-2xl ring-1 ring-flexBlack/20 md:grid-cols-[260px_1fr]">
        <Sidebar />
        <div className="bg-white p-5 sm:p-7 md:p-8 lg:p-10 overflow-y-auto">
          {children}
        </div>
      </section>
    </main>
  );
}