import Header from "../components/Header";
import MembershipDashboard from "../components/MembershipDashboard";

export default function SubscriptionTier() {

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-[#f0f7ff] to-[#e3f2fd]">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-10 lg:px-14">
        <section className="mb-10 rounded-3xl bg-gradient-to-br from-[#000033] via-[#0a2d5c] to-[#1a4d8a] px-8 py-12 text-white sm:px-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-flexBlue/20 px-4 py-1.5 text-sm font-semibold text-flexBlue mb-4">
            💎 Premium Membership
          </div>
          <h1 className="text-4xl font-black text-white sm:text-5xl">Choose Your Perfect Plan</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            Select a membership that aligns with your fitness goals. All plans include real-time gym capacity tracking and seamless check-ins.
          </p>
        </section>

        <MembershipDashboard />

        <section className="mt-12 rounded-3xl bg-gradient-to-r from-flexBlue/10 to-[#1c8ee6]/10 border-2 border-flexBlue/30 p-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-flexBlue">Have Questions?</p>
            <h2 className="mt-2 text-2xl font-black text-[#000033]">Join thousands of gym enthusiasts</h2>
            <p className="mt-3 text-flexNavy/80">Get access to exclusive features and community benefits with your membership.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
