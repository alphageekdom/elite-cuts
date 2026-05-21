import type { Metadata } from 'next';

import {
  formatPhoneHref,
  formatShopAddress,
  formatShopCityStateZip,
  getShopSettings,
} from '@/lib/shopSettings';
import { formatShopHoursRows, getShopHours } from '@/lib/shopHours';
import SectionLabel from '@/components/ui/SectionLabel';

export async function generateMetadata(): Promise<Metadata> {
  const { shopName } = await getShopSettings();
  return {
    title: `Contact · ${shopName}`,
    description: `Reach ${shopName} for custom cuts, pickup questions, holiday orders, and weeknight recommendations.`,
  };
}

export default async function ContactPage() {
  const [settings, hoursDays] = await Promise.all([
    getShopSettings(),
    getShopHours(),
  ]);
  const fullAddress = formatShopAddress(settings);
  const hours = formatShopHoursRows(hoursDays);
  const contactItems = [
    {
      label: 'Phone',
      value: settings.phone,
      href: formatPhoneHref(settings.phone),
      detail: 'Quickest during shop hours.',
    },
    {
      label: 'Email',
      value: settings.email,
      href: `mailto:${settings.email}`,
      detail: 'Best for custom-cut requests.',
    },
    {
      label: 'Address',
      value: `${settings.street}, ${formatShopCityStateZip(settings)}`,
      href: `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`,
      detail: 'Easy parking out front.',
    },
  ];

  return (
    <div className='bg-cream'>
      <section className='px-6 pt-24 pb-12 text-center sm:px-8 md:pt-32 md:pb-16'>
        <SectionLabel className='mb-3 block'>Get in touch</SectionLabel>
        <h1 className='font-display text-[clamp(40px,5vw,64px)] font-normal leading-[1.05] tracking-tight text-ink'>
          Talk to the <em className='text-oxblood'>counter.</em>
        </h1>
        <p className='mx-auto mt-5 max-w-[48ch] text-[15px] leading-relaxed text-ink-soft'>
          Custom cuts, pickup questions, holiday orders, weeknight
          recommendations. Ring us, write us, or stop in at the case.
        </p>
      </section>

      <section className='mx-auto max-w-5xl px-6 pb-24 sm:px-8 lg:pb-32'>
        <ul className='grid gap-4 sm:grid-cols-3'>
          {contactItems.map((item) => {
            const external = item.href.startsWith('http');
            return (
              <li key={item.label} className='flex'>
                <a
                  href={item.href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  aria-label={external ? `Open ${item.value} in Google Maps` : undefined}
                  className='group flex w-full flex-col gap-2 rounded-lg border border-line-soft bg-paper p-6 transition-colors hover:border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2 focus-visible:ring-offset-cream'
                >
                  <span className='text-[11px] font-medium uppercase tracking-[0.18em] text-muted'>
                    {item.label}
                  </span>
                  <span className='font-medium text-ink transition-colors group-hover:text-oxblood'>
                    {item.value}
                  </span>
                  <span className='text-[13px] leading-snug text-ink-soft'>
                    {item.detail}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>

        <div className='mx-auto mt-12 max-w-md rounded-lg border border-line-soft bg-paper p-8'>
          <h2
            id='shop-hours'
            className='mb-5 font-display text-[22px] font-normal tracking-tight text-ink'
          >
            Shop hours
          </h2>
          <dl
            aria-labelledby='shop-hours'
            className='divide-y divide-line-soft text-[14px]'
          >
            {hours.map(({ label, value }) => (
              <div
                key={label}
                className='flex items-center justify-between gap-4 py-2.5'
              >
                <dt className='text-ink-soft'>{label}</dt>
                <dd className='font-medium text-ink'>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
