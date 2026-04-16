import { LPTemplate, LPSection } from '@/types/lp';

export function generateHtml(template: LPTemplate, fieldValues: Record<string, string>): string {
  const sectionHtmls = template.sections.map((section) =>
    renderSection(section, fieldValues)
  );

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${fieldValues['meta_title'] || template.name}</title>
  <style>
    ${template.globalStyles}
    * { box-sizing: border-box; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
${sectionHtmls.join('\n')}
</body>
</html>`;
}

export function renderSection(section: LPSection, fieldValues: Record<string, string>): string {
  let html = section.htmlTemplate;

  for (const field of section.fields) {
    const valueKey = `${section.id}_${field.key}`;
    const value = fieldValues[valueKey] ?? field.value ?? field.placeholder ?? '';
    const escaped = escapeHtml(value);

    // Replace all occurrences of {{field_key}}
    html = html.replaceAll(`{{${field.key}}}`, escaped);
  }

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getDefaultFieldValues(template: LPTemplate): Record<string, string> {
  const values: Record<string, string> = {};
  for (const section of template.sections) {
    for (const field of section.fields) {
      const key = `${section.id}_${field.key}`;
      values[key] = field.value || '';
    }
  }
  return values;
}
