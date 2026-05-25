import { NextResponse } from 'next/server';
import type { Types } from 'mongoose';

import UserModel from '@/models/User';
import OrderModel from '@/models/Order';
import { withAdmin } from '@/lib/api-handler';
import { toCsv, csvFilename } from '@/lib/csv/build';
import { getTier, type Tier } from '@/lib/admin/customer-tier';
import { matchesStatFilter, STAT_FILTERS, type StatFilter } from '@/lib/admin/customer-status';

export const dynamic = 'force-dynamic';

const ALLOWED_TIERS: readonly Tier[] = ['regular', 'connoisseur', 'master'];

type RawUserLean = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  rewardPoints?: number;
  adminNote?: string;
  createdAt: Date;
  deletedAt?: Date | null;
  dormancyWarnedAt?: Date | null;
  savedCuts?: unknown[];
};

type OrderAggResult = {
  _id: Types.ObjectId | null;
  count: number;
  totalSpend: number;
  lastOrderAt: Date;
};

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseBool(raw: string | null): boolean | null {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

export const GET = withAdmin(async (req) => {
  try {
    const url = new URL(req.url);
    const rawStatus = url.searchParams.get('status')?.trim() ?? 'all';
    const status: StatFilter = (STAT_FILTERS as readonly string[]).includes(rawStatus)
      ? (rawStatus as StatFilter)
      : 'all';
    const search = url.searchParams.get('search')?.trim().toLowerCase() ?? '';
    const noteSearch = url.searchParams.get('noteSearch')?.trim().toLowerCase() ?? '';
    const from = parseDate(url.searchParams.get('from'));
    const to = parseDate(url.searchParams.get('to'));
    const hasOrders = parseBool(url.searchParams.get('hasOrders'));
    const hasSavedCuts = parseBool(url.searchParams.get('hasSavedCuts'));
    const rawTiers = (url.searchParams.get('tier') ?? '').split(',').map((t) => t.trim());
    const tierFilter = rawTiers.filter((t): t is Tier => (ALLOWED_TIERS as readonly string[]).includes(t));

    // Phase D — exclude the demo customer from the CSV by default so a
    // downstream analysis doesn't pick up the recruiter's clicks.
    const userQuery: Record<string, unknown> = {
      isAdmin: { $ne: true },
      isDemo: { $ne: true },
    };
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = from;
      if (to) range.$lte = to;
      userQuery.createdAt = range;
    }

    const [rawUsers, orderAgg] = await Promise.all([
      UserModel.find(userQuery)
        .sort({ createdAt: -1 })
        .limit(10000)
        .lean<RawUserLean[]>()
        .exec(),
      OrderModel.aggregate<OrderAggResult>([
        {
          $group: {
            _id: '$user',
            count: { $sum: 1 },
            totalSpend: { $sum: '$totalCost' },
            lastOrderAt: { $max: '$createdAt' },
          },
        },
      ]),
    ]);

    const orderMap = new Map<string, { count: number; totalSpend: number; lastOrderAt: Date }>();
    for (const entry of orderAgg) {
      if (entry._id == null) continue;
      orderMap.set(entry._id.toString(), {
        count: entry.count,
        totalSpend: entry.totalSpend,
        lastOrderAt: entry.lastOrderAt,
      });
    }

    const now = Date.now();
    const rows = rawUsers
      .map((u) => {
        const stats = orderMap.get(u._id.toString());
        const orderCount = stats?.count ?? 0;
        const totalSpend = stats?.totalSpend ?? 0;
        const lastOrderAt = stats?.lastOrderAt ?? null;
        return {
          email: u.email,
          name: u.name,
          phone: u.phone ?? '',
          tier: getTier(orderCount),
          rewardPoints: u.rewardPoints ?? 0,
          orderCount,
          totalSpend,
          lastOrderAt,
          createdAt: u.createdAt,
          adminNote: u.adminNote ?? '',
          savedCutsCount: (u.savedCuts ?? []).length,
          dormancyWarnedAt: u.dormancyWarnedAt ?? null,
          deletedAt: u.deletedAt ?? null,
        };
      })
      .filter((r) => {
        if (!matchesStatFilter(r, status, now)) return false;
        if (tierFilter.length > 0 && !tierFilter.includes(r.tier)) return false;
        if (hasOrders === true && r.orderCount === 0) return false;
        if (hasOrders === false && r.orderCount > 0) return false;
        if (hasSavedCuts === true && r.savedCutsCount === 0) return false;
        if (hasSavedCuts === false && r.savedCutsCount > 0) return false;
        if (search) {
          const matchesSearch =
            r.name.toLowerCase().includes(search) || r.email.toLowerCase().includes(search);
          if (!matchesSearch) return false;
        }
        if (noteSearch && !r.adminNote.toLowerCase().includes(noteSearch)) return false;
        return true;
      });

    const csv = toCsv(rows, [
      { header: 'email', value: (r) => r.email },
      { header: 'name', value: (r) => r.name },
      { header: 'phone', value: (r) => r.phone },
      { header: 'tier', value: (r) => r.tier },
      { header: 'rewardPoints', value: (r) => r.rewardPoints },
      { header: 'orderCount', value: (r) => r.orderCount },
      { header: 'totalSpend', value: (r) => r.totalSpend.toFixed(2) },
      { header: 'lastOrderAt', value: (r) => (r.lastOrderAt ? r.lastOrderAt.toISOString() : '') },
      { header: 'createdAt', value: (r) => r.createdAt.toISOString() },
      { header: 'adminNote', value: (r) => r.adminNote },
    ]);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${csvFilename('customers')}"`,
      },
    });
  } catch (error) {
    console.error('[customers export GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
