import { useState } from 'react';
import { toast } from 'react-toastify';

const useHandleBookmark = (userId, productId) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleBookmarkClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) {
      toast.error('You Need To Sign In To Bookmark A Product');
      return;
    }

    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });

      if (res.status === 200) {
        const data = await res.json();
        toast.success(data.message);
        setIsBookmarked(data.isBookmarked);
      } else {
        toast.error('Failed to update bookmark');
      }
    } catch (error) {
      console.log(error);
      toast.error('Something Went Wrong');
    }
  };

  const checkBookmarkStatus = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/bookmarks/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });

      if (res.status === 200) {
        const data = await res.json();
        setIsBookmarked(data.isBookmarked);
      } else {
        console.error('Failed to fetch bookmark status');
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    isBookmarked,
    loading,
    handleBookmarkClick,
    checkBookmarkStatus,
  };
};

export default useHandleBookmark;
