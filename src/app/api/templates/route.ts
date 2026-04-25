import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, saveTemplate } from '@/lib/storage';
import { LPTemplate } from '@/types/lp';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  return NextResponse.json(getTemplates());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, sections, globalStyles, globalScripts, cdnLinks, sourceUrl } =
      body as Partial<LPTemplate>;

    if (!name || !sections) {
      return NextResponse.json({ error: 'name と sections は必須です' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const template: LPTemplate = {
      id: uuidv4(),
      name,
      description: description || '',
      sections,
      globalStyles: globalStyles || '',
      globalScripts: globalScripts || '',
      cdnLinks: cdnLinks || [],
      sourceUrl,
      createdAt: now,
      updatedAt: now,
    };

    saveTemplate(template);
    return NextResponse.json(template, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
