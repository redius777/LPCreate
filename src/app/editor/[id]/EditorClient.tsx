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

type SidebarTab = 'sections' | 'code';
type ViewMode = 'split' | 'editor' | 'preview';

export default function EditorClient({ template }: Props) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    getDefaultFieldValues(template)
  );
  const [globalStyles, setGlobalStyles] = useState(template.globalStyles || '');
  const [globalScripts, setGlobalScripts] = useState(template.globalScripts || '');
  const [cdnLinks, setCdnLinks] = useState<string[]>(template.cdnLinks || []);

  const [previewHtml, setPreviewHtml] = useState('');
  const [generating, setGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(
    template.sections[0]?.id ?? ''
  );
  const [view, setView] = useState<ViewMode>('split');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('sections');

  const generatePreview = useCallback(async () => {
    setGenerating(true);
    try {
      // Build a modified template snapshot with current editor overrides
      const overriddenTemplate = {
        ...template,
        globalStyles,
        globalScripts,
        cdnLinks,
      };
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          fieldValues,
          // Pass overrides so the server uses them
          overrides: {
            globalStyles,
            globalScripts,
            cdnLinks,
          },
        }),
      });
      const data = await res.json();
      if (data.html) setPreviewHtml(data.html);
    } finally {
      setGenerating(false);
    }
  }, [template, fieldValues, globalStyles, globalScripts, cdnLinks]);

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
    a.download = `${template.name.replace(/[^\w぀-鿿]/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const currentSection = template.sections.find((s) => s.id === activeSection);
  const showEditor = view === 'split' || view === 'editor';
  const showPreview = view === 'split' || view === 'preview';

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

        {cdnLinks.length > 0 && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
            CDN {cdnLinks.length}件
          </span>
        )}
        {globalScripts && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            JS あり
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={generatePreview}
            disabled={generating}
            className="text-sm px-4 py-1.5 border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors font-medium"
          >
            {generating ? '生成中...' : '↺ 更新'}
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
        {/* Left panel: sidebar tabs */}
        {showEditor && (
          <div className="w-52 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
            {/* Tab header */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setSidebarTab('sections')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  sidebarTab === 'sections'
                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                セクション
              </button>
              <button
                onClick={() => setSidebarTab('code')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  sidebarTab === 'code'
                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                CSS / JS
              </button>
            </div>

            {sidebarTab === 'sections' ? (
              <div className="p-3 overflow-y-auto flex-1">
                {template.sections.map((s, i) => (
                  <SectionButton
                    key={s.id}
                    section={s}
                    index={i}
                    active={s.id === activeSection}
                    onClick={() => { setActiveSection(s.id); setSidebarTab('sections'); }}
                  />
                ))}
              </div>
            ) : (
              <div className="p-3 overflow-y-auto flex-1 space-y-3 text-xs text-gray-500">
                <p>CSS / JS の直接編集はフィールドパネルから行えます。</p>
                {cdnLinks.length > 0 && (
                  <div>
                    <p className="font-semibold text-gray-700 mb-1">読み込みCDN</p>
                    {cdnLinks.map((u, i) => (
                      <p key={i} className="truncate text-indigo-600 mb-0.5">{u}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Center panel: field editor or code editor */}
        {showEditor && (
          <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
            {sidebarTab === 'sections' && currentSection ? (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <SectionBadge type={currentSection.type} />
                  <span className="font-semibold text-gray-900 text-sm">{currentSection.label}</span>
                </div>
                {currentSection.description && (
                  <p className="text-xs text-gray-500 mb-4">{currentSection.description}</p>
                )}
                {currentSection.fields.length === 0 ? (
                  <p className="text-sm text-gray-400">編集可能なフィールドはありません</p>
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
            ) : (
              <CodeEditorPanel
                globalStyles={globalStyles}
                globalScripts={globalScripts}
                cdnLinks={cdnLinks}
                onStylesChange={setGlobalStyles}
                onScriptsChange={setGlobalScripts}
                onCdnChange={setCdnLinks}
                onApply={generatePreview}
                generating={generating}
              />
            )}
          </div>
        )}

        {/* Preview */}
        {showPreview && (
          <div className="flex-1 bg-gray-100 overflow-hidden relative">
            {generating && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                <div className="text-sm text-gray-500">生成中...</div>
              </div>
            )}
            {previewHtml ? (
              <LpPreview html={previewHtml} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                「更新」ボタンでプレビューを表示
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section sidebar button ───────────────────────────────────────────────────

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
        active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-4 text-right shrink-0">{index + 1}</span>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{section.label}</p>
          <p className="text-xs text-gray-400">{section.fields.length} フィールド</p>
        </div>
      </div>
    </button>
  );
}

// ── CSS / JS code editor panel ───────────────────────────────────────────────

function CodeEditorPanel({
  globalStyles,
  globalScripts,
  cdnLinks,
  onStylesChange,
  onScriptsChange,
  onCdnChange,
  onApply,
  generating,
}: {
  globalStyles: string;
  globalScripts: string;
  cdnLinks: string[];
  onStylesChange: (v: string) => void;
  onScriptsChange: (v: string) => void;
  onCdnChange: (v: string[]) => void;
  onApply: () => void;
  generating: boolean;
}) {
  const [tab, setTab] = useState<'css' | 'js' | 'cdn'>('css');
  const [cdnText, setCdnText] = useState(cdnLinks.join('\n'));

  function applyAll() {
    onCdnChange(cdnText.split('\n').map((s) => s.trim()).filter(Boolean));
    onApply();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-gray-200">
        {(['css', 'js', 'cdn'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
              tab === t
                ? 'bg-gray-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'css' ? 'CSS' : t === 'js' ? 'JavaScript' : 'CDN'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-3 gap-2">
        {tab === 'css' && (
          <>
            <p className="text-xs text-gray-400">
              @keyframes・:hover・transition など全体CSSを直接編集できます
            </p>
            <textarea
              value={globalStyles}
              onChange={(e) => onStylesChange(e.target.value)}
              className="flex-1 w-full font-mono text-xs border border-gray-300 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
              spellCheck={false}
            />
          </>
        )}

        {tab === 'js' && (
          <>
            <p className="text-xs text-gray-400">
              スクロールアニメーション・カルーセル等のJSを直接編集できます
            </p>
            <textarea
              value={globalScripts}
              onChange={(e) => onScriptsChange(e.target.value)}
              className="flex-1 w-full font-mono text-xs border border-gray-300 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
              spellCheck={false}
            />
          </>
        )}

        {tab === 'cdn' && (
          <>
            <p className="text-xs text-gray-400">
              1行に1URLを記入（AOS.js、GSAP、SwiperなどのCDN）
            </p>
            <textarea
              value={cdnText}
              onChange={(e) => setCdnText(e.target.value)}
              className="flex-1 w-full font-mono text-xs border border-gray-300 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
              spellCheck={false}
              placeholder={"https://unpkg.com/aos@2.3.1/dist/aos.css\nhttps://unpkg.com/aos@2.3.1/dist/aos.js"}
            />
          </>
        )}

        <button
          onClick={applyAll}
          disabled={generating}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {generating ? '生成中...' : 'プレビューに反映'}
        </button>
      </div>
    </div>
  );
}
