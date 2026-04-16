'use client';

import { useState, useRef } from 'react';
import { AnalyzeResponse } from '@/types/lp';

interface Props {
  onAnalyzed: (result: AnalyzeResponse, sourceType: string) => void;
}

type InputMode = 'url' | 'html' | 'image';

export default function LpUploader({ onAnalyzed }: Props) {
  const [mode, setMode] = useState<InputMode>('url');
  const [url, setUrl] = useState('');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function analyze(formData?: FormData) {
    setLoading(true);
    setError('');
    try {
      let res: Response;
      if (formData) {
        res = await fetch('/api/analyze', { method: 'POST', body: formData });
      } else {
        const body = mode === 'url' ? { url } : { html };
        res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'エラーが発生しました');
      onAnalyzed(data as AnalyzeResponse, mode);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  function handleFile(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    analyze(fd);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const tabs: { key: InputMode; label: string; icon: string }[] = [
    { key: 'url', label: 'URLから取得', icon: '🌐' },
    { key: 'html', label: 'HTMLを貼り付け', icon: '</>' },
    { key: 'image', label: '画像/スクリーンショット', icon: '🖼️' },
  ];

  return (
    <div className="w-full max-w-2xl">
      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              mode === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="mr-1">{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      {mode === 'url' && (
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/landing-page"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === 'Enter' && analyze()}
          />
          <button
            onClick={() => analyze()}
            disabled={loading || !url.trim()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '解析中...' : '解析'}
          </button>
        </div>
      )}

      {mode === 'html' && (
        <div className="space-y-3">
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="LPのHTMLをここに貼り付けてください..."
            rows={8}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
          <button
            onClick={() => analyze()}
            disabled={loading || !html.trim()}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '解析中...' : 'HTMLを解析してテンプレート化'}
          </button>
        </div>
      )}

      {mode === 'image' && (
        <div className="space-y-3">
          <div
            onClick={() => fileRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
            }`}
          >
            <div className="text-4xl mb-2">🖼️</div>
            <p className="text-sm text-gray-600 font-medium">
              クリックまたはドラッグ&ドロップで画像をアップロード
            </p>
            <p className="text-xs text-gray-400 mt-1">
              JPEG, PNG, GIF, WebP 対応
            </p>
            {loading && (
              <p className="text-sm text-indigo-600 mt-3 font-medium">
                画像を解析中... (しばらくお待ちください)
              </p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
