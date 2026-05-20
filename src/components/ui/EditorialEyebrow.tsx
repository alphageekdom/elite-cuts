type EditorialEyebrowProps = {
  children: React.ReactNode;
  className?: string;
  as?: 'block' | 'inline-block';
};

// Editorial brand eyebrow — italic display + camel + ↗ glyph baked in by
// convention at the call site. Sits above the hero heading on customer
// pages (demo, auth, etc). The companion to `SectionLabel` (uppercase
// tracking) — pick the editorial variant for marketing surfaces, the
// section label for admin/metadata. Pass extra classes (animation
// delays, reveal hooks, etc) via `className`.
export default function EditorialEyebrow({
  children,
  className = '',
  as = 'block',
}: EditorialEyebrowProps) {
  const display = as === 'inline-block' ? 'inline-block' : 'block';
  return (
    <span
      className={`font-display italic text-sm text-camel tracking-[0.02em] ${display} ${className}`}
    >
      {children}
    </span>
  );
}
