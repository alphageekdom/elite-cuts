'use client';
import { useCallback, useRef, useState, type MouseEvent } from 'react';
import { toast } from 'sonner';

type BookmarkResponse = { message: string; isBookmarked: boolean };
type BookmarkCheckResponse = { isBookmarked: boolean };

export const useHandleBookmark = (
  userId: string | undefined,
  productId: string
) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const inflightRef = useRef(false);

  const handleBookmarkClick = useCallback(async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) {
      toast.error('Sign in to save cuts');
      return;
    }
    if (inflightRef.current) return;
    inflightRef.current = true;

    try {
      const res = await fetch('/api/saved-cuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      if (res.status === 200) {
        const data = (await res.json()) as BookmarkResponse;
        toast.success(data.message);
        setIsBookmarked(data.isBookmarked);
      } else {
        toast.error('Could not update your saved cuts');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      inflightRef.current = false;
    }
  }, [userId, productId]);

  // useCallback so consumers can list it in useEffect deps without tripping
  // exhaustive-deps when productId/userId are stable.
  const checkBookmarkStatus = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const res = await fetch('/api/saved-cuts/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      if (res.status === 200) {
        const data = (await res.json()) as BookmarkCheckResponse;
        setIsBookmarked(data.isBookmarked);
      }
    } catch (err) {
      // try/finally without this catch turned an offline status check into an
      // unhandled promise rejection. Failing silent is right — the heart just
      // stays unfilled and the click path reports its own errors.
      console.error('[useHandleBookmark] status check failed', err);
    } finally {
      setLoading(false);
    }
  }, [userId, productId]);

  return {
    isBookmarked,
    loading,
    handleBookmarkClick,
    checkBookmarkStatus,
  };
};
