import type { ReactNode } from "react";
import { motion } from "framer-motion";

type HoverCardProps = {
  children: ReactNode;
  className?: string;
};

export default function HoverCard({ children, className = "" }: HoverCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 0 40px rgba(0,102,204,0.35)", transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
      whileTap={{ scale: 0.97, transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
