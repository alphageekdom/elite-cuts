import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import UserModel from '@/models/User';
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

  await connectDB();
  const rawAdmins = await UserModel.find({ isAdmin: true }, 'name email').lean();
  const adminUsers = rawAdmins.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
  }));

  return <SettingsClient adminUsers={adminUsers} />;
}
