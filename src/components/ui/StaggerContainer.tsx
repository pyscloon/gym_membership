import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { motion as motionTokens, viewportIn } from "../../styles/animations";

type StaggerContainerProps = {
  children: ReactNode;
  className?: string;
};

export default function StaggerContainer({ children, className = "" }: StaggerContainerProps) {
  return (
    <motion.div className={className} variants={motionTokens.stagger} initial="hidden" whileInView="visible" viewport={viewportIn}>
      {children}
    </motion.div>
  );
}
