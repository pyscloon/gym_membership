import { motion } from "framer-motion";
import { motion as motionTokens } from "../../styles/animations";
import SectionEyebrow from "./SectionEyebrow";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  dark?: boolean;
};

export default function PageHeader({ title, subtitle, eyebrow, dark = false }: PageHeaderProps) {
  return (
    <motion.header variants={motionTokens.entry} initial="hidden" animate="visible" className="mb-8">
      {eyebrow ? <SectionEyebrow label={eyebrow} className={dark ? "text-[#0099FF]" : "text-[#0066CC]"} /> : null}
      <h1 className={`fr-headline mt-2 text-4xl sm:text-5xl ${dark ? "text-white" : "text-[#000033]"}`}>{title}</h1>
      <span className="mt-3 block h-[3px] w-[60px]" style={{ backgroundImage: "linear-gradient(90deg, #0066CC, #0099FF)" }} aria-hidden="true" />
      {subtitle ? (
        <p className={`mt-4 max-w-3xl text-base [font-family:var(--font-body)] ${dark ? "text-[rgba(238,238,238,0.82)]" : "text-[#555555]"}`}>
          {subtitle}
        </p>
      ) : null}
    </motion.header>
  );
}
