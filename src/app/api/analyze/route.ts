import { NextRequest, NextResponse } from 'next/server';
import { analyzeLpFromHtml, analyzeLpFromImage, fetchUrlHtml } from '@/lib/lp-analyzer';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Handle multipart form data (image upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 });
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: '対応形式: JPEG, PNG, GIF, WebP' },
          { status: 400 }
        );
      }

      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const result = await analyzeLpFromImage(
        base64,
        file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      );
      return NextResponse.json(result);
    }

    // Handle JSON body (URL or raw HTML)
    const body = await req.json();
    const { url, html } = body as { url?: string; html?: string };

    if (!url && !html) {
      return NextResponse.json(
        { error: 'url または html を指定してください' },
        { status: 400 }
      );
    }

    let sourceHtml = html;
    if (url) {
      sourceHtml = await fetchUrlHtml(url);
    }

    const result = await analyzeLpFromHtml(sourceHtml!);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[analyze]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
