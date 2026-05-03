// Extracts and coerces the standard product fields from an admin form
// submission. Centralises the null-safe String()/parseInt() conversions that
// FormData.get() requires.
export const parseProductFormData = (formData: FormData) => ({
  name: String(formData.get('name') ?? ''),
  category: String(formData.get('category') ?? ''),
  description: String(formData.get('description') ?? ''),
  price: Number(String(formData.get('price') ?? '0')),
  stockCount: Number.parseInt(String(formData.get('stockCount') ?? '0'), 10),
});
