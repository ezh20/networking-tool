'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSendOptions } from '@/lib/send';

interface Message {
  id: string;
  type: string;
  content: string;
  status: string;
  createdAt: Date;
  contact: { id: string; name: string; platform: string; email: string | null; phone: string | null; linkedinUrl: string | null };
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
  const [content, setContent] = useState(msg.content);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tweakInput, setTweakInput] = useState('');
  const [tweaking, setTweaking] = useState(false);
  const [showTweak, setShowTweak] = useState(false);
  const [showSend, setShowSend] = useState(false);

  const sendOptions = getSendOptions(msg.contact, content);

  const updateStatus = async (newStatus: string) => {
    await fetch(`/api/messages/${msg.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatus(newStatus);
  };

  const saveContent = async () => {
    setSaving(true);
    await fetch(`/api/messages/${msg.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setSaving(false);
    setEditing(false);
  };

  const tweak = async () => {
    if (!tweakInput.trim()) return;
    setTweaking(true);
    const res = await fetch(`/api/messages/${msg.id}/tweak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction: tweakInput }),
    });
    const data = await res.json();
    if (res.ok) {
      setContent(data.content);
      setTweakInput('');
      setShowTweak(false);
    }
    setTweaking(false);
  };

  const handleSend = async (url: string) => {
    if (url === '__copy__') {
      navigator.clipboard.writeText(content);
    } else {
      window.open(url, '_blank');
    }
    await updateStatus('sent');
    setShowSend(false);
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
      {editing ? (
        <div className="mb-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-gray-400 resize-y"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={saveContent} disabled={saving} className="px-3 py-1 bg-primary text-white rounded text-xs hover:bg-gray-800 disabled:opacity-40">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setContent(content); setEditing(false); }} className="px-3 py-1 border border-border rounded text-xs hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap mb-3">{content}</p>
      )}
      {showTweak && (
        <div className="flex gap-2 mb-3">
          <input
            value={tweakInput}
            onChange={(e) => setTweakInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && tweak()}
            placeholder="e.g. make it shorter, translate to Chinese..."
            className="flex-1 px-3 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:border-gray-400"
          />
          <button onClick={tweak} disabled={tweaking || !tweakInput.trim()} className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:opacity-40">
            {tweaking ? 'Tweaking...' : 'Go'}
          </button>
          <button onClick={() => { setShowTweak(false); setTweakInput(''); }} className="px-3 py-1 border border-border rounded text-xs hover:bg-gray-50">
            Cancel
          </button>
        </div>
      )}
      {showSend && (
        <div className="flex flex-wrap gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
          {sendOptions.length > 0 ? (
            sendOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleSend(opt.url)}
                className="px-3 py-1 bg-accent text-white rounded text-xs hover:bg-blue-700"
              >
                {opt.label}
              </button>
            ))
          ) : (
            <span className="text-xs text-muted">No contact info. Add email, phone, or LinkedIn URL on the contact page.</span>
          )}
          <button onClick={() => { updateStatus('sent'); setShowSend(false); }} className="px-3 py-1 border border-border rounded text-xs hover:bg-gray-50">
            Just mark sent
          </button>
          <button onClick={() => setShowSend(false)} className="px-3 py-1 border border-border rounded text-xs hover:bg-gray-50">
            Cancel
          </button>
        </div>
      )}
      <div className="flex gap-2">
        {status === 'draft' && (
          <button onClick={() => updateStatus('approved')} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
            Approve
          </button>
        )}
        {status === 'approved' && !showSend && (
          <button onClick={() => setShowSend(true)} className="px-3 py-1 bg-accent text-white rounded text-xs hover:bg-blue-700">
            Send...
          </button>
        )}
        {status !== 'sent' && !editing && (
          <>
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1 border border-border rounded text-xs hover:bg-gray-50"
            >
              Edit
            </button>
            {!showTweak && (
              <button
                onClick={() => setShowTweak(true)}
                className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs hover:bg-purple-100"
              >
                Tweak with AI
              </button>
            )}
          </>
        )}
        <button
          onClick={() => navigator.clipboard.writeText(content)}
          className="px-3 py-1 border border-border rounded text-xs hover:bg-gray-50"
        >
          Copy
        </button>
      </div>
    </div>
  );
}
