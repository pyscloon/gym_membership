import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { motion as motionTokens } from "../../styles/animations";

type PageTransitionProps = {
  children: ReactNode;
  routeKey: string;
};

export default function PageTransition({ children, routeKey }: PageTransitionProps) {
  return (
    <motion.div
      key={routeKey}
      variants={motionTokens.pageExit}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
