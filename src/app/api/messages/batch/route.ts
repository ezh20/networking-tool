import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateBatchMessages } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const { contactIds, type, metadata } = await req.json();

  if (!contactIds || contactIds.length === 0) {
    return NextResponse.json({ error: 'No contacts selected' }, { status: 400 });
  }

  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds } },
  });

  const userProfile = await prisma.userProfile.findUnique({ where: { id: 'default' } });
  const userStyle = userProfile?.styleAnalysis || '{"tone": "friendly and professional", "formality": "casual-professional"}';

  const contactData = contacts.map(c => ({
    id: c.id,
    name: c.name,
    profile: c.profileJson || `Name: ${c.name}, Platform: ${c.platform}${c.headline ? `, Headline: ${c.headline}` : ''}${c.background ? `, Background: ${c.background}` : ''}`,
  }));

  const results = await generateBatchMessages({
    type,
    contacts: contactData,
    userStyle,
    metadata,
  });

  // Save all generated messages
  const created = await Promise.all(
    results.map(r =>
      prisma.outreachMessage.create({
        data: {
          contactId: r.contactId,
          type,
          content: r.message,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      })
    )
  );

  return NextResponse.json({ count: created.length });
}
