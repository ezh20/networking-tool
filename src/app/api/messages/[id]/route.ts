import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();

  const data: Record<string, unknown> = { status };
  if (status === 'sent') {
    data.sentAt = new Date();
  }

  const message = await prisma.outreachMessage.update({
    where: { id },
    data,
  });

  return NextResponse.json(message);
}
