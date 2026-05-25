import { DEFAULT_SHOP_SETTINGS } from '@/lib/shop-settings/defaults';
import type { ShopSettings } from '@/models/ShopSettings';

// Snapshot for the nightly demo reset. Reads from the single canonical
// `DEFAULT_SHOP_SETTINGS` so the demo's "back to a known state" intent
// and the production schema defaults can't drift apart.
export const DEMO_SHOP_SETTINGS: ShopSettings = DEFAULT_SHOP_SETTINGS;
