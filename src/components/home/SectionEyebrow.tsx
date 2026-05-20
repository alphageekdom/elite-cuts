import SectionLabel from '@/components/ui/SectionLabel';

type SectionEyebrowProps = {
  label: string;
  className?: string;
};

// Section eyebrow with a trailing horizontal rule. Used on the homepage
// to anchor major sections. Sibling of `SectionHead` which adds an
// optional leading number — pick this one when the section doesn't
// carry a numbered ornament. `className` overrides the default `mb-16`
// when the consumer needs different spacing.
const SectionEyebrow = ({ label, className = 'mb-16' }: SectionEyebrowProps) => (
  <div className={`flex items-baseline gap-6 ${className}`}>
    <SectionLabel>{label}</SectionLabel>
    <span aria-hidden='true' className='h-px flex-1 bg-line' />
  </div>
);

export default SectionEyebrow;
