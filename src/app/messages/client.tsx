'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Message {
  id: string;
  type: string;
  content: string;
  status: string;
  createdAt: Date;
  contact: { id: string; name: string; platform: string };
}

export function MessagesList({ messages }: { messages: Message[] }) {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? messages : messages.filter(m => m.status === filter);

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {['all', 'draft', 'approved', 'sent'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors capitalize ${
              filter === f ? 'bg-primary text-white border-primary' : 'border-border hover:border-gray-300'
            }`}
          >
            {f} ({f === 'all' ? messages.length : messages.filter(m => m.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted text-center py-12">No messages yet. Generate some from a contact page or campaign.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((msg) => (
            <MessageCard key={msg.id} msg={msg} />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageCard({ msg }: { msg: Message }) {
  const [status, setStatus] = useState(msg.status);

  const updateStatus = async (newStatus: string) => {
    await fetch(`/api/messages/${msg.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatus(newStatus);
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Link href={`/contacts/${msg.contact.id}`} className="text-sm font-medium hover:underline">
            {msg.contact.name}
          </Link>
          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full capitalize">{msg.type.replace('_', ' ')}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          status === 'approved' ? 'bg-green-50 text-green-700' :
          status === 'sent' ? 'bg-blue-50 text-blue-700' :
          'bg-yellow-50 text-yellow-700'
        }`}>
          {status}
        </span>
      </div>
      <p className="text-sm whitespace-pre-wrap mb-3">{msg.content}</p>
      <div className="flex gap-2">
        {status === 'draft' && (
          <button onClick={() => updateStatus('approved')} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
            Approve
          </button>
        )}
        {status === 'approved' && (
          <button onClick={() => updateStatus('sent')} className="px-3 py-1 bg-accent text-white rounded text-xs hover:bg-blue-700">
            Mark Sent
          </button>
        )}
        <button
          onClick={() => navigator.clipboard.writeText(msg.content)}
          className="px-3 py-1 border border-border rounded text-xs hover:bg-gray-50"
        >
          Copy
        </button>
      </div>
    </div>
  );
}
