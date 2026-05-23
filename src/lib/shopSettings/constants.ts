// Client-safe enums for the shop settings domain. Lives outside the Mongoose
// model file so the Zod schema (and the GeneralTab dormancy dropdown) can
// import these without pulling mongoose into the browser bundle. The model
// file re-exports them for server-side back-compat — see `models/ShopSettings.ts`.

export const DORMANCY_THRESHOLD_VALUES = [0, 12, 18, 24] as const;
export type DormancyThreshold = (typeof DORMANCY_THRESHOLD_VALUES)[number];

// Human-readable labels for the dormancy threshold select. The form maps
// over this list rather than hand-typing option labels.
export const DORMANCY_OPTIONS: { value: DormancyThreshold; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 12, label: '12 months' },
  { value: 18, label: '18 months' },
  { value: 24, label: '24 months' },
];
