import { prisma } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [contactCount, messageCount, draftCount] = await Promise.all([
    prisma.contact.count(),
    prisma.chatMessage.count(),
    prisma.outreachMessage.count({ where: { status: 'draft' } }),
  ]);

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold mb-1">Dashboard</h2>
      <p className="text-muted text-sm mb-8">Your networking overview</p>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <StatCard label="Contacts" value={contactCount} href="/contacts" />
        <StatCard label="Chat Messages" value={messageCount} />
        <StatCard label="Drafts to Review" value={draftCount} href="/messages" />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted uppercase tracking-wide">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <ActionCard
            title="Import Chats"
            description="Upload WeChat or LinkedIn chat history"
            href="/import"
          />
          <ActionCard
            title="New Campaign"
            description="Generate messages for multiple contacts"
            href="/campaigns"
          />
          <ActionCard
            title="Cold Outreach"
            description="Craft a compelling message to someone new"
            href="/campaigns?type=cold_outreach"
          />
          <ActionCard
            title="Holiday Greetings"
            description="Send personalized holiday messages"
            href="/campaigns?type=holiday"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-muted mt-1">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function ActionCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link href={href} className="block bg-surface border border-border rounded-xl p-4 hover:border-gray-300 transition-colors">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted mt-1">{description}</p>
    </Link>
  );
}
