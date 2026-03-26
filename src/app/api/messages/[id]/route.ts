import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status, content } = await req.json();

  const data: Record<string, unknown> = {};
  if (status !== undefined) {
    data.status = status;
    if (status === 'sent') {
      data.sentAt = new Date();
    }
  }
  if (content !== undefined) {
    data.content = content;
  }

  const message = await prisma.outreachMessage.update({
    where: { id },
    data,
  });

  return NextResponse.json(message);
}
