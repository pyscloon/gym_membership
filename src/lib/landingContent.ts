export type Testimonial = {
  name: string;
  feedback: string;
};

export type AppFeature = {
  title: string;
  description: string;
  icon: "user" | "dashboard" | "scan";
};

export const testimonials: Testimonial[] = [
  {
    name: "Mia Serrano",
    feedback:
      "From check-in to workout tracking, everything feels effortless. FLEX REPUBLIC made consistency finally stick for me.",
  },
  {
    name: "Jordan Cruz",
    feedback:
      "The coaches are elite and the app keeps me accountable every day. I know exactly when to train and how to improve.",
  },
  {
    name: "Theo Ramirez",
    feedback:
      "I can scan in, train, and head out without waiting in line. It is modern, fast, and built for serious members.",
  },
  {
    name: "Arielle Dizon",
    feedback:
      "Best gym experience in the city. Premium equipment, smooth mobile access, and a community that pushes you higher.",
  },
];

export const appFeatures: AppFeature[] = [
  {
    title: "Login / Register",
    description: "Quick and secure access to your account",
    icon: "user",
  },
  {
    title: "Dashboard",
    description: "Track sessions, progress, and gym usage at a glance",
    icon: "dashboard",
  },
  {
    title: "Check-in / Check-out",
    description: "Scan to enter. No queues, no friction.",
    icon: "scan",
  },
];

export const whyChooseFeatures = [
  { step: "01", title: "Live Capacity", desc: "Real-time gym occupancy data" },
  { step: "02", title: "Smart Scheduling", desc: "Best time recommendations" },
  { step: "03", title: "Flexible Plans", desc: "Plans that fit your goals" },
  { step: "04", title: "Seamless Check-In", desc: "Quick QR code validation" },
];

export const branchLocations = [
  {
    name: "Jaro Plaza Branch",
    details: "Plaza Rizal St, Jaro, Iloilo City, 5000 Iloilo.",
  },
  {
    name: "B-Complex Branch ",
    details:
      "The B Lifestyle Complex Building, Diversion Road, Cuartero Highway, Jaro, Iloilo City, 5000 Iloilo.",
  },
];
