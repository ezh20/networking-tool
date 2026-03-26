import { prisma } from '@/lib/db';
import { MessagesList } from './client';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const messages = await prisma.outreachMessage.findMany({
    orderBy: { createdAt: 'desc' },
    include: { contact: { select: { id: true, name: true, platform: true } } },
  });

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold mb-1">Messages</h2>
      <p className="text-muted text-sm mb-8">Review and manage generated messages</p>
      <MessagesList messages={messages} />
    </div>
  );
}
