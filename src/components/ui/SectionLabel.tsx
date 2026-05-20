type SectionLabelColor = 'muted' | 'camel';

type SectionLabelProps = {
  children: React.ReactNode;
  color?: SectionLabelColor;
  className?: string;
};

const COLOR_CLASSES: Record<SectionLabelColor, string> = {
  muted: 'text-muted',
  camel: 'text-camel',
};

// Uppercase tracking section label — sits above a heading on customer
// pages, in modals, or at the top of error / 404 screens. The companion
// to `EditorialEyebrow` (italic display + camel + arrow) — pick the
// section label for quiet metadata, the editorial eyebrow for branded
// loud moments. With-rule variants live in `SectionEyebrow` (homepage,
// no number) and `SectionHead` (numbered, used elsewhere).
export default function SectionLabel({
  children,
  color = 'muted',
  className = '',
}: SectionLabelProps) {
  return (
    <span
      className={`text-[11px] font-medium uppercase tracking-[0.22em] ${COLOR_CLASSES[color]} ${className}`}
    >
      {children}
    </span>
  );
}
