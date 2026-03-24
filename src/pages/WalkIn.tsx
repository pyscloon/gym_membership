import MembershipDashboard from "../components/MembershipDashboard";

export default function WalkInPage() {
  return (
    <main
      className="min-h-screen p-0"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0, 0, 0, 0.74), rgba(0, 51, 102, 0.74)), url('/flex-republic-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <section className="grid min-h-screen w-full overflow-hidden bg-flexWhite/92 shadow-2xl ring-1 ring-flexBlack/20 md:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="border-b border-flexNavy/15 bg-flexBlack p-4 text-flexWhite md:border-b-0 md:border-r md:border-flexNavy/20 md:p-5">
          <div className="inline-flex items-center rounded-xl bg-flexWhite px-3 py-2 shadow-md ring-1 ring-flexNavy/20">
            <h1 className="text-xl font-black italic tracking-wide sm:text-2xl">
              <span className="text-black">Flex</span>{" "}
              <span className="text-flexBlue">Republic</span>
            </h1>
          </div>

          <nav className="mt-8 space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-flexWhite/60 font-bold mb-4">
              Walk-In Access
            </p>
            <div className="rounded-xl bg-flexBlue/10 border border-flexBlue/30 px-3 py-2">
              <p className="text-sm font-semibold text-flexBlue">Guest Pass</p>
              <p className="text-xs text-flexWhite/80 mt-1">
                24-hour access to our facility
              </p>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="overflow-y-auto">
          <section className="relative p-4 sm:p-6 md:p-10">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="inline-flex rounded-full bg-flexBlue/10 px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] text-flexNavy ring-1 ring-flexBlue/20">
                  Walk-In Access
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-flexBlack sm:text-3xl">
                  Guest Pass Purchase
                </h2>
              </div>
            </header>

            <section className="mt-6 rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-5 sm:p-6">
              <p className="text-base text-flexBlack sm:text-lg">
                Welcome to Flex Republic!
              </p>
              <p className="mt-1 text-sm text-flexNavy">
                Get instant access to our gym facilities with a walk-in pass. No
                registration required.
              </p>
            </section>

            <section className="mt-6">
              <MembershipDashboard />
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
