'use client';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

type DiffEntry = { field: string; from: unknown; to: unknown };

type RowResult = {
  index: number;
  status: 'create' | 'update' | 'skip' | 'error';
  slug: string;
  name: string;
  diff?: DiffEntry[];
  error?: string;
  warnings?: string[];
};

type Summary = { create: number; update: number; skip: number; error: number };

type DryRunResponse = { rows: RowResult[]; summary: Summary };

type Step = 'upload' | 'preview' | 'done';

type Props = {
  onClose: () => void;
  onCommitted: () => void;
};

const STATUS_CHIP: Record<RowResult['status'], { label: string; bg: string; text: string }> = {
  create: { label: 'CREATE', bg: 'bg-green-soft', text: 'text-green' },
  update: { label: 'UPDATE', bg: 'bg-cream-deep', text: 'text-camel-deeper' },
  skip:   { label: 'SKIP',   bg: 'bg-line-soft',  text: 'text-muted' },
  error:  { label: 'ERROR',  bg: 'bg-red-soft',   text: 'text-oxblood' },
};

function fmtCell(v: unknown): string {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

export default function ProductImportDrawer({ onClose, onCommitted }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [dryRun, setDryRun] = useState<DryRunResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [committedCount, setCommittedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('File must be a .csv');
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error('CSV is larger than 1 MB');
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    await runDryRun(text);
  }

  async function runDryRun(csv: string) {
    setBusy(true);
    try {
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.message ?? 'Failed to parse CSV');
        return;
      }
      setDryRun(body as DryRunResponse);
      setStep('preview');
    } catch {
      toast.error('Failed to parse CSV');
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    if (!csvText) return;
    setBusy(true);
    try {
      const res = await fetch('/api/products/import?commit=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.message ?? 'Import failed');
        return;
      }
      setCommittedCount(body.committedCount ?? 0);
      setStep('done');
      toast.success(`Imported ${body.committedCount ?? 0} product${body.committedCount === 1 ? '' : 's'}`);
      onCommitted();
    } catch {
      toast.error('Import failed');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep('upload');
    setFileName('');
    setCsvText('');
    setDryRun(null);
    setCommittedCount(0);
    // Clear the native file input so a previously-picked filename doesn't
    // hang around — the input would otherwise show the stale name until the
    // admin picks again.
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function downloadTemplate() {
    const res = await fetch('/api/products/export?template=true');
    if (!res.ok) {
      toast.error('Template download failed');
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products-template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  const newProductCount = dryRun?.summary.create ?? 0;
  const errorCount = dryRun?.summary.error ?? 0;
  const changeCount = (dryRun?.summary.create ?? 0) + (dryRun?.summary.update ?? 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 border-b border-line-soft">
        <div>
          <div className="text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Bulk import</div>
          <div id="product-import-title" className="font-display text-[22px] tracking-[-0.01em]">Import products from CSV</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Step strip */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-line-soft bg-cream">
        {(['upload', 'preview', 'done'] as Step[]).map((s, i) => {
          const active = step === s;
          const past = (['upload', 'preview', 'done'] as Step[]).indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-2 text-[11px] tracking-[0.16em] uppercase">
              <span
                className={`w-5 h-5 rounded-full grid place-items-center font-mono text-[10px] ${
                  active ? 'bg-ink text-cream' : past ? 'bg-green text-cream' : 'bg-line-soft text-muted'
                }`}
              >
                {past ? '✓' : i + 1}
              </span>
              <span className={active ? 'text-ink font-medium' : 'text-muted'}>{s}</span>
              {i < 2 && <span className="w-6 h-px bg-line-soft" />}
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {step === 'upload' && (
          <div className="space-y-5">
            <div>
              <div className="text-[13px] text-ink-soft mb-2">
                Upload a CSV with this column order: <span className="font-mono text-[12px]">slug, name, description, category, price, unit, stock, isFeatured, isActive, supplier</span>.
                Existing products are matched by <strong>slug</strong>; leave slug blank on new rows and it&apos;s derived from the name. Updating the name of an existing slug renames the product.
              </div>
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1.5 text-[12px] text-oxblood hover:underline"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download empty template
              </button>
            </div>

            <label
              htmlFor="product-import-file"
              className="flex flex-col items-center justify-center gap-2 p-10 border-2 border-dashed border-line rounded-md bg-paper hover:border-ink hover:bg-cream transition-colors cursor-pointer"
            >
              <svg className="w-7 h-7 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-[13px] font-medium">{busy ? 'Reading file…' : 'Click to select a .csv file'}</span>
              <span className="text-[11px] text-muted">Max 1 MB · up to 1000 rows</span>
              <input
                id="product-import-file"
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </label>
          </div>
        )}

        {step === 'preview' && dryRun && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[13px] text-ink-soft">
              <span className="font-mono text-[12px]">{fileName}</span>
              <span className="text-muted">·</span>
              <span>
                <span className="text-green font-medium">{dryRun.summary.create} new</span>,{' '}
                <span className="text-camel-deep font-medium">{dryRun.summary.update} updated</span>,{' '}
                <span className="text-muted">{dryRun.summary.skip} unchanged</span>
                {errorCount > 0 && (
                  <>, <span className="text-oxblood font-medium">{errorCount} error{errorCount === 1 ? '' : 's'}</span></>
                )}
              </span>
            </div>

            {newProductCount > 0 && (
              <div className="text-[12px] text-muted bg-cream border border-line-soft rounded-md px-3 py-2">
                {newProductCount} new product{newProductCount === 1 ? '' : 's'} will be created without images — add them via the product editor afterwards.
              </div>
            )}

            <div className="border border-line-soft rounded-md overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-cream border-b border-line-soft">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] font-medium tracking-[0.18em] uppercase text-muted w-20">Status</th>
                    <th className="text-left px-3 py-2 text-[10px] font-medium tracking-[0.18em] uppercase text-muted">Name</th>
                    <th className="text-left px-3 py-2 text-[10px] font-medium tracking-[0.18em] uppercase text-muted">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {dryRun.rows.map((row) => {
                    const chip = STATUS_CHIP[row.status];
                    return (
                      <tr key={row.index} className="border-b border-line-soft last:border-b-0 align-top">
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.04em] ${chip.bg} ${chip.text}`}>
                            {chip.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{row.name || row.slug}</div>
                          <div className="font-mono text-[11px] text-muted">{row.slug}</div>
                        </td>
                        <td className="px-3 py-2 text-ink-soft">
                          {row.status === 'error' && <span className="text-oxblood">{row.error}</span>}
                          {row.status === 'skip' && <span className="text-muted">No changes</span>}
                          {row.status === 'create' && <span className="text-muted">New product</span>}
                          {row.status === 'update' && row.diff && (
                            <div className="space-y-0.5">
                              {row.diff.map((d, i) => (
                                <div key={i} className="font-mono text-[11px]">
                                  <span className="text-muted">{d.field}:</span>{' '}
                                  <span className="text-ink-soft line-through">{fmtCell(d.from)}</span>{' '}
                                  <span className="text-camel-deep">→</span>{' '}
                                  <span className="text-ink">{fmtCell(d.to)}</span>
                                </div>
                              ))}
                              {row.warnings?.map((w, i) => (
                                <div key={`w-${i}`} className="text-[11px] text-oxblood">⚠ {w}</div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {errorCount > 0 && (
              <div className="text-[12px] text-oxblood bg-red-soft border border-[rgba(107,31,31,0.2)] rounded-md px-3 py-2">
                Fix the error rows and re-upload — the commit will refuse to apply until they&apos;re resolved.
              </div>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-10">
            <div className="w-12 h-12 mx-auto rounded-full bg-green text-cream grid place-items-center mb-4">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="font-display text-[22px] tracking-[-0.01em] mb-1">Import complete</div>
            <div className="text-[13px] text-ink-soft">
              {committedCount} product{committedCount === 1 ? '' : 's'} applied.
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-line-soft bg-paper">
        {step === 'preview' && (
          <>
            <button
              onClick={reset}
              disabled={busy}
              className="px-4 py-2 rounded-full bg-paper border border-line text-ink-soft text-[13px] hover:border-ink hover:text-ink transition-colors disabled:opacity-50"
            >
              Pick a different file
            </button>
            <button
              onClick={handleCommit}
              disabled={busy || changeCount === 0 || errorCount > 0}
              className="px-4.5 py-2 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy
                ? 'Applying…'
                : errorCount > 0
                ? 'Resolve errors to continue'
                : changeCount === 0
                ? 'Nothing to apply'
                : `Apply ${changeCount} change${changeCount === 1 ? '' : 's'}`}
            </button>
          </>
        )}
        {step === 'done' && (
          <button
            onClick={onClose}
            className="px-4.5 py-2 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors"
          >
            Done
          </button>
        )}
        {step === 'upload' && (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-paper border border-line text-ink-soft text-[13px] hover:border-ink hover:text-ink transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
