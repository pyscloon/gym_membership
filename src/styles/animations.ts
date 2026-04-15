import type { Variants } from "framer-motion";

export const snapEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const motion = {
  entry: {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: snapEase },
    },
  } satisfies Variants,
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.7, ease: snapEase },
    },
  } satisfies Variants,
  stagger: {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  } satisfies Variants,
  hoverLift: {
    whileHover: {
      y: -4,
      boxShadow: "0 0 40px rgba(0,102,204,0.35)",
      transition: { duration: 0.3, ease: "easeOut" },
    },
    whileTap: {
      scale: 0.97,
      transition: { duration: 0.15, ease: "easeOut" },
    },
  },
  pageExit: {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: snapEase },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: { duration: 0.3, ease: snapEase },
    },
  } satisfies Variants,
};

export const viewportIn = {
  once: true,
  amount: 0.15,
};
