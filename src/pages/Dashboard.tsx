import Header from "../components/Header";
import MembershipDashboard from "../components/MembershipDashboard";

export default function Dashboard() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-[#f0f7ff] to-[#e3f2fd]">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-10 lg:px-14">
        <section className="mb-8 rounded-3xl bg-gradient-to-r from-[#000033] via-[#0a2d5c] to-[#1a4d8a] px-8 py-9 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-flexBlue">Dashboard</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Welcome Back</h1>
          <p className="mt-2 text-white/85">Track your gym access, membership status, and renewals in one place.</p>
        </section>

        <MembershipDashboard />
      </main>
    </div>
  );
}