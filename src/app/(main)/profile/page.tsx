import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Profile',
  robots: { index: false, follow: false },
};
import connectDB from '@/config/database';
import { getSessionUser } from '@/lib/auth/session';
import User, { type PointsHistoryEntry, type TierValue } from '@/models/User';
import Product from '@/models/Product';
import Order from '@/models/Order';
import { convertToSerializableObject } from '@/lib/convertToObject';
import { getShopSettings } from '@/lib/shop-settings/queries';
import {
  getEffectiveBalance,
  getTierView,
  type TierView,
  type TierInfo,
} from '@/lib/rewards/calculator';
import type { SerializedProduct } from '@/models/Product';
import type { OrderStatus, PaymentMethod } from '@/models/Order';
import type { PricingType } from '@/lib/products/constants';
import type { Types } from 'mongoose';
import ProfileHero from '@/components/profile/ProfileHero';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileTabs from '@/components/profile/ProfileTabs';
import ProfileOrderList from '@/components/profile/ProfileOrderList';
import ProfileSavedCuts from '@/components/profile/ProfileSavedCuts';
import ProfileLoyaltyCard from '@/components/profile/ProfileLoyaltyCard';
import ProfileAccountInfo from '@/components/profile/ProfileAccountInfo';
import ProfileRecentlyViewed from '@/components/profile/ProfileRecentlyViewed';
import ProfileAddresses from '@/components/profile/ProfileAddresses';
import ProfilePaymentMethods from '@/components/profile/ProfilePaymentMethods';
import ProfileInfoForm from '@/components/profile/ProfileInfoForm';
import UpdateProfile from '@/components/profile/UpdateProfile';
import DeleteAccountSection from '@/components/profile/DeleteAccountSection';
import ProfileRewards from '@/components/profile/ProfileRewards';
import ProfileMessages from '@/components/profile/ProfileMessages';
import type { SerializedMessage } from '@/components/profile/ProfileMessages';
import MessageModel from '@/models/Message';
import type { SerializedAddress } from '@/types/address';

export type ProfileOrder = {
  _id: string;
  orderItems: {
    product: string;
    name: string;
    qty: number;
    image: string;
    price: number;
    productType: string;
    refunded: boolean;
    pricingType?: PricingType;
    pricePerLb?: number;
    realizedWeightLb?: number;
  }[];
  subtotal: number;
  tax: number;
  totalCost: number;
  isPaid: boolean;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  pickupLocation: string;
  pickedUp: boolean;
  // Phase 4 — auto-settle status surfaced on the profile order card so
  // the customer can tell at a glance whether the settlement charge has
  // been applied to their card.
  settlementStatus?: 'pending' | 'settled' | 'failed';
  createdAt: string;
  updatedAt: string;
};

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function ProfilePage({ searchParams }: Props) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) redirect('/login');

  await connectDB();

  const params = await searchParams;
  const activeTab = params.tab ?? 'overview';
  const { userId } = sessionUser;

  const rawUser = await User.findById(userId).lean<{
    _id: Types.ObjectId;
    name: string;
    email: string;
    phone?: string;
    savedCuts: Types.ObjectId[];
    addresses: {
      _id: Types.ObjectId;
      label: string;
      address1: string;
      address2?: string;
      city: string;
      state: string;
      zip: string;
      isDefault: boolean;
    }[];
    rewardPoints: number;
    lifetimePoints: number;
    pointsHistory: PointsHistoryEntry[];
    tierAnniversaryAt?: Date;
    currentTier?: TierValue;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>();

  if (!rawUser) return redirect('/login');

  const settings = await getShopSettings();
  const effective = getEffectiveBalance(rawUser);

  // Phase D2 tier-aware view. Pure function — persist if it tells us a
  // reassessment happened (the anniversary just passed) so the customer's
  // currentTier + anniversary stay in sync.
  const tierView: TierView = getTierView(rawUser, settings);
  if (tierView.reassessed) {
    await User.findByIdAndUpdate(userId, {
      $set: {
        currentTier: tierView.tier,
        tierAnniversaryAt: tierView.nextAnniversaryAt,
      },
    });
  } else if (!rawUser.tierAnniversaryAt) {
    // Legacy backfill — stamp the resolved anniversary the first time we
    // compute it so subsequent reads have a stable period start.
    await User.findByIdAndUpdate(userId, {
      $set: { tierAnniversaryAt: tierView.periodStart },
    });
  }

  // Keep the TierInfo shape for components that still take it (loyalty card,
  // hero, stats). Maps from the view.
  const tier: TierInfo = {
    tier: tierView.tier,
    label: tierView.label,
    threshold:
      tierView.tier === 'masterCut'
        ? settings.masterCutThreshold
        : tierView.tier === 'connoisseur'
          ? settings.connoisseurThreshold
          : 0,
    nextTier:
      tierView.tier === 'masterCut'
        ? null
        : tierView.tier === 'connoisseur'
          ? 'masterCut'
          : 'connoisseur',
    nextThreshold: tierView.nextThreshold,
    pointsToNext: tierView.pointsToNext,
    progress: tierView.progress,
  };
  const serializedRecentHistory = effective.recentHistory.map((e) => ({
    delta: e.delta,
    reason: e.reason,
    orderId: e.orderId ? String(e.orderId) : undefined,
    createdAt: new Date(e.createdAt).toISOString(),
  }));

  const serializedAddresses: SerializedAddress[] = (rawUser.addresses ?? []).map((a) => ({
    _id: a._id.toString(),
    label: a.label,
    address1: a.address1,
    ...(a.address2 ? { address2: a.address2 } : {}),
    city: a.city,
    state: a.state,
    zip: a.zip,
    isDefault: a.isDefault,
  }));

  const savedCutIds = rawUser.savedCuts ?? [];
  const rawProducts =
    savedCutIds.length > 0
      ? await Product.find({ _id: { $in: savedCutIds } }).lean()
      : [];
  const serializedSavedCuts = rawProducts.map((p) =>
    convertToSerializableObject(p as unknown as Record<string, unknown>),
  ) as SerializedProduct[];

  // Stub: fetch 3 in-stock products as "recently viewed" (no tracking yet)
  const rawRecent = await Product.find({ stockCount: { $gt: 0 } })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();
  const recentProducts = rawRecent.map((p) =>
    convertToSerializableObject(p as unknown as Record<string, unknown>),
  ) as SerializedProduct[];

  const [rawOrders, rawMessages] = await Promise.all([
    Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(activeTab === 'orders' ? 50 : 5)
      .lean(),
    MessageModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const serializedOrders: ProfileOrder[] = rawOrders.map((o) => ({
    _id: String(o._id),
    orderItems: o.orderItems.map((item) => ({
      product: String(item.product),
      name: item.name,
      qty: item.qty,
      image: item.image,
      price: item.price,
      productType: item.productType,
      refunded: item.refunded ?? false,
      pricingType: item.pricingType,
      pricePerLb: item.pricePerLb,
      realizedWeightLb: item.realizedWeightLb,
    })),
    subtotal: o.subtotal,
    tax: o.tax,
    totalCost: o.totalCost,
    isPaid: o.isPaid,
    orderStatus: o.orderStatus,
    paymentMethod: o.paymentMethod,
    pickupLocation: o.pickupLocation,
    pickedUp: o.pickedUp,
    settlementStatus: o.paymentResult?.settlementStatus,
    createdAt: (o.createdAt as Date).toISOString(),
    updatedAt: (o.updatedAt as Date).toISOString(),
  }));

  const serializedMessages: SerializedMessage[] = rawMessages.map((m) => ({
    _id: String(m._id),
    subject: m.subject,
    body: m.body,
    ...(m.orderRef ? { orderRef: m.orderRef } : {}),
    status: m.status,
    createdAt: (m.createdAt as Date).toISOString(),
  }));

  const createdAt = (rawUser.createdAt as Date).toISOString();
  const displayName = sessionUser.user.name ?? rawUser.name ?? 'Member';
  const displayEmail = sessionUser.user.email ?? rawUser.email ?? '';
  const totalSpent = serializedOrders.reduce((s, o) => s + o.totalCost, 0);
  const joinedMs = Date.now() - rawUser.createdAt.getTime();
  const joinedMonths = Math.max(1, Math.round(joinedMs / (1000 * 60 * 60 * 24 * 30)));

  return (
    <div className="bg-cream min-h-[calc(100vh-5rem)]">
      <div className="max-w-300 mx-auto px-5 md:px-8">

        <ProfileHero
          name={displayName}
          email={displayEmail}
          createdAt={createdAt}
          userId={userId}
          tierLabel={tier.label}
          isAdmin={rawUser.isAdmin ?? false}
        />

        <ProfileStats
          orderCount={serializedOrders.length}
          totalSpent={totalSpent}
          savedCuts={serializedSavedCuts.length}
          joinedMonths={joinedMonths}
          rewardPoints={effective.balance}
          tier={tier}
        />

        <ProfileTabs
          activeTab={activeTab}
          orderCount={serializedOrders.length}
          savedCount={serializedSavedCuts.length}
          addressCount={serializedAddresses.length}
          messageCount={serializedMessages.length}
        />

        {/* Main grid */}
        <div className="pt-8 pb-16 sm:pt-12 sm:pb-20 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 items-start">

          {/* Left: content */}
          <div>
            {(activeTab === 'overview' || activeTab === 'orders') && (
              <section className={activeTab === 'orders' ? '' : 'mb-14'}>
                <div className="flex items-end justify-between mb-7 gap-5">
                  <div>
                    {activeTab === 'orders' ? (
                      <h2 className="font-display text-[28px] font-normal tracking-tight leading-tight">
                        Your <em className="italic text-oxblood">orders</em>
                        {serializedOrders.length > 0 && (
                          <span className="ml-3 font-sans text-[15px] font-normal text-muted align-middle">
                            ({serializedOrders.length})
                          </span>
                        )}
                      </h2>
                    ) : (
                      <h2 className="font-display text-[28px] font-normal tracking-tight leading-tight">
                        Recent <em className="italic text-oxblood">orders</em>
                      </h2>
                    )}
                  </div>
                  {serializedOrders.length > 0 && activeTab === 'overview' && (
                    <Link
                      href="?tab=orders"
                      className="text-[13px] font-medium text-ink-soft inline-flex items-center gap-1.5 border-b border-current pb-px hover:text-oxblood hover:gap-2.5 transition-all"
                    >
                      View all
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                    </Link>
                  )}
                </div>
                <ProfileOrderList orders={serializedOrders} showAll={activeTab === 'orders'} />
              </section>
            )}

            {(activeTab === 'overview' || activeTab === 'saved') && (
              <section>
                <div className="flex items-end justify-between mb-7 gap-5">
                  <div>
                    {activeTab === 'saved' ? (
                      <h2 className="font-display text-[28px] font-normal tracking-tight leading-tight">
                        Your saved <em className="italic text-oxblood">cuts</em>
                        {serializedSavedCuts.length > 0 && (
                          <span className="ml-3 font-sans text-[15px] font-normal text-muted align-middle">
                            ({serializedSavedCuts.length})
                          </span>
                        )}
                      </h2>
                    ) : (
                      <h2 className="font-display text-[28px] font-normal tracking-tight leading-tight">
                        Your saved <em className="italic text-oxblood">cuts</em>
                      </h2>
                    )}
                  </div>
                  {serializedSavedCuts.length > 3 && activeTab === 'overview' && (
                    <Link
                      href="?tab=saved"
                      className="text-[13px] font-medium text-ink-soft inline-flex items-center gap-1.5 border-b border-current pb-px hover:text-oxblood hover:gap-2.5 transition-all"
                    >
                      See all {serializedSavedCuts.length}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                    </Link>
                  )}
                </div>
                <ProfileSavedCuts savedCuts={serializedSavedCuts} showAll={activeTab === 'saved'} />
              </section>
            )}

            {activeTab === 'addresses' && (
              <ProfileAddresses addresses={serializedAddresses} />
            )}

            {activeTab === 'paymentMethods' && (
              <section>
                <div className="mb-7">
                  <h2 className="font-display text-[28px] font-normal tracking-tight leading-tight">
                    Payment <em className="italic text-oxblood">methods</em>
                  </h2>
                  <p className="mt-2 text-[13px] text-ink-soft">
                    Cards saved at checkout. Add a new one by ticking Save this card on your next Stripe checkout.
                  </p>
                </div>
                <ProfilePaymentMethods />
              </section>
            )}

            {activeTab === 'messages' && (
              <ProfileMessages
                messages={serializedMessages}
                userId={userId}
                name={displayName}
                rewardPoints={effective.balance}
                isAdmin={rawUser.isAdmin ?? false}
              />
            )}

            {activeTab === 'rewards' && (
              <ProfileRewards
                points={effective.balance}
                lifetimePoints={effective.lifetimePoints}
                expiredPoints={effective.expiredPoints}
                tier={tier}
                qualifyingPoints={tierView.qualifying}
                periodEndsAt={tierView.periodEndsAt?.toISOString() ?? null}
                recentHistory={serializedRecentHistory}
                redemptionPoints={settings.redemptionPoints}
                redemptionDollars={settings.redemptionDollars}
                pointsExpiryMonths={settings.pointsExpiryMonths}
              />
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Profile info */}
                <div className="bg-paper border border-line-soft rounded p-6 sm:p-8">
                  <h2 className="font-display text-[28px] font-normal tracking-tight leading-tight mb-6">
                    Profile <em className="italic text-oxblood">info</em>
                  </h2>
                  <ProfileInfoForm initialName={displayName} initialEmail={displayEmail} initialPhone={rawUser.phone ?? ''} />
                </div>

                {/* Password */}
                <div className="bg-paper border border-line-soft rounded p-6 sm:p-8">
                  <h2 className="font-display text-[28px] font-normal tracking-tight leading-tight mb-6">
                    Change <em className="italic text-oxblood">password</em>
                  </h2>
                  <UpdateProfile />
                </div>

                {/* Danger zone — kept off-admins; admins can't self-delete. */}
                {!rawUser.isAdmin && <DeleteAccountSection />}
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <aside className="space-y-4">
            <ProfileLoyaltyCard
              points={tierView.qualifying}
              tier={tier}
              periodEndsAt={tierView.periodEndsAt?.toISOString() ?? null}
            />
            <ProfileAccountInfo email={displayEmail} joinedAt={createdAt} />
            <ProfileRecentlyViewed products={recentProducts} />
          </aside>
        </div>
      </div>
    </div>
  );
}
