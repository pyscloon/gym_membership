import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";

type SecondaryButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragEnd" | "onDragStart"> & {
  children: ReactNode;
};

export default function SecondaryButton({ children, className = "", ...props }: SecondaryButtonProps) {
  const safeProps = props as any;

  return (
    <motion.button
      {...safeProps}
      whileHover={{ borderColor: "#0099FF", color: "#0099FF" }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={`rounded-[50px] border border-white/30 bg-transparent px-6 py-2.5 text-sm text-white fr-headline [font-weight:700] ${className}`}
    >
      {children}
    </motion.button>
  );
}
