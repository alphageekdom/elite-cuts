// Ceiling on how many review documents a single read pulls back. Shared by the
// product detail page and `GET /api/products/:id` so the two can't drift.
//
// Deliberately NOT applied to the separate `.select('rating')` read on the
// product page: that one is uncapped so the average stays honest as reviews
// accumulate, and it fetches one small field per row.
export const REVIEW_DISPLAY_CAP = 200;
