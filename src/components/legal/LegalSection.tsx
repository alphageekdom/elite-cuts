import type { ReactNode } from 'react';

type SectionProps = {
  heading: string;
  children: ReactNode;
};

export function LegalSection({ heading, children }: SectionProps) {
  return (
    <section className='flex flex-col gap-4'>
      <h2 className='font-display text-[26px] font-normal leading-tight tracking-tight text-ink'>
        {heading}
      </h2>
      {children}
    </section>
  );
}

type ParagraphProps = { children: ReactNode };

export function LegalParagraph({ children }: ParagraphProps) {
  return (
    <p className='text-[15px] leading-[1.7] text-ink-soft'>{children}</p>
  );
}

type ListProps = { items: ReactNode[] };

export function LegalList({ items }: ListProps) {
  return (
    <ul className='ml-5 flex list-disc flex-col gap-2 text-[15px] leading-[1.7] text-ink-soft marker:text-camel'>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
