import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const profile = await prisma.userProfile.findUnique({ where: { id: 'default' } });
  return NextResponse.json(profile);
}

export async function PUT(req: NextRequest) {
  const { name, bio } = await req.json();

  const profile = await prisma.userProfile.upsert({
    where: { id: 'default' },
    create: { id: 'default', name: name || '', bio },
    update: { name, bio },
  });

  return NextResponse.json(profile);
}
