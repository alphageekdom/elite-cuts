import 'server-only';

import Notification from '@/models/Notification';
import User from '@/models/User';
import { getShopSettings } from '@/lib/shop-settings/queries';
import { formatMoney } from '@/lib/format';

// Fire-and-forget admin alert when a new order lands. Gated on the
// notifNewOrder admin setting; getShopSettings fails open so a settings
// outage doesn't silence the alert. `excludeUserId` suppresses the
// self-notification when an admin is the one placing the order.
export const notifyAdminsOfNewOrder = async (
  orderId: string,
  totalCost: number,
  excludeUserId?: string,
): Promise<void> => {
  const settings = await getShopSettings();
  if (!settings.notifNewOrder) return;
  const adminFilter: Record<string, unknown> = { isAdmin: true };
  if (excludeUserId) adminFilter._id = { $ne: excludeUserId };
  const admins = await User.find(adminFilter, '_id').lean();
  if (!admins.length) return;
  const orderRef = `#EC-${orderId.slice(-4).toUpperCase()}`;
  const docs = admins.map((a) => ({
    type: 'new_order' as const,
    title: 'New order placed',
    body: `${orderRef} — ${formatMoney(totalCost)}`,
    userId: a._id,
    readAt: null,
  }));
  await Notification.insertMany(docs);
};

// Phase 4 — fire an admin alert when auto-settle at pickup fails. Always
// notifies; this isn't gated on a settings toggle because a failed
// settlement is a payment incident the shop has to handle in-store, not
// a routine event the admin can opt out of.
export const notifyAdminsOfSettlementFailure = async (args: {
  orderId: string;
  error: string;
}): Promise<void> => {
  const admins = await User.find({ isAdmin: true }, '_id').lean();
  if (!admins.length) return;
  const orderRef = `#EC-${args.orderId.slice(-4).toUpperCase()}`;
  const docs = admins.map((a) => ({
    type: 'settlement_failed' as const,
    title: 'Auto-settle failed',
    body: `${orderRef} — ${args.error.slice(0, 140)} Settle in-store.`,
    userId: a._id,
    readAt: null,
  }));
  await Notification.insertMany(docs);
};
