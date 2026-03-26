import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeMyStyle } from '@/lib/ai';

export async function POST() {
  // Get all messages I sent across all contacts
  const myMessages = await prisma.chatMessage.findMany({
    where: { sender: 'me' },
    orderBy: { timestamp: 'desc' },
    take: 200,
    select: { content: true, timestamp: true },
  });

  if (myMessages.length === 0) {
    return NextResponse.json({ error: 'No messages found to analyze' }, { status: 400 });
  }

  const styleAnalysis = await analyzeMyStyle(myMessages);

  // Upsert user profile
  await prisma.userProfile.upsert({
    where: { id: 'default' },
    create: { id: 'default', name: '', styleAnalysis },
    update: { styleAnalysis },
  });

  return NextResponse.json({ styleAnalysis });
}
