import { redirect } from 'next/navigation';
import Link from 'next/link';
import connectDB from '@/config/database';
import { getSessionUser } from '@/utils/getSessionUser';
import User from '@/models/User';
import Product from '@/models/Product';
import Order from '@/models/Order';
import { convertToSerializableObject } from '@/utils/convertToObject';
import type { SerializedProduct } from '@/models/Product';
import type { OrderStatus, PaymentMethod } from '@/models/Order';
import type { Types } from 'mongoose';
import ProfileHero from '@/components/profile/ProfileHero';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileTabs from '@/components/profile/ProfileTabs';
import ProfileOrderList from '@/components/profile/ProfileOrderList';
import ProfileSavedCuts from '@/components/profile/ProfileSavedCuts';
import ProfileLoyaltyCard from '@/components/profile/ProfileLoyaltyCard';
import ProfileAccountInfo from '@/components/profile/ProfileAccountInfo';

export type ProfileOrder = {
  _id: string;
  orderItems: {
    product: string;
    name: string;
    qty: number;
    image: string;
    price: number;
    productType: string;
  }[];
  subtotal: number;
  tax: number;
  totalCost: number;
  isPaid: boolean;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  pickupLocation: string;
  pickedUp: boolean;
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
    bookmarks: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
  }>();

  if (!rawUser) return redirect('/login');

  const bookmarkIds = rawUser.bookmarks ?? [];
  const rawProducts =
    bookmarkIds.length > 0
      ? await Product.find({ _id: { $in: bookmarkIds } }).lean()
      : [];
  const serializedBookmarks = rawProducts.map((p) =>
    convertToSerializableObject(p as unknown as Record<string, unknown>),
  ) as SerializedProduct[];

  const rawOrders = await Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(activeTab === 'orders' ? 50 : 5)
    .lean();

  const serializedOrders: ProfileOrder[] = rawOrders.map((o) => ({
    _id: String(o._id),
    orderItems: o.orderItems.map((item) => ({
      product: String(item.product),
      name: item.name,
      qty: item.qty,
      image: item.image,
      price: item.price,
      productType: item.productType,
    })),
    subtotal: o.subtotal,
    tax: o.tax,
    totalCost: o.totalCost,
    isPaid: o.isPaid,
    orderStatus: o.orderStatus,
    paymentMethod: o.paymentMethod,
    pickupLocation: o.pickupLocation,
    pickedUp: o.pickedUp,
    createdAt: (o.createdAt as Date).toISOString(),
    updatedAt: (o.updatedAt as Date).toISOString(),
  }));

  const createdAt = (rawUser.createdAt as Date).toISOString();
  const displayName = sessionUser.user.name ?? rawUser.name ?? 'Member';
  const displayEmail = sessionUser.user.email ?? rawUser.email ?? '';
  const totalSpent = serializedOrders.reduce((s, o) => s + o.totalCost, 0);
  const joinedMs = Date.now() - rawUser.createdAt.getTime();
  const joinedMonths = Math.max(1, Math.round(joinedMs / (1000 * 60 * 60 * 24 * 30)));

  return (
    <main className="bg-cream min-h-screen pt-20">
      <div className="max-w-300 mx-auto px-5 md:px-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-3 text-[12px] tracking-[0.18em] uppercase text-muted pt-6 pb-2">
          <Link href="/" className="hover:text-oxblood transition-colors">Home</Link>
          <span className="opacity-40">/</span>
          <span>Account</span>
          <span className="opacity-40">/</span>
          <span className="text-ink">Profile</span>
        </nav>

        <ProfileHero name={displayName} email={displayEmail} createdAt={createdAt} />

        <ProfileStats
          orderCount={serializedOrders.length}
          totalSpent={totalSpent}
          savedCuts={serializedBookmarks.length}
          joinedMonths={joinedMonths}
        />

        <ProfileTabs
          activeTab={activeTab}
          orderCount={serializedOrders.length}
          savedCount={serializedBookmarks.length}
        />

        {/* Main grid */}
        <div className="py-12 pb-24 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 items-start">

          {/* Left: content */}
          <div>
            {(activeTab === 'overview' || activeTab === 'orders') && (
              <section className="mb-14">
                <div className="flex items-end justify-between mb-7 gap-5">
                  <div>
                    <p className="font-display italic text-camel text-[13px] mb-1">— 01</p>
                    <h2 className="font-display text-[28px] font-normal tracking-tight leading-tight">
                      Recent <em className="italic text-oxblood">orders</em>
                    </h2>
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
                    <p className="font-display italic text-camel text-[13px] mb-1">
                      {activeTab === 'overview' ? '— 02' : '— 01'}
                    </p>
                    <h2 className="font-display text-[28px] font-normal tracking-tight leading-tight">
                      Your saved <em className="italic text-oxblood">cuts</em>
                    </h2>
                  </div>
                  {serializedBookmarks.length > 3 && activeTab === 'overview' && (
                    <Link
                      href="?tab=saved"
                      className="text-[13px] font-medium text-ink-soft inline-flex items-center gap-1.5 border-b border-current pb-px hover:text-oxblood hover:gap-2.5 transition-all"
                    >
                      See all {serializedBookmarks.length}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                    </Link>
                  )}
                </div>
                <ProfileSavedCuts bookmarks={serializedBookmarks} showAll={activeTab === 'saved'} />
              </section>
            )}

            {activeTab === 'addresses' && (
              <div className="bg-paper border border-dashed border-line rounded p-14 text-center">
                <h3 className="font-display font-medium text-[22px] tracking-tight mb-2">Addresses</h3>
                <p className="text-muted text-sm">Address management coming soon.</p>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-paper border border-line-soft rounded p-8">
                <div className="mb-6">
                  <p className="font-display italic text-camel text-[13px] mb-1">— 01</p>
                  <h2 className="font-display text-[28px] font-normal tracking-tight leading-tight">
                    Account <em className="italic text-oxblood">settings</em>
                  </h2>
                </div>
                {/* TODO: UpdateProfile */}
                <p className="text-muted text-sm font-mono">[UpdateProfile] — password change form</p>
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <aside className="space-y-4">
            <ProfileLoyaltyCard />
            <ProfileAccountInfo email={displayEmail} joinedAt={createdAt} />
            {/* TODO: ProfileRecentlyViewed */}
            <div className="bg-paper border border-line-soft rounded p-7">
              <p className="text-muted text-sm font-mono">[ProfileRecentlyViewed]</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
