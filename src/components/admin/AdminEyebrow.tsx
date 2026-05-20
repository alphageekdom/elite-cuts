type AdminEyebrowSize = 'page' | 'drawer' | 'card';

type AdminEyebrowProps = {
  children: React.ReactNode;
  size?: AdminEyebrowSize;
  className?: string;
};

const SIZE_CLASSES: Record<AdminEyebrowSize, string> = {
  page: 'text-sm',
  drawer: 'text-[13px]',
  card: 'text-[12px]',
};

// Admin-side eyebrow — italic display + camel, sized for the surface
// it sits on. No leading glyph (the prior bespoke spans added a `✦`
// inconsistently and it carried no meaning). Sits above admin page
// titles, drawer headers, and analytics card headings.
export default function AdminEyebrow({
  children,
  size = 'page',
  className = '',
}: AdminEyebrowProps) {
  return (
    <div className={`font-display italic ${SIZE_CLASSES[size]} text-camel ${className}`}>
      {children}
    </div>
  );
}
