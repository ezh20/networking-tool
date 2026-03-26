import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q')?.trim();
  const platform = searchParams.get('platform');
  const tag = searchParams.get('tag')?.trim();

  const where: Prisma.ContactWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { headline: { contains: q } },
      { company: { contains: q } },
    ];
  }

  if (platform) {
    where.platform = platform;
  }

  if (tag) {
    where.tags = { contains: tag };
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { chatHistory: true, outreach: true } },
    },
  });
  return NextResponse.json(contacts);
}
