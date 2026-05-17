// Repeated label markup used across the admin form drawers (staff + shift).
// Small uppercase eyebrow with the same tracking and color treatment.
export default function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">
      {children}
    </label>
  );
}
