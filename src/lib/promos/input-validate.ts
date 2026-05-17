import { PROMO_TYPES, type PromoType } from '@/models/Promo';

export type PromoInput = {
  code: string;
  description?: string;
  type: PromoType;
  value: number;
  minSubtotal?: number | null;
  maxDiscount?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  usageLimit?: number | null;
  perCustomerLimit?: number;
  firstOrderOnly: boolean;
  excludesPoints: boolean;
  excludesMember: boolean;
  isActive: boolean;
};

export type PromoInputResult =
  | { ok: true; data: PromoInput }
  | { ok: false; error: string };

const CODE_RE = /^[A-Z0-9_-]{3,30}$/;

const toOptionalNumber = (raw: unknown): number | null => {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
};

const toOptionalDate = (raw: unknown): Date | null => {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) return raw;
  if (typeof raw !== 'string') return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Validates the shape an admin sends from the form drawer. Used by both
// POST (create) and PUT (update) so the rules live in one place.
export function validatePromoInput(raw: unknown): PromoInputResult {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid request body' };
  }
  const body = raw as Record<string, unknown>;

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!CODE_RE.test(code)) {
    return { ok: false, error: 'Code must be 3-30 characters: letters, numbers, dash, underscore' };
  }

  const description =
    typeof body.description === 'string' && body.description.trim()
      ? body.description.trim().slice(0, 280)
      : undefined;

  const type = body.type as PromoType;
  if (!PROMO_TYPES.includes(type)) {
    return { ok: false, error: 'Type must be "percent" or "fixed"' };
  }

  const value = Number(body.value);
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, error: 'Value is required and must be positive' };
  }
  if (type === 'percent' && (value < 1 || value > 100 || !Number.isInteger(value))) {
    return { ok: false, error: 'Percent value must be a whole number between 1 and 100' };
  }
  if (type === 'fixed' && !Number.isInteger(value)) {
    return { ok: false, error: 'Fixed value must be a whole number of cents' };
  }

  const minSubtotal = toOptionalNumber(body.minSubtotal);
  if (minSubtotal != null && (Number.isNaN(minSubtotal) || minSubtotal < 0)) {
    return { ok: false, error: 'Minimum subtotal must be a non-negative number of cents' };
  }

  const maxDiscount = toOptionalNumber(body.maxDiscount);
  if (maxDiscount != null && (Number.isNaN(maxDiscount) || maxDiscount < 0)) {
    return { ok: false, error: 'Maximum discount must be a non-negative number of cents' };
  }

  const startsAt = toOptionalDate(body.startsAt);
  const endsAt = toOptionalDate(body.endsAt);
  if (startsAt && endsAt && endsAt <= startsAt) {
    return { ok: false, error: 'End date must be after the start date' };
  }

  const usageLimit = toOptionalNumber(body.usageLimit);
  if (usageLimit != null && (Number.isNaN(usageLimit) || usageLimit < 1 || !Number.isInteger(usageLimit))) {
    return { ok: false, error: 'Usage limit must be a positive integer' };
  }

  const perCustomerRaw = toOptionalNumber(body.perCustomerLimit);
  const perCustomerLimit =
    perCustomerRaw == null
      ? 1
      : Number.isNaN(perCustomerRaw) || perCustomerRaw < 1 || !Number.isInteger(perCustomerRaw)
        ? NaN
        : perCustomerRaw;
  if (Number.isNaN(perCustomerLimit)) {
    return { ok: false, error: 'Per-customer limit must be a positive integer' };
  }

  return {
    ok: true,
    data: {
      code,
      ...(description ? { description } : {}),
      type,
      value,
      minSubtotal: minSubtotal ?? null,
      maxDiscount: maxDiscount ?? null,
      startsAt: startsAt ?? null,
      endsAt: endsAt ?? null,
      usageLimit: usageLimit ?? null,
      perCustomerLimit,
      firstOrderOnly: Boolean(body.firstOrderOnly),
      excludesPoints: body.excludesPoints == null ? true : Boolean(body.excludesPoints),
      excludesMember: Boolean(body.excludesMember),
      isActive: body.isActive == null ? true : Boolean(body.isActive),
    },
  };
}
