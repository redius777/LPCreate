'use client';

import { useRouter } from 'next/navigation';

export default function DeleteButton({ templateId }: { templateId: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm('このテンプレートを削除しますか？')) return;
    await fetch(`/api/templates/${templateId}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors"
    >
      削除
    </button>
  );
}
