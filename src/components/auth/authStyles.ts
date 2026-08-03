// Chrome shared by the sign-in and register forms. They're visual siblings, so
// one copy is what keeps them from drifting — as separate copies they already
// had.
//
// Named after the checkout equivalent (`checkoutStyles.ts`) so the pattern
// reads the same across the two form-heavy surfaces.

// Underline field. `pr-6` reserves room for the validity tick; fields that
// also carry a Show/Hide toggle add their own wider padding on top.
//
// Focus: these carried `outline-none` with only the 1px bottom border turning
// oxblood — animated over 300ms, so the one cue a keyboard user got was a hairline
// changing colour slowly. Every other control in the app uses a real focus ring.
// The ring is added back on `focus-visible` only, so it appears for keyboard and
// assistive-tech focus without drawing a box around a field a mouse user just
// clicked into. The bottom-border colour change stays as the shared cue for both.
export const AUTH_INPUT_CLASS =
  'w-full border-0 border-b border-line bg-transparent text-ink text-base py-2 pb-3.5 pr-6 outline-none placeholder:text-muted focus:border-oxblood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood transition-colors duration-300';

// The Show/Hide control sitting inside a password field's right edge.
// `py-3.5` is carrying the tap target to ~45px tall; at `py-2` the button
// measured 33px. The horizontal padding stays at `px-1` deliberately — the
// button is already ~49px wide, and widening it eats into the `pr-16`
// clearance that keeps a revealed password from running under it (measured at
// 15px spare on a 320px screen).
export const AUTH_PW_TOGGLE_CLASS =
  'absolute right-0 top-1/2 -translate-y-1/2 px-1 py-3.5 text-[11px] font-semibold tracking-[0.12em] uppercase text-oxblood transition-opacity duration-300 hover:opacity-70 focus-visible:opacity-70';

// Extra right padding on a password input so typed text clears the toggle.
export const AUTH_PW_INPUT_CLASS = `${AUTH_INPUT_CLASS} pr-16`;

// The card-shaped secondary door under the form — sign-in's two demo entrances
// and register's "look around first".
export const AUTH_DOOR_CLASS =
  'flex w-full items-center gap-3.5 rounded-xl border border-line bg-paper px-4 py-3.5 transition-colors duration-300 hover:border-ink disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-line motion-reduce:transition-none';
