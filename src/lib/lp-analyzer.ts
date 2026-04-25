import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import { AnalyzeResponse, LPSection, SectionType } from '@/types/lp';
import { v4 as uuidv4 } from 'uuid';
import { capturePageSnapshot } from './screenshot';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── HTML extraction (for paste/upload paths) ────────────────────────────────

interface RawSource {
  bodyHtml: string;
  inlineStyles: string;
  inlineScripts: string;
  externalScripts: string[];
  externalStyles: string[];
}

function extractFromHtml(html: string): RawSource {
  const $ = cheerio.load(html);
  const inlineStyles: string[] = [];
  const inlineScripts: string[] = [];
  const externalScripts: string[] = [];
  const externalStyles: string[] = [];

  $('style').each((_, el) => inlineStyles.push($(el).html() || ''));
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) externalStyles.push(href);
  });
  $('script').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      externalScripts.push(src);
    } else {
      const code = $(el).html() || '';
      if (code.trim()) inlineScripts.push(code);
    }
  });

  $('script').remove();
  $('style').remove();
  $('link[rel="stylesheet"]').remove();
  $('noscript').remove();

  return {
    bodyHtml: $.html().slice(0, 14000),
    inlineStyles: inlineStyles.join('\n\n').slice(0, 10000),
    inlineScripts: inlineScripts.join('\n\n').slice(0, 10000),
    externalScripts,
    externalStyles,
  };
}

// ─── Shared prompt pieces ────────────────────────────────────────────────────

const JSON_SCHEMA = `{
  "suggestedName": "テンプレート名",
  "description": "このLPテンプレートの概要（1〜2文）",
  "globalStyles": "全体CSS文字列（後述ルール参照）",
  "globalScripts": "全動的挙動を再現するJS文字列（後述ルール参照）",
  "cdnLinks": ["必要な外部CDN URLのみ（不要なら[]）"],
  "sections": [
    {
      "type": "hero|features|benefits|testimonials|pricing|cta|faq|header|footer|custom",
      "label": "セクション名（日本語可）",
      "description": "セクションの役割と含まれる動的要素の説明",
      "fields": [
        {
          "key": "snake_case_key",
          "label": "フィールド名（日本語可）",
          "type": "text|textarea|image_url|color|url|list",
          "placeholder": "入力例",
          "value": "元LPから抽出した実際の値",
          "listItems": ["listタイプのみ各項目"]
        }
      ],
      "htmlTemplate": "クラス名・id・data-*属性をそのまま保持したHTMLテンプレート。変数部分のみ{{field_key}}で置換。"
    }
  ]
}`;

const RULES = `
【globalStylesのルール】
- body・要素の基本スタイル（フォント、マージン、パディング、背景色）
- :hover / :focus / :active などすべての擬似クラスのスタイル
- @keyframes を含む全アニメーション定義
- transition / animation プロパティ（transformやopacityの変化含む）
- スクロールアニメーション用の初期状態・完了状態クラス
  例: .aos-fade-up { opacity:0; transform:translateY(30px); transition:all 0.6s ease; }
      .aos-fade-up.is-visible { opacity:1; transform:translateY(0); }
- メディアクエリ（モバイル対応）
- カルーセル・タブ・モーダルなどのUI状態クラス

【globalScriptsのルール】
- document.addEventListener('DOMContentLoaded', ...) 内に全処理を記述
- 以下をすべてVanilla JSで再現する:
  ・IntersectionObserver によるスクロールトリガーアニメーション
  ・ハンバーガーメニュー・ドロップダウン開閉
  ・カルーセル・スライダー（自動再生含む）
  ・タブ切り替え・アコーディオン（FAQ等）
  ・スムーズスクロール（アンカーリンク）
  ・数値カウントアップ
  ・パララックス効果
  ・スティッキーヘッダーのスタイル変化
  ・その他見て取れるすべてのインタラクション
- 外部ライブラリはcdnLinksに追加した上でglobalScriptsで初期化する
  例: cdnLinks=["https://unpkg.com/aos@2.3.1/dist/aos.css","https://unpkg.com/aos@2.3.1/dist/aos.js"]
      globalScripts: "document.addEventListener('DOMContentLoaded',()=>{ AOS.init({...}); })"

【htmlTemplateのルール】
- data-aos・data-tab・data-slide 等の属性はそのまま保持（JSが参照するため削除厳禁）
- クラス名・idもそのまま保持
- テキスト・画像URL・色など変わりうる値のみ {{field_key}} で置換
- inline styleは最小限（クラスで管理する）

【その他】
- jsonのみ返す（\`\`\`json などのコードブロック記法も不要）
- 最低5セクション以上識別する`;

// ─── URL analysis (screenshot + source) ─────────────────────────────────────

export async function analyzeLpFromUrl(url: string): Promise<AnalyzeResponse> {
  const snapshot = await capturePageSnapshot(url);
  const src = extractFromHtml(snapshot.html);

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8096,
    messages: [
      {
        role: 'user',
        content: [
          // 1) Full-page screenshot for visual understanding
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: snapshot.screenshotBase64,
            },
          },
          // 2) Source code for complete dynamic behavior
          {
            type: 'text',
            text: `あなたはフロントエンドエンジニア兼LPデザイナーです。
上記のLPのフルページスクリーンショットと以下のソースコードを両方参照して、
視覚的デザインと動的挙動を完全に再現できるテンプレートを作成してください。

## HTML構造
\`\`\`html
${src.bodyHtml}
\`\`\`

## CSS（アニメーション・トランジション含む）
\`\`\`css
${src.inlineStyles || '（なし）'}
\`\`\`

## JavaScript
\`\`\`js
${src.inlineScripts || '（なし）'}
\`\`\`

## 外部スクリプト
${snapshot.externalScripts.length ? snapshot.externalScripts.join('\n') : '（なし）'}

## 外部スタイルシート
${snapshot.externalStyles.length ? snapshot.externalStyles.join('\n') : '（なし）'}

スクリーンショットで確認できるビジュアルと、ソースコードに含まれる動的処理の両方を忠実に再現してください。

次のJSON形式で返してください:
${JSON_SCHEMA}
${RULES}`,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  return parseClaudeResponse(content.text);
}

// ─── HTML paste analysis ─────────────────────────────────────────────────────

export async function analyzeLpFromHtml(html: string): Promise<AnalyzeResponse> {
  const src = extractFromHtml(html);

  const prompt = `あなたはフロントエンドエンジニア兼LPデザイナーです。
以下のLPのソースコードを完全に解析し、動的な挙動も含めて再現可能なテンプレートを作成してください。

## HTML構造
\`\`\`html
${src.bodyHtml}
\`\`\`

## CSS（アニメーション・トランジション含む）
\`\`\`css
${src.inlineStyles || '（なし）'}
\`\`\`

## JavaScript
\`\`\`js
${src.inlineScripts || '（なし）'}
\`\`\`

## 外部スクリプト（参照のみ）
${src.externalScripts.length ? src.externalScripts.join('\n') : '（なし）'}

## 外部スタイルシート（参照のみ）
${src.externalStyles.length ? src.externalStyles.join('\n') : '（なし）'}

次のJSON形式で返してください:
${JSON_SCHEMA}
${RULES}`;

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8096,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  return parseClaudeResponse(content.text);
}

// ─── Image-only analysis ─────────────────────────────────────────────────────

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
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `あなたはフロントエンドエンジニア兼LPデザイナーです。
このLPスクリーンショットを解析し、視覚的デザインと想定される動的挙動を再現するテンプレートを作成してください。

画像から以下を読み取って忠実に再現してください:
- レイアウト・配色・タイポグラフィ・余白
- ボタン・カード・アイコン等のUI要素デザイン
- ナビゲーション構造

動的挙動は画像から推測して生成:
- スクロールアニメーション（フェードイン・スライドイン等）
- ナビゲーションのスムーズスクロール・スティッキー効果
- CTAボタンのhoverエフェクト（拡大・色変化・影）
- カルーセル・スライダーが見える場合は実装
- FAQ・アコーディオンが見える場合は実装

次のJSON形式で返してください:
${JSON_SCHEMA}
${RULES}`,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  return parseClaudeResponse(content.text);
}

// ─── Response parser ─────────────────────────────────────────────────────────

function parseClaudeResponse(text: string): AnalyzeResponse {
  let parsed;
  try {
    const cleaned = text.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude応答のパースに失敗しました: ${text.slice(0, 300)}`);
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
    globalScripts: parsed.globalScripts || '',
    cdnLinks: Array.isArray(parsed.cdnLinks) ? parsed.cdnLinks : [],
    sections,
  };
}
