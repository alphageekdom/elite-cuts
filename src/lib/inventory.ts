export const DEFAULT_PAR = 15;

// Par level thresholds per category (MVP stub — no par field in Product model yet).
// Used in the inventory page, InventoryClient, and AdminSidebar to compute stock health.
// Any category not listed here falls back to DEFAULT_PAR.
export const CATEGORY_PAR: Record<string, number> = {
  Beef: 30,
  Pork: 25,
  Chicken: 20,
  Lamb: 20,
  Charcuterie: 15,
  Other: 15,
};
