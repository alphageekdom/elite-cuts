import Image from 'next/image';

type Props = {
  image: string;
  name: string;
  isAged: boolean;
  isNewArrival: boolean;
  isFeatured: boolean;
};

export default function ProductGallery({
  image,
  name,
  isAged,
  isNewArrival,
  isFeatured,
}: Props) {
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

  return (
    <div className='relative aspect-4/5 overflow-hidden rounded-sm bg-cream-deep'>
      {tagLabel && (
        <div className='absolute top-4 left-4 z-10'>
          <span
            className={`rounded-full px-3 py-1.5 text-[10px] font-medium tracking-[0.18em] uppercase ${tagClass}`}
          >
            {tagLabel}
          </span>
        </div>
      )}

      <Image
        src={`/images/products/${image}`}
        alt={name}
        fill
        sizes='(min-width: 1280px) 680px, (min-width: 768px) 55vw, 100vw'
        className='object-cover'
        priority
      />
    </div>
  );
}
