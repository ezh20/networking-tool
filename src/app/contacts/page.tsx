'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Contact {
  id: string;
  name: string;
  platform: string;
  headline: string | null;
  company: string | null;
  tags: string | null;
  _count: { chatHistory: number; outreach: number };
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (platform) params.set('platform', platform);
    if (tagFilter) params.set('tag', tagFilter);

    const res = await fetch(`/api/contacts?${params}`);
    const data = await res.json();
    setContacts(data);
    setLoading(false);
  }, [search, platform, tagFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    fetch('/api/contacts').then(r => r.json()).then((data: Contact[]) => {
      const tags = new Set<string>();
      data.forEach(c => {
        if (c.tags) c.tags.split(',').forEach(t => tags.add(t.trim()));
      });
      setAllTags(Array.from(tags).sort());
    });
  }, []);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
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

      <div className="space-y-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, company, or headline..."
          className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-gray-400"
        />
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1">
            {['', 'wechat', 'linkedin'].map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors capitalize ${
                  platform === p ? 'bg-primary text-white border-primary' : 'border-border hover:border-gray-300'
                }`}
              >
                {p || 'All platforms'}
              </button>
            ))}
          </div>
          {allTags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setTagFilter('')}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                  !tagFilter ? 'bg-blue-600 text-white border-blue-600' : 'border-border hover:border-gray-300'
                }`}
              >
                All tags
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setTagFilter(tagFilter === t ? '' : t)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                    tagFilter === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted text-sm">Loading...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 text-muted text-sm">
          {search || platform || tagFilter ? (
            'No contacts match your filters.'
          ) : (
            <>No contacts yet. <Link href="/import" className="text-accent hover:underline">Import some chats</Link> to get started.</>
          )}
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
