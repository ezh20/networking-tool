import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const contact = await prisma.contact.update({
    where: { id },
    data: {
      background: body.background,
      tags: body.tags,
    },
  });
  return NextResponse.json(contact);
}
