import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const contacts = await prisma.contact.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      platform: true,
      headline: true,
      company: true,
      profileJson: true,
    },
  });
  return NextResponse.json(contacts);
}
