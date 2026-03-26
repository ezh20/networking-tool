import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseWeChatExport } from '@/lib/parsers/wechat';
import { parseLinkedInMessages, parseLinkedInProfile } from '@/lib/parsers/linkedin';

export async function POST(req: NextRequest) {
  const { type, content, myName } = await req.json();

  if (!content) {
    return NextResponse.json({ error: 'No content provided' }, { status: 400 });
  }

  if (type === 'linkedin_profile') {
    const profile = parseLinkedInProfile(content);
    const contact = await prisma.contact.upsert({
      where: { platform_platformId: { platform: 'linkedin', platformId: profile.name } },
      create: {
        name: profile.name,
        platform: 'linkedin',
        platformId: profile.name,
        headline: profile.headline,
        company: profile.company,
        location: profile.location,
        background: profile.summary,
      },
      update: {
        headline: profile.headline,
        company: profile.company,
        location: profile.location,
      },
    });
    return NextResponse.json({ contactsCreated: 1, messagesCreated: 0, contactId: contact.id });
  }

  if (!myName) {
    return NextResponse.json({ error: 'Your name is required for chat import' }, { status: 400 });
  }

  let parsed;
  if (type === 'wechat') {
    parsed = parseWeChatExport(content, myName);
  } else if (type === 'linkedin_messages') {
    parsed = parseLinkedInMessages(content, myName);
  } else {
    return NextResponse.json({ error: 'Unknown import type' }, { status: 400 });
  }

  let contactsCreated = 0;
  let messagesCreated = 0;

  for (const chat of parsed) {
    if (!chat.contactName || chat.messages.length === 0) continue;

    const platform = type === 'wechat' ? 'wechat' : 'linkedin';
    const platformId = chat.platformId || chat.contactName;

    const contact = await prisma.contact.upsert({
      where: { platform_platformId: { platform, platformId } },
      create: {
        name: chat.contactName,
        platform,
        platformId,
      },
      update: {
        name: chat.contactName,
      },
    });

    contactsCreated++;

    for (const msg of chat.messages) {
      await prisma.chatMessage.create({
        data: {
          contactId: contact.id,
          sender: msg.sender,
          content: msg.content,
          timestamp: msg.timestamp,
        },
      });
      messagesCreated++;
    }
  }

  return NextResponse.json({ contactsCreated, messagesCreated });
}
