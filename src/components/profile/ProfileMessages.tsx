'use client';
import { useState } from 'react';
import { toast } from 'sonner';

import NewMessageModal from './NewMessageModal';
import { AVATAR_COLORS, MEMBER_AVATAR_COLORS } from '@/lib/admin/constants';
import { avatarColorForId, getInitials } from '@/lib/format';
import type { MessageStatus } from '@/models/Message';
import { useDismissOnEscape } from '@/hooks/useDismissOnEscape';

export type SerializedMessage = {
  _id: string;
  subject: string;
  body: string;
  orderRef?: string;
  status: MessageStatus;
  createdAt: string;
};

const ADMIN_AVATAR_COLOR = 'bg-linear-to-br from-ink to-oxblood-deep text-camel';
const SUBJECT_MAX = 120;
const BODY_MAX = 2000;
const CANCEL_BUTTON_CLASS =
  'text-muted hover:text-ink focus-visible:outline-none focus-visible:text-ink transition-colors disabled:opacity-50';
const PRIMARY_CTA_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2 focus-visible:ring-offset-cream';

type Props = {
  messages: SerializedMessage[];
  userId: string;
  name: string;
  rewardPoints: number;
  isAdmin: boolean;
};

function statusPill(status: MessageStatus) {
  return status === 'open'
    ? 'bg-camel/15 text-camel-deep'
    : 'bg-cream-deep text-muted';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ProfileMessages({ messages, userId, name, rewardPoints, isAdmin }: Props) {
  const isMember = rewardPoints >= 250;
  const avatarColor = isAdmin
    ? ADMIN_AVATAR_COLOR
    : avatarColorForId(userId, isMember ? MEMBER_AVATAR_COLORS : AVATAR_COLORS);
  const [modalOpen, setModalOpen] = useState(false);
  const [items, setItems] = useState<SerializedMessage[]>(messages);

  // Sync local state when the parent re-fetches (e.g. NewMessageModal calls
  // router.refresh() after a successful POST) — the server is the source of
  // truth and optimistic edits/deletes are merged-in until the next prop tick.
  const [prevMessages, setPrevMessages] = useState(messages);
  if (prevMessages !== messages) {
    setPrevMessages(messages);
    setItems(messages);
  }

  // Single-row edit at a time keeps the form state simple — one subject /
  // body pair, lifted into the parent so cancel / save can clear it cleanly.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function startEdit(msg: SerializedMessage) {
    setConfirmingDeleteId(null);
    setEditingId(msg._id);
    setEditSubject(msg.subject);
    setEditBody(msg.body);
  }

  function cancelEdit() {
    const returnFocusId = editingId;
    setEditingId(null);
    setEditSubject('');
    setEditBody('');
    // The row's Edit button unmounts while the inline form is open, so there's
    // nothing to restore by reference. Once this state change re-renders the
    // button, hand focus back to it (by row id) rather than dropping the
    // keyboard user to <body>. Covers cancel, Escape, and post-save alike.
    if (returnFocusId) {
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[data-edit-trigger="${returnFocusId}"]`)
          ?.focus();
      });
    }
  }

  // Escape cancels whichever inline interaction is open (edit form or
  // delete-confirm) — matches the NewMessageModal's Escape-closes behavior
  // so the keyboard contract stays consistent across the messages tab.
  useDismissOnEscape(
    editingId !== null || confirmingDeleteId !== null,
    () => {
      if (editingId !== null) cancelEdit();
      if (confirmingDeleteId !== null) setConfirmingDeleteId(null);
    },
  );

  async function saveEdit(id: string) {
    const subject = editSubject.trim();
    const body = editBody.trim();
    if (!subject || !body) {
      toast.error('Subject and message are required');
      return;
    }
    setPendingId(id);
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.message ?? 'Failed to update message');
        return;
      }
      setItems((prev) =>
        prev.map((m) => (m._id === id ? { ...m, subject, body } : m)),
      );
      cancelEdit();
      toast.success('Message updated');
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setPendingId(null);
    }
  }

  async function doDelete(id: string) {
    setPendingId(id);
    try {
      const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.message ?? 'Failed to delete message');
        return;
      }
      setItems((prev) => prev.filter((m) => m._id !== id));
      setConfirmingDeleteId(null);
      if (editingId === id) cancelEdit();
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <section>
        <div className="flex items-end justify-between mb-7 gap-5">
          <h2 className="font-display text-[28px] font-normal tracking-tight leading-tight">
            Your <em className="italic text-oxblood">messages</em>
            {items.length > 0 && (
              <span className="ml-3 font-sans text-[15px] font-normal text-muted align-middle">
                ({items.length})
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={`inline-flex items-center gap-2 text-[13px] font-medium bg-ink text-cream px-4 py-2 rounded-full hover:bg-oxblood transition-colors whitespace-nowrap shrink-0 ${PRIMARY_CTA_FOCUS}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New inquiry
          </button>
        </div>

        {items.length === 0 ? (
          <div className="bg-paper border border-dashed border-line rounded p-14 text-center">
            <div className="w-14 h-14 rounded-full bg-cream-deep text-ink-soft flex items-center justify-center mx-auto mb-5" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <h3 className="font-display font-medium text-[22px] tracking-tight mb-2">No messages yet</h3>
            <p className="text-muted text-sm mb-6 max-w-[32ch] mx-auto">
              Have a question or need help with an order? We&apos;re here.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={`inline-flex items-center gap-2 bg-ink text-cream text-[13px] font-medium tracking-[0.04em] px-5 py-3 rounded-full hover:bg-oxblood transition-colors ${PRIMARY_CTA_FOCUS}`}
            >
              Send a message
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((msg) => {
              const isEditing = editingId === msg._id;
              const isConfirmingDelete = confirmingDeleteId === msg._id;
              const isPending = pendingId === msg._id;
              const canEdit = msg.status === 'open';
              const editDirty =
                isEditing &&
                (editSubject.trim() !== msg.subject ||
                  editBody.trim() !== msg.body);
              const editValid =
                isEditing &&
                editSubject.trim().length > 0 &&
                editBody.trim().length > 0;

              return (
                <div
                  key={msg._id}
                  className="bg-paper border border-line-soft rounded px-5 py-4"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-medium text-[13px] tracking-tight shrink-0 mt-0.5 select-none ${avatarColor}`}>
                      {getInitials(name)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {msg.orderRef && (
                          <span className="font-mono text-[11px] text-ink-soft bg-cream-deep px-2 py-0.5 rounded">
                            #{msg.orderRef}
                          </span>
                        )}
                        <span className="text-[11px] tracking-[0.14em] uppercase text-muted">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                      {isEditing ? (
                        <div className="space-y-3 mt-2">
                          <div>
                            <label
                              htmlFor="edit-subject"
                              className="block text-[11px] font-medium text-ink-soft tracking-[0.06em] uppercase mb-1"
                            >
                              Subject
                            </label>
                            <input
                              id="edit-subject"
                              type="text"
                              value={editSubject}
                              onChange={(e) => setEditSubject(e.target.value.slice(0, SUBJECT_MAX))}
                              disabled={isPending}
                              className="w-full bg-cream border border-line-soft rounded-lg px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-ink transition-colors disabled:opacity-60"
                            />
                            <div className="text-right text-[11px] text-muted mt-0.5">
                              {editSubject.length}/{SUBJECT_MAX}
                            </div>
                          </div>
                          <div>
                            <label
                              htmlFor="edit-body"
                              className="block text-[11px] font-medium text-ink-soft tracking-[0.06em] uppercase mb-1"
                            >
                              Message
                            </label>
                            <textarea
                              id="edit-body"
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value.slice(0, BODY_MAX))}
                              disabled={isPending}
                              rows={5}
                              className="w-full bg-cream border border-line-soft rounded-lg px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-ink transition-colors resize-none disabled:opacity-60"
                            />
                            <div className="text-right text-[11px] text-muted -mt-0.5">
                              {editBody.length}/{BODY_MAX}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-display font-medium text-[17px] tracking-tight truncate">
                            {msg.subject}
                          </p>
                          <p className="text-[13px] text-muted mt-0.5 line-clamp-2">{msg.body}</p>
                        </>
                      )}
                    </div>

                    {/* Status (hidden while editing to free horizontal space) */}
                    {!isEditing && (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] whitespace-nowrap shrink-0 mt-0.5 ${statusPill(msg.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                        {msg.status === 'open' ? 'Open' : 'Closed'}
                      </span>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="mt-3 pt-3 border-t border-line-soft flex items-center justify-end gap-3 text-[12px]">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={isPending}
                          className={CANCEL_BUTTON_CLASS}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(msg._id)}
                          disabled={isPending || !editDirty || !editValid}
                          className="font-medium text-ink hover:text-oxblood focus-visible:outline-none focus-visible:text-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPending ? 'Saving…' : 'Save'}
                        </button>
                      </>
                    ) : isConfirmingDelete ? (
                      <>
                        <span className="text-muted mr-auto">Delete this message?</span>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(null)}
                          disabled={isPending}
                          className={CANCEL_BUTTON_CLASS}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => doDelete(msg._id)}
                          disabled={isPending}
                          className="font-medium text-oxblood hover:text-oxblood-deep focus-visible:outline-none focus-visible:text-oxblood-deep transition-colors disabled:opacity-50"
                        >
                          {isPending ? 'Deleting…' : 'Delete'}
                        </button>
                      </>
                    ) : (
                      <>
                        {canEdit && (
                          <button
                            type="button"
                            data-edit-trigger={msg._id}
                            onClick={() => startEdit(msg)}
                            className="text-muted hover:text-ink focus-visible:outline-none focus-visible:text-ink transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            cancelEdit();
                            setConfirmingDeleteId(msg._id);
                          }}
                          className="text-muted hover:text-oxblood focus-visible:outline-none focus-visible:text-oxblood transition-colors"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <NewMessageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
