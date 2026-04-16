import { notFound } from 'next/navigation';
import { getTemplate } from '@/lib/storage';
import EditorClient from './EditorClient';

export const dynamic = 'force-dynamic';

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = getTemplate(id);
  if (!template) notFound();

  return <EditorClient template={template} />;
}
