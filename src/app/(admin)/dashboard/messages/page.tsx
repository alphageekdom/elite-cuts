import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import connectDB from '@/config/database';
import MessageModel from '@/models/Message';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MessagesClient, { type MessageRow } from '@/components/admin/messages/MessagesClient';
import { buildMessageRow, type PopulatedUser } from '@/lib/admin/messages';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Messages · Admin' };

export default async function AdminMessagesPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.user?.isAdmin) redirect('/login');

  await connectDB();

  const [rawMessages, openCount] = await Promise.all([
    MessageModel.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .populate<{ user: PopulatedUser }>('user', 'name email')
      .lean(),
    MessageModel.countDocuments({ status: 'open' }),
  ]);

  const messages: MessageRow[] = rawMessages.map(buildMessageRow);

  return (
    <>
      <AdminPageHeader
        eyebrow="Support"
        breadcrumb="Messages"
        title="Customer"
        titleAccent="messages"
        subtitle={`${messages.length} ${messages.length === 1 ? 'message' : 'messages'} · ${openCount} open`}
      />
      <MessagesClient messages={messages} />
    </>
  );
}
