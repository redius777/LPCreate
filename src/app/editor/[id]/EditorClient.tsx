'use client';

import { useState, useEffect, useCallback } from 'react';
import { LPTemplate, LPSection } from '@/types/lp';
import { getDefaultFieldValues } from '@/lib/lp-generator';
import FieldEditor from '@/components/FieldEditor';
import LpPreview from '@/components/LpPreview';
import SectionBadge from '@/components/SectionBadge';

interface Props {
  template: LPTemplate;
}

export default function EditorClient({ template }: Props) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    getDefaultFieldValues(template)
  );
  const [previewHtml, setPreviewHtml] = useState('');
  const [generating, setGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(
    template.sections[0]?.id ?? ''
  );
  const [view, setView] = useState<'split' | 'editor' | 'preview'>('split');

  const generatePreview = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id, fieldValues }),
      });
      const data = await res.json();
      if (data.html) setPreviewHtml(data.html);
    } finally {
      setGenerating(false);
    }
  }, [template.id, fieldValues]);

  // Auto-generate preview on mount
  useEffect(() => {
    generatePreview();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFieldChange(key: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }

  function downloadHtml() {
    const blob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/[^a-zA-Z0-9ぁ-ん一-龯]/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const currentSection = template.sections.find((s) => s.id === activeSection);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] -mt-8 -mx-4">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
        <h1 className="font-semibold text-gray-900 text-sm truncate max-w-xs">{template.name}</h1>
        <span className="text-gray-300">|</span>

        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
          {(['split', 'editor', 'preview'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                view === v ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {v === 'split' ? '分割' : v === 'editor' ? '編集' : 'プレビュー'}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={generatePreview}
            disabled={generating}
            className="text-sm px-4 py-1.5 border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors font-medium"
          >
            {generating ? '生成中...' : '↺ プレビュー更新'}
          </button>
          <button
            onClick={downloadHtml}
            disabled={!previewHtml}
            className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
          >
            📥 HTMLダウンロード
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Section list sidebar */}
        {(view === 'split' || view === 'editor') && (
          <div className="w-52 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
                セクション
              </p>
              {template.sections.map((s, i) => (
                <SectionButton
                  key={s.id}
                  section={s}
                  index={i}
                  active={s.id === activeSection}
                  onClick={() => setActiveSection(s.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Field editor */}
        {(view === 'split' || view === 'editor') && currentSection && (
          <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <SectionBadge type={currentSection.type} />
                <span className="font-semibold text-gray-900 text-sm">{currentSection.label}</span>
              </div>
              {currentSection.description && (
                <p className="text-xs text-gray-500 mb-4">{currentSection.description}</p>
              )}
              {currentSection.fields.length === 0 ? (
                <p className="text-sm text-gray-400">このセクションに編集可能なフィールドはありません</p>
              ) : (
                <FieldEditor
                  section={currentSection}
                  values={fieldValues}
                  onChange={handleFieldChange}
                />
              )}
              <button
                onClick={generatePreview}
                disabled={generating}
                className="mt-6 w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {generating ? '生成中...' : 'プレビューに反映'}
              </button>
            </div>
          </div>
        )}

        {/* Preview */}
        {(view === 'split' || view === 'preview') && (
          <div className="flex-1 bg-gray-100 overflow-hidden relative">
            {generating && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                <div className="text-sm text-gray-500">プレビュー生成中...</div>
              </div>
            )}
            {previewHtml ? (
              <LpPreview html={previewHtml} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                プレビューを更新してください
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionButton({
  section,
  index,
  active,
  onClick,
}: {
  section: LPSection;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2.5 py-2 rounded-lg mb-1 transition-colors ${
        active
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-4 text-right">{index + 1}</span>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{section.label}</p>
          <p className="text-xs text-gray-400 truncate">{section.fields.length} フィールド</p>
        </div>
      </div>
    </button>
  );
}
