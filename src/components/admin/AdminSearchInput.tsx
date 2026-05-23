'use client';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
};

export default function AdminSearchInput({ value, onChange, placeholder, className = '' }: Props) {
  return (
    <label className={`flex items-center gap-2.5 bg-paper border border-line rounded-full px-4 py-2 focus-within:border-ink transition-colors ${className}`}>
      <svg className="w-3.5 h-3.5 text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-none outline-none text-[13px] text-ink placeholder:text-muted min-w-0"
      />
    </label>
  );
}
