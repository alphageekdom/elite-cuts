'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Props = { reviewId: string };

export default function ReviewActions({ reviewId }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        toast.success('Review deleted.');
        router.refresh();
      } else {
        const data = (await res.json()) as { message?: string };
        toast.error(data.message ?? 'Failed to delete review');
        setConfirming(false);
      }
    } catch {
      toast.error('Something went wrong.');
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  };

  if (confirming) {
    return (
      <div className='flex items-center gap-3 text-[12px]'>
        <span className='text-muted'>Delete this review?</span>
        <button
          type='button'
          onClick={handleDelete}
          disabled={deleting}
          className='font-medium text-oxblood hover:underline disabled:opacity-50'
        >
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          type='button'
          onClick={() => setConfirming(false)}
          className='text-muted hover:text-ink'
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type='button'
      onClick={() => setConfirming(true)}
      className='text-[12px] text-muted hover:text-oxblood'
    >
      Delete review
    </button>
  );
}
