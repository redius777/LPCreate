import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import { AnalyzeResponse, LPSection, SectionType } from '@/types/lp';
import { v4 as uuidv4 } from 'uuid';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYZE_PROMPT_BASE = `あなたはLPデザイナーです。LPを分析して、テンプレートとして再利用できる構造に変換してください。

次のJSON形式のみで返答してください（余分なテキスト・マークダウン不要）：

{
  "suggestedName": "テンプレート名",
  "description": "このLPテンプレートの概要（1〜2文）",
  "globalStyles": "body{font-family:sans-serif;margin:0;padding:0;} などの基本CSS文字列",
  "sections": [
    {
      "type": "hero|features|benefits|testimonials|pricing|cta|faq|header|footer|custom",
      "label": "セクション名（日本語可）",
      "description": "このセクションの役割",
      "fields": [
        {
          "key": "snake_case_key",
          "label": "フィールド名（日本語可）",
          "type": "text|textarea|image_url|color|url|list",
          "placeholder": "入力例または説明",
          "value": "元LPから抽出した実際の値（画像の場合は空でもOK）",
          "listItems": ["listタイプの場合のみ各項目"]
        }
      ],
      "htmlTemplate": "{{field_key}}プレースホルダー入りのHTMLテンプレート。インラインstyleでスタイルを定義。"
    }
  ]
}

ルール:
1. htmlTemplateは実際にレンダリング可能な完全なHTMLにする（divタグから始める）
2. テキスト・画像・色など変わりうる全ての値を{{field_key}}で置換する
3. スタイルはすべてinline styleで定義（外部CSS/クラス参照は使わない）
4. 最低5セクション以上を識別する
5. jsonのみ返す（\`\`\`json などのコードブロック記法も不要）`;

function sanitizeHtml(html: string): string {
  const $ = cheerio.load(html);
  $('script').remove();
  $('style').remove();
  $('link[rel="stylesheet"]').remove();
  $('noscript').remove();
  return $.html().slice(0, 12000);
}

export async function analyzeLpFromHtml(html: string): Promise<AnalyzeResponse> {
  const cleanHtml = sanitizeHtml(html);

  const prompt = `${ANALYZE_PROMPT_BASE}

以下のHTMLを分析してください：
\`\`\`html
${cleanHtml}
\`\`\``;

  return callClaudeForAnalysis(prompt);
}

export async function analyzeLpFromImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
): Promise<AnalyzeResponse> {
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `${ANALYZE_PROMPT_BASE}

上記の画像（LPのスクリーンショット）を分析してください。
画像から読み取れるテキスト・レイアウト・色・構成要素をすべて抽出し、
実際に機能するHTMLテンプレートを生成してください。
画像から読み取れた実際のテキストをvalueに設定してください。`,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  return parseClaudeResponse(content.text);
}

async function callClaudeForAnalysis(prompt: string): Promise<AnalyzeResponse> {
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8096,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  return parseClaudeResponse(content.text);
}

function parseClaudeResponse(text: string): AnalyzeResponse {
  let parsed;
  try {
    const cleaned = text.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse Claude response: ${text.slice(0, 300)}`);
  }

  const sections: LPSection[] = (parsed.sections || []).map(
    (s: Omit<LPSection, 'id'> & { type: SectionType }) => ({
      id: uuidv4(),
      type: s.type || 'custom',
      label: s.label || 'セクション',
      description: s.description || '',
      fields: (s.fields || []).map((f: LPSection['fields'][0]) => ({
        ...f,
        listItems: f.type === 'list' ? (f.listItems || []) : undefined,
      })),
      htmlTemplate: s.htmlTemplate || '',
    })
  );

  return {
    suggestedName: parsed.suggestedName || '新しいテンプレート',
    description: parsed.description || '',
    globalStyles: parsed.globalStyles || 'body{font-family:sans-serif;margin:0;padding:0;}',
    sections,
  };
}

export async function fetchUrlHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; LPCreate/1.0)',
    },
  });
  if (!response.ok) throw new Error(`URLの取得に失敗しました: ${response.status}`);
  return response.text();
}
