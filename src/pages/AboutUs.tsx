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

        {/* Values Section */}
        <section className="bg-gradient-to-r from-flexBlue to-[#1c8ee6] px-6 py-16 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-3xl font-black text-white mb-8 text-center">Our Core Values</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { value: "Innovation", desc: "Always evolving with cutting-edge tech" },
                { value: "Transparency", desc: "Clear data, honest metrics, no BS" },
                { value: "Community", desc: "Building gyms that are stronger together" },
                { value: "Excellence", desc: "Obsessed with user experience quality" },
              ].map((item) => (
                <div key={item.value} className="rounded-xl bg-white/10 p-6 backdrop-blur border border-white/20">
                  <h3 className="text-xl font-bold text-white">{item.value}</h3>
                  <p className="mt-2 text-white/80">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-[#f8f9ff] px-6 py-16 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-center">
              {[
                { stat: "Founded", value: "2024" },
                { stat: "Members", value: "10K+" },
                { stat: "Gyms", value: "50+" },
                { stat: "Countries", value: "5+" },
              ].map((item) => (
                <div key={item.stat} className="rounded-2xl bg-white p-8 shadow-sm border-2 border-flexBlue/10">
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
