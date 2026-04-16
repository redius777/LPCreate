import { NextRequest, NextResponse } from 'next/server';
import { getTemplate } from '@/lib/storage';
import { generateHtml } from '@/lib/lp-generator';
import { GenerateRequest } from '@/types/lp';

export async function POST(req: NextRequest) {
  try {
    const { templateId, fieldValues } = (await req.json()) as GenerateRequest;

    if (!templateId) {
      return NextResponse.json({ error: 'templateId は必須です' }, { status: 400 });
    }

    const template = getTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 });
    }

    const html = generateHtml(template, fieldValues || {});
    return NextResponse.json({ html });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
