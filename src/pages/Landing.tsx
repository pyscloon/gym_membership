import flexBackground from "../assets/flex-background.png";
import Header from "../components/Header";

export default function Landing() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-[#f0f7ff] to-[#e3f2fd]">
      <Header />

      {/* Hero Section */}
      <section className="w-full bg-gradient-to-br from-[#000033] via-[#0a2d5c] to-[#1a4d8a] px-6 py-16 sm:px-10 lg:px-14">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-flexBlue/20 px-4 py-1.5 text-sm font-semibold text-flexBlue mb-4 ring-1 ring-flexBlue/40">
              <span className="h-2.5 w-2.5 rounded-full bg-flexBlue animate-pulse" aria-hidden="true" />
              Fitness Forward Platform
            </div>
            <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-7xl">
              Elevate Your
              <span className="block bg-gradient-to-r from-flexBlue to-[#1c8ee6] bg-clip-text text-transparent"> Workout</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-white/90 sm:text-xl">
              Monitor gym crowd levels in real-time, choose the best time to train, and manage your membership seamlessly all in one platform.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-flexBlue to-[#1c8ee6] px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-flexBlue/30 transition hover:-translate-y-1 hover:shadow-2xl"
              >
                 Get Started Today
              </a>
              <a
                href="#about"
                className="inline-flex items-center justify-center rounded-xl border-2 border-white/30 bg-white/10 px-8 py-3.5 text-base font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                Learn More
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-flexBlue/25 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-8 -right-8 h-48 w-48 rounded-full bg-[#1c8ee6]/20 blur-3xl" aria-hidden="true" />
            <img
              src={flexBackground}
              alt="Flex Republic gym app preview"
              className="relative z-10 w-full rounded-3xl border-2 border-white/30 object-cover shadow-[0_40px_100px_rgba(31,90,214,0.3)]"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full bg-white px-6 py-16 sm:px-10 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-black text-[#000033] sm:text-5xl">Why Choose Flex Republic?</h2>
            <p className="mt-4 text-lg text-flexNavy/80">Everything you need to dominate your fitness journey</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", title: "Live Capacity", desc: "Real-time gym occupancy data" },
              { step: "02", title: "Smart Scheduling", desc: "Best time recommendations" },
              { step: "03", title: "Flexible Plans", desc: "Plans that fit your goals" },
              { step: "04", title: "Seamless Check-In", desc: "Quick QR code validation" },
            ].map((item) => (
              <article key={item.title} className="group rounded-2xl border-2 border-flexBlue/20 bg-gradient-to-br from-flexBlue/5 to-flexBlue/10 p-6 transition hover:-translate-y-1 hover:border-flexBlue/40 hover:shadow-lg">
                <span className="mb-3 inline-flex rounded-md border border-flexBlue/35 bg-white px-2.5 py-1 text-xs font-bold tracking-widest text-flexBlue transition group-hover:bg-flexBlue group-hover:text-white">
                  {item.step}
                </span>
                <h3 className="text-xl font-bold text-[#000033]">{item.title}</h3>
                <p className="mt-2 text-sm text-flexNavy/75">{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full bg-gradient-to-r from-flexBlue via-[#1c8ee6] to-[#0f66bf] px-6 py-12 sm:px-10 lg:px-14">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-6 rounded-2xl bg-white/10 p-8 backdrop-blur">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-white/80">Transform Your Fitness</p>
            <p className="text-2xl font-black text-white">Start your premium membership now</p>
          </div>
          <a
            href="/subscription-tier"
            className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3 font-bold text-flexBlue shadow-lg transition hover:scale-105 hover:shadow-2xl"
          >
            View Plans →
          </a>
        </div>
      </section>

      {/* Stats Section */}
      <section id="about" className="w-full bg-[#f8f9ff] px-6 py-16 sm:px-10 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "10K+", label: "Active Members" },
              { stat: "24/7", label: "Real-Time Data" },
              { stat: "4.9★", label: "User Rating" },
              { stat: "100%", label: "Uptime" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white p-8 text-center shadow-md border-2 border-flexBlue/10">
                <p className="text-4xl font-black text-flexBlue">{item.stat}</p>
                <p className="mt-2 text-flexNavy font-semibold">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="w-full bg-gradient-to-br from-[#000033] to-[#0a2d5c] px-6 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-white/80">Ready to train smarter? Join thousands of gym members using Flex Republic today.</p>
        </div>
      </section>
    </div>
  );
}
