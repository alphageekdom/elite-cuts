'use client';

export default function AdminTopbar() {
  return (
    <div className="flex items-center justify-between px-5 md:px-10 py-4 md:py-5 gap-4 border-b border-line-soft bg-cream shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-105 bg-paper border border-line rounded-full px-4.5 py-2.5 flex items-center gap-3 focus-within:border-ink transition-colors">
        <svg
          className="w-3.5 h-3.5 text-muted shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search cuts, orders, customers…"
          className="flex-1 bg-transparent border-none outline-none font-sans text-[14px] text-ink placeholder:text-muted"
        />
        <span className="hidden sm:inline text-[11px] tracking-widest text-muted bg-cream-deep px-1.5 py-0.5 rounded">
          ⌘ K
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          aria-label="Notifications"
          className="relative w-10 h-10 rounded-full bg-paper border border-line grid place-items-center text-ink hover:border-ink transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-oxblood border-2 border-paper" />
        </button>
        <button
          aria-label="Messages"
          className="w-10 h-10 rounded-full bg-paper border border-line grid place-items-center text-ink hover:border-ink transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
