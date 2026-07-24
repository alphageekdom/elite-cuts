'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';

import { productImageSrc } from '@/lib/format';

type Props = {
  images: string[];
  name: string;
  isAged: boolean;
  isNewArrival: boolean;
  isFeatured: boolean;
};

export default function ProductGallery({
  images,
  name,
  isAged,
  isNewArrival,
  isFeatured,
}: Props) {
  // Only images that resolve to a real src — a bad filename shouldn't leave a
  // dead thumbnail in the strip.
  const resolved = images
    .map((img) => productImageSrc(img))
    .filter((src): src is string => Boolean(src));

  const [active, setActive] = useState(0);
  const [opening, setOpening] = useState(false);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Natural dimensions of each full-res original, measured client-side and
  // cached. PhotoSwipe needs real width/height to size the zoom canvas; the
  // originals live in /public so we read their intrinsic size by loading them
  // once rather than shipping dimensions through the data layer or coupling a
  // server-side image reader into the page.
  const dimsRef = useRef<Map<string, { w: number; h: number }>>(new Map());

  const tagLabel = isAged
    ? 'Dry-Aged'
    : isNewArrival
      ? 'New Arrival'
      : isFeatured
        ? 'Featured'
        : null;

  const tagClass = isAged
    ? 'bg-oxblood text-cream'
    : isNewArrival
      ? 'bg-camel text-ink'
      : 'bg-ink text-cream';

  const hasGallery = resolved.length > 1;
  const activeSrc = resolved[active] ?? resolved[0] ?? '';

  // Arrow keys move between thumbs and carry focus so the strip is operable
  // without a pointer. Left/right wrap; the focused thumb becomes active.
  const onThumbKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const next = (index + delta + resolved.length) % resolved.length;
    setActive(next);
    thumbRefs.current[next]?.focus();
  };

  const measure = (src: string) =>
    new Promise<{ w: number; h: number }>((resolve) => {
      const cached = dimsRef.current.get(src);
      if (cached) return resolve(cached);
      const img = new window.Image();
      img.onload = () => {
        const dims = {
          w: img.naturalWidth || 1600,
          h: img.naturalHeight || 1600,
        };
        dimsRef.current.set(src, dims);
        resolve(dims);
      };
      // A failed measure shouldn't block the lightbox — fall back to a square.
      img.onerror = () => resolve({ w: 1600, h: 1600 });
      img.src = src;
    });

  // Open the full-screen zoom lightbox at the currently-active image. PhotoSwipe
  // (core, lazy-loaded on click so it stays out of the initial bundle) manages
  // its own focus trap, Escape, arrow-key navigation, and restores focus to the
  // trigger button on close.
  const openLightbox = async () => {
    if (opening || resolved.length === 0) return;
    setOpening(true);
    try {
      // Only the active image is measured before opening. Blocking on every
      // original (a 4-shot gallery is a few MB) left seconds of dead time on
      // the click; the rest are measured in the background below and patched
      // into their slides via refreshSlideContent as their sizes resolve.
      const [{ default: PhotoSwipeLightbox }, activeDims] = await Promise.all([
        import('photoswipe/lightbox'),
        measure(resolved[active]),
      ]);

      // Slides not yet measured borrow the active image's dimensions so
      // PhotoSwipe's zoom math stays sane until the real size lands.
      const items = resolved.map((src, i) => {
        const d = i === active ? activeDims : dimsRef.current.get(src);
        return {
          src,
          width: d?.w ?? activeDims.w,
          height: d?.h ?? activeDims.h,
          alt: name,
        };
      });

      const lightbox = new PhotoSwipeLightbox({
        dataSource: items,
        pswpModule: () => import('photoswipe'),
        showHideAnimationType: 'zoom',
        wheelToZoom: true,
        bgOpacity: 0.92,
      });
      // Release the per-open proxy once its gallery closes. Registered on the
      // lightbox (not `lightbox.pswp`, which is undefined until the async core
      // module resolves). The destroy runs on a microtask so pswp finishes its
      // own teardown first — by then `lightbox.pswp` is undefined, so
      // `lightbox.destroy()` skips the `pswp.destroy()` call that would
      // otherwise re-dispatch this event and recurse.
      lightbox.on('destroy', () => {
        queueMicrotask(() => lightbox.destroy());
      });
      lightbox.init();
      lightbox.loadAndOpen(active);

      // Background-measure the remaining originals and correct each slide's
      // dimensions the moment its real size is known.
      resolved.forEach((src, i) => {
        if (i === active || dimsRef.current.has(src)) return;
        void measure(src).then((d) => {
          items[i].width = d.w;
          items[i].height = d.h;
          lightbox.pswp?.refreshSlideContent(i);
        });
      });
    } catch {
      toast.error('Could not open the image viewer.');
    } finally {
      setOpening(false);
    }
  };

  return (
    <div>
      <button
        type='button'
        onClick={() => void openLightbox()}
        aria-label={`Open full-screen viewer for ${name}`}
        aria-busy={opening}
        className={`group bg-cream-deep focus-visible:ring-ink focus-visible:ring-offset-cream relative block aspect-square w-full overflow-hidden rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:aspect-4/5 ${
          opening ? 'cursor-wait' : 'cursor-zoom-in'
        }`}
      >
        {tagLabel && (
          <span
            className={`absolute top-4 left-4 z-10 rounded-full px-3 py-1.5 text-[10px] font-medium tracking-[0.18em] uppercase ${tagClass}`}
          >
            {tagLabel}
          </span>
        )}

        <Image
          src={activeSrc}
          alt={name}
          fill
          sizes='(min-width: 1280px) 680px, (min-width: 768px) 55vw, 100vw'
          className='object-cover'
          priority
        />

        {/* Zoom affordance — signals the image opens full-screen. */}
        <span className='bg-ink/70 text-cream absolute right-4 bottom-4 z-10 grid h-9 w-9 place-items-center rounded-full opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100'>
          <svg
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth={2}
            aria-hidden
            className='h-4 w-4'
          >
            <circle cx='11' cy='11' r='7' />
            <line x1='21' y1='21' x2='16.65' y2='16.65' />
            <line x1='11' y1='8' x2='11' y2='14' />
            <line x1='8' y1='11' x2='14' y2='11' />
          </svg>
        </span>
      </button>

      {/* Thumbnail strip — renders only with more than one image, so the
          single-image cuts look exactly as they did before. Thumbs swap the
          main stage in place; the main image opens the zoom lightbox. */}
      {hasGallery && (
        <div
          role='group'
          aria-label={`${name} images`}
          className='mt-3 flex gap-3'
        >
          {resolved.map((src, index) => {
            const isActive = index === active;
            return (
              <button
                key={src}
                ref={(el) => {
                  thumbRefs.current[index] = el;
                }}
                type='button'
                aria-label={`View image ${index + 1} of ${resolved.length}`}
                aria-pressed={isActive}
                onClick={() => setActive(index)}
                onKeyDown={(e) => onThumbKeyDown(e, index)}
                className={`focus-visible:ring-ink focus-visible:ring-offset-cream relative aspect-square w-16 shrink-0 overflow-hidden rounded-sm border-2 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:w-20 ${
                  isActive
                    ? 'border-oxblood'
                    : 'hover:border-line border-transparent'
                }`}
              >
                <Image
                  src={src}
                  alt=''
                  fill
                  sizes='80px'
                  className='object-cover'
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
