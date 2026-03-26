import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateMessage } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const { contactId, type, metadata } = await req.json();

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  const userProfile = await prisma.userProfile.findUnique({ where: { id: 'default' } });

  const message = await generateMessage({
    type,
    contactProfile: contact.profileJson || `Name: ${contact.name}, Platform: ${contact.platform}${contact.headline ? `, Headline: ${contact.headline}` : ''}${contact.background ? `, Background: ${contact.background}` : ''}`,
    userStyle: userProfile?.styleAnalysis || '{"tone": "friendly and professional", "formality": "casual-professional"}',
    contactName: contact.name,
    metadata,
  });

  const outreach = await prisma.outreachMessage.create({
    data: {
      contactId,
      type,
      content: message,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  return NextResponse.json(outreach);
}
