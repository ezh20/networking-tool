import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeContactProfile } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const { contactId } = await req.json();

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: { chatHistory: { orderBy: { timestamp: 'asc' } } },
  });

  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  if (contact.chatHistory.length === 0) {
    return NextResponse.json({ error: 'No chat history to analyze' }, { status: 400 });
  }

  const profileJson = await analyzeContactProfile(
    contact.name,
    contact.chatHistory.map(m => ({
      sender: m.sender,
      content: m.content,
      timestamp: m.timestamp,
    })),
    contact.background || undefined
  );

  await prisma.contact.update({
    where: { id: contactId },
    data: { profileJson },
  });

  return NextResponse.json({ profileJson });
}
