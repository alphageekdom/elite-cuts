export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2';

type ScrollAwareToneOpts = {
  hoverScrolled?: string;
  hoverHero?: string;
};

// Returns the navbar-family tone class for elements that flip between
// over-hero (cream) and scrolled (ink) states. Ring-offset color matches
// the underlying surface so the focus ring doesn't draw a white halo on
// the cream nav bg. `opts` lets callers append a scroll-aware hover class
// (CartCount uses this to switch between hover:text-oxblood when scrolled
// and hover:text-camel-soft over the hero).
export const scrollAwareTone = (
  scrolled: boolean,
  opts?: ScrollAwareToneOpts
) => {
  // Compose as [tone, hover?, ring-offset] so callers that opt into a hover
  // class get the same class order as the pre-extraction inline ternary
  // (Tailwind doesn't care about non-conflicting utility order, but
  // preserving it keeps SSR diffs byte-identical post-refactor).
  const tone = scrolled ? 'text-ink' : 'text-cream';
  const ringOffset = scrolled
    ? 'focus-visible:ring-offset-cream'
    : 'focus-visible:ring-offset-transparent';
  const hover = scrolled ? opts?.hoverScrolled : opts?.hoverHero;
  return hover ? `${tone} ${hover} ${ringOffset}` : `${tone} ${ringOffset}`;
};
