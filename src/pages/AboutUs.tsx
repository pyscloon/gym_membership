import { Link } from "react-router-dom";
import Header from "../components/Header";

export default function AboutUs() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-[#f0f7ff] to-[#e3f2fd]">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#000033] via-[#0a2d5c] to-[#1a4d8a] px-6 py-16 text-white sm:px-10 lg:px-14">
          <div className="mx-auto max-w-7xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-flexBlue/20 px-4 py-1.5 text-sm font-semibold text-flexBlue mb-4">
              <span className="h-2.5 w-2.5 rounded-full bg-flexBlue animate-pulse" aria-hidden="true" />
              Our Story
            </div>
            <h1 className="text-4xl font-black text-white sm:text-5xl lg:text-6xl">About Flex Republic</h1>
            <p className="mt-6 max-w-3xl text-lg text-white/85 leading-relaxed">
              We believe fitness should be smart, accessible, and social. Flex Republic combines cutting-edge technology with a passion for helping people achieve their goals.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="bg-white px-6 py-16 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-3">
              <article className="rounded-2xl border-2 border-flexBlue/20 bg-gradient-to-br from-flexBlue/10 to-white p-8 hover:shadow-lg transition">
                <div className="mb-4 inline-flex rounded-md bg-flexBlue/10 px-2 py-1 text-xs font-bold tracking-widest text-flexBlue">MISSION</div>
                <h2 className="text-2xl font-black text-[#000033]">Our Mission</h2>
                <p className="mt-4 text-flexNavy/80 leading-relaxed">
                  Empower gym members worldwide to train smarter, not harder. We provide real-time insights that remove guesswork from fitness routines.
                </p>
              </article>

              <article className="rounded-2xl border-2 border-flexBlue/20 bg-gradient-to-br from-flexBlue/10 to-white p-8 hover:shadow-lg transition">
                <div className="mb-4 inline-flex rounded-md bg-flexBlue/10 px-2 py-1 text-xs font-bold tracking-widest text-flexBlue">VISION</div>
                <h2 className="text-2xl font-black text-[#000033]">Our Vision</h2>
                <p className="mt-4 text-flexNavy/80 leading-relaxed">
                  Create a globally connected fitness ecosystem where gyms and members work together seamlessly to build healthier communities.
                </p>
              </article>

              <article className="rounded-2xl border-2 border-flexBlue/20 bg-gradient-to-br from-flexBlue/10 to-white p-8 hover:shadow-lg transition">
                <div className="mb-4 inline-flex rounded-md bg-flexBlue/10 px-2 py-1 text-xs font-bold tracking-widest text-flexBlue">PROMISE</div>
                <h2 className="text-2xl font-black text-[#000033]">Our Promise</h2>
                <p className="mt-4 text-flexNavy/80 leading-relaxed">
                  Reliable tools, transparent data, and membership options that stay easy to manage. Your success is our success.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Trainers Section */}
        <section className="bg-gradient-to-r from-flexBlue to-[#1c8ee6] px-6 py-16 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/75">Professional Team</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Meet Our Trainers</h2>
              <p className="mt-4 text-base leading-relaxed text-white/85 sm:text-lg">
                Our trainers combine disciplined expertise with a refined approach to coaching, guiding every member with clarity and consistency.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: "Amiel Benedict Mirasol", role: "Coach" },
                { name: "Ilon Ziv Barcelona", role: "Coach" },
                { name: "Gian Gamir Umadhay", role: "Coach" },
                { name: "Lance Jrzn Demonteverde", role: "Coach" },
              ].map((trainer) => (
                <article key={trainer.name} className="rounded-2xl border border-white/20 bg-white/10 p-6 text-white shadow-[0_18px_40px_rgba(0,0,0,0.12)] backdrop-blur transition hover:-translate-y-1 hover:bg-white/15">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Trainer</p>
                      <h3 className="mt-2 text-xl font-bold">{trainer.name}</h3>
                    </div>
                    <div className="h-12 w-12 flex-shrink-0 rounded-full border border-white/30 bg-white/15" aria-hidden="true" />
                  </div>
                  <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-white/80">{trainer.role}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-[#f8f9ff] px-6 py-16 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-7xl">
            {/* Using flex and justify-center to center the three items */}
            <div className="flex flex-wrap justify-center gap-8 text-center">
              {[
                { stat: "Founded", value: "2021" },
                { stat: "Members", value: "100" },
                { stat: "Gyms", value: "2" },
              ].map((item) => (
                <div 
                  key={item.stat} 
                  className="w-full max-w-[280px] rounded-2xl bg-white p-8 shadow-sm border-2 border-flexBlue/10"
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-flexBlue">{item.stat}</p>
                  <p className="mt-3 text-4xl font-black text-[#000033]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-br from-[#000033] to-[#0a2d5c] px-6 py-16 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-r from-flexBlue to-[#1c8ee6] p-10 text-center text-white">
            <h2 className="text-3xl font-black">Ready to Join Our Movement?</h2>
            <p className="mt-3 text-white/90 text-lg">Start your fitness transformation with Flex Republic today.</p>
            <Link
              to="/subscription-tier"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 font-bold text-flexBlue shadow-lg transition hover:scale-105 hover:shadow-xl"
            >
              View Membership Plans
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}