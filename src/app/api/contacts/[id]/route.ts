import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  const allowedFields = ['background', 'tags', 'email', 'phone', 'linkedinUrl', 'name', 'headline', 'company', 'location'];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }
  const contact = await prisma.contact.update({
    where: { id },
    data,
  });
  return NextResponse.json(contact);
}
