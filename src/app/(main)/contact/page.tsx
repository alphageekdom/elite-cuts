import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact · EliteCuts',
  description: 'Get in touch with EliteCuts — we\'re here to help with orders, custom cuts, and anything else.',
};

const CONTACT_ITEMS = [
  {
    label: 'Phone',
    value: '(619) 555-0182',
    href: 'tel:+16195550182',
    detail: 'Mon – Sat, 8 AM – 6 PM',
  },
  {
    label: 'Email',
    value: 'hello@elitecuts.com',
    href: 'mailto:hello@elitecuts.com',
    detail: 'We reply within one business day',
  },
  {
    label: 'Address',
    value: '1842 India St, San Diego, CA 92101',
    href: 'https://maps.google.com/?q=1842+India+St+San+Diego+CA+92101',
    detail: 'Street parking available on India St',
  },
] as const;

export default function ContactPage() {
  return (
    <div className='min-h-screen bg-cream'>
      {/* Hero */}
      <div className='border-b border-line-soft px-6 pb-16 pt-32 text-center sm:px-8'>
        <p className='mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted'>
          Get in touch
        </p>
        <h1 className='font-display text-[clamp(40px,5vw,64px)] font-normal leading-none tracking-tight text-ink'>
          We&apos;re here to <em className='text-oxblood'>help.</em>
        </h1>
        <p className='mx-auto mt-5 max-w-[48ch] text-[15px] leading-relaxed text-ink-soft'>
          Questions about your order, a custom cut request, or anything else —
          reach out and we&apos;ll get back to you quickly.
        </p>
      </div>

      {/* Contact cards */}
      <div className='mx-auto max-w-4xl px-6 py-16 sm:px-8'>
        <div className='grid gap-4 sm:grid-cols-3'>
          {CONTACT_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.href.startsWith('http') ? '_blank' : undefined}
              rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className='group flex flex-col gap-2 rounded-lg border border-line-soft bg-paper p-6 transition-colors hover:border-line'
            >
              <span className='text-[10px] font-medium uppercase tracking-[0.18em] text-muted'>
                {item.label}
              </span>
              <span className='font-medium text-ink transition-colors group-hover:text-oxblood'>
                {item.value}
              </span>
              <span className='text-[13px] text-ink-soft'>{item.detail}</span>
            </a>
          ))}
        </div>

        {/* Hours */}
        <div className='mt-12 border-t border-line-soft pt-12'>
          <h2 className='mb-6 font-display text-[22px] font-normal tracking-tight text-ink'>
            Shop hours
          </h2>
          <table className='w-full max-w-sm text-[14px]'>
            <tbody className='divide-y divide-line-soft'>
              {[
                ['Monday', 'Closed'],
                ['Tuesday – Friday', '8 AM – 6 PM'],
                ['Saturday', '7 AM – 5 PM'],
                ['Sunday', '9 AM – 3 PM'],
              ].map(([day, hours]) => (
                <tr key={day}>
                  <td className='py-2.5 pr-8 text-ink-soft'>{day}</td>
                  <td className='py-2.5 font-medium text-ink'>{hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Back to rewards */}
        <div className='mt-12 border-t border-line-soft pt-8'>
          <Link
            href='/rewards'
            className='text-[13px] text-ink-soft transition-colors hover:text-oxblood'
          >
            ← Back to Rewards
          </Link>
        </div>
      </div>
    </div>
  );
}
