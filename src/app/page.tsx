'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LpUploader from '@/components/LpUploader';
import { AnalyzeResponse, LPTemplate } from '@/types/lp';
import { v4 as uuidv4 } from 'uuid';
import SectionBadge from '@/components/SectionBadge';

export default function HomePage() {
  const router = useRouter();
  const [analyzed, setAnalyzed] = useState<AnalyzeResponse | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);

  function handleAnalyzed(result: AnalyzeResponse) {
    setAnalyzed(result);
    setTemplateName(result.suggestedName);
  }

  async function saveTemplate() {
    if (!analyzed) return;
    setSaving(true);
    try {
      const payload: Partial<LPTemplate> = {
        name: templateName || analyzed.suggestedName,
        description: analyzed.description,
        sections: analyzed.sections,
        globalStyles: analyzed.globalStyles,
      };
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('保存に失敗しました');
      const template: LPTemplate = await res.json();
      router.push(`/editor/${template.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エラー');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-gray-900">
          LPテンプレートジェネレーター
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          既存のLPを読み込んでテンプレート化し、<br />
          新しいLPを素早く・ビジュアルに作成できます
        </p>
      </div>

      {/* Step 1: Input */}
      {!analyzed && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Step 1: LPを読み込む
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            URL・HTML・スクリーンショット画像のいずれかを入力してください
          </p>
          <div className="flex justify-center">
            <LpUploader onAnalyzed={handleAnalyzed} />
          </div>
        </div>
      )}

      {/* Step 2: Review + Save */}
      {analyzed && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-green-500 text-xl">✓</span>
            <div>
              <p className="font-medium text-green-800">解析完了！</p>
              <p className="text-sm text-green-700">{analyzed.description}</p>
            </div>
            <button
              onClick={() => setAnalyzed(null)}
              className="ml-auto text-sm text-gray-500 hover:text-gray-700"
            >
              やり直す
            </button>
          </div>

          {/* Sections preview */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              検出されたセクション ({analyzed.sections.length}個)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {analyzed.sections.map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <span className="text-xs text-gray-400 font-mono w-5 mt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SectionBadge type={s.type} />
                      <span className="text-sm font-medium text-gray-800 truncate">{s.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{s.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      フィールド数: {s.fields.length}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Step 2: テンプレートとして保存
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="テンプレート名"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={saveTemplate}
                disabled={saving}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '保存中...' : '保存してエディタへ →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature overview */}
      {!analyzed && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: '🔍',
              title: 'AI解析',
              desc: 'Claude AIがLPの構造を自動解析。セクション・テキスト・色を抽出',
            },
            {
              icon: '✏️',
              title: 'ビジュアル編集',
              desc: 'フォームに入力するだけで各セクションの内容を簡単に差し替え',
            },
            {
              icon: '📥',
              title: 'HTML出力',
              desc: '完成したLPをHTMLファイルとしてダウンロード。すぐに使える',
            },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
