import Image from 'next/image';
import Link from 'next/link';

import StoreInfoModal from '@/components/ui/StoreInfoModal';
import Reveal from '@/components/uielements/Reveal';
import GrillHeroBg from '@/assets/images/grill-hero.jpg';
import { formatGrillHour, type SerializedEvent } from '@/lib/event-config';

type Props = {
  event: SerializedEvent;
};

export default function GrillEventHero({ event }: Props) {
  const endLabel = formatGrillHour(event.endHour);

  return (
    <section
      aria-label="Grilling now"
      className="relative -mt-20 flex min-h-[clamp(640px,100vh,960px)] items-center overflow-hidden pt-30 pb-16 text-cream"
    >
      <div className="absolute inset-0 -z-10 scale-105 animate-[heroZoom_20s_ease-in-out_infinite_alternate] motion-reduce:animate-none">
        <Image src={GrillHeroBg} alt="" fill priority sizes="100vw" className="object-cover" />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(20,16,14,0.7)_0%,rgba(20,16,14,0.55)_45%,rgba(20,16,14,0.85)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_55%,rgba(20,16,14,0.7)_0%,transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_25%_50%,rgba(112,32,36,0.45)_0%,transparent_65%)]"
      />

      <div className="relative z-1 mx-auto w-full max-w-7xl px-6 md:px-8">
        <Reveal>
          <div className="mb-7 inline-flex items-center gap-3 whitespace-nowrap rounded-full border border-cream/20 bg-cream/12 px-4 py-2 text-[11px] font-medium tracking-[0.22em] uppercase text-cream backdrop-blur-sm">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-75 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green" />
            </span>
            Grilling now · until {endLabel}
          </div>
        </Reveal>

        <Reveal delayMs={80}>
          <h1 className="mb-9 max-w-[14ch] font-display text-[clamp(54px,8.5vw,132px)] leading-[0.95] tracking-[-0.035em] font-normal">
            On the{' '}
            <em className="font-light text-camel-soft">grill</em>{' '}
            out front.
          </h1>
        </Reveal>

        <Reveal delayMs={160}>
          <p className="mb-10 max-w-[44ch] text-[clamp(16px,1.6vw,18px)] leading-relaxed text-cream/90">
            {event.message}
          </p>
        </Reveal>

        <Reveal delayMs={240}>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <StoreInfoModal
              label="Visit us in‑store →"
              triggerClassName="inline-flex items-center justify-center gap-2.5 rounded-full bg-cream px-7 py-3.5 text-sm font-medium tracking-[0.04em] text-ink transition-colors duration-300 hover:bg-cream-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-ink/40"
            />
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2.5 rounded-full border border-cream/60 px-7 py-3.5 text-sm font-medium tracking-[0.02em] text-cream transition-[background-color,border-color,color] duration-300 hover:border-cream hover:bg-cream/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-ink/40"
            >
              Browse cuts
            </Link>
          </div>
        </Reveal>

        <p className="mt-7 text-[12px] font-medium tracking-[0.18em] uppercase text-cream/75">
          Show your receipt — online order or walk-in
        </p>
      </div>

      <div className="absolute right-0 bottom-10 left-0 z-1 mx-auto hidden w-full max-w-7xl items-end justify-between px-6 text-xs tracking-[0.18em] uppercase opacity-70 md:flex md:px-8">
        <span>EC · GRILL</span>
        <span className="flex items-center gap-3">
          Live
          <span className="relative h-10 w-px overflow-hidden bg-current">
            <span
              aria-hidden="true"
              className="absolute inset-0 animate-[heroScrollPulse_2s_ease-in-out_infinite] bg-green motion-reduce:animate-none"
            />
          </span>
        </span>
        <span>32.7491° N · 117.1294° W</span>
      </div>
    </section>
  );
}
