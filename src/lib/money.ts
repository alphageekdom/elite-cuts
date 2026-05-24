// Round a dollar amount to cent precision (2 decimal places). The same
// `Math.round(x * 100) / 100` was inlined across the order PATCH handler,
// the Stripe webhook, the running-mean review path, and the order builder.
// One helper means a future precision change (e.g. tenths-of-a-cent for some
// fee math) touches one file instead of five.
export function roundMoney(dollars: number): number {
  return Math.round(dollars * 100) / 100;
}
