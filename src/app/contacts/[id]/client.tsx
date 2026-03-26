'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Contact {
  id: string;
  name: string;
  platform: string;
  platformId: string | null;
  headline: string | null;
  company: string | null;
  location: string | null;
  background: string | null;
  profileJson: string | null;
  tags: string | null;
  chatHistory: { id: string; sender: string; content: string; timestamp: Date }[];
  outreach: { id: string; type: string; content: string; status: string; createdAt: Date }[];
}

export function ContactDetail({ contact }: { contact: Contact }) {
  const router = useRouter();
  const [background, setBackground] = useState(contact.background || '');
  const [tags, setTags] = useState(contact.tags || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [messageType, setMessageType] = useState<string>('holiday');
  const [metadata, setMetadata] = useState('');
  const [saving, setSaving] = useState(false);

  const profile = contact.profileJson ? (() => {
    try { return JSON.parse(contact.profileJson); } catch { return null; }
  })() : null;

  const saveBackground = async () => {
    setSaving(true);
    await fetch(`/api/contacts/${contact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ background, tags }),
    });
    setSaving(false);
  };

  const analyzeProfile = async () => {
    setAnalyzing(true);
    await fetch(`/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: contact.id }),
    });
    setAnalyzing(false);
    router.refresh();
  };

  const generateMessage = async () => {
    setGenerating(true);
    await fetch(`/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId: contact.id,
        type: messageType,
        metadata: metadata ? JSON.parse(metadata) : undefined,
      }),
    });
    setGenerating(false);
    router.refresh();
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold mb-1">{contact.name}</h2>
          <p className="text-muted text-sm">
            {contact.headline || contact.platform}
            {contact.company ? ` at ${contact.company}` : ''}
            {contact.location ? ` \u00b7 ${contact.location}` : ''}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-gray-100 text-xs capitalize">{contact.platform}</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Background */}
          <section className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium mb-3">Background Notes</h3>
            <textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="How do you know this person? Any context..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-gray-400 resize-y mb-2"
            />
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma-separated): friend, tech, investor"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-gray-400 mb-3"
            />
            <button
              onClick={saveBackground}
              disabled={saving}
              className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </section>

          {/* AI Profile */}
          <section className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">AI Profile</h3>
              <button
                onClick={analyzeProfile}
                disabled={analyzing}
                className="px-3 py-1 bg-accent text-white rounded-lg text-xs hover:bg-blue-700 transition-colors disabled:opacity-40"
              >
                {analyzing ? 'Analyzing...' : profile ? 'Re-analyze' : 'Analyze'}
              </button>
            </div>
            {profile ? (
              <div className="space-y-2 text-sm">
                <Field label="Personality" value={profile.personality} />
                <Field label="Communication Style" value={profile.communicationStyle} />
                <Field label="Relationship" value={profile.relationship} />
                <Field label="Best Approach" value={profile.bestApproach} />
                {profile.interests && (
                  <div>
                    <span className="text-xs text-muted">Interests:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.interests.map((i: string) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{i}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted">Click Analyze to generate a profile from chat history.</p>
            )}
          </section>

          {/* Generate Message */}
          <section className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium mb-3">Generate Message</h3>
            <div className="flex gap-2 mb-3">
              {['holiday', 'scheduling', 'cold_outreach', 'followup'].map((t) => (
                <button
                  key={t}
                  onClick={() => setMessageType(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                    messageType === t ? 'bg-primary text-white border-primary' : 'border-border hover:border-gray-300'
                  }`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
            <textarea
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              placeholder='Optional JSON: {"holiday": "Christmas", "customInstructions": "mention our trip"}'
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg text-xs font-mono focus:outline-none focus:border-gray-400 resize-y mb-3"
            />
            <button
              onClick={generateMessage}
              disabled={generating}
              className="w-full py-2 bg-accent text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Generated Messages */}
          {contact.outreach.length > 0 && (
            <section className="bg-surface border border-border rounded-xl p-5">
              <h3 className="text-sm font-medium mb-3">Generated Messages</h3>
              <div className="space-y-3">
                {contact.outreach.map((msg) => (
                  <OutreachCard key={msg.id} msg={msg} />
                ))}
              </div>
            </section>
          )}

          {/* Chat History */}
          <section className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium mb-3">Recent Chat History</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {contact.chatHistory.length === 0 ? (
                <p className="text-xs text-muted">No chat history imported yet.</p>
              ) : (
                contact.chatHistory.map((msg) => (
                  <div key={msg.id} className={`text-xs p-2 rounded-lg ${msg.sender === 'me' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'}`}>
                    <span className="text-muted">{msg.sender === 'me' ? 'You' : contact.name}:</span>{' '}
                    {msg.content}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted">{label}:</span>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function OutreachCard({ msg }: { msg: { id: string; type: string; content: string; status: string; createdAt: Date } }) {
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
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full capitalize">{msg.type.replace('_', ' ')}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          status === 'approved' ? 'bg-green-50 text-green-700' :
          status === 'sent' ? 'bg-blue-50 text-blue-700' :
          'bg-yellow-50 text-yellow-700'
        }`}>
          {status}
        </span>
      </div>
      <p className="text-sm whitespace-pre-wrap mb-2">{msg.content}</p>
      {status === 'draft' && (
        <div className="flex gap-2">
          <button
            onClick={() => updateStatus('approved')}
            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
          >
            Approve
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(msg.content)}
            className="px-3 py-1 border border-border rounded text-xs hover:bg-gray-50"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}
