import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import ScheduleClient from '@/components/admin/schedule/ScheduleClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Schedule · EliteCuts Admin',
};

export default async function AdminSchedulePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }
  return <ScheduleClient />;
}
