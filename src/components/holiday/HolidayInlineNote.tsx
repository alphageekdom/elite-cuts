import StoreInfoModal from '@/components/ui/StoreInfoModal';
import { type ActiveHoliday, formatDaysUntil } from '@/lib/announcements/holidays';

type Props = {
  match: ActiveHoliday;
};

// Renders the holiday-variant of the bulk/advance-order note for the product
// detail page. The page decides when to show this (via getHolidayForCut on the
// product name) and passes the matched holiday in as a prop, so we don't
// duplicate the date computation.
export default function HolidayInlineNote({ match }: Props) {
  const { holiday, daysUntil } = match;

  return (
    <p className='mt-3 px-1 text-[12px] leading-relaxed text-muted'>
      <em className='italic text-oxblood'>{holiday.name}</em> is{' '}
      {formatDaysUntil(daysUntil).toLowerCase()} —{' '}
      <StoreInfoModal label='visit us in‑store' /> to pre-order 1–2 weeks ahead.
    </p>
  );
}
