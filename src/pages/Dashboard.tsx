import Header from "../components/Header";
import MembershipDashboard from "../components/MembershipDashboard";

export default function Dashboard() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_top_right,#d9f5ff_0%,#f7fbff_35%,#ecf5ff_100%)]">
      <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-20 bottom-10 h-80 w-80 rounded-full bg-blue-200/25 blur-3xl" aria-hidden="true" />
      <Header />
      <main className="relative mx-auto w-full max-w-7xl px-6 py-10 sm:px-10 lg:px-14">
        <section className="mb-8 overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-r from-[#021738] via-[#0b2f63] to-[#0f4e8c] px-8 py-10 text-white shadow-[0_30px_65px_rgba(4,23,56,0.35)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-flexBlue">Dashboard</p>
          <h1 className="mt-2 text-3xl font-black sm:text-5xl">Welcome Back</h1>
          <p className="mt-3 max-w-2xl text-white/85">Monitor your session activity, membership controls, and gym access tools from this central control panel.</p>
        </section>

        <MembershipDashboard />
      </main>
    </div>
  );
}