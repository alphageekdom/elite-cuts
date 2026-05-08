export function SaveToast({ visible }: { visible: boolean }) {
  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2.5 bg-ink text-cream px-6 py-3 rounded-full text-sm font-medium shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-transform duration-400 ${
        visible ? 'translate-y-0' : 'translate-y-35'
      }`}
    >
      <svg className="w-4 h-4 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Settings saved
    </div>
  );
}
