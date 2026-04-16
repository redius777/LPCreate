import Link from 'next/link';
import { getTemplates } from '@/lib/storage';
import SectionBadge from '@/components/SectionBadge';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const templates = getTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">テンプレート一覧</h1>
          <p className="text-sm text-gray-500 mt-1">
            保存済みのLPテンプレート ({templates.length}件)
          </p>
        </div>
        <Link
          href="/"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + 新規作成
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 text-lg mb-2">テンプレートがまだありません</p>
          <p className="text-gray-400 text-sm mb-6">
            既存のLPを読み込んでテンプレートを作成しましょう
          </p>
          <Link
            href="/"
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            LPを解析してテンプレート作成
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-gray-900 text-lg truncate">{t.name}</h2>
              {t.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.description}</p>
              )}

              <div className="flex flex-wrap gap-1.5 mt-3">
                {t.sections.slice(0, 5).map((s) => (
                  <SectionBadge key={s.id} type={s.type} />
                ))}
                {t.sections.length > 5 && (
                  <span className="text-xs text-gray-400">+{t.sections.length - 5}</span>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-3">
                {new Date(t.createdAt).toLocaleDateString('ja-JP')} 作成
                {' · '}
                {t.sections.length} セクション
              </p>

              <div className="flex gap-2 mt-4">
                <Link
                  href={`/editor/${t.id}`}
                  className="flex-1 text-center bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  編集する
                </Link>
                <DeleteButton templateId={t.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteButton({ templateId }: { templateId: string }) {
  return (
    <form
      action={async () => {
        'use server';
        const { deleteTemplate } = await import('@/lib/storage');
        deleteTemplate(templateId);
      }}
    >
      <button
        type="submit"
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors"
        onClick={(e) => {
          if (!confirm('このテンプレートを削除しますか？')) e.preventDefault();
        }}
      >
        削除
      </button>
    </form>
  );
}
