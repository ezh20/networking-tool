'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface Contact {
  id: string;
  name: string;
  platform: string;
  profileJson: string | null;
}

export function CampaignsClient() {
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [type, setType] = useState(searchParams.get('type') || 'holiday');
  const [holiday, setHoliday] = useState('');
  const [goal, setGoal] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/contacts').then(r => r.json()).then(setContacts);
  }, []);

  const toggleContact = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
  };

  const runCampaign = async () => {
    if (selectedIds.size === 0) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/messages/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: Array.from(selectedIds),
          type,
          metadata: {
            holiday: holiday || undefined,
            schedulingGoal: goal || undefined,
            outreachGoal: goal || undefined,
            customInstructions: instructions || undefined,
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(`Generated ${data.count} messages. Review them in Messages.`);
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold mb-1">Campaign</h2>
      <p className="text-muted text-sm mb-8">Generate messages for multiple contacts at once</p>

      <div className="space-y-6">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Message Type</label>
          <div className="flex gap-2">
            {['holiday', 'scheduling', 'cold_outreach', 'followup'].map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors capitalize ${
                  type === t ? 'bg-primary text-white border-primary' : 'border-border hover:border-gray-300'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Config */}
        {type === 'holiday' && (
          <div>
            <label className="block text-sm font-medium mb-2">Holiday</label>
            <input
              value={holiday}
              onChange={(e) => setHoliday(e.target.value)}
              placeholder="e.g. Christmas, Lunar New Year, Thanksgiving"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
        )}

        {(type === 'scheduling' || type === 'cold_outreach') && (
          <div>
            <label className="block text-sm font-medium mb-2">Goal</label>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={type === 'scheduling' ? 'e.g. 30-min coffee chat, dinner catch-up' : 'e.g. explore partnership, get intro to their CTO'}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Additional Instructions (optional)</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Any extra context or tone guidance..."
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-gray-400 resize-y"
          />
        </div>

        {/* Contact Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Select Contacts ({selectedIds.size}/{contacts.length})</label>
            <button onClick={selectAll} className="text-xs text-accent hover:underline">
              {selectedIds.size === contacts.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="border border-border rounded-xl max-h-64 overflow-y-auto divide-y divide-border">
            {contacts.length === 0 ? (
              <p className="text-sm text-muted p-4 text-center">No contacts. Import some first.</p>
            ) : (
              contacts.map((c) => (
                <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleContact(c.id)}
                    className="rounded"
                  />
                  <div>
                    <p className="text-sm">{c.name}</p>
                    <p className="text-xs text-muted capitalize">{c.platform}</p>
                  </div>
                  {!c.profileJson && (
                    <span className="ml-auto text-xs text-yellow-600">No profile</span>
                  )}
                </label>
              ))
            )}
          </div>
        </div>

        <button
          onClick={runCampaign}
          disabled={loading || selectedIds.size === 0}
          className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {loading ? 'Generating...' : `Generate ${selectedIds.size} Messages`}
        </button>

        {result && (
          <div className={`p-3 rounded-lg text-sm ${result.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
