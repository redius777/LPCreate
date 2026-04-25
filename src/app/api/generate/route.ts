import { NextRequest, NextResponse } from 'next/server';
import { getTemplate } from '@/lib/storage';
import { generateHtml } from '@/lib/lp-generator';
import { GenerateRequest, LPTemplate } from '@/types/lp';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GenerateRequest & {
      overrides?: Partial<Pick<LPTemplate, 'globalStyles' | 'globalScripts' | 'cdnLinks'>>;
    };
    const { templateId, fieldValues, overrides } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'templateId は必須です' }, { status: 400 });
    }

    const template = getTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 });
    }

    // Allow the editor to override CSS/JS without persisting to storage
    const effective: LPTemplate = overrides
      ? { ...template, ...overrides }
      : template;

    const html = generateHtml(effective, fieldValues || {});
    return NextResponse.json({ html });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
