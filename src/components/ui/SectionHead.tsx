import SectionLabel from '@/components/ui/SectionLabel';

type Props = { label: string; num?: string };

// Section eyebrow with an optional leading number ornament and a
// trailing horizontal rule. Sibling of `SectionEyebrow` (no number) —
// pick this one when a numbered prefix anchors the section.
export default function SectionHead({ label, num }: Props) {
  return (
    <div className='mb-14 flex items-baseline gap-6'>
      {num && (
        <span className='font-display text-sm font-medium text-camel'>{num}</span>
      )}
      <SectionLabel>{label}</SectionLabel>
      <span className='h-px flex-1 bg-line' aria-hidden />
    </div>
  );
}
