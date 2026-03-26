'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [styleAnalysis, setStyleAnalysis] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [cliStatus, setCliStatus] = useState<{ available: boolean; version: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(data => {
      if (data) {
        setName(data.name || '');
        setBio(data.bio || '');
        setStyleAnalysis(data.styleAnalysis);
      }
    });
    fetch('/api/settings').then(r => r.json()).then(data => {
      setCliStatus({ available: data.cliAvailable, version: data.version });
    });
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, bio }),
    });
    setSaving(false);
  };

  const analyzeStyle = async () => {
    setAnalyzing(true);
    const res = await fetch('/api/analyze/style', { method: 'POST' });
    const data = await res.json();
    setStyleAnalysis(data.styleAnalysis);
    setAnalyzing(false);
  };

  const style = styleAnalysis ? (() => {
    try { return JSON.parse(styleAnalysis); } catch { return null; }
  })() : null;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold mb-1">Settings</h2>
      <p className="text-muted text-sm mb-8">Configure your profile</p>

      <div className="space-y-8">
        {/* Claude CLI Status */}
        <section className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium mb-3">Claude CLI</h3>
          {cliStatus === null ? (
            <p className="text-xs text-muted">Checking...</p>
          ) : cliStatus.available ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm">Connected</span>
              <span className="text-xs text-muted ml-2">v{cliStatus.version}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm text-red-700">Not found. Install Claude Code and sign in with your Max subscription.</span>
            </div>
          )}
          <p className="text-xs text-muted mt-2">AI features use your Claude Max subscription via the Claude CLI. No API key needed.</p>
        </section>

        {/* My Profile */}
        <section className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium mb-3">My Profile</h3>
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-gray-400"
            />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief bio / what you do"
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-gray-400 resize-y"
            />
            <button
              onClick={saveProfile}
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </section>

        {/* Writing Style */}
        <section className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">My Writing Style</h3>
            <button
              onClick={analyzeStyle}
              disabled={analyzing}
              className="px-3 py-1 bg-accent text-white rounded-lg text-xs hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
              {analyzing ? 'Analyzing...' : style ? 'Re-analyze' : 'Analyze from Chats'}
            </button>
          </div>
          {style ? (
            <div className="space-y-2 text-sm">
              <div><span className="text-xs text-muted">Tone:</span> <span>{style.tone}</span></div>
              <div><span className="text-xs text-muted">Formality:</span> <span>{style.formality}</span></div>
              <div><span className="text-xs text-muted">Emoji Usage:</span> <span>{style.emojiUsage}</span></div>
              <div><span className="text-xs text-muted">Avg Length:</span> <span>{style.avgLength}</span></div>
              <div><span className="text-xs text-muted">Humor:</span> <span>{style.humor ? 'Yes' : 'No'}</span></div>
              {style.patterns && (
                <div>
                  <span className="text-xs text-muted">Patterns:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {style.patterns.map((p: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {style.languages && (
                <div>
                  <span className="text-xs text-muted">Languages:</span>
                  <span className="ml-1">{style.languages.join(', ')}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted">Import some chats first, then click Analyze to learn your writing style.</p>
          )}
        </section>
      </div>
    </div>
  );
}
