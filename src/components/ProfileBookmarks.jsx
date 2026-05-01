'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-toastify';

const ProfileBookmarks = ({ bookmarks: initialBookmarks }) => {
  const [bookmarks, setBookmarks] = useState(initialBookmarks);

  const removeBookmark = async (productId) => {
    try {
      const response = await fetch(`/api/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove the bookmark');
      }

      toast.success('Bookmark Removed');

      const updatedBookmarks = bookmarks.filter(
        (bookmark) => bookmark._id !== productId
      );

      setBookmarks(updatedBookmarks);
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast.error('Failed to remove bookmark');
    }
  };

  const handleRemoveBookmark = (productId) => {
    const confirmed = window.confirm(
      'Are you sure you want to remove this bookmark?'
    );

    if (!confirmed) return;

    removeBookmark(productId);
  };

  return bookmarks.map((bookmark) => (
    <div key={bookmark?._id} className='mb-10'>
      <Link href={`/products/${bookmark._id}`} aria-label={bookmark.name}>
        <Image
          className='h-32 w-full rounded-md object-cover'
          src={`/images/products/${bookmark?.images[0]}`}
          alt=''
          width={500}
          height={100}
          priority={true}
        />
      </Link>
      <div className='mt-2'>
        <p className='text-lg font-semibold'>{bookmark.name}</p>
      </div>
      <div className='mt-2'>
        <button
          className='bg-red-700 text-white px-4 py-2 rounded-md'
          onClick={() => handleRemoveBookmark(bookmark._id)}
        >
          Unbookmark
        </button>
      </div>
    </div>
  ));
};

export default ProfileBookmarks;
