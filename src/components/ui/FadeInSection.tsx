import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { motion as motionTokens, viewportIn } from "../../styles/animations";

type FadeInSectionProps = {
  children: ReactNode;
  className?: string;
};

export default function FadeInSection({ children, className = "" }: FadeInSectionProps) {
  return (
    <motion.section
      className={className}
      variants={motionTokens.entry}
      initial="hidden"
      whileInView="visible"
      viewport={viewportIn}
    >
      {children}
    </motion.section>
  );
}
