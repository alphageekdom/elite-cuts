'use server';

import { revalidatePath } from 'next/cache';
import { Types } from 'mongoose';

import connectDB from '@/config/database';
import Promo from '@/models/Promo';
import { getSessionUser } from '@/lib/getSessionUser';
import { promoInputSchema } from '@/lib/promos/schema';

type ActionResult = { success: boolean; error?: string };

async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const session = await getSessionUser();
  if (!session?.userId) return { ok: false, error: 'Authentication required' };
  if (!session.user?.isAdmin) return { ok: false, error: 'Admin access required' };
  return { ok: true, userId: session.userId };
}

export async function createPromo(
  input: unknown,
): Promise<ActionResult & { id?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const result = promoInputSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? 'Invalid promo input',
    };
  }
  const data = result.data;

  try {
    await connectDB();
    const doc = await Promo.create({
      code: data.code,
      ...(data.description ? { description: data.description } : {}),
      type: data.type,
      value: data.value,
      ...(data.minSubtotal != null && { minSubtotal: data.minSubtotal }),
      ...(data.maxDiscount != null && { maxDiscount: data.maxDiscount }),
      ...(data.startsAt != null && { startsAt: data.startsAt }),
      ...(data.endsAt != null && { endsAt: data.endsAt }),
      ...(data.usageLimit != null && { usageLimit: data.usageLimit }),
      perCustomerLimit: data.perCustomerLimit,
      firstOrderOnly: data.firstOrderOnly,
      excludesPoints: data.excludesPoints,
      excludesMember: data.excludesMember,
      isActive: data.isActive,
      isPublic: data.isPublic,
      createdBy: new Types.ObjectId(auth.userId),
    });
    revalidatePath('/dashboard/promos');
    return { success: true, id: String(doc._id) };
  } catch (error) {
    if (error instanceof Error && /E11000/.test(error.message)) {
      return { success: false, error: 'That code is already in use' };
    }
    console.error('[createPromo]', error);
    return { success: false, error: 'Failed to create promo' };
  }
}

export async function updatePromo(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!Types.ObjectId.isValid(id)) {
    return { success: false, error: 'Invalid promo id' };
  }

  const result = promoInputSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? 'Invalid promo input',
    };
  }
  const data = result.data;

  try {
    await connectDB();
    // $unset nulled optionals so the doc reads "not set" instead of
    // carrying an explicit null — keeps validatePromo's $eq:null gating
    // consistent with how new promos are created.
    const unset: Record<string, ''> = {};
    if (data.minSubtotal == null) unset.minSubtotal = '';
    if (data.maxDiscount == null) unset.maxDiscount = '';
    if (data.startsAt == null) unset.startsAt = '';
    if (data.endsAt == null) unset.endsAt = '';
    if (data.usageLimit == null) unset.usageLimit = '';

    const set: Record<string, unknown> = { ...data };
    for (const k of Object.keys(unset)) delete set[k];

    const update: Record<string, unknown> = { $set: set };
    if (Object.keys(unset).length > 0) update.$unset = unset;

    const updated = await Promo.findByIdAndUpdate(id, update, {
      runValidators: true,
    });
    if (!updated) return { success: false, error: 'Promo not found' };

    revalidatePath('/dashboard/promos');
    return { success: true };
  } catch (error) {
    if (error instanceof Error && /E11000/.test(error.message)) {
      return { success: false, error: 'That code is already in use' };
    }
    console.error('[updatePromo]', error);
    return { success: false, error: 'Failed to update promo' };
  }
}

async function setActive(id: string, isActive: boolean): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!Types.ObjectId.isValid(id)) {
    return { success: false, error: 'Invalid promo id' };
  }
  try {
    await connectDB();
    const updated = await Promo.findByIdAndUpdate(id, { $set: { isActive } });
    if (!updated) return { success: false, error: 'Promo not found' };
    revalidatePath('/dashboard/promos');
    return { success: true };
  } catch (error) {
    console.error('[setActive]', error);
    return { success: false, error: 'Failed to update promo status' };
  }
}

export async function enablePromo(id: string): Promise<ActionResult> {
  return setActive(id, true);
}

export async function disablePromo(id: string): Promise<ActionResult> {
  return setActive(id, false);
}

export async function deletePromo(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!Types.ObjectId.isValid(id)) {
    return { success: false, error: 'Invalid promo id' };
  }
  try {
    await connectDB();
    // Refuse hard-delete on used promos so the audit trail stays intact.
    // Orders carry a snapshot of the code + savings, but the ref by ObjectId
    // is the only stable join key for grouping orders by campaign — losing
    // the promo doc would break that join. Admin should disable instead.
    const existing = await Promo.findById(id).select('usageCount').lean();
    if (!existing) return { success: false, error: 'Promo not found' };
    if ((existing.usageCount ?? 0) > 0) {
      return {
        success: false,
        error:
          'This code has been redeemed — disable it instead of deleting so the audit trail stays intact.',
      };
    }
    await Promo.findByIdAndDelete(id);
    revalidatePath('/dashboard/promos');
    return { success: true };
  } catch (error) {
    console.error('[deletePromo]', error);
    return { success: false, error: 'Failed to delete promo' };
  }
}
