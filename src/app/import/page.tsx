'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';

type ImportType = 'wechat' | 'linkedin_messages' | 'linkedin_profile';

export default function ImportPage() {
  const [importType, setImportType] = useState<ImportType>('wechat');
  const [myName, setMyName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleImport = async () => {
    setLoading(true);
    setResult(null);

    try {
      let content = textInput;
      if (file) {
        content = await file.text();
      }

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: importType, content, myName }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(`Imported ${data.contactsCreated} contacts with ${data.messagesCreated} messages.`);
        setTextInput('');
        setFile(null);
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
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold mb-1">Import</h2>
      <p className="text-muted text-sm mb-8">Upload chat history and profiles</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Import Type</label>
          <div className="flex gap-2">
            {([
              ['wechat', 'WeChat Chats'],
              ['linkedin_messages', 'LinkedIn Messages'],
              ['linkedin_profile', 'LinkedIn Profile'],
            ] as [ImportType, string][]).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setImportType(value)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  importType === value
                    ? 'bg-primary text-white border-primary'
                    : 'border-border hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {importType !== 'linkedin_profile' && (
          <div>
            <label className="block text-sm font-medium mb-2">Your Name (as it appears in chats)</label>
            <input
              type="text"
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
              placeholder="e.g. Eric Zhang"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">
            {importType === 'linkedin_profile' ? 'Profile Data' : 'Chat History'}
          </label>

          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center mb-3">
            <Upload className="mx-auto mb-2 text-muted" size={24} />
            <label className="cursor-pointer text-sm text-accent hover:underline">
              Choose file
              <input
                type="file"
                className="hidden"
                accept=".txt,.csv,.json"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            {file && <p className="text-xs text-muted mt-2">{file.name}</p>}
          </div>

          <p className="text-xs text-muted mb-2 text-center">or paste directly</p>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={
              importType === 'wechat'
                ? 'Paste WeChat chat export here...'
                : importType === 'linkedin_messages'
                ? 'Paste LinkedIn messages CSV...'
                : 'Paste LinkedIn profile data (JSON or text)...'
            }
            rows={8}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-gray-400 resize-y"
          />
        </div>

        <button
          onClick={handleImport}
          disabled={loading || (!file && !textInput)}
          className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-800 transition-colors"
        >
          {loading ? 'Importing...' : 'Import'}
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
