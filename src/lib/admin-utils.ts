export { MONTH_ABBR, formatMoney, getInitials, formatDate, formatDateTime, relativeTime, productImageSrc, avatarColorForId } from './format';

// Shared responsive border classes for the stat strip used on all admin pages.
export function statCellBorderClasses(idx: number, cellCount = 7): string {
  const isRightEdge2  = idx % 2 === 1;
  const isLastRow2    = idx >= Math.floor((cellCount - 1) / 2) * 2;
  const isRightEdge4  = idx % 4 === 3;
  const isLastRow4    = idx >= Math.floor((cellCount - 1) / 4) * 4;
  return [
    'border-r border-b border-line-soft',
    isRightEdge2 ? 'border-r-0' : '',
    isLastRow2   ? 'border-b-0' : '',
    isRightEdge4 ? 'sm:border-r-0' : 'sm:border-r',
    isLastRow4   ? 'sm:border-b-0' : 'sm:border-b',
    idx < cellCount - 1 ? 'lg:border-r lg:border-line-soft' : 'lg:border-r-0',
    'lg:border-b-0',
  ]
    .filter(Boolean)
    .join(' ');
}
