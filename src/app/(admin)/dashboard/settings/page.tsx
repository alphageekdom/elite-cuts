import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import SettingsClient from '@/components/admin/settings/SettingsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Settings · EliteCuts Admin',
};

export default async function AdminSettingsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  return <SettingsClient />;
}
