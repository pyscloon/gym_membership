import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import AppTopBar from "../components/ui/AppTopBar";
import { useAuth } from "../hooks/useAuth";
import { fetchUserMembership } from "../lib/membershipService";

/**
 * Hook to animate numeric values
 */
function useCounter(target: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const currentCount = Math.floor(progress * target);
      if (countRef.current !== currentCount) {
        countRef.current = currentCount;
        setCount(currentCount);
      }
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return count;
}

const StatCard = ({ stat, value, delay }: { stat: string; value: string; delay: number }) => {
  const numericValue = parseInt(value.replace(/\D/g, ""));
  const displayValue = useCounter(numericValue);
  
  return (
    <div className="fr-stat-module" style={{ animationDelay: `${delay}ms` }}>
      <div className="module-grid" />
      <div className="module-content">
        <span className="module-label">{stat}</span>
        <div className="module-value">
          {displayValue}{value.includes("+") ? "+" : ""}
        </div>
        <div className="module-deco">
          <div className="deco-line" />
          <div className="deco-dot" />
        </div>
      </div>
    </div>
  );
};

export default function AboutUs() {
  const { user } = useAuth();

  useEffect(() => {
    const loadMembership = async () => {
      if (!user) {
        return;
      }

      await fetchUserMembership(user.id);
    };

    void loadMembership();
  }, [user]);

  const trainers = [
    { name: "Amiel Benedict Mirasol", role: "Elite Trainer", id: "A-001" },
    { name: "Ilon Ziv Barcelona", role: "Strength Coach", id: "A-002" },
    { name: "Gian Gamir Umadhay", role: "Fitness Coach", id: "A-003" },
    { name: "Lance Jrzn Demonteverde", role: "Boxing Coach", id: "A-004" },
  ];

  return (
    <div className="fr-page-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;800&family=Inter:wght@400;500&family=Space+Mono&family=Bebas+Neue&display=swap');

        :root {
          --fr-navy: #000033;
          --fr-royal: #0066CC;
          --fr-sky: #0099FF;
          --fr-gold: #D4AF37;
          --fr-white: #FFFFFF;
          --fr-offwhite: #EEEEEE;
        }

        .fr-page-wrapper {
          background: var(--fr-navy);
          color: var(--fr-offwhite);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .fr-page-wrapper::before {
          content: "";
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            linear-gradient(rgba(0,153,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,153,255,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        section { position: relative; z-index: 1; }

        /* --- RESTORED HERO --- */
        .fr-hero {
          padding: 80px 48px;
          background: linear-gradient(135deg, #000033 0%, #000d26 50%, #001a4d 100%);
          border-bottom: 1px solid rgba(0,102,204,0.20);
        }

        .fr-label {
          font-family: 'Space Mono', monospace;
          font-weight: 400;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-size: 11px;
          color: var(--fr-sky);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .fr-h1 {
          font-family: 'Barlow', sans-serif;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: -0.03em;
          font-size: clamp(2.8rem, 6vw, 5rem);
          color: var(--fr-white);
          margin: 16px 0;
        }

        .fr-gradient-text {
          background: linear-gradient(90deg, #0066CC, #0099FF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .fr-subtext {
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          line-height: 1.7;
          color: rgba(238,238,238,0.75);
          max-width: 640px;
        }

        /* --- RESTORED GLASS CARDS --- */
        .fr-glass-card {
          background: rgba(0, 0, 30, 0.75);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 102, 204, 0.35);
          border-radius: 16px;
          padding: 32px;
          position: relative;
          overflow: hidden;
          transition: all 0.25s ease;
          animation: fadeUp 0.6s ease forwards;
          opacity: 0;
        }

        .fr-accent-bar {
          height: 3px;
          background: linear-gradient(90deg, #0066CC, #0099FF);
          position: absolute;
          top: 0; left: 0; right: 0;
        }

        .fr-card-h {
          font-family: 'Barlow', sans-serif;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 1.5rem;
          color: var(--fr-white);
          margin-top: 12px;
        }

        /* --- TRAINER SECTION --- */
        .trainer-card {
          background: #121418 !important;
          padding: 0 !important;
          border: 1px solid var(--fr-gold) !important;
          display: flex;
          flex-direction: column;
          height: 480px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.6);
        }

        .trainer-visual-box {
          position: relative;
          height: 60%;
          background: radial-gradient(circle, #1e2126 0%, #0a0c10 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .trainer-frame-overlay {
          position: absolute; inset: 0; z-index: 3;
          width: 100%; height: 100%; object-fit: contain; transform: scale(1.1);
        }

        .trainer-img { height: 70%; z-index: 2; object-fit: contain; }

        /* --- BEAUTIFIED STATS MODULES --- */
        .fr-stats-grid-section {
          padding: 80px 48px;
          background: #EEEEEE;
          display: flex;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .fr-stat-module {
          background: #ffffff;
          width: 280px;
          height: 160px;
          border-left: 4px solid var(--fr-royal);
          position: relative;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          padding: 0 32px;
          overflow: hidden;
          opacity: 0;
          animation: fadeUp 0.8s ease forwards;
        }

        .module-grid {
          position: absolute; inset: 0;
          background-image: radial-gradient(#0066cc15 1px, transparent 1px);
          background-size: 15px 15px;
        }

        .module-content { position: relative; z-index: 2; }
        .module-label { font-family: 'Space Mono', monospace; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 2px; }
        .module-value { font-family: 'Barlow', sans-serif; font-weight: 800; font-size: 3.5rem; color: var(--fr-navy); line-height: 1; }
        .module-deco { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
        .deco-line { width: 40px; height: 2px; background: var(--fr-sky); }
        .deco-dot { width: 6px; height: 6px; background: var(--fr-navy); border-radius: 50%; }

        /* --- BEAUTIFIED FINAL CTA --- */
        .fr-final-cta {
          padding: 120px 48px;
          background: #050510;
          position: relative;
          overflow: hidden;
          text-align: center;
        }

        .cta-bg-glow {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 600px; height: 600px; background: radial-gradient(circle, rgba(0,102,204,0.15) 0%, transparent 70%);
        }

        .cta-title { font-family: 'Barlow', sans-serif; font-weight: 800; font-size: clamp(2.5rem, 5vw, 4.5rem); color: white; line-height: 0.9; margin-bottom: 24px; }
        
        .fr-btn-premium {
          display: inline-flex; align-items: center; gap: 12px;
          background: white; color: var(--fr-navy); padding: 18px 48px;
          font-family: 'Barlow', sans-serif; font-weight: 800; text-transform: uppercase;
          transition: all 0.3s ease; box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        }

        .fr-btn-premium:hover { background: var(--fr-sky); color: white; transform: translateY(-3px); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <AppTopBar />

      <main>
        {/* 1.  HERO SECTION */}
        <section className="fr-hero">
          <div className="mx-auto max-w-7xl px-4">
            <h1 className="fr-h1">ABOUT <span className="fr-gradient-text">FLEX REPUBLIC</span></h1>
            <p className="fr-subtext">We believe fitness should be smart, accessible, and social. Flex Republic combines cutting-edge technology with elite coaching.</p>
          </div>
        </section>

        {/* 2. RESTORED MISSION/VISION SECTION */}
        <section className="px-12 py-20 bg-[#EEEEEE] relative">
          <div className="mx-auto max-w-7xl relative z-10">
            <div className="fr-label justify-center mb-12 text-[#0066CC]">WHAT WE STAND FOR</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <article className="fr-glass-card bg-[rgba(255,255,255,0.95)]" style={{ animationDelay: '0ms' }}>
                <div className="fr-accent-bar" />
                <span className="fr-label" style={{ color: '#0066CC' }}>MISSION</span>
                <h2 className="fr-card-h text-[#000033]">Our Mission</h2>
                <p className="fr-subtext mt-4 text-sm text-[rgba(0,0,51,0.85)]">Empower gym members to train smarter through data-driven insights and professional guidance.</p>
              </article>
              <article className="fr-glass-card bg-[rgba(255,255,255,0.95)]" style={{ animationDelay: '120ms' }}>
                <div className="fr-accent-bar" />
                <span className="fr-label" style={{ color: '#0066CC' }}>VISION</span>
                <h2 className="fr-card-h text-[#000033]">Our Vision</h2>
                <p className="fr-subtext mt-4 text-sm text-[rgba(0,0,51,0.85)]">To create a globally connected fitness ecosystem where technology and hard work intersect seamlessly.</p>
              </article>
              <article className="fr-glass-card bg-[rgba(255,255,255,0.95)]" style={{ animationDelay: '240ms' }}>
                <div className="fr-accent-bar" />
                <span className="fr-label" style={{ color: '#0066CC' }}>PROMISE</span>
                <h2 className="fr-card-h text-[#000033]">Our Promise</h2>
                <p className="fr-subtext mt-4 text-sm text-[rgba(0,0,51,0.85)]">We provide reliable tools, transparent data, and membership options that put our members' success first.</p>
              </article>
            </div>
          </div>
        </section>

        {/* 3. TRAINERS SECTION */}
        <section className="px-12 py-24 bg-[#050510]">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <div className="fr-label justify-center" style={{ color: 'var(--fr-gold)' }}>PROFESSIONAL STAFF</div>
              <h2 className="fr-h1">MEET OUR COACHES</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {trainers.map((trainer, i) => (
                <article key={trainer.id} className="trainer-card" style={{ animationDelay: `${i * 150}ms`, opacity: 1 }}>
                  <div className="trainer-visual-box">
                    <img src="/src/assets/frame.png" className="trainer-frame-overlay" alt="frame" />
                    <img src="/src/assets/placeholder.png" className="trainer-img" alt={trainer.name} />
                  </div>
                  <div className="p-6 text-center">
                    <span className="gold-tag">CERTIFIED COACH</span>
                    <h3 className="font-['Bebas_Neue'] text-3xl text-white">{trainer.name}</h3>
                    <p className="text-xs text-blue-400 uppercase tracking-widest">{trainer.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 4. BEAUTIFIED STATS SECTION */}
        <section className="fr-stats-grid-section">
          <StatCard stat="Founded" value="2021" delay={100} />
          <StatCard stat="Total Members" value="100+" delay={200} />
          <StatCard stat="Active Gyms" value="02" delay={300} />
        </section>

        {/* 5. RESTORED & BEAUTIFIED FINAL CTA */}
        <section className="fr-final-cta">
          <div className="cta-bg-glow" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <span className="cta-tagline" style={{ color: 'var(--fr-sky)', fontFamily: 'Space Mono', fontSize: '12px' }}>LIMITED SLOTS AVAILABLE</span>
            <h2 className="cta-title">THE REPUBLIC <br/> IS WAITING</h2>
            <p className="text-gray-400 mb-10">Access data-driven training, world-class coaches, and a community built on performance.</p>
            <Link to="/subscription-tier" className="fr-btn-premium">
              View Membership Plans
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}