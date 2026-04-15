type StatPillProps = {
  value: string;
  label: string;
  dark?: boolean;
};

export default function StatPill({ value, label, dark = false }: StatPillProps) {
  return (
    <div className={`rounded-md px-6 py-5 ${dark ? "bg-[rgba(0,102,204,0.2)]" : "bg-[rgba(0,102,204,0.12)]"}`}>
      <p className={`text-sm [font-family:var(--font-label)] ${dark ? "text-[#0099FF]" : "text-[#0066CC]"}`}>{value}</p>
      <p className={`text-sm [font-family:var(--font-body)] ${dark ? "text-[rgba(238,238,238,0.82)]" : "text-[#555555]"}`}>{label}</p>
    </div>
  );
}
