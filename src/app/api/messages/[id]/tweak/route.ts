import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { tweakMessage } from '@/lib/ai';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { instruction } = await req.json();

  if (!instruction) {
    return NextResponse.json({ error: 'Instruction is required' }, { status: 400 });
  }

  const message = await prisma.outreachMessage.findUnique({ where: { id } });
  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  const tweaked = await tweakMessage(message.content, instruction);

  const updated = await prisma.outreachMessage.update({
    where: { id },
    data: { content: tweaked },
  });

  return NextResponse.json(updated);
}
