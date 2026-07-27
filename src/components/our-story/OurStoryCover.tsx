import Image from 'next/image';
import Reveal from '@/components/uielements/Reveal';

export default function OurStoryCover() {
  return (
    <section className='px-4 pb-24 sm:px-8 lg:px-16'>
      <div className='mx-auto max-w-7xl'>
        <Reveal>
          <div className='bg-ink relative aspect-4/3 overflow-hidden rounded-sm sm:aspect-video lg:aspect-21/9'>
            <Image
              src='/images/our-story/shop-cover.jpg'
              alt='EliteCuts shop interior, est. 2018'
              fill
              className='object-cover contrast-[1.04] saturate-[0.92]'
              sizes='(max-width: 768px) 100vw, 90vw'
              preload
            />
            <div className='bg-ink/65 text-cream before:bg-camel absolute bottom-4 left-4 inline-flex items-center gap-2.5 rounded-full px-3.5 py-2 font-mono text-[11px] tracking-[0.18em] uppercase backdrop-blur-sm before:h-px before:w-4 before:opacity-80 sm:bottom-6 sm:left-7'>
              The shop · San Diego, March 2018
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
