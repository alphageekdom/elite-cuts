'use server';

type PromoResult =
  | { valid: true; amount: number; label: string }
  | { valid: false };

const PROMO_CODES: Record<string, { type: 'percent' | 'fixed'; value: number; label: string }> = {
  ELITECUTS10: { type: 'percent', value: 10, label: '10% off your order' },
  FIRSTORDER:  { type: 'percent', value: 15, label: '15% off — first order' },
  NORTHPARK:   { type: 'fixed',   value: 5,  label: '$5 off' },
};

export async function validatePromoCode(
  code: string,
  subtotal: number,
): Promise<PromoResult> {
  const entry = PROMO_CODES[code.trim().toUpperCase()];
  if (!entry) return { valid: false };
  const amount =
    entry.type === 'percent' ? subtotal * (entry.value / 100) : entry.value;
  return { valid: true, amount, label: entry.label };
}
