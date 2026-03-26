import { prisma } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const contacts = await prisma.contact.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { chatHistory: true, outreach: true } },
    },
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Contacts</h2>
          <p className="text-muted text-sm">{contacts.length} contacts</p>
        </div>
        <Link
          href="/import"
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
        >
          Import
        </Link>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-16 text-muted text-sm">
          No contacts yet. <Link href="/import" className="text-accent hover:underline">Import some chats</Link> to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="flex items-center justify-between bg-surface border border-border rounded-xl p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-muted">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{contact.name}</p>
                  <p className="text-xs text-muted">
                    {contact.headline || contact.platform}
                    {contact.company ? ` at ${contact.company}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span>{contact._count.chatHistory} messages</span>
                <span className="px-2 py-0.5 rounded-full bg-gray-100 capitalize">{contact.platform}</span>
                {contact.tags && (
                  <div className="flex gap-1">
                    {contact.tags.split(',').slice(0, 2).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
