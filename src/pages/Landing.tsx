import { useEffect, useRef, useState } from "react";
import { motion, useInView, useSpring } from "framer-motion";
import { Link } from "react-router-dom";
import AppTopBar from "../components/ui/AppTopBar";
import placeholderImage from "../assets/placeholder.jpg";
import flexBackground from "../assets/flex-background.png";
import location1 from "../assets/Location1.png";
import location2 from "../assets/Location2.png";
import { appFeatures, branchLocations, testimonials, whyChooseFeatures } from "../lib/landingContent";

const snapSpring = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
  mass: 0.65,
};

export default function Landing() {
  const [activeFeature, setActiveFeature] = useState<string>("Login / Register");
  const [heroWord, setHeroWord] = useState<"FORGE" | "FLEX">("FORGE");
  const [isLocating, setIsLocating] = useState(false);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState<Record<string, number> | null>(null);

  const testimonialSectionRef = useRef<HTMLElement | null>(null);
  const mobileSectionRef = useRef<HTMLElement | null>(null);
  const sectionFourRef = useRef<HTMLElement | null>(null);
  const sectionFiveRef = useRef<HTMLElement | null>(null);

  const mobileInView = useInView(mobileSectionRef, { once: true, amount: 0.25 });
  const sectionFourInView = useInView(sectionFourRef, { once: true, amount: 0.2 });
  const sectionFiveInView = useInView(sectionFiveRef, { once: true, amount: 0.2 });

  const tiltX = useSpring(0, { stiffness: 250, damping: 25, mass: 0.55 });
  const tiltY = useSpring(0, { stiffness: 250, damping: 25, mass: 0.55 });

  const featureScreens: Record<string, string> = {
    "Login / Register": placeholderImage,
    Dashboard: flexBackground,
    "Check-in / Check-out": location1,
  };

  const featureTilt: Record<string, { x: number; y: number }> = {
    "Login / Register": { x: -4, y: 5 },
    Dashboard: { x: 0, y: -4 },
    "Check-in / Check-out": { x: 4, y: 5 },
  };

  const branchCoordinates = [
    { name: "Jaro Plaza Branch", lat: 10.72431, lng: 122.56252 },
    { name: "B-Complex Branch ", lat: 10.73421, lng: 122.55745 },
  ];

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const calculateKmDistance = (startLat: number, startLng: number, endLat: number, endLng: number) => {
    const earthRadiusKm = 6371;
    const deltaLat = toRadians(endLat - startLat);
    const deltaLng = toRadians(endLng - startLng);
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(toRadians(startLat)) * Math.cos(toRadians(endLat)) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const handleFeatureClick = (title: string) => {
    setActiveFeature(title);
    const target = featureTilt[title] ?? { x: 0, y: 0 };
    tiltX.set(target.x);
    tiltY.set(target.y);
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setHeroWord((current) => (current === "FORGE" ? "FLEX" : "FORGE"));
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  // FIXED: handleEnterLocation logic revised to avoid native browser alerts
  const handleEnterLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setLocationError(null);
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const distances = branchCoordinates.reduce<Record<string, number>>((acc, branch) => {
          acc[branch.name] = calculateKmDistance(
            position.coords.latitude,
            position.coords.longitude,
            branch.lat,
            branch.lng
          );
          return acc;
        }, {});
        setDistanceKm(distances);
        setLocationAllowed(true);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        setLocationAllowed(false);
        // Map error codes to friendly strings to avoid "Localhost says" dialogs
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Please enable location access in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("The request to get user location timed out.");
            break;
          default:
            setLocationError("An unknown error occurred.");
            break;
        }
      },
      { 
        enableHighAccuracy: true, 
        timeout: 8000, // Reduced timeout for better UX
        maximumAge: 0  // Force a fresh location fetch
      }
    );
  };

  return (
    <div className="w-full bg-white text-[#000033]">
      {/* Section 1 — Hero */}
      <section className="relative h-[88vh] min-h-[640px] w-full overflow-hidden bg-[#00001a] px-6 sm:px-10 lg:px-14">
        <AppTopBar mode="landing" />
        
        <div className="absolute inset-0 z-0">
          <img 
            src="src/assets/backgroundimage1.png" 
            alt="Gym Background" 
            className="h-full w-full object-cover blur-[2px] scale-105" 
          />
          <div className="absolute inset-0 bg-[#000033]/60 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#000033]/40 via-transparent to-[#000033]/80" />
        </div>

        <div className="fr-grid absolute inset-0 z-[1] opacity-40" aria-hidden="true" />
        <div className="fr-noise absolute inset-0 z-[2] opacity-10 pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl items-center">
          <motion.div
            className="mx-auto max-w-3xl pt-16 text-center"
            initial={{ y: 24, clipPath: "inset(0 0 100% 0)" }}
            animate={{ y: 0, clipPath: "inset(0 0 0% 0)" }}
            transition={{ ...snapSpring, delay: 0.12 }}
          >
            <motion.h1
              className="fr-heading fr-heading-hero mt-5 text-[36px] text-white md:text-5xl xl:text-[72px] leading-[1.1] overflow-visible"
              initial={{ y: 44, clipPath: "polygon(0 100%, 100% 84%, 100% 100%, 0 100%)" }}
              animate={{ y: 0, clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }}
              transition={{ ...snapSpring, delay: 0.24 }}
            >
              <span className="inline-flex items-center gap-3 tracking-normal">
                <span key={heroWord} className="fr-hero-flicker">
                  {heroWord}
                </span>
                <span className="pr-3 -mr-3">YOUR</span>
              </span>
              <span className="block text-[#0066CC]">LEGACY.</span>
            </motion.h1>

            <motion.p
              className="mt-6 max-w-[520px] mx-auto text-base text-[#EEEEEE] sm:text-lg [font-family:var(--font-body)]"
              initial={{ y: 20, clipPath: "inset(0 0 100% 0)" }}
              animate={{ y: 0, clipPath: "inset(0 0 0 0)" }}
              transition={{ ...snapSpring, delay: 0.36 }}
            >
              Train smarter with premium facilities, real-time gym tools, and a seamless digital experience built for members who demand more.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap justify-center gap-3"
              initial={{ y: 20, clipPath: "inset(0 0 100% 0)" }}
              animate={{ y: 0, clipPath: "inset(0 0 0 0)" }}
              transition={{ ...snapSpring, delay: 0.48 }}
            >
              <Link
                to="/subscription-tier"
                className="fr-cta-glow inline-flex items-center justify-center rounded-full bg-[#0066CC] px-8 py-3 text-base text-white transition hover:bg-[#0099FF] font-bold"
              >
                START MEMBERSHIP
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-transparent px-8 py-3 text-base text-white transition hover:border-[#0099FF] font-bold"
              >
                EXPLORE FEATURES
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Section 2 — Testimonials */}
      <section ref={testimonialSectionRef} className="relative w-full overflow-hidden bg-white px-6 pb-20 pt-10 sm:px-10 lg:px-14">
        <span className="fr-watermark pointer-events-none absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 text-[22vw] font-extrabold leading-none [font-family:var(--font-headline)]">
          FLEX
        </span>
        
        <div className="mx-auto w-full max-w-7xl">
          <motion.h2
            className="fr-heading mb-12 text-center text-3xl text-[#000033] sm:text-5xl"
            initial={{ y: 26, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={snapSpring}
          >
            USERS TALK ABOUT US
          </motion.h2>

          <div className="relative flex overflow-hidden">
            <motion.div
              className="flex gap-6"
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                duration: 25,
                ease: "linear",
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              {[...testimonials, ...testimonials].map((item, index) => (
                <article
                  key={`${item.name}-${index}`}
                  className={`relative w-[280px] min-w-[280px] overflow-hidden rounded-xl sm:w-[300px] sm:min-w-[300px] xl:w-[290px] xl:min-w-[290px] ${
                      index % 2 === 1 ? "mt-6" : "mt-0"
                  }`}
                >
                  <img
                    src={placeholderImage}
                    alt={`${item.name} training`}
                    className={`h-[420px] w-full object-cover ${
                      index % 2 === 1 ? "sm:h-[390px]" : "sm:h-[450px]"
                    }`}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,30,0.9)_0%,rgba(0,0,30,0)_55%)]" />

                  <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-[#0066CC]/30 bg-[#000028]/72 p-4 backdrop-blur-md">
                    <p className="fr-quote text-5xl leading-none text-[#0099FF]">&quot;</p>
                    <h3 className="mt-1 text-base text-white font-bold">{item.name}</h3>
                    <p className="mt-2 text-[13px] text-[#EEEEEE]/85 line-clamp-3">
                      {item.feedback}
                    </p>
                  </div>
                </article>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 3 — Mobile App */}
      <section ref={mobileSectionRef} className="relative w-full overflow-hidden bg-[#000033] px-6 py-16 sm:px-10 lg:px-14">
        <div className="fr-grid absolute inset-0 z-0 opacity-30 pointer-events-none" aria-hidden="true" />
        <div className="fr-noise absolute inset-0 z-[1] opacity-10 pointer-events-none" aria-hidden="true" />
        <span className="fr-watermark fr-watermark-strong pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[21vw] font-extrabold leading-none [font-family:var(--font-headline)] text-white/[0.03]">
          FLEX
        </span>

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <motion.div
            className="text-center"
            initial={{ y: 26, clipPath: "inset(0 0 100% 0)" }}
            animate={mobileInView ? { y: 0, clipPath: "inset(0 0 0% 0)" } : {}}
            transition={snapSpring}
          >
            <p className="fr-label text-xs font-bold tracking-widest text-[#0099FF]">AVAILABLE ON IOS & ANDROID</p>
            <h2 className="fr-heading mt-3 text-3xl text-white sm:text-5xl">OUR MOBILE APP</h2>
            <p className="mt-4 text-base text-[#EEEEEE]/80 sm:text-lg [font-family:var(--font-body)]">What does FLEX REPUBLIC mobile app do?</p>
          </motion.div>

          <div className="mt-12 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="mx-auto w-full max-w-[300px]">
              <motion.div
                className="relative aspect-[9/16] rounded-3xl border border-white/10 bg-[#000028] p-3"
                style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 1000 }}
                animate={{
                  boxShadow: activeFeature ? "0 0 92px rgba(0,153,255,0.3)" : "0 0 60px rgba(0,102,204,0.1)",
                }}
                transition={{ ...snapSpring, stiffness: 280, damping: 24 }}
              >
                <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10" aria-hidden="true" />
                <img
                  src={featureScreens[activeFeature] ?? placeholderImage}
                  alt={`${activeFeature} preview`}
                  className="h-full w-full rounded-2xl object-cover"
                />
              </motion.div>
            </div>

            <div className="flex flex-col gap-4">
              {appFeatures.map((feature, index) => {
                const isActive = activeFeature === feature.title;
                return (
                  <motion.article
                    key={feature.title}
                    className={`cursor-pointer rounded-[16px] border-2 px-6 py-6 transition-colors duration-300 ${
                      isActive ? "border-[#0099FF]/80 bg-[#000044]/90" : "border-white/5 bg-white/5 hover:bg-white/10"
                    }`}
                    onClick={() => handleFeatureClick(feature.title)}
                    initial={{ y: 24, opacity: 0 }}
                    animate={mobileInView ? { y: 0, opacity: 1, scale: isActive ? 1.03 : 1, boxShadow: isActive ? "0 0 40px rgba(0,153,255,0.35)" : "0 0 0px rgba(0,0,0,0)" } : {}}
                    whileHover={{ scale: isActive ? 1.03 : 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ ...snapSpring, delay: mobileInView ? index * 0.05 : 0 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`transition-all duration-300 ${isActive ? "text-[#00CCFF] drop-shadow-[0_0_10px_rgba(0,204,255,0.8)] scale-110" : "text-[#0099FF] opacity-70"}`}>
                        {feature.icon === "user" && <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3-3H9m0 0 2.25-2.25M9 12l2.25 2.25" /></svg>}
                        {feature.icon === "dashboard" && <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12.75h6.75V3.75H3.75v9zm0 7.5h6.75v-4.5H3.75v4.5zm9.75 0h6.75V11.25H13.5v9zm0-12h6.75V3.75H13.5v4.5z" /></svg>}
                        {feature.icon === "scan" && <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.5h-3v3m0 9v3h3m9 0h3v-3m0-9v-3h-3M7.5 12h9" /></svg>}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-lg transition-colors duration-300 font-bold ${isActive ? "text-white" : "text-white/80"}`}>{feature.title}</h3>
                        <p className={`mt-1 text-[14px] leading-relaxed transition-all duration-300 ${isActive ? "text-white/90" : "text-[#EEEEEE]/50"}`}>{feature.description}</p>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 — Locations */}
      <section ref={sectionFourRef} id="locations" className="fr-road-grid relative w-full overflow-hidden bg-white px-6 py-16 sm:px-10 lg:px-14">
        <span className="fr-watermark pointer-events-none absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 text-[21vw] font-extrabold leading-none">FLEX</span>
        <div className="mx-auto max-w-7xl">
          <motion.div className="mb-12 text-center" initial={{ y: 24, clipPath: "inset(0 0 100% 0)" }} animate={sectionFourInView ? { y: 0, clipPath: "inset(0 0 0% 0)" } : {}} transition={snapSpring}>
            <h2 className="fr-heading mt-4 text-3xl text-[#000033] sm:text-5xl">OUR SIGNATURE LOCATIONS</h2>
          </motion.div>
          <div className="relative mt-10">
            <div className="mb-8 flex flex-col items-center gap-3">
              {/* BUTTON COMPONENT */}
              <button 
                className={`rounded-full px-6 py-2.5 text-sm text-white transition-all duration-300 ${
                  isLocating ? "bg-gray-400 cursor-not-allowed" : "bg-[#0066CC] hover:bg-[#0099FF]"
                }`} 
                onClick={handleEnterLocation} 
                disabled={isLocating}
              >
                {isLocating ? "Detecting..." : "Enter your location"}
              </button>
              
              {/* STATUS MESSAGES — Replaces browser alerts */}
              {locationError && (
                <p className="text-xs text-red-500 font-medium [font-family:var(--font-body)]">
                   ⚠️ {locationError}
                </p>
              )}
              {!locationError && locationAllowed && (
                <p className="text-xs text-green-600 font-medium [font-family:var(--font-body)]">
                   Done.
                </p>
              )}
            </div>
            
            <div className="grid gap-7 md:grid-cols-2">
              {branchLocations.map((branch, index) => (
                <article key={branch.name} className="overflow-hidden rounded-3xl border-2 border-[#0066CC]/15 bg-white shadow-[0_20px_45px_rgba(0,102,204,0.12)]">
                  <div className="relative h-72 sm:h-80">
                    <img src={index === 0 ? location1 : location2} alt={branch.name} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#000033]/75 via-[#000033]/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-2xl text-white font-bold">{branch.name}</h3>
                    </div>
                    {/* Distance Badge */}
                    {distanceKm?.[branch.name] !== undefined && (
                      <div className="absolute right-4 top-4 rounded-full border border-[#0099FF]/60 bg-[#000033]/80 px-3 py-1 text-xs text-[#EEEEEE]">
                        🏍 {distanceKm[branch.name].toFixed(1)} km away
                      </div>
                    )}
                  </div>
                  <div className="p-6"><p className="text-sm leading-relaxed text-[#0066CC]/80 sm:text-base">{branch.details}</p></div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 5 — Why Choose */}
      <section ref={sectionFiveRef} id="features" className="relative w-full overflow-hidden bg-[#EEEEEE] px-6 py-16 sm:px-10 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <motion.div className="mb-12 text-center" initial={{ y: 24, clipPath: "inset(0 0 100% 0)" }} animate={sectionFiveInView ? { y: 0, clipPath: "inset(0 0 0% 0)" } : {}} transition={snapSpring}>
            <h2 className="fr-heading text-3xl text-[#000033] sm:text-5xl">Why Choose Flex Republic?</h2>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {whyChooseFeatures.map((item) => (
              <article key={item.title} className="rounded-2xl border-2 border-[#0066CC]/20 bg-white p-6">
                <h3 className="text-xl text-[#000033] font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-[#0066CC]/75">{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6 — Footer CTA */}
      <section className="w-full bg-[#000033] px-6 py-12 sm:px-10 lg:px-14">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-6 rounded-2xl bg-[#0066CC] p-8">
          <p className="text-2xl text-white font-extrabold">TRANSFORM YOUR FITNESS.</p>
          <a href="/subscription-tier" className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3 text-[#0066CC] font-bold">JOIN NOW</a>
        </div>
      </section>
    </div>
  );
}