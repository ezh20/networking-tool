import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ContactDetail } from './client';

export const dynamic = 'force-dynamic';

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      chatHistory: { orderBy: { timestamp: 'desc' }, take: 50 },
      outreach: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  if (!contact) notFound();

  return <ContactDetail contact={contact} />;
}
