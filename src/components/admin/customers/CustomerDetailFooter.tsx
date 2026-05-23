'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { inputCls } from '@/components/admin/AdminForm';
import { getLifecycle } from '@/lib/customer-tier';
import type { CustomerTableRow } from '@/types/admin';

type Props = {
  customer: CustomerTableRow;
  onDelete: (id: string, opts?: { reason?: string; immediate?: boolean }) => Promise<void>;
  onCancelDeletion?: (id: string) => Promise<void>;
  onCancelDormancy?: (id: string) => Promise<void>;
  onEditProfile: () => void;
};

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}

export default function CustomerDetailFooter({
  customer,
  onDelete,
  onCancelDeletion,
  onCancelDormancy,
  onEditProfile,
}: Props) {
  const { isSoftDeleted, isDormancyWarned } = getLifecycle(customer);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteImmediate, setDeleteImmediate] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancellingDormancy, setCancellingDormancy] = useState(false);

  async function handleDelete() {
    if (deleteImmediate && !deleteReason.trim()) {
      toast.error('Reason is required for immediate hard delete');
      return;
    }
    setDeleting(true);
    try {
      await onDelete(customer.id, {
        reason: deleteReason.trim() || undefined,
        immediate: deleteImmediate,
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleCancelDeletion() {
    if (!onCancelDeletion) return;
    setCancelling(true);
    try {
      await onCancelDeletion(customer.id);
    } finally {
      setCancelling(false);
    }
  }

  async function handleCancelDormancy() {
    if (!onCancelDormancy) return;
    setCancellingDormancy(true);
    try {
      await onCancelDormancy(customer.id);
    } finally {
      setCancellingDormancy(false);
    }
  }

  return (
    <div className="px-8 py-4.5 bg-paper border-t border-line-soft shrink-0">
      {confirmDelete ? (
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[10px] font-medium tracking-[0.18em] uppercase text-muted mb-1.5">
              Reason {deleteImmediate && <span className="text-oxblood normal-case tracking-normal">· required</span>}
            </div>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder={deleteImmediate ? 'Spam, abuse, fake reviews…' : 'Optional — noted in the audit log'}
              className={`${inputCls} resize-y text-[13px]`}
            />
          </div>
          <label className="flex items-start gap-2.5 text-[13px] text-ink-soft cursor-pointer">
            <input
              type="checkbox"
              checked={deleteImmediate}
              onChange={(e) => setDeleteImmediate(e.target.checked)}
              className="mt-0.5 accent-oxblood"
            />
            <span>
              Immediate hard-delete <span className="text-muted">(skip the 30-day grace; permanent)</span>
            </span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => { setConfirmDelete(false); setDeleteReason(''); setDeleteImmediate(false); }}
              className="flex-1 px-4 py-2.5 rounded-full border border-line text-ink-soft text-[13px] font-medium hover:border-ink hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting || (deleteImmediate && !deleteReason.trim())}
              className="flex-1 px-4 py-2.5 rounded-full bg-oxblood text-cream text-[13px] font-medium hover:bg-oxblood/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting
                ? 'Deleting…'
                : deleteImmediate
                  ? 'Hard-delete now'
                  : 'Schedule deletion'}
            </button>
          </div>
        </div>
      ) : isSoftDeleted ? (
        <div className="flex gap-2">
          <button
            onClick={handleCancelDeletion}
            disabled={cancelling || !onCancelDeletion}
            className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelling ? 'Cancelling…' : 'Cancel deletion'}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete now"
            className="w-10 h-10 rounded-full border border-line text-ink-soft grid place-items-center hover:border-oxblood hover:text-oxblood transition-colors shrink-0"
            title="Delete immediately"
          >
            <TrashIcon />
          </button>
        </div>
      ) : isDormancyWarned ? (
        <div className="flex gap-2">
          <button
            onClick={handleCancelDormancy}
            disabled={cancellingDormancy || !onCancelDormancy}
            className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancellingDormancy ? 'Cancelling…' : 'Cancel dormancy cleanup'}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete customer"
            className="w-10 h-10 rounded-full border border-line text-ink-soft grid place-items-center hover:border-oxblood hover:text-oxblood transition-colors shrink-0"
          >
            <TrashIcon />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onEditProfile}
            className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors"
          >
            Edit profile
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete customer"
            className="w-10 h-10 rounded-full border border-line text-ink-soft grid place-items-center hover:border-oxblood hover:text-oxblood transition-colors shrink-0"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}
