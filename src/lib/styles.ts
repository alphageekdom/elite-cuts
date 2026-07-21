export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2';

// Sizing for the ChevronIcon separators between breadcrumb links. Shared so
// the cart and product-detail crumbs can't drift apart.
export const CRUMB_CHEVRON = 'h-2.5 w-2.5 opacity-50';

// Trailing ArrowIcon on a primary CTA. The nudge fires only when the parent
// carries `group/cta`; CartSummary's disabled button deliberately omits it so
// the arrow stays put, and the unmatched variant is simply inert there.
// The CTAs on other group names (CTA.tsx's `group/primary`, PlaceOrderButton's
// bare `group`) keep inline copies — one constant can't cover them without
// renaming those groups.
export const CTA_ARROW =
  'h-3.5 w-3.5 transition-transform duration-300 group-hover/cta:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/cta:translate-x-0';

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
