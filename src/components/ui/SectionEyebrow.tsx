import type { ReactNode } from "react";

type SectionEyebrowProps = {
  label: ReactNode;
  className?: string;
};

export default function SectionEyebrow({ label, className = "" }: SectionEyebrowProps) {
  return <p className={`fr-label text-[12px] text-[#0066CC] ${className}`}>{label}</p>;
}
