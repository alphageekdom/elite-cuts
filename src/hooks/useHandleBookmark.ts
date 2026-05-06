import { useCallback, useState, type MouseEvent } from 'react';
import { toast } from 'sonner';

type BookmarkResponse = { message: string; isBookmarked: boolean };
type BookmarkCheckResponse = { isBookmarked: boolean };

const useHandleBookmark = (
  userId: string | undefined,
  productId: string
) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBookmarkClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) {
      toast.error('You Need To Sign In To Bookmark A Product');
      return;
    }

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
        toast.error('Failed to update bookmark');
      }
    } catch {
      toast.error('Something Went Wrong');
    }
  };

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

export default useHandleBookmark;
