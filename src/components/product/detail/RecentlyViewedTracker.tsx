'use client';

import { useEffect } from 'react';

import { recordRecentlyViewed } from '@/lib/products/recently-viewed';

type Props = { slug: string };

/**
 * Records a product view for the profile's "Recently viewed" panel.
 *
 * Renders nothing — it exists so the server-rendered product page can log the
 * visit without becoming a client component itself. Writing in an effect (not
 * during render) keeps this out of the way of the page's own work, and means
 * a bot or prefetch that never commits the render doesn't leave a trace.
 */
export default function RecentlyViewedTracker({ slug }: Props) {
  useEffect(() => {
    recordRecentlyViewed(slug);
  }, [slug]);

  return null;
}
