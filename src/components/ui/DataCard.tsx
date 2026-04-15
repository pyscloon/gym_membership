import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { motion as motionTokens } from "../../styles/animations";

type DataCardProps = {
  title?: string;
  value?: string;
  children?: ReactNode;
  className?: string;
};

export default function DataCard({ title, value, children, className = "" }: DataCardProps) {
  return (
    <motion.article
      variants={motionTokens.entry}
      whileHover={{ y: -4, boxShadow: "0 0 40px rgba(0,102,204,0.35)", transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
      whileTap={{ scale: 0.97, transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] } }}
      className={`relative overflow-hidden rounded-[14px] border border-[rgba(0,0,51,0.08)] bg-white p-7 ${className}`}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundImage: "linear-gradient(90deg, #0066CC, #0099FF)" }}
        aria-hidden="true"
      />
      {title && <h3 className="fr-headline text-lg text-[#000033] [font-weight:700]">{title}</h3>}
      {value && <p className="mt-2 text-2xl [font-family:var(--font-label)] text-[#0066CC]">{value}</p>}
      {children}
    </motion.article>
  );
}
