import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { shadows } from "../../styles/tokens";

type PrimaryButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragEnd" | "onDragStart"> & {
  children: ReactNode;
};

export default function PrimaryButton({ children, className = "", ...props }: PrimaryButtonProps) {
  const safeProps = props as any;

  return (
    <motion.button
      {...safeProps}
      whileHover={{ boxShadow: shadows.buttonGlow, backgroundColor: "#0099FF" }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={`rounded-[50px] bg-[#0066CC] px-6 py-2.5 text-sm text-white fr-headline [font-weight:700] ${className}`}
    >
      {children}
    </motion.button>
  );
}
