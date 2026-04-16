import { SectionType } from '@/types/lp';

const SECTION_CONFIG: Record<SectionType, { label: string; color: string }> = {
  hero: { label: 'ヒーロー', color: 'bg-purple-100 text-purple-700' },
  features: { label: '機能', color: 'bg-blue-100 text-blue-700' },
  benefits: { label: 'ベネフィット', color: 'bg-green-100 text-green-700' },
  testimonials: { label: '口コミ', color: 'bg-yellow-100 text-yellow-700' },
  pricing: { label: '料金', color: 'bg-orange-100 text-orange-700' },
  cta: { label: 'CTA', color: 'bg-red-100 text-red-700' },
  faq: { label: 'FAQ', color: 'bg-teal-100 text-teal-700' },
  header: { label: 'ヘッダー', color: 'bg-gray-100 text-gray-700' },
  footer: { label: 'フッター', color: 'bg-gray-100 text-gray-700' },
  custom: { label: 'カスタム', color: 'bg-pink-100 text-pink-700' },
};

export default function SectionBadge({ type }: { type: SectionType }) {
  const cfg = SECTION_CONFIG[type] || SECTION_CONFIG.custom;
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}
