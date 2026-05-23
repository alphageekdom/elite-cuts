import type { ShiftColor } from '@/lib/shift-constants';

// Shape used everywhere the staff dashboard renders rows. Lives in the
// display lib (rather than in StaffPageClient) so the import direction
// from leaf components to the orchestrator is one-way.
export type StaffRow = {
  id: string;
  name: string;
  role: string;
  roleKey: StaffRoleKey;
  station: string;
  status: StaffStatus;
  color: ShiftColor;
  email: string;
  notes: string;
  workingToday: boolean;
  todayShift: string | null;
};

// Enums live here (not in the Mongoose model) so client components can
// import them without dragging mongoose/mongodb into the browser bundle.
export const STAFF_STATUSES = ['active', 'inactive', 'seasonal', 'on-leave'] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export const STAFF_ROLE_KEYS = [
  'head-butcher',
  'charcuterie',
  'apprentice',
  'counter',
  'delivery',
  'receiving',
  'other',
] as const;
export type StaffRoleKey = (typeof STAFF_ROLE_KEYS)[number];

export const STATUS_LABEL: Record<StaffStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  seasonal: 'Seasonal',
  'on-leave': 'On Leave',
};

// Badge classes per status — color is reinforced by a tiny dot + label,
// so the meaning isn't carried by color alone.
export const STATUS_BADGE: Record<StaffStatus, string> = {
  active: 'bg-green-soft text-green',
  inactive: 'bg-ink/6 text-muted',
  seasonal: 'bg-cream-deep text-ink-soft',
  'on-leave': 'bg-amber-soft text-amber',
};

export const ROLE_LABEL: Record<StaffRoleKey, string> = {
  'head-butcher': 'Head Butcher',
  charcuterie: 'Charcuterie',
  apprentice: 'Apprentice',
  counter: 'Counter',
  delivery: 'Delivery',
  receiving: 'Receiving',
  other: 'Other',
};

// Color is role-coded on the schedule grid so an admin can tell what *kind*
// of work each shift is from a glance, rather than who specifically is on it.
// Two head butchers share the oxblood swatch; one head butcher and one
// apprentice get visually distinct cards.
export const ROLE_COLOR: Record<StaffRoleKey, ShiftColor> = {
  'head-butcher': 'tangelo',
  charcuterie: 'marcus',
  apprentice: 'maya',
  counter: 'sam',
  delivery: 'delivery',
  receiving: 'elena',
  other: 'marcus',
};

// Role chips on the filter row collapse the three butcher-side roles
// into one "Butchers" group; counter / delivery / receiving stand alone.
export const ROLE_GROUPS = {
  butchers: ['head-butcher', 'apprentice', 'charcuterie'] as StaffRoleKey[],
  counter: ['counter'] as StaffRoleKey[],
  delivery: ['delivery'] as StaffRoleKey[],
  receiving: ['receiving'] as StaffRoleKey[],
};

export type StaffFilterKey =
  | 'all'
  | 'active'
  | 'working-today'
  | 'off-today'
  | 'butchers'
  | 'counter'
  | 'delivery'
  | 'receiving';

export const AVATAR_BG: Record<ShiftColor, string> = {
  tangelo: 'bg-oxblood',
  marcus: 'bg-ink',
  elena: 'bg-camel',
  sam: 'bg-green',
  maya: 'bg-camel-soft',
  delivery: 'bg-cream-deep',
};

// Swatch classes for the color pickers in the shift and staff drawers.
// Mirrors AVATAR_BG but adds the dashed border treatment for the 'delivery'
// option so it reads as a generic-but-distinct picker chip.
export const COLOR_SWATCH: Record<ShiftColor, string> = {
  tangelo:  'bg-oxblood',
  marcus:   'bg-ink',
  elena:    'bg-camel',
  sam:      'bg-green',
  maya:     'bg-camel-soft',
  delivery: 'bg-cream-deep border border-dashed border-line',
};

export const AVATAR_FG: Record<ShiftColor, string> = {
  tangelo: 'text-cream',
  marcus: 'text-cream',
  elena: 'text-ink',
  sam: 'text-cream',
  maya: 'text-ink',
  delivery: 'text-ink-soft',
};

// Standard form-input classes shared by the admin form drawers
// (staff + shift). Cream fill, soft border, focuses to ink.
export const FORM_FIELD_CLS =
  'w-full bg-cream border border-line-soft rounded-lg px-4 py-2.5 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors';

// hourIndex 0 = 8 AM, … 8 = 4 PM. End uses +1 because the slot covers a full hour.
export function formatShiftRange(startHourIndex: number, endHourIndex: number): string {
  const startH = startHourIndex + 8;
  const endH = endHourIndex + 9;
  const fmt = (h: number) => (h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);
  return `${fmt(startH)} – ${fmt(endH)}`;
}
