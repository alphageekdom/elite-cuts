'use client';

// Cross-context select wrapper used by admin drawers / settings tabs and
// customer profile / catalog forms alike. Originally lived in
// `components/admin/AdminForm.tsx` but moved here once consumers outside
// the admin tree (customer address form, customer catalog filter bar)
// needed the same chevron + chrome treatment.
//
// API stays as `React.SelectHTMLAttributes<HTMLSelectElement>` so callers
// pass `value`, `onChange`, and `<option>` children exactly as they would
// for a bare `<select>`. No props redesign — just chrome unification.
export function SelectField({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className="appearance-none w-full border border-line bg-paper font-sans text-sm text-ink px-4 py-3 rounded-lg outline-none focus:border-ink transition-colors cursor-pointer pr-9"
        {...props}
      >
        {children}
      </select>
      <svg
        className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted pointer-events-none"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
